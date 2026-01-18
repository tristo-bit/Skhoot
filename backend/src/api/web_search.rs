use axum::{
    extract::{Query, State},
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use scraper::{Html, Selector};
use std::collections::HashMap;

use crate::error::AppError;

/// API endpoints for web search functionality
pub fn web_search_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/search/web", get(web_search))
}

/// Query parameters for web search
#[derive(Debug, Deserialize)]
pub struct WebSearchQuery {
    pub q: String,                      // Search query
    pub num_results: Option<usize>,     // Number of results (default: 5, max: 10)
    pub search_type: Option<String>,    // Type: general, news, docs
}

/// Web search result
#[derive(Debug, Clone, Serialize)]
pub struct WebSearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    pub published_date: Option<String>,
    pub relevance_score: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

/// Web search response
#[derive(Debug, Serialize)]
pub struct WebSearchResponse {
    pub query: String,
    pub results: Vec<WebSearchResult>,
    pub total_results: usize,
    pub search_time_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<ImageResult>>,
}

/// Image search result
#[derive(Debug, Clone, Serialize)]
pub struct ImageResult {
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub title: Option<String>,
    pub source_url: Option<String>,
}

/// Web search endpoint using lightweight HTTP scraping
/// 
/// This implementation:
/// - Uses DuckDuckGo HTML scraping (no API key, unlimited)
/// - Falls back to SearXNG public instances if needed
/// - No browser required - just HTTP + HTML parsing
/// - Lightweight and fast (~500ms per search)
pub async fn web_search(
    Query(params): Query<WebSearchQuery>,
    State(_state): State<crate::AppState>,
) -> Result<Json<WebSearchResponse>, AppError> {
    let start_time = std::time::Instant::now();
    
    let num_results = params.num_results.unwrap_or(5).min(10);
    let search_type = params.search_type.as_deref().unwrap_or("general");
    
    tracing::info!(
        "Web search request - query: '{}', type: {}, num_results: {}",
        params.q,
        search_type,
        num_results
    );
    
    // Try DuckDuckGo first (fast, free, unlimited)
    let results = match search_duckduckgo(&params.q, num_results).await {
        Ok(results) => {
            tracing::info!("Search completed using DuckDuckGo");
            results
        }
        Err(e) => {
            tracing::warn!("DuckDuckGo failed: {}. Falling back to SearXNG...", e);
            // Fallback to SearXNG public instances
            search_searxng_fallback(&params.q, num_results).await?
        }
    };
    
    // Also search for images (up to 6 for display)
    let images = match search_duckduckgo_images(&params.q, 6).await {
        Ok(imgs) => {
            tracing::info!("Found {} images", imgs.len());
            if imgs.is_empty() { None } else { Some(imgs) }
        }
        Err(e) => {
            tracing::debug!("Image search failed: {}", e);
            None
        }
    };
    
    let search_time_ms = start_time.elapsed().as_millis() as u64;
    
    let response = WebSearchResponse {
        query: params.q.clone(),
        results: results.clone(),
        total_results: results.len(),
        search_time_ms,
        images,
    };
    
    Ok(Json(response))
}

// ============================================================================
// DuckDuckGo HTTP Scraping Implementation (Production)
// ============================================================================

/// Search DuckDuckGo using lightweight HTTP scraping
/// Based on the websearch SDK approach - no browser needed!
/// 
/// This approach:
/// - Uses simple HTTP POST with form data
/// - Parses HTML with scraper crate
/// - No API key required
/// - Unlimited searches
/// - Fast (~500ms)
/// - Lightweight (~10MB memory)
async fn search_duckduckgo(query: &str, num_results: usize) -> Result<Vec<WebSearchResult>, AppError> {
    // Prepare form data
    let mut form_data = HashMap::new();
    form_data.insert("q", query);
    form_data.insert("b", ""); // Start index
    form_data.insert("kl", "wt-wt"); // Region: worldwide
    
    // Create HTTP client with proper headers
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;
    
    tracing::debug!("Sending DuckDuckGo search request for: {}", query);
    
    // Send POST request to DuckDuckGo HTML endpoint
    let response = client
        .post("https://html.duckduckgo.com/html")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .header("Referer", "https://html.duckduckgo.com/")
        .form(&form_data)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("DuckDuckGo request failed: {}", e)))?;
    
    if !response.status().is_success() {
        return Err(AppError::Internal(format!(
            "DuckDuckGo returned status: {}",
            response.status()
        )));
    }
    
    let html = response
        .text()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to read DuckDuckGo response: {}", e)))?;
    
    tracing::debug!("Received DuckDuckGo HTML response (length: {})", html.len());
    
    // Parse HTML and extract results
    parse_duckduckgo_html(&html, num_results)
}

/// Parse DuckDuckGo HTML results using CSS selectors
fn parse_duckduckgo_html(html: &str, num_results: usize) -> Result<Vec<WebSearchResult>, AppError> {
    let document = Html::parse_document(html);
    
    // CSS selectors for DuckDuckGo HTML structure
    let result_selector = Selector::parse("h2.result__title a")
        .map_err(|e| AppError::Internal(format!("Invalid CSS selector: {:?}", e)))?;
    
    let snippet_selector = Selector::parse(".result__snippet")
        .map_err(|e| AppError::Internal(format!("Invalid CSS selector: {:?}", e)))?;
    
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
            let url = normalize_url(href);
            
            // Extract title from link text
            let title = normalize_text(&link_element.inner_html());
            
            // Get corresponding snippet
            let snippet = result_snippets
                .get(i)
                .map(|snippet_elem| normalize_text(&snippet_elem.inner_html()));
            
            // Only add if we have valid title and URL
            if !title.is_empty() && !url.is_empty() {
                results.push(WebSearchResult {
                    title,
                    url,
                    snippet: snippet.unwrap_or_default(),
                    published_date: None,
                    relevance_score: 0.95 - (i as f32 * 0.05),
                    image_url: None,
                });
            }
        }
    }
    
    if results.is_empty() {
        return Err(AppError::Internal(
            "No search results found. DuckDuckGo may have changed their HTML structure.".to_string()
        ));
    }
    
    Ok(results)
}

/// Normalize URL by removing tracking parameters and cleaning up
fn normalize_url(url: &str) -> String {
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
fn normalize_text(text: &str) -> String {
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

// ============================================================================
// SearXNG Fallback Implementation
// ============================================================================

/// Fallback to public SearXNG instances when browser is unavailable
/// SearXNG is a free metasearch engine that aggregates results from multiple sources
async fn search_searxng_fallback(query: &str, num_results: usize) -> Result<Vec<WebSearchResult>, AppError> {
    // List of reliable public SearXNG instances
    let instances = [
        "https://searx.be",
        "https://search.bus-hit.me",
        "https://searx.tiekoetter.com",
        "https://search.sapti.me",
        "https://searx.work",
    ];
    
    let mut last_error = None;
    
    // Try each instance until one works
    for instance in instances.iter() {
        match search_searxng_instance(instance, query, num_results).await {
            Ok(results) => {
                tracing::info!("Search completed using SearXNG instance: {}", instance);
                return Ok(results);
            }
            Err(e) => {
                tracing::debug!("SearXNG instance {} failed: {}", instance, e);
                last_error = Some(e);
                continue;
            }
        }
    }
    
    Err(last_error.unwrap_or_else(|| 
        AppError::Internal("All SearXNG instances failed".to_string())
    ))
}

/// Query a specific SearXNG instance
async fn search_searxng_instance(
    instance: &str,
    query: &str,
    num_results: usize,
) -> Result<Vec<WebSearchResult>, AppError> {
    let url = format!(
        "{}/search?q={}&format=json&pageno=1",
        instance,
        urlencoding::encode(query)
    );
    
    // Set timeout to avoid hanging on slow instances
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;
    
    let response = client
        .get(&url)
        .header("User-Agent", "Skhoot/0.1.3 (Desktop App)")
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("SearXNG request failed: {}", e)))?;
    
    if !response.status().is_success() {
        return Err(AppError::Internal(format!(
            "SearXNG returned status: {}",
            response.status()
        )));
    }
    
    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse SearXNG response: {}", e)))?;
    
    parse_searxng_results(&data, num_results)
}

/// Parse SearXNG JSON response
fn parse_searxng_results(data: &serde_json::Value, num_results: usize) -> Result<Vec<WebSearchResult>, AppError> {
    let results_array = data["results"]
        .as_array()
        .ok_or_else(|| AppError::Internal("No results array in SearXNG response".to_string()))?;
    
    let mut results = Vec::new();
    
    for (i, result) in results_array.iter().take(num_results).enumerate() {
        let title = result["title"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        let url = result["url"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        let content = result["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        // Only add if we have at least title and URL
        if !title.is_empty() && !url.is_empty() {
            results.push(WebSearchResult {
                title,
                url,
                snippet: content,
                published_date: result["publishedDate"]
                    .as_str()
                    .map(|s| s.to_string()),
                relevance_score: 0.95 - (i as f32 * 0.05),
                image_url: None,
            });
        }
    }
    
    if results.is_empty() {
        return Err(AppError::Internal("No valid results found in SearXNG response".to_string()));
    }
    
    Ok(results)
}

// ============================================================================
// DuckDuckGo Image Search Implementation
// ============================================================================

/// Search DuckDuckGo for images
async fn search_duckduckgo_images(query: &str, num_results: usize) -> Result<Vec<ImageResult>, AppError> {
    let url = format!(
        "https://duckduckgo.com/i.js?q={}&o=json&p=1&s=0&u=bing&f=,,,&l=us-en",
        urlencoding::encode(query)
    );
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;
    
    tracing::debug!("Sending DuckDuckGo image search request for: {}", query);
    
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .header("Referer", "https://duckduckgo.com/")
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("DuckDuckGo image request failed: {}", e)))?;
    
    if !response.status().is_success() {
        return Err(AppError::Internal(format!(
            "DuckDuckGo images returned status: {}",
            response.status()
        )));
    }
    
    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse DuckDuckGo image response: {}", e)))?;
    
    parse_duckduckgo_images(&data, num_results)
}

/// Parse DuckDuckGo image JSON response
fn parse_duckduckgo_images(data: &serde_json::Value, num_results: usize) -> Result<Vec<ImageResult>, AppError> {
    let results_array = data["results"]
        .as_array()
        .ok_or_else(|| AppError::Internal("No results array in DuckDuckGo image response".to_string()))?;
    
    let mut images = Vec::new();
    
    for result in results_array.iter().take(num_results) {
        let image_url = result["image"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        let thumbnail_url = result["thumbnail"]
            .as_str()
            .map(|s| s.to_string());
        
        let title = result["title"]
            .as_str()
            .map(|s| s.to_string());
        
        let source_url = result["url"]
            .as_str()
            .map(|s| s.to_string());
        
        // Only add if we have a valid image URL
        if !image_url.is_empty() {
            images.push(ImageResult {
                url: image_url,
                thumbnail_url,
                title,
                source_url,
            });
        }
    }
    
    Ok(images)
}
