use axum::{extract::{State, Path}, Json, routing::{get, post, delete, put}, Router};
use serde_json::Value;
use std::collections::HashMap;

use crate::AppState;
use crate::error::AppError;
use crate::workflows::types::*;

pub fn workflow_routes() -> Router<AppState> {
    Router::new()
        .route("/workflows", get(list_workflows).post(create_workflow))
        .route("/workflows/:id", get(get_workflow).put(update_workflow).delete(delete_workflow))
        .route("/workflows/execute", post(execute_workflow))
        .route("/workflows/executions/:id", get(get_execution).put(update_execution).delete(cancel_execution))
        .route("/workflows/executions/active", get(list_active_executions))
}

// ... existing code ...

async fn update_execution(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(context): Json<ExecutionContext>,
) -> Result<Json<bool>, AppError> {
    if context.execution_id != id {
        return Err(AppError::BadRequest("Execution ID mismatch".to_string()));
    }
    state.workflow_engine.update_execution(context).await
        .map_err(|e| AppError::Internal(e))?;
    Ok(Json(true))
}

async fn list_workflows(State(state): State<AppState>) -> Result<Json<Vec<Workflow>>, AppError> {
    let workflows = state.workflow_storage.list().await;
    Ok(Json(workflows))
}

async fn create_workflow(
    State(state): State<AppState>,
    Json(request): Json<CreateWorkflowRequest>,
) -> Result<Json<Workflow>, AppError> {
    let workflow = state.workflow_storage.create(request).await;
    Ok(Json(workflow))
}

async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Workflow>, AppError> {
    let workflow = state.workflow_storage.get(&id).await
        .ok_or_else(|| AppError::NotFound(format!("Workflow {} not found", id)))?;
    Ok(Json(workflow))
}

async fn update_workflow(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(workflow): Json<Workflow>,
) -> Result<Json<Workflow>, AppError> {
    let updated = state.workflow_storage.update(&id, workflow).await
        .ok_or_else(|| AppError::NotFound(format!("Workflow {} not found", id)))?;
    Ok(Json(updated))
}

async fn delete_workflow(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<bool>, AppError> {
    let success = state.workflow_storage.delete(&id).await;
    Ok(Json(success))
}

async fn execute_workflow(
    State(state): State<AppState>,
    Json(request): Json<ExecuteWorkflowRequest>,
) -> Result<Json<ExecutionContext>, AppError> {
    let context = state.workflow_engine.execute(request).await
        .map_err(|e| AppError::Internal(e))?;
    Ok(Json(context))
}

async fn get_execution(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ExecutionContext>, AppError> {
    let context = state.workflow_engine.get_execution(&id).await
        .ok_or_else(|| AppError::NotFound(format!("Execution {} not found", id)))?;
    Ok(Json(context))
}

async fn list_active_executions(State(state): State<AppState>) -> Result<Json<Vec<ExecutionContext>>, AppError> {
    let executions = state.workflow_engine.list_active().await;
    Ok(Json(executions))
}

async fn cancel_execution(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<bool>, AppError> {
    state.workflow_engine.cancel(&id).await
        .map_err(|e| AppError::Internal(e))?;
    Ok(Json(true))
}
