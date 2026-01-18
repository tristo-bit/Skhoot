# Web Search Implementation Options for Desktop App

## Requirements
- ✅ Free
- ✅ Unlimited (no rate limits)
- ✅ Leverage desktop capabilities (headless browsers, local processes, etc.)

## Recommended Options (Ranked)

### 🥇 Option 1: Public SearXNG Instance + Fallback (RECOMMENDED)
**Best balance of simplicity, reliability, and performance**

**How it works:**
- Use public SearXNG instances (free metasearch aggregator)
- SearXNG queries multiple search engines (Google, Bing, DuckDuckGo, etc.) and aggregates results
- Fallback to different instances if one is down
- No API key, no rate limits, completely free

**Pros:**
- ✅ Free and unlimited
- ✅ High-quality results (aggregates from multiple engines)
- ✅ No API keys or authentication
- ✅ Simple HTTP requests (no browser needed)
- ✅ Privacy-focused
- ✅ JSON API available
- ✅ Multiple public instances for redundancy

**Cons:**
- ⚠️ Depends on public instances (but we can use fallbacks)
- ⚠️ Response time varies by instance (~500-2000ms)

**Implementation:**
```rust
// Query public SearXNG instances with fallback
let instances = [
    "https://searx.be",
    "https://search.bus-hit.me",
    "https://searx.tiekoetter.com",
    "https://search.sapti.me"
];

for instance in instances {
    let url = format!("{}/search?q={}&format=json", instance, query);
    if let Ok(results) = reqwest::get(&url).await {
        return Ok(parse_searxng_results(results));
    }
}
```

**Effort:** Low (2-3 hours)
**Reliability:** High (with fallback instances)

---

### 🥈 Option 2: Headless Browser Scraping (DuckDuckGo/Google)
**Most powerful, leverages desktop capabilities**

**How it works:**
- Use headless Chromium via Rust bindings (chromiumoxide or headless_chrome)
- Scrape search results directly from DuckDuckGo or Google HTML
- Bypass API limitations by acting like a real browser
- Can handle JavaScript-rendered content

**Pros:**
- ✅ Truly unlimited (no API quotas)
- ✅ High-quality results from major search engines
- ✅ Can handle dynamic content
- ✅ Leverages desktop app capabilities
- ✅ Can rotate user agents and avoid detection

**Cons:**
- ⚠️ Slower (~2-5 seconds per search)
- ⚠️ More complex implementation
- ⚠️ Requires bundling Chromium (~150MB)
- ⚠️ Search engines may block if detected as bot
- ⚠️ HTML structure changes require maintenance

**Rust Libraries:**
- `chromiumoxide` - Async Chromium control
- `headless_chrome` - Simpler API
- `fantoccini` - WebDriver protocol

**Implementation:**
```rust
use chromiumoxide::Browser;

async fn search_with_browser(query: &str) -> Result<Vec<SearchResult>> {
    let browser = Browser::default().await?;
    let page = browser.new_page("https://duckduckgo.com").await?;
    
    // Type query and submit
    page.find_element("input[name='q']").await?
        .type_str(query).await?
        .press_key("Enter").await?;
    
    // Wait for results
    page.wait_for_navigation().await?;
    
    // Extract results from DOM
    let results = page.evaluate("
        Array.from(document.querySelectorAll('.result')).map(r => ({
            title: r.querySelector('.result__title')?.textContent,
            url: r.querySelector('.result__url')?.href,
            snippet: r.querySelector('.result__snippet')?.textContent
        }))
    ").await?;
    
    Ok(parse_results(results))
}
```

**Effort:** Medium-High (1-2 days)
**Reliability:** High (with proper error handling)

---

### 🥉 Option 3: Self-Hosted SearXNG (Optional)
**Maximum control and privacy**

**How it works:**
- Bundle SearXNG with the app or run as separate process
- SearXNG runs locally and queries search engines
- App queries local SearXNG instance

**Pros:**
- ✅ Complete control
- ✅ Maximum privacy
- ✅ No external dependencies
- ✅ Unlimited and free

**Cons:**
- ⚠️ Complex deployment (Docker or Python)
- ⚠️ Increases app size significantly
- ⚠️ User needs to manage local instance
- ⚠️ Overkill for most use cases

**Implementation:**
- Bundle SearXNG Docker container with app
- Start on app launch: `docker run -d searxng/searxng`
- Query local instance: `http://localhost:8080/search?q=...&format=json`

**Effort:** High (2-3 days)
**Reliability:** Very High

---

### Option 4: HTML Scraping without Browser (Lightweight)
**Simplest approach, but fragile**

**How it works:**
- Direct HTTP requests to search engines
- Parse HTML with regex or HTML parser
- No browser needed

**Pros:**
- ✅ Fast (~200-500ms)
- ✅ Lightweight (no browser)
- ✅ Simple implementation

**Cons:**
- ⚠️ Easily blocked by search engines
- ⚠️ Fragile (breaks when HTML changes)
- ⚠️ Can't handle JavaScript-rendered content
- ⚠️ May violate ToS

**Implementation:**
```rust
use scraper::{Html, Selector};

async fn scrape_duckduckgo(query: &str) -> Result<Vec<SearchResult>> {
    let url = format!("https://html.duckduckgo.com/html/?q={}", query);
    let html = reqwest::get(&url).await?.text().await?;
    
    let document = Html::parse_document(&html);
    let result_selector = Selector::parse(".result").unwrap();
    
    let results = document.select(&result_selector)
        .map(|el| parse_result_element(el))
        .collect();
    
    Ok(results)
}
```

**Effort:** Low (3-4 hours)
**Reliability:** Medium (fragile)

---

## Comparison Matrix

| Option | Speed | Reliability | Complexity | Quality | Desktop Leverage |
|--------|-------|-------------|------------|---------|------------------|
| SearXNG Public | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Headless Browser | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Self-Hosted SearXNG | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| HTML Scraping | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |

---

## Recommended Implementation Strategy

### Phase 1: Quick Win (Today)
**Use Public SearXNG with Fallback**
- Implement in 2-3 hours
- Get working immediately
- High quality results
- No dependencies

### Phase 2: Enhanced (Optional)
**Add Headless Browser Fallback**
- If SearXNG instances are down, use browser scraping
- Best of both worlds: fast + reliable
- Leverages desktop capabilities

### Phase 3: Advanced (Future)
**Self-Hosted SearXNG Option**
- For users who want maximum privacy
- Optional feature, not required

---

## Code Structure

```rust
// backend/src/api/web_search.rs

pub async fn web_search(...) -> Result<Json<WebSearchResponse>> {
    // Try SearXNG first (fast)
    if let Ok(results) = search_searxng(&query, num_results).await {
        return Ok(Json(results));
    }
    
    // Fallback to headless browser (slower but reliable)
    if let Ok(results) = search_with_browser(&query, num_results).await {
        return Ok(Json(results));
    }
    
    // Last resort: simple HTML scraping
    let results = scrape_duckduckgo_html(&query, num_results).await?;
    Ok(Json(results))
}
```

---

## Next Steps

1. **Implement SearXNG** (recommended first step)
   - Simple HTTP requests
   - Multiple fallback instances
   - Working in 2-3 hours

2. **Test with real queries**
   - "Best restaurants in Toulouse"
   - "Latest AI news"
   - "Rust programming tutorials"

3. **Add browser fallback** (optional enhancement)
   - Only if SearXNG proves unreliable
   - Adds robustness

---

## Resources

- [SearXNG Documentation](https://docs.searxng.org/)
- [Public SearXNG Instances](https://searx.space/)
- [chromiumoxide (Rust)](https://github.com/mattsse/chromiumoxide)
- [scraper (HTML parsing)](https://github.com/causal-agent/scraper)
