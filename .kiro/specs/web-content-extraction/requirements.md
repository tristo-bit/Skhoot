# Requirements Document: Web Content Extraction System

## Introduction

This specification defines an enhanced web search system that goes beyond simple search result scraping to provide ChatGPT-style web browsing capabilities. The system will fetch, render, and extract meaningful content from web pages, enabling deep content understanding and citation-backed responses.

The enhancement transforms the current "search results only" system into a "search + browse + extract" pipeline that can:
- Fetch and parse web pages safely
- Extract main article content with metadata
- Handle JavaScript-heavy sites via native WebView rendering
- Provide structured, citation-ready content for AI consumption

## Glossary

- **Content_Extraction_System**: The complete pipeline that fetches, renders, and extracts structured content from web pages
- **HTTP_Fetcher**: Component that retrieves web pages using standard HTTP requests
- **WebView_Renderer**: Native browser component (WKWebView/WebView2/WebKitGTK) that renders JavaScript-heavy pages
- **Metadata_Extractor**: Component that extracts structured metadata (title, author, date, images) from HTML
- **Main_Content_Extractor**: Component that isolates article text from boilerplate using readability algorithms
- **SSRF_Validator**: Security component that prevents Server-Side Request Forgery attacks
- **Page_Extract**: Structured output containing extracted content, metadata, and confidence scores
- **Render_Job**: Request to render a page using the native WebView
- **Confidence_Score**: Numeric measure (0.0-1.0) of extraction quality
- **Boilerplate**: Non-content elements like navigation, ads, footers, and sidebars

## Requirements

### Requirement 1: Safe HTTP Page Fetching

**User Story:** As a system administrator, I want web page fetching to be secure against SSRF attacks, so that internal network resources remain protected.

#### Acceptance Criteria

1. WHEN a URL is provided for fetching, THE SSRF_Validator SHALL verify the URL scheme is http or https
2. WHEN a URL hostname is resolved, THE SSRF_Validator SHALL block private IP addresses (RFC1918, loopback, link-local, multicast)
3. WHEN a URL redirects, THE SSRF_Validator SHALL validate each redirect target against SSRF rules
4. WHEN fetching page content, THE HTTP_Fetcher SHALL enforce a maximum download size limit of 10MB
5. WHEN fetching page content, THE HTTP_Fetcher SHALL enforce a timeout of 15 seconds
6. WHEN a fetch exceeds size or time limits, THE HTTP_Fetcher SHALL abort and return an error

### Requirement 2: Metadata Extraction

**User Story:** As an AI agent, I want to extract structured metadata from web pages, so that I can provide accurate citations and context.

#### Acceptance Criteria

1. WHEN parsing HTML, THE Metadata_Extractor SHALL extract the page title from `<title>`, Open Graph tags, or JSON-LD
2. WHEN parsing HTML, THE Metadata_Extractor SHALL extract the publication date from meta tags, JSON-LD, or article tags
3. WHEN parsing HTML, THE Metadata_Extractor SHALL extract author information from meta tags or JSON-LD
4. WHEN parsing HTML, THE Metadata_Extractor SHALL extract the primary image from Open Graph tags or article content
5. WHEN parsing HTML, THE Metadata_Extractor SHALL extract the canonical URL from link tags
6. WHEN multiple metadata sources exist, THE Metadata_Extractor SHALL prioritize Open Graph and JSON-LD over generic meta tags

### Requirement 3: Main Content Extraction

**User Story:** As an AI agent, I want to extract only the main article content from web pages, so that I can focus on relevant information without boilerplate.

#### Acceptance Criteria

1. WHEN extracting content, THE Main_Content_Extractor SHALL remove script, style, nav, footer, header, and aside elements
2. WHEN extracting content, THE Main_Content_Extractor SHALL identify the primary content container using paragraph density heuristics
3. WHEN extracting content, THE Main_Content_Extractor SHALL preserve paragraph structure and headings
4. WHEN extracting content, THE Main_Content_Extractor SHALL calculate a confidence score based on word count and content-to-HTML ratio
5. WHEN extracted word count exceeds 800 words, THE Main_Content_Extractor SHALL assign a confidence score of at least 0.9
6. WHEN extracted word count is below 120 words, THE Main_Content_Extractor SHALL assign a confidence score below 0.3

### Requirement 4: Headless WebView Rendering Fallback

**User Story:** As a system, I want to render JavaScript-heavy pages using a headless native WebView, so that I can extract content from single-page applications and dynamic sites without any visual display.

#### Acceptance Criteria

1. WHEN HTTP extraction confidence is below 0.5, THE Content_Extraction_System SHALL trigger a WebView render job
2. WHEN a render job is created, THE WebView_Renderer SHALL load the URL in a hidden, offscreen native WebView instance
3. WHEN rendering, THE WebView_Renderer SHALL execute JavaScript without displaying any UI to the user
4. WHEN rendering, THE WebView_Renderer SHALL wait for DOM content loaded or a specified CSS selector to appear
5. WHEN rendering completes, THE WebView_Renderer SHALL extract the final HTML, title, and URL via JavaScript execution
6. WHEN rendering exceeds 30 seconds, THE WebView_Renderer SHALL abort and return an error
7. WHEN rendering completes, THE Content_Extraction_System SHALL re-run content extraction on the rendered HTML

### Requirement 5: Browse Endpoint

**User Story:** As a developer, I want a dedicated browse endpoint, so that I can fetch and extract content from a single URL.

#### Acceptance Criteria

1. WHEN a browse request is received with a URL, THE Content_Extraction_System SHALL validate the URL for SSRF
2. WHEN a browse request is received, THE HTTP_Fetcher SHALL fetch the page content
3. WHEN page content is fetched, THE Metadata_Extractor SHALL extract all available metadata
4. WHEN page content is fetched, THE Main_Content_Extractor SHALL extract the main article text
5. WHEN extraction confidence is low and render is enabled, THE Content_Extraction_System SHALL trigger WebView rendering
6. WHEN extraction completes, THE Content_Extraction_System SHALL return a Page_Extract with content, metadata, and confidence scores

### Requirement 6: Search with Content Gathering

**User Story:** As an AI agent, I want to search and automatically gather content from top results, so that I can provide comprehensive, citation-backed answers.

#### Acceptance Criteria

1. WHEN a search request includes gather=true, THE Content_Extraction_System SHALL fetch and extract content from the top N results
2. WHEN gathering content, THE Content_Extraction_System SHALL process up to 3 URLs concurrently
3. WHEN gathering content, THE Content_Extraction_System SHALL limit total gathering to 5 pages maximum
4. WHEN gathering fails for a URL, THE Content_Extraction_System SHALL continue with remaining URLs
5. WHEN gathering completes, THE Content_Extraction_System SHALL return both search results and extracted page content
6. WHEN gathering completes, THE Content_Extraction_System SHALL include source URLs with all extracted content

### Requirement 7: Caching for Performance

**User Story:** As a system administrator, I want fetched pages to be cached, so that repeated requests are fast and reduce external bandwidth.

#### Acceptance Criteria

1. WHEN a page is successfully fetched and extracted, THE Content_Extraction_System SHALL cache the Page_Extract by URL hash
2. WHEN a cached page is requested within 60 minutes, THE Content_Extraction_System SHALL return the cached result
3. WHEN a cache entry exceeds 60 minutes, THE Content_Extraction_System SHALL evict it and fetch fresh content
4. WHEN cache storage exceeds 100MB, THE Content_Extraction_System SHALL evict oldest entries first
5. WHEN a page fetch fails, THE Content_Extraction_System SHALL NOT cache the error

### Requirement 8: JSON-LD Structured Data Extraction

**User Story:** As an AI agent, I want to extract JSON-LD structured data from pages, so that I can access high-quality metadata from news sites and blogs.

#### Acceptance Criteria

1. WHEN parsing HTML, THE Metadata_Extractor SHALL locate all `<script type="application/ld+json">` elements
2. WHEN JSON-LD is found, THE Metadata_Extractor SHALL parse it as JSON
3. WHEN JSON-LD contains datePublished, THE Metadata_Extractor SHALL extract the publication date
4. WHEN JSON-LD contains author information, THE Metadata_Extractor SHALL extract author names
5. WHEN JSON-LD is an array or contains @graph, THE Metadata_Extractor SHALL traverse nested structures
6. WHEN JSON-LD parsing fails, THE Metadata_Extractor SHALL fall back to meta tag extraction

### Requirement 9: Error Handling and Resilience

**User Story:** As a system, I want robust error handling for page fetching, so that failures are graceful and informative.

#### Acceptance Criteria

1. WHEN a URL fails SSRF validation, THE Content_Extraction_System SHALL return an error indicating the security violation
2. WHEN a page fetch times out, THE Content_Extraction_System SHALL return an error with timeout details
3. WHEN a page returns a non-success HTTP status, THE Content_Extraction_System SHALL return an error with the status code
4. WHEN content extraction produces no results, THE Content_Extraction_System SHALL return an error indicating extraction failure
5. WHEN WebView rendering fails, THE Content_Extraction_System SHALL fall back to HTTP-only extraction results
6. WHEN all extraction methods fail, THE Content_Extraction_System SHALL return the raw HTML with a low confidence score

### Requirement 10: Tauri Integration for Headless WebView Rendering

**User Story:** As a desktop application, I want to use Tauri's native WebView for headless rendering, so that I avoid bundling Chromium, maintain cross-platform compatibility, and keep the rendering invisible to users.

#### Acceptance Criteria

1. WHEN the Tauri application starts, THE WebView_Renderer SHALL initialize a hidden, offscreen WebView instance
2. WHEN a render job is received, THE WebView_Renderer SHALL load the URL in the hidden WebView without displaying any window
3. WHEN rendering completes, THE WebView_Renderer SHALL execute JavaScript to extract document.documentElement.outerHTML
4. WHEN rendering completes, THE WebView_Renderer SHALL extract document.title and location.href
5. WHEN rendering completes, THE WebView_Renderer SHALL return the extracted data to the backend for AI consumption
6. WHEN the WebView is idle, THE WebView_Renderer SHALL reuse the same instance for subsequent render jobs
7. WHEN rendering occurs, THE WebView_Renderer SHALL NOT display any visual UI or windows to the user

### Requirement 11: Content Quality Scoring

**User Story:** As an AI agent, I want confidence scores for extracted content, so that I can determine whether to use HTTP extraction or trigger rendering.

#### Acceptance Criteria

1. WHEN content is extracted, THE Main_Content_Extractor SHALL calculate word count
2. WHEN content is extracted, THE Main_Content_Extractor SHALL calculate the ratio of extracted text to total HTML size
3. WHEN word count exceeds 800, THE Main_Content_Extractor SHALL assign confidence >= 0.9
4. WHEN word count is 300-800, THE Main_Content_Extractor SHALL assign confidence 0.7-0.9
5. WHEN word count is 120-300, THE Main_Content_Extractor SHALL assign confidence 0.5-0.7
6. WHEN word count is below 120, THE Main_Content_Extractor SHALL assign confidence < 0.5

### Requirement 12: Response Format with Citations

**User Story:** As an AI agent, I want extracted content to include source URLs and metadata, so that I can provide proper citations in my responses.

#### Acceptance Criteria

1. WHEN returning a Page_Extract, THE Content_Extraction_System SHALL include the final URL after redirects
2. WHEN returning a Page_Extract, THE Content_Extraction_System SHALL include the page title
3. WHEN returning a Page_Extract, THE Content_Extraction_System SHALL include extracted text with paragraph structure
4. WHEN returning a Page_Extract, THE Content_Extraction_System SHALL include all extracted metadata (author, date, images)
5. WHEN returning a Page_Extract, THE Content_Extraction_System SHALL include extraction method and confidence score
6. WHEN returning gathered content, THE Content_Extraction_System SHALL maintain URL associations for all text chunks
