// HTTP Bridge for Backend Communication
// 
// This module provides an HTTP server that exposes Tauri commands
// so the backend (running as a separate process) can call them.

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde_json::json;
use std::sync::Arc;
use tauri::AppHandle;

use crate::webview_renderer::{RenderJob, RenderResult, WebViewRendererState};

/// HTTP Bridge State
pub struct HttpBridgeState {
    pub app_handle: AppHandle,
    pub renderer_state: WebViewRendererState,
}

/// Start the HTTP bridge server
pub async fn start_http_bridge(
    app_handle: AppHandle,
    renderer_state: WebViewRendererState,
) {
    let state = Arc::new(HttpBridgeState {
        app_handle,
        renderer_state,
    });

    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/render", post(render_endpoint))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:1420")
        .await
        .expect("Failed to bind HTTP bridge server");

    println!("[Skhoot] HTTP bridge server listening on http://127.0.0.1:1420");

    axum::serve(listener, app)
        .await
        .expect("HTTP bridge server failed");
}

/// Health check endpoint
async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "tauri-http-bridge"
    }))
}

/// Render endpoint - forwards to WebView renderer
async fn render_endpoint(
    State(state): State<Arc<HttpBridgeState>>,
    Json(job): Json<RenderJob>,
) -> Result<Json<RenderResult>, (StatusCode, String)> {
    println!("[Skhoot] Received render request: job_id={}", job.job_id);

    // Call the render method
    match state.renderer_state.render(job).await {
        Ok(result) => {
            println!("[Skhoot] Render completed successfully: job_id={}", result.job_id);
            Ok(Json(result))
        }
        Err(e) => {
            eprintln!("[Skhoot] Render failed: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e))
        }
    }
}
