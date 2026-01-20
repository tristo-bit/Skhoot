// Tauri Command Bridge
// 
// This module provides a bridge between the backend (running as a sidecar)
// and the Tauri frontend for triggering WebView rendering operations.
// 
// Since the backend runs as a separate process, we use HTTP to communicate
// with a local endpoint that the Tauri frontend exposes.

use crate::content_extraction::{RenderJob, RenderResult, ContentExtractionError};

/// Tauri Command Bridge
/// 
/// Provides methods to call Tauri commands from the backend via HTTP.
/// The Tauri frontend must expose an HTTP endpoint that forwards requests
/// to the appropriate Tauri command.
pub struct TauriBridge {
    /// Base URL for the Tauri frontend (e.g., "http://localhost:3000")
    tauri_url: String,
    
    /// HTTP client for making requests
    client: reqwest::Client,
}

impl TauriBridge {
    /// Creates a new Tauri bridge
    /// 
    /// # Arguments
    /// * `tauri_url` - Base URL where Tauri frontend is running (default: "http://localhost:1420")
    pub fn new(tauri_url: Option<String>) -> Result<Self, ContentExtractionError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60)) // Long timeout for rendering
            .build()
            .map_err(|e| ContentExtractionError::RenderFailed {
                url: "tauri_bridge".to_string(),
                reason: format!("Failed to create HTTP client: {}", e),
            })?;
        
        Ok(Self {
            tauri_url: tauri_url.unwrap_or_else(|| "http://localhost:1420".to_string()),
            client,
        })
    }
    
    /// Calls the Tauri render_page command
    /// 
    /// This method sends a render job to the Tauri frontend, which will
    /// execute the headless WebView rendering and return the result.
    /// 
    /// # Arguments
    /// * `job` - The render job to execute
    /// 
    /// # Returns
    /// * `Ok(RenderResult)` - Successfully rendered and extracted content
    /// * `Err(ContentExtractionError)` - Rendering failed
    pub async fn render_page(
        &self,
        job: RenderJob,
    ) -> Result<RenderResult, ContentExtractionError> {
        let url = format!("{}/api/render", self.tauri_url);
        
        tracing::debug!(
            "Sending render request to Tauri: job_id={}, url={}",
            job.job_id,
            job.url
        );
        
        // Send POST request to Tauri frontend
        let response = self.client
            .post(&url)
            .json(&job)
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to send render request to Tauri: {}", e);
                ContentExtractionError::RenderFailed {
                    url: job.url.clone(),
                    reason: format!("Failed to communicate with Tauri frontend: {}", e),
                }
            })?;
        
        // Check response status
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            
            tracing::error!(
                "Tauri render request failed with status {}: {}",
                status,
                error_text
            );
            
            return Err(ContentExtractionError::RenderFailed {
                url: job.url,
                reason: format!("Tauri returned status {}: {}", status, error_text),
            });
        }
        
        // Parse response
        let result: RenderResult = response.json().await.map_err(|e| {
            tracing::error!("Failed to parse render result from Tauri: {}", e);
            ContentExtractionError::RenderFailed {
                url: job.url.clone(),
                reason: format!("Failed to parse render result: {}", e),
            }
        })?;

        // Validate render result
        if result.elapsed_ms == 0 || result.html.is_empty() {
             tracing::warn!(
                "Tauri returned suspicious render result: elapsed={}ms, html_len={}",
                result.elapsed_ms,
                result.html.len()
            );
            
            return Err(ContentExtractionError::RenderFailed {
                url: job.url,
                reason: "Tauri returned invalid render result (0ms elapsed or empty HTML)".to_string(),
            });
        }
        
        tracing::info!(
            "Render completed successfully: job_id={}, elapsed={}ms",
            result.job_id,
            result.elapsed_ms
        );
        
        Ok(result)
    }
    
    /// Checks if the Tauri frontend is reachable
    /// 
    /// This is useful for determining if WebView rendering is available.
    pub async fn is_available(&self) -> bool {
        let url = format!("{}/api/health", self.tauri_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }
}

impl Default for TauriBridge {
    fn default() -> Self {
        Self::new(None).expect("Failed to create default TauriBridge")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tauri_bridge_creation() {
        let bridge = TauriBridge::new(None);
        assert!(bridge.is_ok());
        
        let bridge = bridge.unwrap();
        assert_eq!(bridge.tauri_url, "http://localhost:1420");
    }

    #[test]
    fn test_tauri_bridge_custom_url() {
        let bridge = TauriBridge::new(Some("http://localhost:8080".to_string()));
        assert!(bridge.is_ok());
        
        let bridge = bridge.unwrap();
        assert_eq!(bridge.tauri_url, "http://localhost:8080");
    }

    #[tokio::test]
    async fn test_is_available_when_not_running() {
        // This test verifies that is_available returns false when Tauri is not running
        let bridge = TauriBridge::new(Some("http://localhost:9999".to_string())).unwrap();
        
        let available = bridge.is_available().await;
        
        // Should be false since nothing is running on port 9999
        assert!(!available);
    }
}
