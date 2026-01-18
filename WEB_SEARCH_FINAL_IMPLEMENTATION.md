# Web Search Final Implementation Plan

## Decision: Lightweight HTTP Scraping (No Browser)

After analyzing the websearch SDK in `/documentation/websearch-main`, we're abandoning the headless browser approach in favor of lightweight HTTP scraping.

## Why No Browser?

### Problems with Headless Browser:
- ❌ Requires Chrome/Chromium installed on user's system
- ❌ Large binary size impact (~150MB for browser)
- ❌ Slow (2-4 seconds per search)
- ❌ High memory usage (~100MB per instance)
- ❌ Not suitable for open-source, lightweight project
- ❌ No pure Rust browser exists (servo is experimental)

### Benefits of HTTP Scraping:
- ✅ No external dependencies
- ✅ Small binary size (~2MB for crates)
- ✅ Fast (~500ms per search)
- ✅ Low memory usage (~10MB)
- ✅ Works on all systems
- ✅ Open source friendly
- ✅ Proven approach (websearch SDK is production-ready)

## Implementation Options

### Option 1: Use WebSearch SDK (RECOMMENDED)

**Approach**: Integrate the existing websearch SDK as a dependency

**Pros**:
- Production-ready, well-tested
- 8+ providers out of the box
- Multi-provider strategies
- Comprehensive error handling
- Active maintenance

**Cons**:
- Additional dependency
- May include features we don't need

**Implementation**:
```toml
[dependencies]
websearch = { path = "../documentation/websearch-main" }
```

```rust
use websearch::{web_search, providers::DuckDuckGoProvider, SearchOptions};

let provider = DuckDuckGoProvider::new();
let results = web_search(SearchOptions {
    query: "best restaurants in Toulouse".to_string(),
    max_results: Some(5),
    provider: Box::new(provider),
    ..Default::default()
}).await?;
```

### Option 2: Extract DuckDuckGo Provider

**Approach**: Copy just the DuckDuckGo provider code into our project

**Pros**:
- Minimal code footprint
- Full control over implementation
- No external SDK dependency
- Customizable for Skhoot's needs

**Cons**:
- Need to maintain ourselves
- Miss out on multi-provider features
- More work upfront

**Implementation**:
- Copy `providers/duckduckgo.rs` logic
- Adapt to our existing structure
- Keep it simple and focused

## Recommended Architecture

### Dual-Tool Approach

```
Tool 1: web_search
├── Purpose: General web search
├── Providers: DuckDuckGo (primary), SearXNG (fallback)
├── Input: query, max_results, provider
└── Output: [{ title, url, snippet, domain }]

Tool 2: web_scrape
├── Purpose: Targeted content extraction
├── Method: CSS selectors + link following
├── Input: url, selectors[], follow_links, max_depth
└── Output: [{ selector, text, html }]
```

### Provider Strategy

```rust
// Try DuckDuckGo first (fast, free, unlimited)
match search_duckduckgo(&query).await {
    Ok(results) => return Ok(results),
    Err(e) => {
        // Fallback to SearXNG public instances
        search_searxng_fallback(&query).await
    }
}
```

## Implementation Steps

### Step 1: Remove Headless Browser Dependencies
```bash
# Remove from Cargo.toml
- headless_chrome = "1.0"
```

### Step 2: Add Required Dependencies
```toml
[dependencies]
scraper = "0.20"          # HTML parsing with CSS selectors
urlencoding = "2.1"       # URL encoding
reqwest = { version = "0.11", features = ["json"] }  # Already have
```

### Step 3: Implement DuckDuckGo Provider

Based on websearch SDK's approach:

```rust
async fn search_duckduckgo(query: &str, max_results: usize) -> Result<Vec<SearchResult>> {
    // 1. POST form data to html.duckduckgo.com/html
    let mut form_data = HashMap::new();
    form_data.insert("q", query);
    form_data.insert("kl", "wt-wt"); // Worldwide
    
    // 2. Send request with proper headers
    let html = client
        .post("https://html.duckduckgo.com/html")
        .header("User-Agent", "Mozilla/5.0...")
        .header("Referer", "https://html.duckduckgo.com/")
        .form(&form_data)
        .send()
        .await?
        .text()
        .await?;
    
    // 3. Parse HTML with scraper
    let document = Html::parse_document(&html);
    let result_selector = Selector::parse("h2.result__title a")?;
    let snippet_selector = Selector::parse(".result__snippet")?;
    
    // 4. Extract results
    let mut results = Vec::new();
    for (link, snippet) in document.select(&result_selector)
        .zip(document.select(&snippet_selector))
        .take(max_results) 
    {
        results.push(SearchResult {
            title: link.inner_html(),
            url: link.value().attr("href").unwrap(),
            snippet: snippet.inner_html(),
            ...
        });
    }
    
    Ok(results)
}
```

### Step 4: Implement SearXNG Fallback

Already implemented in current code - keep it!

### Step 5: Add Web Scrape Tool

Based on Kowalski's WebScrapeTool:

```rust
async fn web_scrape(
    url: &str,
    selectors: &[String],
    follow_links: bool,
    max_depth: usize,
) -> Result<Vec<ScrapedData>> {
    // 1. Fetch page
    let html = reqwest::get(url).await?.text().await?;
    
    // 2. Parse with scraper
    let document = Html::parse_document(&html);
    
    // 3. Extract data using CSS selectors
    let mut results = Vec::new();
    for selector_str in selectors {
        let selector = Selector::parse(selector_str)?;
        for element in document.select(&selector) {
            results.push(ScrapedData {
                selector: selector_str.clone(),
                text: element.text().collect(),
                html: element.html(),
            });
        }
    }
    
    // 4. Follow links if requested
    if follow_links && max_depth > 0 {
        let links = extract_links(&document, url)?;
        for link in links {
            let link_results = web_scrape(&link, selectors, true, max_depth - 1).await?;
            results.extend(link_results);
        }
    }
    
    Ok(results)
}
```

## File Structure

```
backend/src/api/
├── web_search.rs          # Main web search implementation
│   ├── search_duckduckgo()
│   ├── search_searxng_fallback()
│   └── web_search endpoint
└── web_scrape.rs          # New: Web scraping tool
    ├── web_scrape()
    ├── extract_links()
    └── web_scrape endpoint
```

## Testing Strategy

```bash
# Test DuckDuckGo search
curl "http://localhost:3001/api/v1/search/web?q=best+restaurants+toulouse&num_results=5"

# Test web scrape
curl -X POST "http://localhost:3001/api/v1/scrape/web" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "selectors": [".title", ".content"],
    "follow_links": false
  }'
```

## Performance Comparison

| Approach | Speed | Memory | Binary Size | Dependencies |
|----------|-------|--------|-------------|--------------|
| Headless Browser | 2-4s | ~100MB | +150MB | Chrome required |
| HTTP Scraping | ~500ms | ~10MB | +2MB | None |

## Migration Path

1. ✅ Remove headless_chrome dependency
2. ✅ Implement DuckDuckGo HTTP scraping
3. ✅ Keep SearXNG fallback
4. ✅ Test with real queries
5. ✅ Add web_scrape tool
6. ✅ Update documentation
7. ✅ Update frontend tool definitions

## Success Criteria

- ✅ Search works without Chrome/Chromium
- ✅ Binary size stays under 50MB
- ✅ Search completes in under 1 second
- ✅ Works on all platforms (Linux, macOS, Windows)
- ✅ No API keys required for basic functionality
- ✅ Graceful fallback when primary provider fails

## Next Steps

1. Remove headless browser code
2. Implement DuckDuckGo HTTP scraping
3. Test thoroughly
4. Add web_scrape tool
5. Update documentation
6. Ship it! 🚀
