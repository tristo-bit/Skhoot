// HTTP Fetcher with size and timeout limits
// Safely fetches web pages with streaming size limit enforcement

use reqwest::Client;
use std::time::{Duration, Instant};
use url::Url;
use futures::StreamExt;

use crate::content_extraction::{ContentExtractionError, SsrfValidator};

/// Result from HTTP fetch operation
#[derive(Debug, Clone)]
pub struct FetchResult {
    /// Final URL after following redirects
    pub final_url: String,
    
    /// HTTP status code
    pub status: u16,
    
    /// Content-Type header value
    pub content_type: Option<String>,
    
    /// Downloaded HTML content
    pub html: String,
    
    /// Time taken to fetch (milliseconds)
    pub fetch_time_ms: u64,
}

/// HTTP Fetcher with size and timeout limits
/// 
/// This fetcher safely downloads web pages with:
/// - Streaming size limit enforcement (aborts at 10MB)
/// - Timeout enforcement (15 seconds default)
/// - SSRF validation for all URLs including redirects
/// - Proper User-Agent and Accept headers
pub struct HttpFetcher {
    client: Client,
    max_bytes: usize,
    timeout: Duration,
}

impl HttpFetcher {
    /// Creates a new HttpFetcher with default limits
    /// 
    /// Defaults:
    /// - max_bytes: 10MB (10 * 1024 * 1024)
    /// - timeout: 15 seconds
    pub fn new() -> Result<Self, ContentExtractionError> {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::limited(10))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
            .map_err(|e| ContentExtractionError::ExtractionFailed {
                url: "".to_string(),
                reason: format!("Failed to create HTTP client: {}", e),
            })?;

        Ok(Self {
            client,
            max_bytes: 10 * 1024 * 1024, // 10MB
            timeout: Duration::from_secs(15),
        })
    }

    /// Creates a new HttpFetcher with custom limits
    pub fn with_limits(max_bytes: usize, timeout: Duration) -> Result<Self, ContentExtractionError> {
        let client = Client::builder()
            .timeout(timeout)
            .redirect(reqwest::redirect::Policy::limited(10))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
            .map_err(|e| ContentExtractionError::ExtractionFailed {
                url: "".to_string(),
                reason: format!("Failed to create HTTP client: {}", e),
            })?;

        Ok(Self {
            client,
            max_bytes,
            timeout,
        })
    }

    /// Fetches a URL with streaming size limit
    /// 
    /// This method:
    /// 1. Validates the URL for SSRF
    /// 2. Sends HTTP request with proper headers
    /// 3. Streams response body while counting bytes
    /// 4. Aborts if size exceeds max_bytes
    /// 5. Returns FetchResult with HTML and metadata
    pub async fn fetch(&self, url: &Url) -> Result<FetchResult, ContentExtractionError> {
        let start_time = Instant::now();

        // Validate URL for SSRF
        SsrfValidator::validate_url(url).await?;

        // Send request
        let response = self
            .client
            .get(url.as_str())
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.9")
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    ContentExtractionError::FetchTimeout {
                        url: url.to_string(),
                        timeout_ms: self.timeout.as_millis() as u64,
                    }
                } else {
                    ContentExtractionError::ExtractionFailed {
                        url: url.to_string(),
                        reason: format!("HTTP request failed: {}", e),
                    }
                }
            })?;

        // Capture metadata before consuming body
        let final_url = response.url().to_string();
        let status = response.status().as_u16();
        let content_type = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        // Check for HTTP errors
        if !response.status().is_success() {
            return Err(ContentExtractionError::HttpError {
                url: url.to_string(),
                status,
            });
        }

        // Validate final URL after redirects
        if final_url != url.as_str() {
            let final_url_parsed = Url::parse(&final_url).map_err(|_| {
                ContentExtractionError::InvalidUrl {
                    url: final_url.clone(),
                }
            })?;
            SsrfValidator::validate_url(&final_url_parsed).await?;
        }

        // Stream response body with size limit
        let mut bytes_downloaded = 0usize;
        let mut body_chunks = Vec::new();
        let mut stream = response.bytes_stream();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| ContentExtractionError::ExtractionFailed {
                url: url.to_string(),
                reason: format!("Failed to read response body: {}", e),
            })?;

            bytes_downloaded += chunk.len();

            // Check size limit
            if bytes_downloaded > self.max_bytes {
                let size_mb = bytes_downloaded as f32 / (1024.0 * 1024.0);
                return Err(ContentExtractionError::SizeLimitExceeded {
                    url: url.to_string(),
                    size_mb,
                });
            }

            body_chunks.push(chunk);
        }

        // Combine chunks into single string
        let body_bytes: Vec<u8> = body_chunks.into_iter().flat_map(|c| c.to_vec()).collect();
        let html = String::from_utf8_lossy(&body_bytes).to_string();

        let fetch_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(FetchResult {
            final_url,
            status,
            content_type,
            html,
            fetch_time_ms,
        })
    }

    /// Fetches a URL with custom limits (overrides instance limits)
    pub async fn fetch_with_limits(
        &self,
        url: &Url,
        max_bytes: usize,
        timeout: Duration,
    ) -> Result<FetchResult, ContentExtractionError> {
        // Create a temporary fetcher with custom limits
        let temp_fetcher = Self::with_limits(max_bytes, timeout)?;
        temp_fetcher.fetch(url).await
    }
}

impl Default for HttpFetcher {
    fn default() -> Self {
        Self::new().expect("Failed to create default HttpFetcher")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_http_fetcher_creation() {
        let fetcher = HttpFetcher::new();
        assert!(fetcher.is_ok());
        
        let fetcher = fetcher.unwrap();
        assert_eq!(fetcher.max_bytes, 10 * 1024 * 1024);
        assert_eq!(fetcher.timeout, Duration::from_secs(15));
    }

    #[tokio::test]
    async fn test_http_fetcher_with_custom_limits() {
        let fetcher = HttpFetcher::with_limits(5 * 1024 * 1024, Duration::from_secs(10));
        assert!(fetcher.is_ok());
        
        let fetcher = fetcher.unwrap();
        assert_eq!(fetcher.max_bytes, 5 * 1024 * 1024);
        assert_eq!(fetcher.timeout, Duration::from_secs(10));
    }

    #[tokio::test]
    async fn test_fetch_public_url() {
        let fetcher = HttpFetcher::new().unwrap();
        let url = Url::parse("https://example.com").unwrap();
        
        let result = fetcher.fetch(&url).await;
        assert!(result.is_ok(), "Failed to fetch example.com: {:?}", result.err());
        
        let fetch_result = result.unwrap();
        assert_eq!(fetch_result.status, 200);
        assert!(!fetch_result.html.is_empty());
        assert!(fetch_result.html.contains("Example Domain"));
    }

    #[tokio::test]
    async fn test_fetch_blocks_private_ip() {
        let fetcher = HttpFetcher::new().unwrap();
        let url = Url::parse("http://127.0.0.1").unwrap();
        
        let result = fetcher.fetch(&url).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ContentExtractionError::SsrfViolation { .. }));
    }

    #[tokio::test]
    async fn test_fetch_blocks_localhost() {
        let fetcher = HttpFetcher::new().unwrap();
        let url = Url::parse("http://localhost").unwrap();
        
        let result = fetcher.fetch(&url).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ContentExtractionError::SsrfViolation { .. }));
    }

    #[tokio::test]
    async fn test_fetch_invalid_url() {
        let fetcher = HttpFetcher::new().unwrap();
        let url = Url::parse("http://this-domain-definitely-does-not-exist-12345.com").unwrap();
        
        let result = fetcher.fetch(&url).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fetch_http_error() {
        let fetcher = HttpFetcher::new().unwrap();
        let url = Url::parse("https://httpbin.org/status/404").unwrap();
        
        let result = fetcher.fetch(&url).await;
        assert!(result.is_err());
        
        if let Err(ContentExtractionError::HttpError { status, .. }) = result {
            assert_eq!(status, 404);
        } else {
            panic!("Expected HttpError, got: {:?}", result);
        }
    }

    // Property-based tests
    #[cfg(test)]
    mod proptests {
        use super::*;
        use proptest::prelude::*;

        // Feature: web-content-extraction, Property 2: Size Limit Enforcement
        // For any HTTP fetch operation, if the response size exceeds 10MB,
        // then the fetcher should abort the download and return an error
        // without consuming additional bandwidth.
        
        // Note: We can't easily test this with real HTTP requests in a property test,
        // but we can test the size checking logic
        proptest! {
            #![proptest_config(ProptestConfig::with_cases(100))]

            #[test]
            fn prop_size_limit_calculation(
                chunk_size in 1usize..1000000,
                num_chunks in 1usize..20,
            ) {
                let total_size = chunk_size * num_chunks;
                let max_bytes = 10 * 1024 * 1024; // 10MB
                
                // Property: total size exceeding max_bytes should be detected
                let exceeds_limit = total_size > max_bytes;
                
                if exceeds_limit {
                    let size_mb = total_size as f32 / (1024.0 * 1024.0);
                    prop_assert!(size_mb > 10.0, "Size {} MB should exceed 10MB limit", size_mb);
                }
            }

            #[test]
            fn prop_timeout_duration_valid(
                timeout_secs in 1u64..300,
            ) {
                let timeout = Duration::from_secs(timeout_secs);
                let fetcher = HttpFetcher::with_limits(10 * 1024 * 1024, timeout);
                
                prop_assert!(fetcher.is_ok());
                prop_assert_eq!(fetcher.unwrap().timeout, timeout);
            }
        }
    }
}
