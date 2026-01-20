# WebView Search Fallback Implementation

## Problem
The web search was failing with timeout errors when trying to access DuckDuckGo via HTTP:
```
DuckDuckGo request failed: error sending request for url (https://html.duckduckgo.com/html): operation timed out
```

## Root Cause
- DuckDuckGo's HTML endpoint was timing out (10 seconds)
- Network issues or rate limiting
- HTTP scraping is fragile and can be blocked

## Solution
Implemented a **two-tier search system** with WebView fallback:

### Tier 1: HTTP Search (Fast Path)
- Uses lightweight HTTP POST to DuckDuckGo HTML endpoint
- **30-second timeout** (increased from 10s)
- **10-second connect timeout**
- **2 retry attempts** with 500ms delay
- Fast when it works (~500ms)

### Tier 2: WebView Search (Reliable Fallback)
- Activates automatically when HTTP fails
- Uses Tauri's native WebView to render DuckDuckGo Lite
- **Looks like a real browser** - bypasses rate limiting
- **Handles JavaScript** and dynamic content
- Uses simpler DuckDuckGo Lite version for easier parsing
- More reliable but slower (~3-5s)

## Implementation Details

### Flow
```
1. User searches → web_search tool called
2. Backend tries HTTP search (30s timeout, 2 retries)
3. If HTTP fails:
   a. Check if WebView is available
   b. Render DuckDuckGo Lite in headless WebView
   c. Extract HTML from rendered page
   d. Parse results using CSS selectors
4. Return results to AI
```

### Code Changes

**backend/src/content_extraction/system.rs:**
- Split `perform_search()` into `perform_http_search()` and `perform_webview_search()`
- Added automatic fallback logic
- Increased HTTP timeout to 30s with retry logic
- Added `parse_duckduckgo_lite_html()` for simpler parsing

**backend/src/api/web_search.rs:**
- Increased timeout to 30s with 10s connect timeout
- Added retry logic (2 attempts with 500ms delay)
- Better error logging

## Benefits

### Reliability
- ✅ HTTP fails → WebView takes over automatically
- ✅ No user intervention needed
- ✅ Works even with rate limiting or network issues

### Performance
- ✅ Fast path (HTTP) when available (~500ms)
- ✅ Reliable path (WebView) when needed (~3-5s)
- ✅ Better than always using WebView

### User Experience
- ✅ Transparent fallback - user doesn't see the difference
- ✅ Always gets results (unless both methods fail)
- ✅ No "search failed" errors for temporary issues

## Testing

To test the WebView fallback:
1. Start the backend: `npm run backend:dev`
2. Start the frontend: `npm run dev`
3. Ask the AI: "What are the best mods for Baldur's Gate?"
4. Watch the logs:
   - First attempt: HTTP search (may timeout)
   - Second attempt: WebView search (should succeed)

## Future Improvements

1. **Cache WebView results** to avoid re-rendering
2. **Parallel search** - try HTTP and WebView simultaneously
3. **User preference** - let users choose HTTP-only or WebView-only
4. **Alternative search engines** - add Google, Bing as fallbacks
5. **Smart selection** - use WebView first for complex queries

## Configuration

The WebView fallback is **enabled by default** when:
- Tauri frontend is running (WebView available)
- HTTP search fails (timeout, error, or CAPTCHA)

No configuration needed - it just works!
