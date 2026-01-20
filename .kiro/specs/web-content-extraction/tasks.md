
…/Skhoot on  main  !?via ⬢ v20.19.6 
➜ cargo test --manifest-path backend/Cargo.toml --lib content_extraction::system --no-fail-fast 2>&1 | tail -50

warning: fields `ssrf_validator`, `metadata_extractor`, and `content_extractor` are never read
  --> src/content_extraction/system.rs:25:5
   |
24 | pub struct ContentExtractionSystem {
   |            ----------------------- fields in this struct
25 |     ssrf_validator: SsrfValidator,
   |     ^^^^^^^^^^^^^^
26 |     http_fetcher: HttpFetcher,
27 |     metadata_extractor: MetadataExtractor,
   |     ^^^^^^^^^^^^^^^^^^
28 |     content_extractor: MainContentExtractor,
   |     ^^^^^^^^^^^^^^^^^
   |
   = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: hiding a lifetime that's elided elsewhere is confusing
   --> src/content_extraction/content_extractor.rs:157:19
    |
157 |         document: &Html,
    |                   ^^^^^ the lifetime is elided here
158 |     ) -> Option<ElementRef> {
    |                 ^^^^^^^^^^ the same lifetime is hidden here
    |
    = help: the same lifetime is referred to in inconsistent ways, making the signature confusing
    = note: `#[warn(mismatched_lifetime_syntaxes)]` on by default
help: use `'_` for type paths
    |
158 |     ) -> Option<ElementRef<'_>> {
    |                           ++++

warning: `skhoot-backend` (lib test) generated 4 warnings (run `cargo fix --lib -p skhoot-backend --tests` to apply 1 suggestion)
    Finished `test` profile [optimized + debuginfo] target(s) in 7.39s
     Running unittests src/lib.rs (backend/target/debug/deps/skhoot_backend-405d16ada76aee81)

running 11 tests
test content_extraction::system::tests::test_error_handling_invalid_url ... ok
test content_extraction::system::tests::test_browse_ssrf_blocked ... ok
test content_extraction::system::tests::test_error_handling_ssrf_violation ... ok
test content_extraction::system::tests::test_low_confidence_detection ... ok
test content_extraction::system::tests::test_browse_private_ip_blocked ... ok
test content_extraction::system::tests::test_system_default ... ok
test content_extraction::system::tests::test_browse_invalid_url ... ok
test content_extraction::system::tests::test_system_with_custom_cache ... ok
test content_extraction::system::tests::test_system_creation ... ok
test content_extraction::system::tests::test_search_and_gather_basic ... ok
test content_extraction::system::tests::test_search_and_gather_respects_limits ... ok

test result: ok. 11 passed; 0 failed; 0 ignored; 0 measured; 136 filtered out; finished in 10.70s

[ble: elapsed 18.213s (CPU 242.7%)] cargo test --manifest-path backend/Cargo.toml --lib content_extractio
# Implementation Plan: Web Content Extraction System

## Overview

This plan implements a headless web content extraction system that enhances the existing web search with ChatGPT-style browsing capabilities. The implementation follows a two-tier architecture: HTTP-first extraction for speed, with headless WebView fallback for JavaScript-heavy sites. All rendering is invisible to users, with extracted content flowing directly to AI agents.

## Tasks

- [x] 1. Set up core data structures and error types
  - Create `PageExtract` struct with all fields (text, metadata, confidence, timing)
  - Create `ContentExtractionError` enum with all error variants
  - Create `ExtractionMethod` enum (DensityHeuristic, ReadabilityAlgorithm, BrowserRender, Fallback)
  - Create `RenderJob`, `RenderWait`, and `RenderResult` structs for WebView communication
  - _Requirements: 5.6, 9.1, 9.2, 9.3, 9.4, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 2. Implement SSRF Validator
  - [x] 2.1 Create `SsrfValidator` struct with validation methods
    - Implement `is_public_ip()` to check IPv4 and IPv6 addresses
    - Block RFC1918 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    - Block loopback (127.0.0.0/8, ::1)
    - Block link-local (169.254.0.0/16, fe80::/10)
    - Block multicast and broadcast addresses
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement `validate_url()` method
    - Check URL scheme is http or https
    - Resolve hostname to IP addresses using `tokio::net::lookup_host`
    - Validate all resolved IPs are public
    - Return descriptive errors for blocked addresses
    - _Requirements: 1.1, 1.2, 5.1_

  - [x]* 2.3 Write property test for SSRF protection
    - **Property 1: SSRF Protection Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 5.1**

- [x] 3. Implement HTTP Fetcher with size and timeout limits
  - [x] 3.1 Create `HttpFetcher` struct with reqwest client
    - Initialize with 10MB max_bytes and 15s timeout
    - Configure proper User-Agent and Accept headers
    - _Requirements: 1.4, 1.5_

  - [x] 3.2 Implement streaming fetch with size limit
    - Use `bytes_stream()` to stream response
    - Count bytes and abort if exceeding 10MB
    - Capture final_url, status, content_type before streaming
    - Return `FetchResult` with HTML and metadata
    - _Requirements: 1.4, 1.6_

  - [x] 3.3 Integrate SSRF validation into fetch flow
    - Validate URL before fetching
    - Validate redirect targets in chain
    - _Requirements: 1.3_

  - [x]* 3.4 Write property test for size limit enforcement
    - **Property 2: Size Limit Enforcement**
    - **Validates: Requirements 1.4**

  - [x]* 3.5 Write unit tests for timeout and error handling
    - Test timeout behavior with slow mock server
    - Test HTTP error status codes
    - _Requirements: 1.5, 1.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Metadata Extractor
  - [x] 5.1 Create `MetadataExtractor` with HTML parsing
    - Parse HTML using `scraper` crate
    - Create `Metadata` struct for extracted data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.2 Implement Open Graph extraction
    - Extract `og:title`, `og:description`, `og:image`
    - Extract `og:url` for canonical URL
    - Extract `article:published_time` and `article:author`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.3 Implement JSON-LD extraction
    - Select all `script[type="application/ld+json"]` elements
    - Parse JSON and handle arrays and @graph structures
    - Extract `datePublished`, `author`, `headline`, `image`
    - Traverse nested structures recursively
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.4 Implement meta tag extraction
    - Extract `<title>`, `meta[name="description"]`, `meta[name="author"]`
    - Extract `meta[name="date"]` and `link[rel="canonical"]`
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 5.5 Implement priority-based metadata merging
    - Merge metadata with priority: Open Graph > JSON-LD > meta tags
    - Return combined `Metadata` struct
    - _Requirements: 2.6_

  - [ ]* 5.6 Write property test for metadata extraction completeness
    - **Property 3: Metadata Extraction Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 5.3**

  - [ ]* 5.7 Write property test for metadata source priority
    - **Property 4: Metadata Source Priority**
    - **Validates: Requirements 2.6**

  - [ ]* 5.8 Write property test for JSON-LD traversal
    - **Property 16: JSON-LD Traversal Completeness**
    - **Validates: Requirements 8.5**

- [x] 6. Implement Main Content Extractor
  - [x] 6.1 Create `MainContentExtractor` with boilerplate removal
    - Remove `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `<form>`, `<svg>`
    - Select content elements: `<p>`, `<h1>`, `<h2>`, `<h3>`, `<li>`
    - _Requirements: 3.1_

  - [x] 6.2 Implement paragraph density heuristic
    - Calculate word count for each container element
    - Group by ancestor containers
    - Select container with highest total word count
    - _Requirements: 3.2_

  - [x] 6.3 Implement structured text extraction
    - Extract text from selected container
    - Preserve paragraph breaks (join with "\n\n")
    - Preserve heading structure
    - Normalize whitespace
    - _Requirements: 3.3_

  - [x] 6.4 Implement confidence scoring
    - Calculate word count
    - Calculate text-to-HTML ratio
    - Apply scoring rules: >800 words = 0.9+, 300-800 = 0.7-0.9, 120-300 = 0.5-0.7, <120 = <0.5
    - Adjust based on text/HTML ratio
    - _Requirements: 3.4, 3.5, 3.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 6.5 Write property test for boilerplate removal
    - **Property 5: Boilerplate Removal Consistency**
    - **Validates: Requirements 3.1**

  - [ ]* 6.6 Write property test for structure preservation
    - **Property 6: Structure Preservation**
    - **Validates: Requirements 3.3**

  - [ ]* 6.7 Write property test for confidence scoring thresholds
    - **Property 7: Confidence Scoring Thresholds**
    - **Validates: Requirements 3.5, 3.6, 11.3, 11.4, 11.5, 11.6**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Cache Manager
  - [x] 8.1 Create `CacheManager` with HashMap storage
    - Use `HashMap<String, CacheEntry>` for in-memory cache
    - Implement URL hashing with SHA-256
    - Set TTL to 60 minutes, max size to 100MB
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 8.2 Implement cache get/put operations
    - `get()`: Check TTL and return if valid
    - `put()`: Store PageExtract with timestamp and size
    - Calculate size estimate for cache entries
    - _Requirements: 7.1, 7.2_

  - [x] 8.3 Implement cache eviction
    - Evict expired entries on get/put
    - Evict LRU entries when size exceeds 100MB
    - Never cache errors or failed extractions
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ]* 8.4 Write property test for cache hit freshness
    - **Property 14: Cache Hit Freshness**
    - **Validates: Requirements 7.2**

  - [ ]* 8.5 Write property test for cache miss on failure
    - **Property 15: Cache Miss on Failure**
    - **Validates: Requirements 7.5**

  - [ ]* 8.6 Write unit tests for cache eviction
    - Test TTL expiration
    - Test LRU eviction when size exceeded
    - _Requirements: 7.3, 7.4_

- [x] 9. Implement Content Extraction System orchestrator
  - [x] 9.1 Create `ContentExtractionSystem` struct
    - Initialize all component instances (validator, fetcher, extractors, cache)
    - Store in `AppState` for Axum handlers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 9.2 Implement `browse()` method
    - Check cache first
    - Validate URL with SSRF validator
    - Fetch HTML with HTTP fetcher
    - Extract metadata and content
    - Calculate confidence score
    - Return `PageExtract` or cache and return
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 9.3 Implement low-confidence detection
    - Check if confidence < 0.5
    - If render enabled and confidence low, prepare for WebView rendering
    - Mark extraction as needing render
    - _Requirements: 4.1, 5.5_

  - [x] 9.4 Implement error handling with graceful degradation
    - SSRF violations: return security error
    - Fetch timeouts: return timeout error
    - HTTP errors: return status error
    - Extraction failures: return raw HTML with confidence 0.0
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [ ]* 9.5 Write property test for PageExtract completeness
    - **Property 17: PageExtract Completeness**
    - **Validates: Requirements 5.6, 12.1, 12.2, 12.3, 12.5**

  - [ ]* 9.6 Write unit tests for error handling
    - Test SSRF violation errors
    - Test timeout errors
    - Test HTTP error responses
    - Test extraction failure fallback
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

- [ ] 10. Implement browse API endpoint
  - [x] 10.1 Create `/browse` GET endpoint in Axum
    - Accept `url` and optional `render` query parameters
    - Call `ContentExtractionSystem::browse()`
    - Return JSON `PageExtract`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 10.2 Add endpoint to router
    - Mount in `web_search_routes()` or create new router
    - Wire up to AppState
    - _Requirements: 5.1_

  - [ ]* 10.3 Write integration test for browse endpoint
    - Test end-to-end browse flow
    - Mock HTTP responses with `wiremock`
    - Verify PageExtract structure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement search and gather functionality
  - [x] 12.1 Extend `ContentExtractionSystem` with `search_and_gather()`
    - Accept query, num_results, and gather_top parameters
    - Call existing `web_search()` to get search results
    - Extract top N URLs (max 5)
    - _Requirements: 6.1, 6.3_

  - [x] 12.2 Implement concurrent gathering with semaphore
    - Create `tokio::sync::Semaphore` with limit of 3
    - Spawn tasks for each URL with semaphore permit
    - Collect results as they complete
    - _Requirements: 6.2_

  - [x] 12.3 Implement gathering resilience
    - Continue on individual URL failures
    - Collect successful PageExtracts
    - Log failures but don't abort entire operation
    - _Requirements: 6.4_

  - [x] 12.4 Create `SearchGatherResponse` struct
    - Include original search results
    - Include gathered PageExtracts
    - Include timing metrics
    - Ensure each PageExtract maintains source URL
    - _Requirements: 6.5, 6.6_

  - [ ]* 12.5 Write property test for concurrent gathering limit
    - **Property 11: Concurrent Gathering Limit**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 12.6 Write property test for gathering resilience
    - **Property 12: Gathering Resilience**
    - **Validates: Requirements 6.4**

  - [ ]* 12.7 Write property test for citation preservation
    - **Property 13: Citation Preservation**
    - **Validates: Requirements 6.6, 12.6**

- [x] 13. Extend search endpoint with gather parameter
  - [x] 13.1 Add `gather` and `gather_top` to `WebSearchQuery`
    - Add optional boolean `gather` field
    - Add optional usize `gather_top` field (default 3, max 5)
    - _Requirements: 6.1_

  - [x] 13.2 Modify `web_search()` handler
    - Check if gather is enabled
    - If yes, call `search_and_gather()` instead
    - Return `SearchGatherResponse` when gathering
    - Return normal `WebSearchResponse` when not gathering
    - _Requirements: 6.1, 6.5_

  - [ ]* 13.3 Write integration test for search and gather
    - Test search with gather=true
    - Verify concurrent processing
    - Verify partial results on failures
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement Tauri WebView Renderer (Tauri side)
  - [x] 15.1 Create `WebViewRenderer` struct in src-tauri
    - Initialize hidden WebView instance on app startup
    - Store WebView handle for reuse
    - Create offscreen/hidden window (no visible UI)
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 15.2 Implement `render()` Tauri command
    - Accept `RenderJob` with URL, timeout, and wait condition
    - Load URL in hidden WebView
    - Wait for ready condition (DomContentLoaded, selector, or network idle)
    - Enforce 30-second timeout
    - _Requirements: 4.2, 4.3, 4.4, 4.6, 10.2_

  - [x] 15.3 Implement DOM extraction via JavaScript
    - Execute `document.documentElement.outerHTML` in WebView
    - Execute `document.title` and `location.href`
    - Return `RenderResult` with extracted data
    - _Requirements: 4.5, 10.3, 10.4_

  - [x] 15.4 Ensure headless rendering (no visible UI)
    - Configure WebView window as hidden/offscreen
    - Verify no window is displayed during rendering
    - Test on all platforms (Windows, macOS, Linux)
    - _Requirements: 4.2, 4.3, 10.2, 10.7_

  - [ ]* 15.5 Write integration test for headless rendering
    - Test rendering with Tauri test harness
    - Verify no UI is displayed
    - Verify HTML extraction works
    - _Requirements: 4.2, 4.3, 4.5, 10.2, 10.3, 10.4, 10.7_

- [x] 16. Integrate WebView rendering into backend
  - [x] 16.1 Create Tauri command bridge in backend
    - Add method to call Tauri `render()` command from backend
    - Handle async communication between backend and Tauri
    - _Requirements: 4.1, 4.7_

  - [x] 16.2 Implement `render_if_needed()` in ContentExtractionSystem
    - Check if confidence < 0.5 and render enabled
    - Create `RenderJob` and send to Tauri
    - Wait for `RenderResult`
    - Re-run extraction on rendered HTML
    - Update PageExtract with rendered content
    - _Requirements: 4.1, 4.7, 5.5_

  - [x] 16.3 Implement render fallback on failure
    - If rendering fails, fall back to HTTP-only extraction
    - Log render failure but return best-effort PageExtract
    - _Requirements: 9.5_

  - [ ]* 16.4 Write property test for WebView rendering trigger
    - **Property 8: WebView Rendering Trigger**
    - **Validates: Requirements 4.1, 5.5**

  - [ ]* 16.5 Write property test for render extraction round-trip
    - **Property 10: Render Extraction Round-Trip**
    - **Validates: Requirements 4.7, 10.3, 10.4, 10.5**

  - [ ]* 16.6 Write unit test for render fallback
    - Test fallback when rendering fails
    - Verify HTTP-only extraction is returned
    - _Requirements: 9.5_

- [x] 17. Final integration and testing
  - [x] 17.1 Test complete browse flow with rendering
    - Test HTTP extraction → low confidence → WebView render → enhanced extraction
    - Verify all components work together
    - _Requirements: 4.1, 4.7, 5.5_

  - [x] 17.2 Test search and gather with rendering
    - Test gather with mix of high and low confidence pages
    - Verify some pages trigger rendering
    - Verify concurrent processing works with rendering
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 17.3 Write end-to-end integration tests
    - Test complete user journey: search → gather → extract → render
    - Test error handling across all components
    - Test caching across multiple requests
    - _Requirements: All_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (min 100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows
- WebView rendering is completely headless - no visible UI to users
- All extracted content flows directly to AI agents for consumption
