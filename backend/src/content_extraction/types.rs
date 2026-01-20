// Core data structures and error types for content extraction

use serde::{Deserialize, Serialize};
use std::fmt;

// ============================================================================
// PageExtract - Complete structured output from content extraction
// ============================================================================

/// Complete structured output from content extraction
/// 
/// This struct contains all extracted content, metadata, quality metrics,
/// and performance data from a web page extraction operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageExtract {
    // Core content
    /// Extracted main article text with paragraph structure preserved
    pub text: String,
    
    /// Word count of extracted text
    pub word_count: usize,
    
    // Metadata
    /// Final URL after following redirects
    pub final_url: String,
    
    /// Page title from <title>, Open Graph, or JSON-LD
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    
    /// Page description from meta tags or Open Graph
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    
    /// Author information from meta tags or JSON-LD
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    
    /// Publication date from meta tags, JSON-LD, or article tags
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_date: Option<String>,
    
    /// Canonical URL from link tags
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canonical_url: Option<String>,
    
    // Images
    /// Primary image from Open Graph or article content
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_image: Option<String>,
    
    /// All images found in the content
    pub images: Vec<String>,
    
    // Links
    /// All links found in the main content
    pub links: Vec<String>,
    
    // Quality metrics
    /// Confidence score (0.0-1.0) indicating extraction quality
    pub confidence: f32,
    
    /// Method used for extraction
    pub extraction_method: ExtractionMethod,
    
    // Performance metrics
    /// Time taken to fetch the page (milliseconds)
    pub fetch_time_ms: u64,
    
    /// Time taken to extract content (milliseconds)
    pub extraction_time_ms: u64,
    
    /// Total time for the entire operation (milliseconds)
    pub total_time_ms: u64,
    
    // HTTP details
    /// HTTP status code
    pub status: u16,
    
    /// Content-Type header value
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,
}

impl PageExtract {
    /// Creates a new PageExtract with required fields
    pub fn new(
        text: String,
        final_url: String,
        confidence: f32,
        extraction_method: ExtractionMethod,
    ) -> Self {
        let word_count = text.split_whitespace().count();
        
        Self {
            text,
            word_count,
            final_url,
            title: None,
            description: None,
            author: None,
            published_date: None,
            canonical_url: None,
            primary_image: None,
            images: Vec::new(),
            links: Vec::new(),
            confidence,
            extraction_method,
            fetch_time_ms: 0,
            extraction_time_ms: 0,
            total_time_ms: 0,
            status: 200,
            content_type: None,
        }
    }
}

// ============================================================================
// ExtractionMethod - Method used for content extraction
// ============================================================================

/// Method used for content extraction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExtractionMethod {
    /// Paragraph density heuristic (fast, works for most pages)
    DensityHeuristic,
    
    /// Readability algorithm (more sophisticated)
    ReadabilityAlgorithm,
    
    /// Browser rendering (for JavaScript-heavy sites)
    BrowserRender,
    
    /// Fallback method (raw HTML when extraction fails)
    Fallback,
}

impl fmt::Display for ExtractionMethod {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExtractionMethod::DensityHeuristic => write!(f, "density_heuristic"),
            ExtractionMethod::ReadabilityAlgorithm => write!(f, "readability_algorithm"),
            ExtractionMethod::BrowserRender => write!(f, "browser_render"),
            ExtractionMethod::Fallback => write!(f, "fallback"),
        }
    }
}

// ============================================================================
// Metadata - Structured metadata extracted from HTML
// ============================================================================

/// Structured metadata extracted from HTML
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Metadata {
    /// Page title
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    
    /// Page description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    
    /// Author information
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    
    /// Publication date
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_date: Option<String>,
    
    /// Canonical URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canonical_url: Option<String>,
    
    /// Primary image URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_image: Option<String>,
    
    /// All images found
    pub images: Vec<String>,
}

// ============================================================================
// RenderJob - Request to render a page using WebView
// ============================================================================

/// Request to render a page using the native WebView
/// 
/// This struct is sent from the backend to the Tauri frontend
/// to trigger headless rendering of a JavaScript-heavy page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderJob {
    /// Unique identifier for this render job
    pub job_id: String,
    
    /// URL to render
    pub url: String,
    
    /// Timeout in milliseconds (default: 30000)
    pub timeout_ms: u64,
    
    /// Wait condition before extracting content
    pub wait: RenderWait,
}

impl RenderJob {
    /// Creates a new render job with default settings
    pub fn new(url: String) -> Self {
        Self {
            job_id: uuid::Uuid::new_v4().to_string(),
            url,
            timeout_ms: 30000, // 30 seconds default
            wait: RenderWait::DomContentLoaded,
        }
    }
    
    /// Creates a render job with custom timeout
    pub fn with_timeout(url: String, timeout_ms: u64) -> Self {
        Self {
            job_id: uuid::Uuid::new_v4().to_string(),
            url,
            timeout_ms,
            wait: RenderWait::DomContentLoaded,
        }
    }
    
    /// Sets the wait condition
    pub fn with_wait(mut self, wait: RenderWait) -> Self {
        self.wait = wait;
        self
    }
}

// ============================================================================
// RenderWait - Wait condition for page rendering
// ============================================================================

/// Wait condition before extracting content from rendered page
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RenderWait {
    /// Wait for DOMContentLoaded event (fast, works for most pages)
    DomContentLoaded,
    
    /// Wait for full page load including images and stylesheets
    Load,
    
    /// Wait for network to be idle for specified milliseconds
    NetworkIdle {
        /// Milliseconds of network idle time to wait for
        idle_ms: u64,
    },
    
    /// Wait for a specific CSS selector to appear
    Selector {
        /// CSS selector to wait for
        css: String,
    },
}

impl Default for RenderWait {
    fn default() -> Self {
        RenderWait::DomContentLoaded
    }
}

// ============================================================================
// RenderResult - Result from WebView rendering
// ============================================================================

/// Result from WebView rendering operation
/// 
/// This struct is returned from the Tauri frontend to the backend
/// after successfully rendering a page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderResult {
    /// Job ID matching the original RenderJob
    pub job_id: String,
    
    /// Final URL after redirects
    pub final_url: String,
    
    /// Page title from document.title
    pub title: String,
    
    /// Rendered HTML from document.documentElement.outerHTML
    pub html: String,
    
    /// Time elapsed for rendering (milliseconds)
    pub elapsed_ms: u64,
}

// ============================================================================
// ContentExtractionError - Error types for content extraction
// ============================================================================

/// Error types for content extraction operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentExtractionError {
    /// SSRF (Server-Side Request Forgery) violation detected
    SsrfViolation {
        /// URL that violated SSRF rules
        url: String,
        /// Reason for blocking
        reason: String,
    },
    
    /// Fetch operation timed out
    FetchTimeout {
        /// URL that timed out
        url: String,
        /// Timeout duration in milliseconds
        timeout_ms: u64,
    },
    
    /// Downloaded content exceeded size limit
    SizeLimitExceeded {
        /// URL that exceeded limit
        url: String,
        /// Size in megabytes
        size_mb: f32,
    },
    
    /// HTTP error response
    HttpError {
        /// URL that returned error
        url: String,
        /// HTTP status code
        status: u16,
    },
    
    /// Content extraction failed
    ExtractionFailed {
        /// URL where extraction failed
        url: String,
        /// Reason for failure
        reason: String,
    },
    
    /// WebView rendering timed out
    RenderTimeout {
        /// URL that timed out during rendering
        url: String,
        /// Timeout duration in milliseconds
        timeout_ms: u64,
    },
    
    /// WebView rendering failed
    RenderFailed {
        /// URL where rendering failed
        url: String,
        /// Reason for failure
        reason: String,
    },
    
    /// Invalid URL provided
    InvalidUrl {
        /// Invalid URL string
        url: String,
    },
}

impl fmt::Display for ContentExtractionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ContentExtractionError::SsrfViolation { url, reason } => {
                write!(f, "SSRF violation for URL '{}': {}", url, reason)
            }
            ContentExtractionError::FetchTimeout { url, timeout_ms } => {
                write!(f, "Fetch timeout for URL '{}' after {}ms", url, timeout_ms)
            }
            ContentExtractionError::SizeLimitExceeded { url, size_mb } => {
                write!(f, "Size limit exceeded for URL '{}': {:.2}MB", url, size_mb)
            }
            ContentExtractionError::HttpError { url, status } => {
                write!(f, "HTTP error {} for URL '{}'", status, url)
            }
            ContentExtractionError::ExtractionFailed { url, reason } => {
                write!(f, "Extraction failed for URL '{}': {}", url, reason)
            }
            ContentExtractionError::RenderTimeout { url, timeout_ms } => {
                write!(f, "Render timeout for URL '{}' after {}ms", url, timeout_ms)
            }
            ContentExtractionError::RenderFailed { url, reason } => {
                write!(f, "Render failed for URL '{}': {}", url, reason)
            }
            ContentExtractionError::InvalidUrl { url } => {
                write!(f, "Invalid URL: '{}'", url)
            }
        }
    }
}

impl std::error::Error for ContentExtractionError {}

// Conversion to AppError for integration with existing error handling
impl From<ContentExtractionError> for crate::error::AppError {
    fn from(err: ContentExtractionError) -> Self {
        crate::error::AppError::Internal(err.to_string())
    }
}

// ============================================================================
// SearchGatherResponse - Response for search + gather operations
// ============================================================================

/// Web search result
/// This is a simplified version for use in content extraction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_date: Option<String>,
    pub relevance_score: f32,
}

/// Response for search and gather operations
/// 
/// This struct contains both the original search results and the gathered
/// page content from the top N results. Each PageExtract maintains its
/// source URL for proper citation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchGatherResponse {
    /// Original search query
    pub query: String,
    
    /// Search results from the search engine
    pub search_results: Vec<WebSearchResult>,
    
    /// Gathered page content from top N results
    /// Each PageExtract includes its source URL in the final_url field
    pub gathered_pages: Vec<PageExtract>,
    
    /// Time taken for the search operation (milliseconds)
    pub total_search_time_ms: u64,
    
    /// Time taken for gathering content (milliseconds)
    pub total_gather_time_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_page_extract_creation() {
        let extract = PageExtract::new(
            "This is test content with multiple words.".to_string(),
            "https://example.com".to_string(),
            0.85,
            ExtractionMethod::DensityHeuristic,
        );
        
        assert_eq!(extract.word_count, 6);
        assert_eq!(extract.confidence, 0.85);
        assert_eq!(extract.final_url, "https://example.com");
        assert_eq!(extract.extraction_method, ExtractionMethod::DensityHeuristic);
    }

    #[test]
    fn test_render_job_creation() {
        let job = RenderJob::new("https://example.com".to_string());
        
        assert_eq!(job.url, "https://example.com");
        assert_eq!(job.timeout_ms, 30000);
        assert!(matches!(job.wait, RenderWait::DomContentLoaded));
        assert!(!job.job_id.is_empty());
    }

    #[test]
    fn test_render_job_with_custom_settings() {
        let job = RenderJob::with_timeout("https://example.com".to_string(), 15000)
            .with_wait(RenderWait::Selector {
                css: ".content".to_string(),
            });
        
        assert_eq!(job.timeout_ms, 15000);
        assert!(matches!(job.wait, RenderWait::Selector { .. }));
    }

    #[test]
    fn test_extraction_method_display() {
        assert_eq!(ExtractionMethod::DensityHeuristic.to_string(), "density_heuristic");
        assert_eq!(ExtractionMethod::ReadabilityAlgorithm.to_string(), "readability_algorithm");
        assert_eq!(ExtractionMethod::BrowserRender.to_string(), "browser_render");
        assert_eq!(ExtractionMethod::Fallback.to_string(), "fallback");
    }

    #[test]
    fn test_content_extraction_error_display() {
        let error = ContentExtractionError::SsrfViolation {
            url: "http://localhost".to_string(),
            reason: "Private IP address".to_string(),
        };
        
        assert!(error.to_string().contains("SSRF violation"));
        assert!(error.to_string().contains("localhost"));
    }

    #[test]
    fn test_metadata_default() {
        let metadata = Metadata::default();
        
        assert!(metadata.title.is_none());
        assert!(metadata.author.is_none());
        assert!(metadata.images.is_empty());
    }
}
