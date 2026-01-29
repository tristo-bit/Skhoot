use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

mod ai;
mod api;
mod cli_agent;
mod cli_bridge;
mod cli_engine;
mod db;
mod indexer;
mod search;
mod search_engine;
mod kiro_bridge;
mod config;
mod error;
mod terminal;
mod content_extraction;
mod workflows;

use config::AppConfig;
use error::AppError;
use db::Database;
use ai::AIManager;
use indexer::FileIndexer;
use search::SearchEngine;
use search_engine::{SearchManager, SearchManagerFactory};
use terminal::TerminalManager;
use content_extraction::ContentExtractionSystem;

#[derive(Clone)]
pub struct AppState {
    #[allow(dead_code)]
    config: Arc<AppConfig>,
    db: Database,
    ai_manager: AIManager,
    indexer: FileIndexer,
    search_engine: SearchEngine,
    file_search_manager: SearchManager,
    content_extraction_system: Arc<tokio::sync::Mutex<ContentExtractionSystem>>,
    pub terminal_manager: TerminalManager,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    database: String,
    indexer: String,
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
    limit: Option<usize>,
}

#[derive(Deserialize)]
struct ApiKeyRequest {
    api_key: String,
}

async fn health_check(State(state): State<AppState>) -> Result<Json<HealthResponse>, AppError> {
    let db_status = if state.db.is_healthy().await { "connected" } else { "disconnected" };
    let indexer_status = if state.indexer.is_running().await { "running" } else { "stopped" };
    
    Ok(Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        database: db_status.to_string(),
        indexer: indexer_status.to_string(),
    }))
}

async fn detect_provider(
    State(state): State<AppState>,
    Json(payload): Json<ApiKeyRequest>,
) -> Result<Json<ai::ProviderInfo>, AppError> {
    let provider_info = state.ai_manager.detect_provider(&payload.api_key).await?;
    Ok(Json(provider_info))
}

async fn search_files(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let results = state.search_engine.search(&params.q, params.limit.unwrap_or(10)).await?;
    Ok(Json(results))
}

async fn start_indexing(State(state): State<AppState>) -> Result<StatusCode, AppError> {
    state.indexer.start_full_index().await?;
    Ok(StatusCode::ACCEPTED)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("skhoot_backend=debug,sqlx=info")
        .init();

    info!("Starting Skhoot Backend v{}", env!("CARGO_PKG_VERSION"));

    let config = Arc::new(AppConfig::new()?);
    let db = Database::new(&config.database_url).await?;
    let ai_manager = AIManager::new();
    let indexer = FileIndexer::new(db.clone()).await?;
    let search_engine = SearchEngine::new(db.clone(), ai_manager.clone()).await?;
    
    // Initialize the new file search manager
    let working_dir = std::env::current_dir()?;
    let file_search_manager = SearchManagerFactory::create_ai_optimized(working_dir);
    
    // Initialize content extraction system
    let content_extraction_system = Arc::new(tokio::sync::Mutex::new(ContentExtractionSystem::new()));
    
    // Initialize terminal manager
    let terminal_manager = TerminalManager::default();
    
    // Spawn background task to cleanup stale sessions every 5 minutes
    {
        let manager = terminal_manager.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300)); // 5 minutes
            loop {
                interval.tick().await;
                manager.cleanup_stale_sessions().await;
            }
        });
    }

    let state = AppState {
        config,
        db,
        ai_manager,
        indexer,
        search_engine,
        file_search_manager,
        content_extraction_system,
        terminal_manager: terminal_manager.clone(),
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/ping", get(|| async { "pong" }))
        .route("/api/v1/ai/detect-provider", post(detect_provider))
        .route("/api/v1/search", get(search_files))
        .route("/api/v1/index/start", post(start_indexing))
        .nest("/api/v1", api::search::search_routes())
        .nest("/api/v1", api::disk::disk_routes())
        .nest("/api/v1", api::agents::agent_routes())
        .nest("/api/v1", api::web_search::web_search_routes())
        .nest("/api/v1/terminal", terminal::terminal_routes().with_state(terminal_manager))
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin(tower_http::cors::Any)
                .allow_methods([
                    axum::http::Method::GET,
                    axum::http::Method::POST,
                    axum::http::Method::PUT,
                    axum::http::Method::DELETE,
                    axum::http::Method::OPTIONS
                ])
                .allow_headers([axum::http::header::CONTENT_TYPE]),
        );

    let port = 3001;
    let addr = format!("127.0.0.1:{}", port);
    info!("Backend server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
