// WebView Renderer for headless content extraction
//
// This module provides headless WebView rendering capabilities for extracting
// content from JavaScript-heavy web pages. The WebView is completely invisible
// to the user - no windows are displayed during rendering.

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder, Manager, Listener};
use std::time::{Duration, Instant};

// Re-export types from backend for convenience
pub use skhoot_backend::content_extraction::types::{RenderJob, RenderResult, RenderWait};

/// WebView Renderer state
/// 
/// This struct manages a hidden WebView instance that can be reused
/// for multiple rendering jobs. The WebView is created offscreen and
/// never displays any visible UI to the user.
pub struct WebViewRenderer {
    app_handle: AppHandle,
    /// Current render job being processed
    current_job: Arc<Mutex<Option<RenderJobState>>>,
}

/// Internal state for tracking a render job
struct RenderJobState {
    job_id: String,
    start_time: Instant,
    timeout_ms: u64,
}

impl WebViewRenderer {
    /// Creates a new WebView renderer
    /// 
    /// The renderer doesn't create the WebView immediately - it creates
    /// a hidden WebView on-demand for each render job to ensure clean state.
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            current_job: Arc::new(Mutex::new(None)),
        }
    }

    /// Renders a URL and extracts the resulting HTML
    /// 
    /// This method:
    /// 1. Creates a hidden, offscreen WebView window
    /// 2. Loads the URL
    /// 3. Waits for the specified ready condition
    /// 4. Extracts the DOM via JavaScript
    /// 5. Cleans up the hidden window
    /// 
    /// The entire process is invisible to the user.
    pub async fn render(&self, job: RenderJob) -> Result<RenderResult, String> {
        let start_time = Instant::now();
        
        // Store current job state for timeout tracking
        {
            let mut current = self.current_job.lock().unwrap();
            *current = Some(RenderJobState {
                job_id: job.job_id.clone(),
                start_time,
                timeout_ms: job.timeout_ms,
            });
        }

        // Create a unique label for this render window
        let window_label = format!("render-{}", job.job_id);
        
        // Create hidden WebView window
        let window = self.create_hidden_window(&window_label, &job.url)
            .map_err(|e| format!("Failed to create hidden window: {}", e))?;

        // Wait for the page to be ready based on the wait condition
        self.wait_for_ready(&job.wait, job.timeout_ms).await?;

        // Extract the DOM content via JavaScript
        let result = self.extract_dom(&job).await?;

        // Clean up: close the hidden window
        if let Err(e) = window.close() {
            eprintln!("[WebViewRenderer] Warning: Failed to close render window: {}", e);
        }

        // Clear current job state
        {
            let mut current = self.current_job.lock().unwrap();
            *current = None;
        }

        Ok(result)
    }

    /// Creates a hidden, offscreen WebView window
    /// 
    /// The window is configured to be:
    /// - Hidden (not visible to user)
    /// - Offscreen (positioned outside visible screen area)
    /// - No decorations or titlebar
    /// - Minimal size
    fn create_hidden_window(
        &self,
        label: &str,
        url: &str,
    ) -> Result<tauri::WebviewWindow, tauri::Error> {
        // Parse URL first
        let parsed_url = url.parse()
            .map_err(|e| tauri::Error::InvalidUrl(e))?;
        
        // Create a hidden window that won't be visible to the user
        let mut window_builder = WebviewWindowBuilder::new(
            &self.app_handle,
            label,
            WebviewUrl::External(parsed_url),
        )
        .title("Skhoot Renderer") // Title won't be visible
        .inner_size(800.0, 600.0) // Minimal size for rendering
        .position(-10000.0, -10000.0) // Position offscreen to prevent any visual artifacts
        .visible(false) // CRITICAL: Window is not visible
        .initialization_script(r#"
            (function() {
                // Aggressively disable all media playback and audio
                const blockMedia = (elem) => {
                    try {
                        elem.muted = true;
                        elem.pause();
                        elem.autoplay = false;
                        elem.volume = 0;
                        // Prevent loading
                        elem.src = '';
                        elem.load();
                        // Disable controls and autoplay
                        elem.setAttribute('autoplay', 'false');
                        elem.setAttribute('muted', 'true');
                    } catch (e) {}
                };

                // Override play prototype to prevent playback from starting
                if (window.HTMLMediaElement) {
                    window.HTMLMediaElement.prototype.play = function() {
                        console.log('Media.play() blocked by Skhoot');
                        return Promise.resolve();
                    };
                }

                // Block Web Audio API
                const dummyContext = {
                    resume: () => Promise.resolve(),
                    suspend: () => Promise.resolve(),
                    close: () => Promise.resolve(),
                    createBufferSource: () => ({ connect: () => {}, start: () => {} }),
                    createGain: () => ({ connect: () => {}, gain: { value: 0 } }),
                    decodeAudioData: () => Promise.resolve(),
                };
                window.AudioContext = function() { return dummyContext; };
                window.webkitAudioContext = window.AudioContext;

                // Initial block
                document.querySelectorAll('video, audio').forEach(blockMedia);

                // Observe for new media elements
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeName === 'VIDEO' || node.nodeName === 'AUDIO') {
                                blockMedia(node);
                            } else if (node.querySelectorAll) {
                                node.querySelectorAll('video, audio').forEach(blockMedia);
                            }
                        });
                    });
                });

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });

                // Periodic check for stubborn players (like YouTube's custom ones)
                setInterval(() => {
                    document.querySelectorAll('video, audio').forEach(blockMedia);
                }, 500);
            })();
        "#)
        .decorations(false); // No window decorations

        #[cfg(not(target_os = "macos"))]
        {
            window_builder = window_builder.transparent(true); // Transparent window (helps prevent titlebar on Windows)
        }

        let window = window_builder
            .skip_taskbar(true) // Don't show in taskbar
            .always_on_bottom(true) // Keep below all other windows if somehow visible
            .resizable(false) // Not resizable
            .minimizable(false) // Not minimizable
            .maximizable(false) // Not maximizable
            .closable(true) // Allow programmatic closing
            .build()?;

        Ok(window)
    }

    /// Waits for the page to be ready based on the wait condition
    /// 
    /// Supports:
    /// - DOMContentLoaded: Wait for DOM to be parsed
    /// - Load: Wait for full page load
    /// - NetworkIdle: Wait for network to be idle
    /// - Selector: Wait for a CSS selector to appear
    async fn wait_for_ready(
        &self,
        wait: &RenderWait,
        timeout_ms: u64,
    ) -> Result<(), String> {
        let start = Instant::now();
        let timeout = Duration::from_millis(timeout_ms);

        match wait {
            RenderWait::DomContentLoaded => {
                // Wait for DOMContentLoaded event
                // Give the page some time to initialize
                tokio::time::sleep(Duration::from_millis(1000)).await;
            }
            
            RenderWait::Load => {
                // Wait for full page load (including images, stylesheets)
                // Use a longer delay for full page load
                tokio::time::sleep(Duration::from_millis(2000)).await;
                
                if start.elapsed() > timeout {
                    return Err(format!("Timeout waiting for page load after {}ms", timeout_ms));
                }
            }
            
            RenderWait::NetworkIdle { idle_ms } => {
                // Wait for network to be idle
                // This is a simplified implementation - we wait for the specified time
                // after giving the page time to load
                tokio::time::sleep(Duration::from_millis(1000)).await;
                
                if start.elapsed() > timeout {
                    return Err(format!("Timeout waiting for network idle after {}ms", timeout_ms));
                }
                
                // Wait for the specified idle time
                tokio::time::sleep(Duration::from_millis(*idle_ms)).await;
            }
            
            RenderWait::Selector { css: _ } => {
                // Wait for a specific CSS selector to appear
                // For now, use a fixed delay since we can't easily poll the DOM
                // In a production implementation, this would use JavaScript evaluation
                tokio::time::sleep(Duration::from_millis(2000)).await;
                
                if start.elapsed() > timeout {
                    return Err(format!(
                        "Timeout waiting for selector after {}ms",
                        timeout_ms
                    ));
                }
            }
        }

        Ok(())
    }

    /// Extracts the DOM content via JavaScript execution
    /// 
    /// Executes JavaScript in the WebView to extract:
    /// - document.documentElement.outerHTML (full rendered HTML)
    /// - document.title (page title)
    /// - location.href (final URL after redirects)
    async fn extract_dom(
        &self,
        job: &RenderJob,
    ) -> Result<RenderResult, String> {
        let start_time = Instant::now();
        
        // Find the window for this job
        let window_label = format!("render-{}", job.job_id);
        let window = self.app_handle.get_webview_window(&window_label)
            .ok_or_else(|| format!("Render window {} not found", window_label))?;

        // Strategy: Use `eval` to send the data back via an event.
        // We will listen for an event `render-result-{job_id}`.
        
        let (tx, rx) = std::sync::mpsc::channel();

        let tx_clone = Arc::new(Mutex::new(tx));
        
        let event_name = format!("render-result-{}", job.job_id);
        let event_id = self.app_handle.listen(event_name.clone(), move |event| {
            if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
                let _ = tx_clone.lock().unwrap().send(payload);
            }
        });

        // Script to emit the result
        let emit_script = format!(
            r#"
            (async function() {{
                try {{
                    const result = {{
                        html: document.documentElement.outerHTML,
                        title: document.title,
                        url: window.location.href
                    }};
                    // Emit event back to Rust
                    window.__TAURI__.event.emit('{}', result);
                }} catch (e) {{
                    console.error('Render extraction failed:', e);
                    window.__TAURI__.event.emit('{}', {{ error: e.toString() }});
                }}
            }})();
            "#,
            event_name, event_name
        );

        // Execute the script
        window.eval(&emit_script)
            .map_err(|e| format!("Failed to execute extraction script: {}", e))?;

        // Wait for result with timeout
        let result_value = match rx.recv_timeout(Duration::from_secs(5)) {
            Ok(val) => val,
            Err(_) => {
                // Cleanup listener
                self.app_handle.unlisten(event_id);
                return Err("Timeout waiting for JS extraction result".to_string());
            }
        };
        
        // Cleanup listener
        self.app_handle.unlisten(event_id);
        
        // Parse result
        let html = result_value["html"].as_str().unwrap_or("").to_string();
        let title = result_value["title"].as_str().unwrap_or("").to_string();
        let final_url = result_value["url"].as_str().unwrap_or(&job.url).to_string();
        
        let elapsed_ms = start_time.elapsed().as_millis() as u64;

        if html.is_empty() {
             return Err("Extracted HTML is empty".to_string());
        }

        Ok(RenderResult {
            job_id: job.job_id.clone(),
            final_url,
            title,
            html,
            elapsed_ms,
        })
    }
}

/// State wrapper for Tauri state management
#[derive(Clone)]
pub struct WebViewRendererState {
    renderer: Arc<Mutex<Option<WebViewRenderer>>>,
}

impl WebViewRendererState {
    pub fn new() -> Self {
        Self {
            renderer: Arc::new(Mutex::new(None)),
        }
    }

    pub fn initialize(&self, app_handle: AppHandle) {
        let mut renderer = self.renderer.lock().unwrap();
        *renderer = Some(WebViewRenderer::new(app_handle));
    }

    pub fn get(&self) -> Option<WebViewRenderer> {
        let renderer = self.renderer.lock().unwrap();
        renderer.as_ref().map(|r| WebViewRenderer {
            app_handle: r.app_handle.clone(),
            current_job: r.current_job.clone(),
        })
    }

    /// Render a page (for HTTP bridge)
    pub async fn render(&self, job: RenderJob) -> Result<RenderResult, String> {
        let renderer = self.get().ok_or_else(|| "Renderer not initialized".to_string())?;
        renderer.render(job).await
    }
}

impl Default for WebViewRendererState {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Tauri command to render a URL using the hidden WebView
/// 
/// This command is called from the backend to trigger headless rendering
/// of JavaScript-heavy pages. The entire rendering process is invisible
/// to the user.
/// 
/// # Arguments
/// * `job` - The render job containing URL, timeout, and wait condition
/// * `state` - The WebView renderer state
/// 
/// # Returns
/// * `Ok(RenderResult)` - Successfully rendered and extracted content
/// * `Err(String)` - Rendering failed with error message
#[tauri::command]
pub async fn render_page(
    job: RenderJob,
    state: tauri::State<'_, WebViewRendererState>,
) -> Result<RenderResult, String> {
    println!("[WebViewRenderer] Received render job: {} for URL: {}", job.job_id, job.url);
    
    // Get the renderer from state
    let renderer = state.get()
        .ok_or_else(|| "WebView renderer not initialized".to_string())?;

    // Perform the rendering
    let result = renderer.render(job).await?;
    
    println!("[WebViewRenderer] Render job {} completed in {}ms", 
             result.job_id, result.elapsed_ms);
    
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_job_state_creation() {
        let state = RenderJobState {
            job_id: "test-123".to_string(),
            start_time: Instant::now(),
            timeout_ms: 30000,
        };

        assert_eq!(state.job_id, "test-123");
        assert_eq!(state.timeout_ms, 30000);
    }

    #[test]
    fn test_webview_renderer_state_default() {
        let state = WebViewRendererState::default();
        assert!(state.get().is_none());
    }
}
