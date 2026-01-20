# Design Document: Web Content Extraction System

## Overview

The Web Content Extraction System enhances the existing web search functionality by adding ChatGPT-style content browsing and extraction capabilities. The system operates as a headless, AI-focused pipeline that fetches web pages, extracts meaningful content, and returns structured data suitable for AI consumption.

The design follows a two-tier architecture:
1. **HTTP-first extraction** (fast, lightweight, works for 80% of pages)
2. **Headless WebView fallback** (handles JavaScript-heavy SPAs and dynamic content)

All operations are invisible to the user - the WebView rendering happens offscreen, and extracted content flows directly to the AI agent for analysis and response generation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent Layer                          │
│  (Consumes structured PageExtract for analysis/response)    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Content Extraction System (Rust)               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ SSRF         │  │ HTTP         │  │ Cache           │  │
│  │ Validator    │──│ Fetcher      │──│ Manager         │  │
│  └──────────────┘  └──────┬───────┘  └─────────────────┘  │
│                            │                                │
│                            ▼                                │
│                   ┌────────────────┐                        │
│                   │ HTML Parser    │                        │
│                   └────────┬───────┘                        │
│                            │                                │
│              ┌─────────────┴─────────────┐                  │
│              ▼                           ▼                  │
│     ┌────────────────┐         ┌────────────────┐          │
│     │ Metadata       │         │ Main Content   │          │
│     │ Extractor      │         │ Extractor      │          │
│     └────────────────┘         └────────┬───────┘          │
│                                         │                   │
│                                         ▼                   │
│                              ┌──────────────────┐           │
│                              │ Confidence       │           │
│                              │ Scorer           │           │
│                              └────────┬─────────┘           │
│                                       │                     │
│                    Low confidence?    │                     │
│                           ┌───────────┴──────────┐          │
│                           ▼                      ▼          │
│                    ┌──────────────┐      ┌──────────────┐  │
│                    │ WebView      │      │ Return       │  │
│                    │ Render Job   │      │ PageExtract  │  │
│                    └──────┬───────┘      └──────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Tauri WebView Renderer (Hidden/Offscreen)         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Native WebView (WKWebView/WebView2/WebKitGTK)       │  │
│  │  - Loads URL headlessly                              │  │
│  │  - Executes JavaScript                               │  │
│  │  - Extracts rendered DOM                             │  │
│  │  - Returns HTML snapshot                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Standard HTTP Extraction:**
```
1. AI requests content → 2. SSRF validation → 3. HTTP fetch
→ 4. Parse HTML → 5. Extract metadata + content
→ 6. Calculate confidence → 7. Return PageExtract to AI
```

**WebView Fallback (Low Confidence):**
```
1-6. (Same as above) → 7. Confidence < 0.5?
→ 8. Create render job → 9. Tauri WebView loads URL headlessly
→ 10. Extract rendered HTML → 11. Re-parse and extract
→ 12. Return enhanced PageExtract to AI
```

**Search + Gather:**
```
1. AI searches → 2. Get top N results → 3. Concurrent fetch (3 at a time)
→ 4. Extract each page → 5. Return search results + PageExtracts
```

## Components and Interfaces

### 1. SSRF Validator

**Purpose:** Prevent Server-Side Request Forgery attacks by validating URLs before fetching.

**Interface:**
```rust
pub struct SsrfValidator;

impl SsrfValidator {
    /// Validates a URL for SSRF safety
    /// Returns Ok(()) if safe, Err with details if blocked
    pub async fn validate_url(url: &Url) -> Result<(), AppError>;
    
    /// Checks if an IP address is public (not private/loopback/etc)
    fn is_public_ip(ip: IpAddr) -> bool;
    
    /// Validates all IPs in a redirect chain
    pub async fn validate_redirect_chain(urls: &[Url]) -> Result<(), AppError>;
}
```

**Validation Rules:**
- Only `http` and `https` schemes allowed
- Block RFC1918 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Block loopback (127.0.0.0/8, ::1)
- Block link-local (169.254.0.0/16, fe80::/10)
- Block multicast and broadcast addresses
- Validate each redirect target in chain

### 2. HTTP Fetcher

**Purpose:** Safely fetch web pages with size and timeout limits.

**Interface:**
```rust
pub struct HttpFetcher {
    client: reqwest::Client,
    max_bytes: usize,      // Default: 10MB
    timeout: Duration,     // Default: 15s
}

impl HttpFetcher {
    pub fn new() -> Self;
    
    /// Fetches a URL with streaming size limit
    pub async fn fetch(&self, url: &Url) -> Result<FetchResult, AppError>;
    
    /// Fetches with custom limits
    pub async fn fetch_with_limits(
        &self,
        url: &Url,
        max_bytes: usize,
        timeout: Duration
    ) -> Result<FetchResult, AppError>;
}

pub struct FetchResult {
    pub final_url: String,
    pub status: u16,
    pub content_type: Option<String>,
    pub html: String,
    pub fetch_time_ms: u64,
}
```

**Features:**
- Streaming download with byte counting
- Abort on size limit exceeded
- Timeout enforcement
- Redirect following with SSRF validation
- Proper User-Agent and Accept headers

### 3. Metadata Extractor

**Purpose:** Extract structured metadata from HTML using multiple sources.

**Interface:**
```rust
pub struct MetadataExtractor;

impl MetadataExtractor {
    /// Extracts all available metadata from HTML
    pub fn extract(html: &str) -> Metadata;
    
    /// Extracts from Open Graph tags
    fn extract_open_graph(document: &Html) -> PartialMetadata;
    
    /// Extracts from JSON-LD structured data
    fn extract_jsonld(document: &Html) -> PartialMetadata;
    
    /// Extracts from standard meta tags
    fn extract_meta_tags(document: &Html) -> PartialMetadata;
    
    /// Merges metadata with priority: OG > JSON-LD > meta tags
    fn merge_with_priority(sources: Vec<PartialMetadata>) -> Metadata;
}

pub struct Metadata {
    pub title: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub published_date: Option<String>,
    pub canonical_url: Option<String>,
    pub primary_image: Option<String>,
    pub images: Vec<String>,
}
```

**Extraction Priority:**
1. Open Graph tags (`og:title`, `og:description`, `og:image`)
2. JSON-LD structured data (`@type: Article`, `datePublished`, `author`)
3. Standard meta tags (`name="description"`, `name="author"`)
4. HTML elements (`<title>`, `<link rel="canonical">`)

### 4. Main Content Extractor

**Purpose:** Extract article text while removing boilerplate using readability-style heuristics.

**Interface:**
```rust
pub struct MainContentExtractor;

impl MainContentExtractor {
    /// Extracts main content with confidence scoring
    pub fn extract(html: &str) -> ContentExtraction;
    
    /// Removes boilerplate elements
    fn remove_boilerplate(document: &Html) -> Vec<Element>;
    
    /// Calculates paragraph density for containers
    fn calculate_density(elements: &[Element]) -> HashMap<ElementId, f32>;
    
    /// Selects best content container
    fn select_primary_container(densities: HashMap<ElementId, f32>) -> Option<ElementId>;
    
    /// Extracts text preserving structure
    fn extract_structured_text(container: &Element) -> String;
}

pub struct ContentExtraction {
    pub text: String,
    pub word_count: usize,
    pub confidence: f32,
    pub method: ExtractionMethod,
    pub extraction_time_ms: u64,
}

pub enum ExtractionMethod {
    DensityHeuristic,
    ReadabilityAlgorithm,
    BrowserRender,
    Fallback,
}
```

**Extraction Algorithm:**
1. Parse HTML into DOM
2. Remove boilerplate: `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `<form>`
3. Calculate paragraph density for each container
4. Select container with highest density
5. Extract text from `<p>`, `<h1-h3>`, `<li>` elements
6. Preserve paragraph breaks and heading structure
7. Calculate confidence based on word count and text/HTML ratio

### 5. Confidence Scorer

**Purpose:** Assign quality scores to extracted content to determine if WebView rendering is needed.

**Interface:**
```rust
pub struct ConfidenceScorer;

impl ConfidenceScorer {
    /// Calculates confidence score for extracted content
    pub fn calculate(extraction: &ContentExtraction, html_size: usize) -> f32;
    
    /// Word count based scoring
    fn score_by_word_count(word_count: usize) -> f32;
    
    /// Content-to-HTML ratio scoring
    fn score_by_ratio(text_size: usize, html_size: usize) -> f32;
    
    /// Combined weighted score
    fn combine_scores(word_score: f32, ratio_score: f32) -> f32;
}
```

**Scoring Rules:**
- Word count > 800: confidence >= 0.9
- Word count 300-800: confidence 0.7-0.9
- Word count 120-300: confidence 0.5-0.7
- Word count < 120: confidence < 0.5
- High text/HTML ratio (>0.3): boost confidence by 0.1
- Low text/HTML ratio (<0.1): reduce confidence by 0.1

### 6. WebView Renderer (Tauri)

**Purpose:** Render JavaScript-heavy pages headlessly and extract the resulting DOM.

**Interface:**
```rust
// In Tauri backend (src-tauri/src/webview_renderer.rs)
pub struct WebViewRenderer {
    webview: Option<WebView>,
}

impl WebViewRenderer {
    /// Initializes hidden WebView instance
    pub fn new() -> Self;
    
    /// Renders a URL and extracts HTML
    pub async fn render(&mut self, job: RenderJob) -> Result<RenderResult, AppError>;
    
    /// Waits for page ready condition
    async fn wait_for_ready(&self, wait: RenderWait) -> Result<(), AppError>;
    
    /// Executes JS to extract DOM
    async fn extract_dom(&self) -> Result<String, AppError>;
}

#[derive(Serialize, Deserialize)]
pub struct RenderJob {
    pub job_id: String,
    pub url: String,
    pub timeout_ms: u64,
    pub wait: RenderWait,
}

#[derive(Serialize, Deserialize)]
pub enum RenderWait {
    DomContentLoaded,
    Load,
    NetworkIdle { idle_ms: u64 },
    Selector { css: String },
}

#[derive(Serialize, Deserialize)]
pub struct RenderResult {
    pub job_id: String,
    pub final_url: String,
    pub title: String,
    pub html: String,
    pub elapsed_ms: u64,
}
```

**Rendering Process:**
1. Reuse existing hidden WebView instance (or create if first job)
2. Load URL in offscreen WebView (no window displayed)
3. Wait for ready condition (DOM loaded, selector appears, or network idle)
4. Execute JavaScript: `document.documentElement.outerHTML`
5. Extract `document.title` and `location.href`
6. Return HTML snapshot to backend
7. Backend re-runs extraction on rendered HTML

### 7. Cache Manager

**Purpose:** Cache extracted content to improve performance and reduce external requests.

**Interface:**
```rust
pub struct CacheManager {
    cache: HashMap<String, CacheEntry>,
    max_size_bytes: usize,  // Default: 100MB
    ttl: Duration,          // Default: 60 minutes
}

impl CacheManager {
    pub fn new() -> Self;
    
    /// Gets cached PageExtract if valid
    pub fn get(&self, url: &str) -> Option<PageExtract>;
    
    /// Stores PageExtract in cache
    pub fn put(&mut self, url: &str, extract: PageExtract);
    
    /// Evicts expired entries
    fn evict_expired(&mut self);
    
    /// Evicts oldest entries when size limit exceeded
    fn evict_lru(&mut self);
    
    /// Calculates URL hash for cache key
    fn hash_url(url: &str) -> String;
}

struct CacheEntry {
    extract: PageExtract,
    cached_at: Instant,
    size_bytes: usize,
}
```

**Caching Strategy:**
- Key: SHA-256 hash of URL
- TTL: 60 minutes
- Max size: 100MB total
- Eviction: LRU when size exceeded
- Only cache successful extractions (not errors)

### 8. Content Extraction System (Orchestrator)

**Purpose:** Orchestrate the complete extraction pipeline.

**Interface:**
```rust
pub struct ContentExtractionSystem {
    ssrf_validator: SsrfValidator,
    http_fetcher: HttpFetcher,
    metadata_extractor: MetadataExtractor,
    content_extractor: MainContentExtractor,
    confidence_scorer: ConfidenceScorer,
    cache_manager: CacheManager,
}

impl ContentExtractionSystem {
    pub fn new() -> Self;
    
    /// Browses a single URL and extracts content
    pub async fn browse(&mut self, url: &str, render: bool) -> Result<PageExtract, AppError>;
    
    /// Searches and gathers content from top results
    pub async fn search_and_gather(
        &mut self,
        query: &str,
        num_results: usize,
        gather_top: usize
    ) -> Result<SearchGatherResponse, AppError>;
    
    /// Internal: extracts from HTML
    async fn extract_from_html(&self, html: &str, url: &str) -> PageExtract;
    
    /// Internal: triggers WebView render if needed
    async fn render_if_needed(&mut self, url: &str, confidence: f32) -> Option<String>;
}
```

## Data Models

### PageExtract

Complete structured output from content extraction:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageExtract {
    // Core content
    pub text: String,
    pub word_count: usize,
    
    // Metadata
    pub final_url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub published_date: Option<String>,
    pub canonical_url: Option<String>,
    
    // Images
    pub primary_image: Option<String>,
    pub images: Vec<String>,
    
    // Links
    pub links: Vec<String>,
    
    // Quality metrics
    pub confidence: f32,
    pub extraction_method: ExtractionMethod,
    
    // Performance
    pub fetch_time_ms: u64,
    pub extraction_time_ms: u64,
    pub total_time_ms: u64,
    
    // HTTP details
    pub status: u16,
    pub content_type: Option<String>,
}
```

### SearchGatherResponse

Response for search + gather operations:

```rust
#[derive(Debug, Serialize)]
pub struct SearchGatherResponse {
    pub query: String,
    pub search_results: Vec<WebSearchResult>,
    pub gathered_pages: Vec<PageExtract>,
    pub total_search_time_ms: u64,
    pub total_gather_time_ms: u64,
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SSRF Protection Completeness

*For any* URL provided to the system, if the URL resolves to a private IP address (RFC1918, loopback, link-local, or multicast), then the SSRF validator should reject it before any fetch occurs.

**Validates: Requirements 1.1, 1.2, 1.3, 5.1**

### Property 2: Size Limit Enforcement

*For any* HTTP fetch operation, if the response size exceeds 10MB, then the fetcher should abort the download and return an error without consuming additional bandwidth.

**Validates: Requirements 1.4**

### Property 3: Metadata Extraction Completeness

*For any* HTML document containing metadata in Open Graph tags, JSON-LD, or meta tags, the metadata extractor should successfully extract at least one metadata field (title, author, date, or image).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 5.3**

### Property 4: Metadata Source Priority

*For any* HTML document with multiple metadata sources, if both Open Graph and generic meta tags are present, then the extracted metadata should use the Open Graph value.

**Validates: Requirements 2.6**

### Property 5: Boilerplate Removal Consistency

*For any* HTML document, after content extraction, the resulting text should not contain content from `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, or `<aside>` elements.

**Validates: Requirements 3.1**

### Property 6: Structure Preservation

*For any* extracted content, if the original HTML contains paragraph breaks and headings, then the extracted text should preserve this structure with appropriate line breaks.

**Validates: Requirements 3.3**

### Property 7: Confidence Scoring Thresholds

*For any* extracted content, if the word count exceeds 800 words, then the confidence score should be at least 0.9; if the word count is below 120 words, then the confidence score should be below 0.5.

**Validates: Requirements 3.5, 3.6, 11.3, 11.4, 11.5, 11.6**

### Property 8: WebView Rendering Trigger

*For any* extraction result, if the confidence score is below 0.5 and rendering is enabled, then the system should trigger a WebView render job.

**Validates: Requirements 4.1, 5.5**

### Property 9: Headless Rendering Invisibility

*For any* WebView render job, the rendering process should complete without displaying any visible window or UI to the user.

**Validates: Requirements 4.2, 4.3, 10.2, 10.7**

### Property 10: Render Extraction Round-Trip

*For any* URL that is rendered via WebView, the system should re-run content extraction on the rendered HTML and return a PageExtract with the rendered content.

**Validates: Requirements 4.7, 10.3, 10.4, 10.5**

### Property 11: Concurrent Gathering Limit

*For any* search and gather operation, the system should process at most 3 URLs concurrently and at most 5 URLs total.

**Validates: Requirements 6.2, 6.3**

### Property 12: Gathering Resilience

*For any* batch of URLs being gathered, if one URL fails to fetch or extract, then the system should continue processing the remaining URLs and return partial results.

**Validates: Requirements 6.4**

### Property 13: Citation Preservation

*For any* gathered content, every piece of extracted text should be associated with its source URL in the response.

**Validates: Requirements 6.6, 12.6**

### Property 14: Cache Hit Freshness

*For any* URL requested within 60 minutes of a previous successful extraction, the system should return the cached PageExtract without re-fetching.

**Validates: Requirements 7.2**

### Property 15: Cache Miss on Failure

*For any* URL that fails to fetch or extract, the system should not cache the error result.

**Validates: Requirements 7.5**

### Property 16: JSON-LD Traversal Completeness

*For any* HTML document with JSON-LD structured data, if the JSON-LD contains nested structures (arrays or @graph), then the metadata extractor should traverse all levels to find datePublished and author fields.

**Validates: Requirements 8.5**

### Property 17: PageExtract Completeness

*For any* successful extraction, the returned PageExtract should include the final URL, extracted text, confidence score, extraction method, and timing metrics.

**Validates: Requirements 5.6, 12.1, 12.2, 12.3, 12.5**

## Error Handling

### Error Types

```rust
pub enum ContentExtractionError {
    SsrfViolation { url: String, reason: String },
    FetchTimeout { url: String, timeout_ms: u64 },
    SizeLimitExceeded { url: String, size_mb: f32 },
    HttpError { url: String, status: u16 },
    ExtractionFailed { url: String, reason: String },
    RenderTimeout { url: String, timeout_ms: u64 },
    RenderFailed { url: String, reason: String },
    InvalidUrl { url: String },
}
```

### Error Handling Strategy

1. **SSRF Violations**: Immediate rejection with security error
2. **Fetch Timeouts**: Return error with timeout details
3. **HTTP Errors**: Return error with status code
4. **Extraction Failures**: Fall back to raw HTML with low confidence
5. **Render Failures**: Fall back to HTTP-only extraction
6. **Complete Failures**: Return raw HTML with confidence 0.0

### Graceful Degradation

```
Best case: HTTP fetch → High confidence extraction → Return PageExtract
↓ (low confidence)
Fallback 1: HTTP fetch → WebView render → High confidence extraction → Return PageExtract
↓ (render fails)
Fallback 2: HTTP fetch → Low confidence extraction → Return PageExtract with warning
↓ (extraction fails)
Last resort: HTTP fetch → Return raw HTML with confidence 0.0
```

## Testing Strategy

### Unit Tests

Unit tests verify specific examples, edge cases, and error conditions:

1. **SSRF Validator Tests**
   - Test blocking of 127.0.0.1, 192.168.x.x, 10.x.x.x
   - Test allowing public IPs
   - Test redirect chain validation

2. **HTTP Fetcher Tests**
   - Test size limit enforcement at boundary (10MB)
   - Test timeout behavior
   - Test redirect following

3. **Metadata Extractor Tests**
   - Test Open Graph extraction
   - Test JSON-LD extraction with nested structures
   - Test priority when multiple sources exist
   - Test fallback to meta tags

4. **Content Extractor Tests**
   - Test boilerplate removal
   - Test paragraph structure preservation
   - Test confidence scoring at thresholds (120, 300, 800 words)

5. **Cache Manager Tests**
   - Test cache hit within TTL
   - Test cache miss after TTL
   - Test LRU eviction

### Property-Based Tests

Property-based tests verify universal properties across randomized inputs. Each test runs a minimum of 100 iterations.

1. **Property Test: SSRF Protection Completeness**
   - Generate random IP addresses (public and private)
   - Verify all private IPs are blocked
   - **Feature: web-content-extraction, Property 1: SSRF Protection Completeness**

2. **Property Test: Size Limit Enforcement**
   - Generate responses of varying sizes (1MB to 20MB)
   - Verify downloads abort at 10MB limit
   - **Feature: web-content-extraction, Property 2: Size Limit Enforcement**

3. **Property Test: Metadata Extraction Completeness**
   - Generate random HTML with various metadata formats
   - Verify at least one field is extracted when metadata exists
   - **Feature: web-content-extraction, Property 3: Metadata Extraction Completeness**

4. **Property Test: Metadata Source Priority**
   - Generate HTML with both OG and meta tags
   - Verify OG values are preferred
   - **Feature: web-content-extraction, Property 4: Metadata Source Priority**

5. **Property Test: Boilerplate Removal Consistency**
   - Generate HTML with boilerplate elements
   - Verify extracted text contains no boilerplate
   - **Feature: web-content-extraction, Property 5: Boilerplate Removal Consistency**

6. **Property Test: Structure Preservation**
   - Generate HTML with paragraphs and headings
   - Verify structure is maintained in extracted text
   - **Feature: web-content-extraction, Property 6: Structure Preservation**

7. **Property Test: Confidence Scoring Thresholds**
   - Generate content with varying word counts
   - Verify confidence scores match threshold rules
   - **Feature: web-content-extraction, Property 7: Confidence Scoring Thresholds**

8. **Property Test: Citation Preservation**
   - Generate multiple PageExtracts with different URLs
   - Verify each text chunk maintains its source URL
   - **Feature: web-content-extraction, Property 13: Citation Preservation**

9. **Property Test: Cache Hit Freshness**
   - Generate random URLs and cache them
   - Request within TTL and verify cache hit
   - **Feature: web-content-extraction, Property 14: Cache Hit Freshness**

10. **Property Test: JSON-LD Traversal Completeness**
    - Generate JSON-LD with nested structures
    - Verify all levels are traversed for metadata
    - **Feature: web-content-extraction, Property 16: JSON-LD Traversal Completeness**

11. **Property Test: PageExtract Completeness**
    - Generate random extractions
    - Verify all required fields are present
    - **Feature: web-content-extraction, Property 17: PageExtract Completeness**

### Integration Tests

1. **End-to-End Browse Test**
   - Test complete browse flow from URL to PageExtract
   - Verify all components work together

2. **Search and Gather Test**
   - Test search + concurrent gathering
   - Verify concurrency limits
   - Verify partial results on failures

3. **WebView Rendering Test**
   - Test headless rendering with real Tauri WebView
   - Verify no UI is displayed
   - Verify rendered HTML is extracted

### Testing Framework

- **Unit tests**: Standard Rust `#[test]` with `tokio::test` for async
- **Property tests**: `proptest` crate (Rust's QuickCheck equivalent)
- **Integration tests**: `tests/` directory with real HTTP mocking via `wiremock`
- **WebView tests**: Tauri test harness with headless mode

### Test Configuration

All property-based tests must:
- Run minimum 100 iterations
- Use appropriate generators for input types
- Include shrinking for failure cases
- Tag with feature name and property number
