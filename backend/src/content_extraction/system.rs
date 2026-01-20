// Content Extraction System Orchestrator
// Orchestrates the complete extraction pipeline from URL to PageExtract

use std::time::Instant;
use url::Url;

use crate::content_extraction::{
    SsrfValidator, HttpFetcher, MetadataExtractor, MainContentExtractor,
    CacheManager, PageExtract, ContentExtractionError, TauriBridge,
    RenderJob, RenderWait,
};

/// Content Extraction System
/// 
/// Orchestrates the complete content extraction pipeline:
/// 1. Cache check
/// 2. SSRF validation
/// 3. HTTP fetch
/// 4. Metadata extraction
/// 5. Content extraction
/// 6. Confidence scoring
/// 7. Optional WebView rendering for low-confidence pages
/// 8. Cache storage
pub struct ContentExtractionSystem {
    ssrf_validator: SsrfValidator,
    http_fetcher: HttpFetcher,
    metadata_extractor: MetadataExtractor,
    content_extractor: MainContentExtractor,
    cache_manager: CacheManager,
    tauri_bridge: Option<TauriBridge>,
}

impl ContentExtractionSystem {
    /// Creates a new ContentExtractionSystem with default settings
    pub fn new() -> Self {
        Self {
            ssrf_validator: SsrfValidator,
            http_fetcher: HttpFetcher::new().expect("Failed to create HTTP fetcher"),
            metadata_extractor: MetadataExtractor,
            content_extractor: MainContentExtractor,
            cache_manager: CacheManager::new(),
            tauri_bridge: TauriBridge::new(None).ok(),
        }
    }

    /// Creates a ContentExtractionSystem with custom cache settings
    pub fn with_cache_settings(
        max_cache_size_bytes: usize,
        cache_ttl_secs: u64,
    ) -> Self {
        Self {
            ssrf_validator: SsrfValidator,
            http_fetcher: HttpFetcher::new().expect("Failed to create HTTP fetcher"),
            metadata_extractor: MetadataExtractor,
            content_extractor: MainContentExtractor,
            cache_manager: CacheManager::with_settings(
                max_cache_size_bytes,
                std::time::Duration::from_secs(cache_ttl_secs),
            ),
            tauri_bridge: TauriBridge::new(None).ok(),
        }
    }
    
    /// Creates a ContentExtractionSystem with custom Tauri URL
    pub fn with_tauri_url(tauri_url: String) -> Self {
        Self {
            ssrf_validator: SsrfValidator,
            http_fetcher: HttpFetcher::new().expect("Failed to create HTTP fetcher"),
            metadata_extractor: MetadataExtractor,
            content_extractor: MainContentExtractor,
            cache_manager: CacheManager::new(),
            tauri_bridge: TauriBridge::new(Some(tauri_url)).ok(),
        }
    }

    /// Browses a single URL and extracts content
    /// 
    /// This method:
    /// 1. Checks cache first
    /// 2. Validates URL with SSRF validator
    /// 3. Fetches HTML with HTTP fetcher
    /// 4. Extracts metadata and content
    /// 5. Calculates confidence score
    /// 6. If confidence < 0.5 and render enabled, marks for WebView rendering
    /// 7. Caches and returns PageExtract
    /// 
    /// Error handling with graceful degradation:
    /// - SSRF violations: return security error (no fallback)
    /// - Fetch timeouts: return timeout error (no fallback)
    /// - HTTP errors: return status error (no fallback)
    /// - Extraction failures: return raw HTML with confidence 0.0 (graceful degradation)
    /// 
    /// # Arguments
    /// 
    /// * `url` - The URL to browse and extract content from
    /// * `render` - Whether to enable WebView rendering for low-confidence pages
    /// 
    /// # Returns
    /// 
    /// Returns a `PageExtract` with all extracted content and metadata
    pub async fn browse(
        &mut self,
        url: &str,
        render: bool,
    ) -> Result<PageExtract, ContentExtractionError> {
        let total_start = Instant::now();

        // Step 1: Check cache first
        if let Some(cached) = self.cache_manager.get(url) {
            tracing::debug!("Cache hit for URL: {}", url);
            return Ok(cached);
        }

        // Step 2: Parse and validate URL
        let parsed_url = Url::parse(url).map_err(|_| ContentExtractionError::InvalidUrl {
            url: url.to_string(),
        })?;

        // Step 3: Validate URL with SSRF validator (no fallback - security critical)
        SsrfValidator::validate_url(&parsed_url)
            .await
            .map_err(|e| match e {
                ContentExtractionError::SsrfViolation { url, reason } => {
                    tracing::warn!("SSRF violation for URL {}: {}", url, reason);
                    ContentExtractionError::SsrfViolation { url, reason }
                }
                ContentExtractionError::InvalidUrl { url } => {
                    tracing::warn!("Invalid URL: {}", url);
                    ContentExtractionError::InvalidUrl { url }
                }
                _ => ContentExtractionError::SsrfViolation {
                    url: url.to_string(),
                    reason: e.to_string(),
                },
            })?;

        // Step 4: Fetch HTML with HTTP fetcher (errors propagate - no fallback)
        let fetch_result = self.http_fetcher.fetch(&parsed_url).await.map_err(|e| {
            match &e {
                ContentExtractionError::FetchTimeout { url, timeout_ms } => {
                    tracing::warn!("Fetch timeout for URL {} after {}ms", url, timeout_ms);
                }
                ContentExtractionError::HttpError { url, status } => {
                    tracing::warn!("HTTP error {} for URL {}", status, url);
                }
                ContentExtractionError::SizeLimitExceeded { url, size_mb } => {
                    tracing::warn!("Size limit exceeded for URL {}: {:.2}MB", url, size_mb);
                }
                _ => {
                    tracing::warn!("Fetch error for URL {}: {:?}", url, e);
                }
            }
            e
        })?;

        // Step 5: Extract metadata (graceful degradation - continue on failure)
        let metadata = MetadataExtractor::extract(&fetch_result.html);

        // Step 6: Extract main content (graceful degradation - use raw HTML on failure)
        let content_extraction = MainContentExtractor::extract(&fetch_result.html);
        
        // If extraction produced no text, fall back to raw HTML
        let (final_text, final_confidence, final_method) = if content_extraction.text.is_empty() {
            tracing::warn!(
                "Content extraction produced no text for URL {}. Falling back to raw HTML.",
                url
            );
            // Return first 10000 chars of raw HTML as fallback
            let raw_text = fetch_result.html.chars().take(10000).collect::<String>();
            (raw_text, 0.0, crate::content_extraction::ExtractionMethod::Fallback)
        } else {
            (content_extraction.text, content_extraction.confidence, content_extraction.method)
        };

        // Step 7: Check for low confidence and trigger rendering if needed
        let (final_text, final_confidence, final_method, final_extraction_time) = 
            if final_confidence < 0.5 && render {
                tracing::info!(
                    "Low confidence ({:.2}) detected for URL: {}. Attempting WebView rendering...",
                    final_confidence,
                    url
                );
                
                // Attempt WebView rendering
                match self.render_if_needed(url, &fetch_result.html).await {
                    Ok((rendered_html, render_time_ms)) => {
                        tracing::info!(
                            "WebView rendering completed in {}ms. Re-extracting content...",
                            render_time_ms
                        );
                        
                        // Re-extract metadata and content from rendered HTML
                        let _rendered_metadata = MetadataExtractor::extract(&rendered_html);
                        let rendered_extraction = MainContentExtractor::extract(&rendered_html);
                        
                        // Check if rendered extraction is better
                        if rendered_extraction.confidence > final_confidence {
                            tracing::info!(
                                "Rendered extraction improved confidence: {:.2} -> {:.2}",
                                final_confidence,
                                rendered_extraction.confidence
                            );
                            
                            // Use rendered content
                            (
                                rendered_extraction.text,
                                rendered_extraction.confidence,
                                crate::content_extraction::ExtractionMethod::BrowserRender,
                                rendered_extraction.extraction_time_ms + render_time_ms,
                            )
                        } else {
                            tracing::warn!(
                                "Rendered extraction did not improve confidence: {:.2} vs {:.2}. Using HTTP extraction.",
                                rendered_extraction.confidence,
                                final_confidence
                            );
                            // Keep HTTP extraction
                            (final_text, final_confidence, final_method, content_extraction.extraction_time_ms)
                        }
                    }
                    Err(e) => {
                        // Rendering failed, fall back to HTTP extraction (handled in subtask 16.3)
                        tracing::warn!(
                            "WebView rendering failed for URL {}: {}. Falling back to HTTP extraction.",
                            url,
                            e
                        );
                        (final_text, final_confidence, final_method, content_extraction.extraction_time_ms)
                    }
                }
            } else {
                (final_text, final_confidence, final_method, content_extraction.extraction_time_ms)
            };

        // Step 8: Build PageExtract
        let page_extract = PageExtract {
            text: final_text,
            word_count: content_extraction.word_count,
            final_url: fetch_result.final_url.clone(),
            title: metadata.title,
            description: metadata.description,
            author: metadata.author,
            published_date: metadata.published_date,
            canonical_url: metadata.canonical_url,
            primary_image: metadata.primary_image,
            images: metadata.images,
            links: Vec::new(), // TODO: Extract links from content
            confidence: final_confidence,
            extraction_method: final_method,
            fetch_time_ms: fetch_result.fetch_time_ms,
            extraction_time_ms: final_extraction_time,
            total_time_ms: total_start.elapsed().as_millis() as u64,
            status: fetch_result.status,
            content_type: fetch_result.content_type,
        };

        // Step 9: Cache the result (only if successful and not needing render)
        // Don't cache low-confidence results that would benefit from rendering
        if page_extract.confidence >= 0.3 {
            self.cache_manager.put(url, page_extract.clone());
        }

        Ok(page_extract)
    }
    
    /// Renders a page using WebView if needed (low confidence)
    /// 
    /// This method:
    /// 1. Checks if Tauri bridge is available
    /// 2. Creates a RenderJob
    /// 3. Sends job to Tauri frontend
    /// 4. Waits for RenderResult
    /// 5. Returns rendered HTML
    /// 
    /// # Arguments
    /// * `url` - The URL to render
    /// * `original_html` - The original HTML (for fallback)
    /// 
    /// # Returns
    /// * `Ok((rendered_html, render_time_ms))` - Successfully rendered HTML and time taken
    /// * `Err(ContentExtractionError)` - Rendering failed
    async fn render_if_needed(
        &self,
        url: &str,
        _original_html: &str,
    ) -> Result<(String, u64), ContentExtractionError> {
        // Check if Tauri bridge is available
        let bridge = self.tauri_bridge.as_ref().ok_or_else(|| {
            ContentExtractionError::RenderFailed {
                url: url.to_string(),
                reason: "Tauri bridge not available".to_string(),
            }
        })?;
        
        // Check if Tauri is reachable
        if !bridge.is_available().await {
            return Err(ContentExtractionError::RenderFailed {
                url: url.to_string(),
                reason: "Tauri frontend not reachable".to_string(),
            });
        }
        
        // Create render job
        let job = RenderJob::new(url.to_string())
            .with_wait(RenderWait::DomContentLoaded);
        
        tracing::debug!(
            "Created render job: job_id={}, url={}, timeout={}ms",
            job.job_id,
            job.url,
            job.timeout_ms
        );
        
        // Send to Tauri for rendering
        let result = bridge.render_page(job).await?;
        
        tracing::info!(
            "Render completed: job_id={}, final_url={}, elapsed={}ms",
            result.job_id,
            result.final_url,
            result.elapsed_ms
        );
        
        Ok((result.html, result.elapsed_ms))
    }

    /// Searches and gathers content from top results
    /// 
    /// This method:
    /// 1. Calls existing web_search() to get search results
    /// 2. Extracts top N URLs (max 5)
    /// 3. Concurrently fetches and extracts content from each URL (max 3 concurrent)
    /// 4. Collects successful PageExtracts
    /// 5. Returns SearchGatherResponse with both search results and gathered content
    /// 
    /// Resilience:
    /// - Continues on individual URL failures
    /// - Logs failures but doesn't abort entire operation
    /// - Returns partial results if some URLs fail
    /// 
    /// # Arguments
    /// 
    /// * `query` - The search query
    /// * `num_results` - Number of search results to return
    /// * `gather_top` - Number of top results to gather content from (max 5)
    /// 
    /// # Returns
    /// 
    /// Returns a `SearchGatherResponse` with search results and gathered page content
    pub async fn search_and_gather(
        &mut self,
        query: &str,
        num_results: usize,
        gather_top: usize,
    ) -> Result<crate::content_extraction::SearchGatherResponse, ContentExtractionError> {
        use tokio::sync::Semaphore;
        use std::sync::Arc;
        
        let _total_start = Instant::now();
        
        // Step 1: Call existing web_search() to get search results (now with racing!)
        let search_start = Instant::now();
        
        let search_results = self.perform_search(query, num_results).await?;
        
        let search_time_ms = search_start.elapsed().as_millis() as u64;
        
        tracing::info!(
            "🔍 Search completed for query '{}': {} results in {}ms",
            query,
            search_results.len(),
            search_time_ms
        );
        
        // Step 2: Extract top N URLs (max 5)
        let gather_limit = gather_top.min(5);
        let urls_to_gather: Vec<String> = search_results
            .iter()
            .take(gather_limit)
            .map(|result| result.url.clone())
            .collect();
        
        tracing::info!(
            "📥 Gathering content from {} URLs concurrently (max: 5)",
            urls_to_gather.len()
        );
        
        // Step 3: Concurrent gathering with higher parallelism (5 concurrent instead of 3)
        let gather_start = Instant::now();
        let semaphore = Arc::new(Semaphore::new(5)); // Increased from 3 to 5 for faster gathering
        
        let mut tasks = Vec::new();
        
        for url in urls_to_gather {
            let semaphore = Arc::clone(&semaphore);
            let url_clone = url.clone();
            
            // Spawn a task for each URL on the tokio runtime (uses all cores)
            let task = tokio::spawn(async move {
                // Acquire semaphore permit
                let _permit = semaphore.acquire().await.unwrap();
                
                tracing::debug!("📄 Gathering content from: {}", url_clone);
                
                // Create a new ContentExtractionSystem for this task
                // (since we can't share &mut across tasks)
                let mut system = ContentExtractionSystem::new();
                
                // Browse the URL (with render disabled initially for speed)
                match system.browse(&url_clone, false).await {
                    Ok(page_extract) => {
                        tracing::info!(
                            "✅ Gathered from {}: {} words, confidence: {:.2}",
                            url_clone,
                            page_extract.word_count,
                            page_extract.confidence
                        );
                        Some(page_extract)
                    }
                    Err(e) => {
                        // Step 4: Implement gathering resilience
                        // Log failure but continue with other URLs
                        tracing::warn!(
                            "❌ Failed to gather from {}: {}",
                            url_clone,
                            e
                        );
                        None
                    }
                }
            });
            
            tasks.push(task);
        }
        
        // Collect results as they complete (parallel join)
        let results = futures::future::join_all(tasks).await;
        
        let mut gathered_pages = Vec::new();
        
        for result in results {
            match result {
                Ok(Some(page_extract)) => {
                    gathered_pages.push(page_extract);
                }
                Ok(None) => {
                    // URL failed, already logged
                }
                Err(e) => {
                    tracing::error!("Task join error: {}", e);
                }
            }
        }
        
        let gather_time_ms = gather_start.elapsed().as_millis() as u64;
        
        tracing::info!(
            "Gathering completed: {}/{} URLs successful in {}ms",
            gathered_pages.len(),
            gather_limit,
            gather_time_ms
        );
        
        // Step 5: Return SearchGatherResponse
        Ok(crate::content_extraction::SearchGatherResponse {
            query: query.to_string(),
            search_results,
            gathered_pages,
            total_search_time_ms: search_time_ms,
            total_gather_time_ms: gather_time_ms,
        })
    }
    
    /// Internal helper to perform web search
    /// Races WebView and HTTP implementations for maximum speed and reliability
    async fn perform_search(
        &self,
        query: &str,
        num_results: usize,
    ) -> Result<Vec<crate::content_extraction::WebSearchResult>, ContentExtractionError> {
        // Check if WebView is available
        let webview_available = if let Some(ref tauri_bridge) = self.tauri_bridge {
            tauri_bridge.is_available().await
        } else {
            false
        };
        
        if webview_available {
            tracing::info!("🌐 Initiating parallel search (WebView + HTTP) for speed...");
            
            // Create the two futures
            // We Box::pin them to create a common type for the vector
            let webview_fut = Box::pin(self.perform_webview_search(query, num_results));
            let http_fut = Box::pin(self.perform_http_search(query, num_results));
            
            // Define the type explicitly to satisfy the compiler
            type SearchFuture = std::pin::Pin<Box<dyn std::future::Future<Output = Result<Vec<crate::content_extraction::WebSearchResult>, ContentExtractionError>> + Send>>;
            
            let tasks: Vec<SearchFuture> = vec![
                webview_fut,
                http_fut,
            ];
            
            // Race them using select_ok
            // This returns the first SUCCESSFUL result, or the last error if both fail
            match futures::future::select_ok(tasks).await {
                Ok((results, _remaining)) => {
                    tracing::info!("✅ Search succeeded (fastest provider won)");
                    Ok(results)
                },
                Err(e) => {
                    tracing::warn!("❌ Both search providers failed. Last error: {}", e);
                    Err(e)
                }
            }
        } else {
            // WebView not available, fall back to HTTP
            tracing::warn!("⚠️ WebView not available, falling back to HTTP search");
            self.perform_http_search(query, num_results).await
        }
    }
    
    /// Perform HTTP-based search (original implementation)
    async fn perform_http_search(
        &self,
        query: &str,
        num_results: usize,
    ) -> Result<Vec<crate::content_extraction::WebSearchResult>, ContentExtractionError> {
        use std::collections::HashMap;
        
        // Prepare form data
        let mut form_data = HashMap::new();
        form_data.insert("q", query);
        form_data.insert("b", ""); // Start index
        form_data.insert("kl", "wt-wt"); // Region: worldwide
        
        // Create HTTP client with proper headers and longer timeout
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .connect_timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| ContentExtractionError::ExtractionFailed {
                url: format!("search:{}", query),
                reason: format!("Failed to create HTTP client: {}", e),
            })?;
        
        tracing::debug!("Sending DuckDuckGo search request for: {}", query);
        
        // Send POST request to DuckDuckGo HTML endpoint with retry logic
        let mut last_error = None;
        let mut response = None;
        
        for attempt in 1..=2 {
            match client
                .post("https://html.duckduckgo.com/html")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Referer", "https://html.duckduckgo.com/")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9")
                .form(&form_data)
                .send()
                .await
            {
                Ok(resp) => {
                    response = Some(resp);
                    break;
                }
                Err(e) => {
                    tracing::warn!("DuckDuckGo search attempt {} failed: {}", attempt, e);
                    last_error = Some(e);
                    if attempt < 2 {
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    }
                }
            }
        }
        
        let response = response.ok_or_else(|| ContentExtractionError::ExtractionFailed {
            url: format!("search:{}", query),
            reason: format!(
                "DuckDuckGo request failed after 2 attempts: {}",
                last_error.map(|e| e.to_string()).unwrap_or_else(|| "Unknown error".to_string())
            ),
        })?;
        
        if !response.status().is_success() {
            return Err(ContentExtractionError::ExtractionFailed {
                url: format!("search:{}", query),
                reason: format!("DuckDuckGo returned status: {}", response.status()),
            });
        }
        
        let html = response
            .text()
            .await
            .map_err(|e| ContentExtractionError::ExtractionFailed {
                url: format!("search:{}", query),
                reason: format!("Failed to read DuckDuckGo response: {}", e),
            })?;
        
        tracing::debug!("Received DuckDuckGo HTML response (length: {})", html.len());
        
        // Check for CAPTCHA challenge
        if html.contains("anomaly-modal") || html.contains("Select all squares") {
            return Err(ContentExtractionError::ExtractionFailed {
                url: format!("search:{}", query),
                reason: "DuckDuckGo CAPTCHA detected - bot protection triggered".to_string(),
            });
        }
        
        // Parse HTML and extract results
        self.parse_duckduckgo_html(&html, num_results)
    }
    
    /// Perform WebView-based search (fallback when HTTP fails)
    async fn perform_webview_search(
        &self,
        query: &str,
        num_results: usize,
    ) -> Result<Vec<crate::content_extraction::WebSearchResult>, ContentExtractionError> {
        let tauri_bridge = self.tauri_bridge.as_ref().ok_or_else(|| {
            ContentExtractionError::RenderFailed {
                url: format!("search:{}", query),
                reason: "WebView not available".to_string(),
            }
        })?;
        
        // Construct DuckDuckGo search URL (use lite version for better parsing)
        let search_url = format!(
            "https://lite.duckduckgo.com/lite/?q={}",
            urlencoding::encode(query)
        );
        
        tracing::info!("Performing WebView-based search for: {}", query);
        
        // Create render job
        let job = RenderJob {
            job_id: format!("search_{}", uuid::Uuid::new_v4()),
            url: search_url.clone(),
            timeout_ms: 30000, // 30 second timeout
            wait: RenderWait::Load, // Wait for page load (lite version loads fast)
        };
        
        // Render the search page
        let render_result = tauri_bridge.render_page(job).await?;
        
        tracing::debug!(
            "WebView search rendered successfully ({}ms), parsing results...",
            render_result.elapsed_ms
        );
        
        // Parse the rendered HTML (lite version has simpler structure)
        self.parse_duckduckgo_lite_html(&render_result.html, num_results)
    }
    
    /// Parse DuckDuckGo Lite HTML (simpler structure, more reliable)
    fn parse_duckduckgo_lite_html(
        &self,
        html: &str,
        num_results: usize,
    ) -> Result<Vec<crate::content_extraction::WebSearchResult>, ContentExtractionError> {
        use scraper::{Html, Selector, ElementRef};
        
        let document = Html::parse_document(html);
        
        // DuckDuckGo Lite uses simpler table-based structure
        let result_selector = Selector::parse("tr td a[href^='http']")
            .map_err(|e| ContentExtractionError::ExtractionFailed {
                url: "search".to_string(),
                reason: format!("Invalid CSS selector: {:?}", e),
            })?;
        
        let mut results = Vec::new();
        let mut seen_urls = std::collections::HashSet::new();
        
        for link_element in document.select(&result_selector) {
            if results.len() >= num_results {
                break;
            }
            
            if let Some(href) = link_element.value().attr("href") {
                // Skip duplicates
                if seen_urls.contains(href) {
                    continue;
                }
                seen_urls.insert(href.to_string());
                
                let title = link_element.text().collect::<Vec<_>>().join(" ").trim().to_string();
                
                // Get snippet from parent row
                let snippet = link_element
                    .parent()
                    .and_then(|parent| parent.parent())
                    .map(|row| {
                        ElementRef::wrap(row)
                            .map(|elem_ref| {
                                elem_ref.text()
                                    .collect::<Vec<_>>()
                                    .join(" ")
                                    .trim()
                                    .to_string()
                            })
                            .unwrap_or_default()
                    })
                    .unwrap_or_default();
                
                if !title.is_empty() && !href.is_empty() {
                    results.push(crate::content_extraction::WebSearchResult {
                        title,
                        url: href.to_string(),
                        snippet,
                        published_date: None,
                        relevance_score: 0.95 - (results.len() as f32 * 0.05),
                    });
                }
            }
        }
        
        if results.is_empty() {
            return Err(ContentExtractionError::ExtractionFailed {
                url: "search".to_string(),
                reason: "No search results found in WebView-rendered page".to_string(),
            });
        }
        
        tracing::info!("Parsed {} results from WebView search", results.len());
        Ok(results)
    }
    
    /// Parse DuckDuckGo HTML results using CSS selectors
    fn parse_duckduckgo_html(
        &self,
        html: &str,
        num_results: usize,
    ) -> Result<Vec<crate::content_extraction::WebSearchResult>, ContentExtractionError> {
        use scraper::{Html, Selector};
        
        let document = Html::parse_document(html);
        
        // CSS selectors for DuckDuckGo HTML structure
        let result_selector = Selector::parse("h2.result__title a")
            .map_err(|e| ContentExtractionError::ExtractionFailed {
                url: "search".to_string(),
                reason: format!("Invalid CSS selector: {:?}", e),
            })?;
        
        let snippet_selector = Selector::parse(".result__snippet")
            .map_err(|e| ContentExtractionError::ExtractionFailed {
                url: "search".to_string(),
                reason: format!("Invalid CSS selector: {:?}", e),
            })?;
        
        let mut results = Vec::new();
        
        // Collect all result links and snippets
        let result_links: Vec<_> = document.select(&result_selector).collect();
        let result_snippets: Vec<_> = document.select(&snippet_selector).collect();
        
        for (i, link_element) in result_links.iter().enumerate() {
            if results.len() >= num_results {
                break;
            }
            
            // Extract URL from href attribute
            if let Some(href) = link_element.value().attr("href") {
                // Skip DuckDuckGo internal links
                if href.contains("duckduckgo.com") || href.starts_with("/") {
                    continue;
                }
                
                // Normalize URL
                let url = self.normalize_url(href);
                
                // Extract title from link text
                let title = self.normalize_text(&link_element.inner_html());
                
                // Get corresponding snippet
                let snippet = result_snippets
                    .get(i)
                    .map(|snippet_elem| self.normalize_text(&snippet_elem.inner_html()));
                
                // Only add if we have valid title and URL
                if !title.is_empty() && !url.is_empty() {
                    results.push(crate::content_extraction::WebSearchResult {
                        title,
                        url,
                        snippet: snippet.unwrap_or_default(),
                        published_date: None,
                        relevance_score: 0.95 - (i as f32 * 0.05),
                    });
                }
            }
        }
        
        if results.is_empty() {
            return Err(ContentExtractionError::ExtractionFailed {
                url: "search".to_string(),
                reason: "No search results found. DuckDuckGo may have changed their HTML structure.".to_string(),
            });
        }
        
        Ok(results)
    }
    
    /// Normalize URL by removing tracking parameters and cleaning up
    fn normalize_url(&self, url: &str) -> String {
        // Remove DuckDuckGo redirect wrapper if present
        if url.starts_with("//duckduckgo.com/l/?") {
            // Extract the actual URL from uddg parameter
            if let Some(uddg_start) = url.find("uddg=") {
                let uddg_param = &url[uddg_start + 5..];
                if let Some(end) = uddg_param.find('&') {
                    if let Ok(decoded) = urlencoding::decode(&uddg_param[..end]) {
                        return decoded.to_string();
                    }
                } else if let Ok(decoded) = urlencoding::decode(uddg_param) {
                    return decoded.to_string();
                }
            }
        }
        
        url.to_string()
    }
    
    /// Normalize text by removing HTML entities and extra whitespace
    fn normalize_text(&self, text: &str) -> String {
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("<b>", "")
            .replace("</b>", "")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }
}

impl Default for ContentExtractionSystem {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_creation() {
        let _system = ContentExtractionSystem::new();
        // Just verify it can be created
    }

    #[test]
    fn test_system_with_custom_cache() {
        let _system = ContentExtractionSystem::with_cache_settings(
            50 * 1024 * 1024, // 50MB
            30 * 60,          // 30 minutes
        );
        // Just verify it can be created
    }

    #[test]
    fn test_system_default() {
        let _system = ContentExtractionSystem::default();
        // Just verify default works
    }

    #[tokio::test]
    async fn test_browse_invalid_url() {
        let mut system = ContentExtractionSystem::new();
        let result = system.browse("not a valid url", false).await;
        
        assert!(result.is_err());
        match result {
            Err(ContentExtractionError::InvalidUrl { .. }) => {
                // Expected error
            }
            _ => panic!("Expected InvalidUrl error"),
        }
    }

    #[tokio::test]
    async fn test_browse_ssrf_blocked() {
        let mut system = ContentExtractionSystem::new();
        
        // Try to access localhost (should be blocked by SSRF validator)
        let result = system.browse("http://localhost:8080", false).await;
        
        assert!(result.is_err());
        match result {
            Err(ContentExtractionError::SsrfViolation { .. }) => {
                // Expected error
            }
            _ => panic!("Expected SsrfViolation error"),
        }
    }

    #[tokio::test]
    async fn test_browse_private_ip_blocked() {
        let mut system = ContentExtractionSystem::new();
        
        // Try to access private IP (should be blocked by SSRF validator)
        let result = system.browse("http://192.168.1.1", false).await;
        
        assert!(result.is_err());
        match result {
            Err(ContentExtractionError::SsrfViolation { .. }) => {
                // Expected error
            }
            _ => panic!("Expected SsrfViolation error"),
        }
    }

    #[tokio::test]
    async fn test_low_confidence_detection() {
        // This test verifies that low-confidence detection logic is in place
        // The actual rendering will be implemented in task 16
        
        // For now, we just verify the system can be created and the browse method
        // accepts the render parameter
        let mut system = ContentExtractionSystem::new();
        
        // Try with render=true (should not crash, even though rendering not implemented yet)
        let result = system.browse("http://192.168.1.1", true).await;
        
        // Should still fail due to SSRF, but the render parameter is accepted
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_search_and_gather_basic() {
        // This test verifies that search_and_gather method exists and can be called
        // It will fail if DuckDuckGo is unreachable or blocks us, but that's expected
        
        let mut system = ContentExtractionSystem::new();
        
        // Try a simple search with gather
        let result = system.search_and_gather("rust programming", 5, 2).await;
        
        // We don't assert success here because:
        // 1. DuckDuckGo might block automated requests
        // 2. Network might be unavailable
        // 3. This is just a smoke test to verify the method exists
        
        match result {
            Ok(response) => {
                // If it succeeds, verify the structure
                assert_eq!(response.query, "rust programming");
                assert!(!response.search_results.is_empty());
                tracing::info!(
                    "Search and gather succeeded: {} results, {} gathered",
                    response.search_results.len(),
                    response.gathered_pages.len()
                );
            }
            Err(e) => {
                // If it fails, just log it - this is expected in CI/CD environments
                tracing::warn!("Search and gather failed (expected in some environments): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_search_and_gather_respects_limits() {
        // This test verifies that gather_top is limited to max 5
        
        let mut system = ContentExtractionSystem::new();
        
        // Request 10 results but only gather from top 10 (should be capped at 5)
        let result = system.search_and_gather("test query", 10, 10).await;
        
        match result {
            Ok(response) => {
                // Verify that we don't gather more than 5 pages
                assert!(
                    response.gathered_pages.len() <= 5,
                    "Should not gather more than 5 pages, got {}",
                    response.gathered_pages.len()
                );
            }
            Err(e) => {
                // If search fails, that's okay - we're just testing the limit logic
                tracing::warn!("Search failed (expected in some environments): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_error_handling_ssrf_violation() {
        let mut system = ContentExtractionSystem::new();
        
        // Test SSRF violation error
        let result = system.browse("http://127.0.0.1", false).await;
        
        assert!(result.is_err());
        match result.unwrap_err() {
            ContentExtractionError::SsrfViolation { url, reason } => {
                assert!(url.contains("127.0.0.1"));
                assert!(!reason.is_empty());
            }
            _ => panic!("Expected SsrfViolation error"),
        }
    }

    #[tokio::test]
    async fn test_error_handling_invalid_url() {
        let mut system = ContentExtractionSystem::new();
        
        // Test invalid URL error
        let result = system.browse("not-a-valid-url", false).await;
        
        assert!(result.is_err());
        match result.unwrap_err() {
            ContentExtractionError::InvalidUrl { url } => {
                assert_eq!(url, "not-a-valid-url");
            }
            _ => panic!("Expected InvalidUrl error"),
        }
    }
}
