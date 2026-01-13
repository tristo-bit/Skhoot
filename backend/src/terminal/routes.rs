//! Terminal HTTP Routes

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use super::manager::TerminalManager;
use super::session::SessionInfo;

/// Request to create a new terminal session
#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub shell: Option<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

/// Response for session creation
#[derive(Debug, Serialize)]
pub struct CreateSessionResponse {
    pub session_id: String,
}

/// Request to write to terminal
#[derive(Debug, Deserialize)]
pub struct WriteRequest {
    pub data: String,
}

/// Response with terminal output
#[derive(Debug, Serialize)]
pub struct ReadResponse {
    pub output: Vec<String>,
}

/// Error response
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

/// Create terminal routes
pub fn terminal_routes() -> Router<TerminalManager> {
    Router::new()
        .route("/sessions", post(create_session))
        .route("/sessions", get(list_sessions))
        .route("/sessions/:id", delete(close_session))
        .route("/sessions/:id/write", post(write_to_session))
        .route("/sessions/:id/read", get(read_from_session))
}

/// Create a new terminal session
async fn create_session(
    State(manager): State<TerminalManager>,
    Json(req): Json<CreateSessionRequest>,
) -> Result<Json<CreateSessionResponse>, (StatusCode, Json<ErrorResponse>)> {
    use super::session::SessionConfig;
    
    let config = SessionConfig {
        shell: req.shell.unwrap_or_else(|| {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        }),
        cols: req.cols.unwrap_or(80),
        rows: req.rows.unwrap_or(24),
        env: vec![],
    };
    
    match manager.create_session(Some(config)).await {
        Ok(session_id) => Ok(Json(CreateSessionResponse { session_id })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )),
    }
}

/// List all terminal sessions
async fn list_sessions(
    State(manager): State<TerminalManager>,
) -> Json<Vec<SessionInfo>> {
    Json(manager.list_sessions().await)
}

/// Close a terminal session
async fn close_session(
    State(manager): State<TerminalManager>,
    Path(session_id): Path<String>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    match manager.close_session(&session_id).await {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: e }),
        )),
    }
}

/// Write to a terminal session
async fn write_to_session(
    State(manager): State<TerminalManager>,
    Path(session_id): Path<String>,
    Json(req): Json<WriteRequest>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    match manager.write(&session_id, &req.data).await {
        Ok(()) => Ok(StatusCode::OK),
        Err(e) => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: e }),
        )),
    }
}

/// Read from a terminal session
async fn read_from_session(
    State(manager): State<TerminalManager>,
    Path(session_id): Path<String>,
) -> Result<Json<ReadResponse>, (StatusCode, Json<ErrorResponse>)> {
    match manager.read(&session_id).await {
        Ok(output) => Ok(Json(ReadResponse { output })),
        Err(e) => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: e }),
        )),
    }
}
