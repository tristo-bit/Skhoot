//! Agent management API routes
//! Provides endpoints for creating, managing, and executing agents

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::error::AppError;

/// API routes for agent management
pub fn agent_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/agents", post(create_agent))
        .route("/agents", get(list_agents))
        .route("/agents/:id", get(get_agent))
        .route("/agents/:id", put(update_agent))
        .route("/agents/:id", delete(delete_agent))
        .route("/agents/:id/execute", post(execute_agent))
        .route("/agents/:id/status", get(get_agent_status))
        .route("/agents/:id/executions", get(list_agent_executions))
        .route("/executions/:execution_id", get(get_execution))
        .route("/executions/:execution_id", put(update_execution_status))
}

// ============================================================================
// Types
// ============================================================================

/// Agent state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AgentState {
    On,
    Off,
    Sleeping,
    Failing,
}

/// Trigger configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TriggerConfig {
    Manual,
    Keyword {
        keywords: Vec<String>,
        auto_activate: bool,
    },
    FileEvent {
        patterns: Vec<String>,
        auto_activate: bool,
    },
    Schedule {
        cron: String,
        auto_activate: bool,
    },
    Toolcall {
        auto_activate: bool,
    },
}

/// Agent configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub max_concurrent_executions: usize,
    pub timeout_seconds: u64,
    pub retry_on_failure: bool,
    pub notify_on_complete: bool,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            max_concurrent_executions: 1,
            timeout_seconds: 300, // 5 minutes
            retry_on_failure: false,
            notify_on_complete: true,
        }
    }
}

/// Agent definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    
    // Behavior
    pub master_prompt: String,
    #[serde(default)]
    pub workflows: Vec<String>,
    
    // Capabilities
    #[serde(default)]
    pub allowed_tools: Vec<String>,
    #[serde(default)]
    pub allowed_workflows: Vec<String>,
    
    // Triggers
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trigger: Option<TriggerConfig>,
    
    // State
    pub state: AgentState,
    #[serde(default)]
    pub is_default: bool,
    
    // Metadata
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<i64>,
    #[serde(default)]
    pub usage_count: u64,
    
    // Configuration
    pub config: AgentConfig,
}

/// Agent execution status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// Agent execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExecution {
    pub id: String,
    pub agent_id: String,
    pub status: ExecutionStatus,
    pub started_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_workflow_id: Option<String>,
    pub context: HashMap<String, serde_json::Value>,
    pub messages: Vec<AgentMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Agent message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub id: String,
    pub agent_id: String,
    pub content: String,
    pub timestamp: i64,
    #[serde(rename = "type")]
    pub message_type: MessageType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Input,
    Output,
    System,
}

// ============================================================================
// Request/Response Types
// ============================================================================

/// Create agent request
#[derive(Debug, Deserialize)]
pub struct CreateAgentRequest {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub master_prompt: String,
    #[serde(default)]
    pub workflows: Vec<String>,
    #[serde(default)]
    pub allowed_tools: Vec<String>,
    #[serde(default)]
    pub allowed_workflows: Vec<String>,
    pub trigger: Option<TriggerConfig>,
    #[serde(default)]
    pub config: AgentConfig,
}

/// Update agent request
#[derive(Debug, Deserialize)]
pub struct UpdateAgentRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub master_prompt: Option<String>,
    pub workflows: Option<Vec<String>>,
    pub allowed_tools: Option<Vec<String>>,
    pub allowed_workflows: Option<Vec<String>>,
    pub trigger: Option<TriggerConfig>,
    pub state: Option<AgentState>,
    pub config: Option<AgentConfig>,
}

/// List agents query parameters
#[derive(Debug, Deserialize)]
pub struct ListAgentsQuery {
    pub state: Option<String>,
    pub tags: Option<String>,
    pub search: Option<String>,
}

/// Execute agent request
#[derive(Debug, Deserialize)]
pub struct ExecuteAgentRequest {
    #[serde(default)]
    pub context: HashMap<String, serde_json::Value>,
    #[allow(dead_code)] // Will be used in Phase 2
    pub message: Option<String>,
}

/// Update execution status request
#[derive(Debug, Deserialize)]
pub struct UpdateExecutionStatusRequest {
    pub status: ExecutionStatus,
    pub error: Option<String>,
    pub messages: Option<Vec<AgentMessage>>,
}

/// Agent storage (in-memory for now, will be file-based)
pub struct AgentStorage {
    agents: Arc<RwLock<HashMap<String, Agent>>>,
    executions: Arc<RwLock<HashMap<String, AgentExecution>>>,
    base_path: PathBuf,
}

impl AgentStorage {
    pub fn new() -> Result<Self, AppError> {
        let base_path = Self::get_storage_path()?;
        std::fs::create_dir_all(&base_path)
            .map_err(|e| AppError::Internal(format!("Failed to create agents directory: {}", e)))?;
        
        Ok(Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            executions: Arc::new(RwLock::new(HashMap::new())),
            base_path,
        })
    }
    
    fn get_storage_path() -> Result<PathBuf, AppError> {
        let home = dirs::home_dir()
            .ok_or_else(|| AppError::Internal("Could not determine home directory".to_string()))?;
        Ok(home.join(".skhoot").join("agents"))
    }
    
    pub async fn save(&self, agent: &Agent) -> Result<(), AppError> {
        // Save to memory
        self.agents.write().await.insert(agent.id.clone(), agent.clone());
        
        // Save to file
        let path = self.base_path.join(format!("{}.json", agent.id));
        let json = serde_json::to_string_pretty(agent)
            .map_err(|e| AppError::Internal(format!("Failed to serialize agent: {}", e)))?;
        
        tokio::fs::write(path, json).await
            .map_err(|e| AppError::Internal(format!("Failed to write agent file: {}", e)))?;
        
        Ok(())
    }
    
    pub async fn load(&self, id: &str) -> Result<Agent, AppError> {
        // Try memory first
        if let Some(agent) = self.agents.read().await.get(id) {
            return Ok(agent.clone());
        }
        
        // Load from file
        let path = self.base_path.join(format!("{}.json", id));
        if !path.exists() {
            return Err(AppError::NotFound(format!("Agent not found: {}", id)));
        }
        
        let json = tokio::fs::read_to_string(path).await
            .map_err(|e| AppError::Internal(format!("Failed to read agent file: {}", e)))?;
        
        let agent: Agent = serde_json::from_str(&json)
            .map_err(|e| AppError::Internal(format!("Failed to parse agent file: {}", e)))?;
        
        // Cache in memory
        self.agents.write().await.insert(id.to_string(), agent.clone());
        
        Ok(agent)
    }
    
    pub async fn list(&self) -> Result<Vec<Agent>, AppError> {
        let mut agents = Vec::new();
        
        // Read from files
        let mut entries = tokio::fs::read_dir(&self.base_path).await
            .map_err(|e| AppError::Internal(format!("Failed to read agents directory: {}", e)))?;
        
        while let Some(entry) = entries.next_entry().await
            .map_err(|e| AppError::Internal(format!("Failed to read directory entry: {}", e)))? {
            
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                match tokio::fs::read_to_string(&path).await {
                    Ok(json) => {
                        if let Ok(agent) = serde_json::from_str::<Agent>(&json) {
                            agents.push(agent);
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to read agent file {:?}: {}", path, e);
                    }
                }
            }
        }
        
        // Update memory cache
        let mut cache = self.agents.write().await;
        cache.clear();
        for agent in &agents {
            cache.insert(agent.id.clone(), agent.clone());
        }
        
        Ok(agents)
    }
    
    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        // Remove from memory
        self.agents.write().await.remove(id);
        
        // Remove file
        let path = self.base_path.join(format!("{}.json", id));
        if path.exists() {
            tokio::fs::remove_file(path).await
                .map_err(|e| AppError::Internal(format!("Failed to delete agent file: {}", e)))?;
        }
        
        Ok(())
    }
    
    pub async fn save_execution(&self, execution: &AgentExecution) -> Result<(), AppError> {
        self.executions.write().await.insert(execution.id.clone(), execution.clone());
        Ok(())
    }
    
    pub async fn get_execution(&self, id: &str) -> Result<AgentExecution, AppError> {
        self.executions.read().await
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::NotFound(format!("Execution not found: {}", id)))
    }
    
    pub async fn list_agent_executions(&self, agent_id: &str) -> Result<Vec<AgentExecution>, AppError> {
        let executions = self.executions.read().await;
        let mut agent_executions: Vec<AgentExecution> = executions
            .values()
            .filter(|e| e.agent_id == agent_id)
            .cloned()
            .collect();
        
        // Sort by started_at descending (newest first)
        agent_executions.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        
        Ok(agent_executions)
    }
}

// Global storage instance (will be moved to AppState in Task 1.3)
lazy_static::lazy_static! {
    static ref STORAGE: AgentStorage = AgentStorage::new().expect("Failed to initialize agent storage");
}

// ============================================================================
// Endpoints
// ============================================================================

/// Create a new agent
pub async fn create_agent(
    State(_state): State<crate::AppState>,
    Json(request): Json<CreateAgentRequest>,
) -> Result<Json<Agent>, AppError> {
    // Validate request
    if request.name.trim().is_empty() {
        return Err(AppError::BadRequest("Agent name cannot be empty".to_string()));
    }
    if request.master_prompt.trim().is_empty() {
        return Err(AppError::BadRequest("Master prompt cannot be empty".to_string()));
    }
    
    let now = chrono::Utc::now().timestamp();
    let agent = Agent {
        id: format!("agent-{}-{}", now, uuid::Uuid::new_v4().to_string()[..8].to_string()),
        name: request.name,
        description: request.description,
        tags: request.tags,
        master_prompt: request.master_prompt,
        workflows: request.workflows,
        allowed_tools: request.allowed_tools,
        allowed_workflows: request.allowed_workflows,
        trigger: request.trigger,
        state: AgentState::On,
        is_default: false,
        created_at: now,
        updated_at: now,
        last_used_at: None,
        usage_count: 0,
        config: request.config,
    };
    
    STORAGE.save(&agent).await?;
    
    tracing::info!("Created agent: {} ({})", agent.name, agent.id);
    
    Ok(Json(agent))
}

/// List all agents
pub async fn list_agents(
    State(_state): State<crate::AppState>,
    Query(query): Query<ListAgentsQuery>,
) -> Result<Json<Vec<Agent>>, AppError> {
    let mut agents = STORAGE.list().await?;
    
    // Filter by state
    if let Some(state_str) = query.state {
        let state = match state_str.to_lowercase().as_str() {
            "on" => AgentState::On,
            "off" => AgentState::Off,
            "sleeping" => AgentState::Sleeping,
            "failing" => AgentState::Failing,
            _ => return Err(AppError::BadRequest(format!("Invalid state: {}", state_str))),
        };
        agents.retain(|a| a.state == state);
    }
    
    // Filter by tags
    if let Some(tags_str) = query.tags {
        let tags: Vec<String> = tags_str.split(',').map(|s| s.trim().to_string()).collect();
        agents.retain(|a| tags.iter().any(|t| a.tags.contains(t)));
    }
    
    // Filter by search
    if let Some(search) = query.search {
        let search_lower = search.to_lowercase();
        agents.retain(|a| {
            a.name.to_lowercase().contains(&search_lower) ||
            a.description.to_lowercase().contains(&search_lower)
        });
    }
    
    // Sort by updated_at descending
    agents.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    
    Ok(Json(agents))
}

/// Get agent details
pub async fn get_agent(
    State(_state): State<crate::AppState>,
    Path(id): Path<String>,
) -> Result<Json<Agent>, AppError> {
    let agent = STORAGE.load(&id).await?;
    Ok(Json(agent))
}

/// Update agent
pub async fn update_agent(
    State(_state): State<crate::AppState>,
    Path(id): Path<String>,
    Json(request): Json<UpdateAgentRequest>,
) -> Result<Json<Agent>, AppError> {
    let mut agent = STORAGE.load(&id).await?;
    
    // Apply updates
    if let Some(name) = request.name {
        if name.trim().is_empty() {
            return Err(AppError::BadRequest("Agent name cannot be empty".to_string()));
        }
        agent.name = name;
    }
    if let Some(description) = request.description {
        agent.description = description;
    }
    if let Some(tags) = request.tags {
        agent.tags = tags;
    }
    if let Some(master_prompt) = request.master_prompt {
        if master_prompt.trim().is_empty() {
            return Err(AppError::BadRequest("Master prompt cannot be empty".to_string()));
        }
        agent.master_prompt = master_prompt;
    }
    if let Some(workflows) = request.workflows {
        agent.workflows = workflows;
    }
    if let Some(allowed_tools) = request.allowed_tools {
        agent.allowed_tools = allowed_tools;
    }
    if let Some(allowed_workflows) = request.allowed_workflows {
        agent.allowed_workflows = allowed_workflows;
    }
    if let Some(trigger) = request.trigger {
        agent.trigger = Some(trigger);
    }
    if let Some(state) = request.state {
        agent.state = state;
    }
    if let Some(config) = request.config {
        agent.config = config;
    }
    
    agent.updated_at = chrono::Utc::now().timestamp();
    
    STORAGE.save(&agent).await?;
    
    tracing::info!("Updated agent: {} ({})", agent.name, agent.id);
    
    Ok(Json(agent))
}

/// Delete agent
pub async fn delete_agent(
    State(_state): State<crate::AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    // Check if agent exists
    let agent = STORAGE.load(&id).await?;
    
    // Prevent deletion of default agents
    if agent.is_default {
        return Err(AppError::BadRequest("Cannot delete default agents".to_string()));
    }
    
    STORAGE.delete(&id).await?;
    
    tracing::info!("Deleted agent: {} ({})", agent.name, agent.id);
    
    Ok(StatusCode::NO_CONTENT)
}

/// Execute agent
pub async fn execute_agent(
    State(_state): State<crate::AppState>,
    Path(id): Path<String>,
    Json(request): Json<ExecuteAgentRequest>,
) -> Result<Json<AgentExecution>, AppError> {
    let mut agent = STORAGE.load(&id).await?;
    
    // Check if agent is enabled
    if agent.state == AgentState::Off {
        return Err(AppError::BadRequest("Agent is disabled".to_string()));
    }
    
    let now = chrono::Utc::now().timestamp();
    let execution = AgentExecution {
        id: format!("exec-{}-{}", now, uuid::Uuid::new_v4().to_string()[..8].to_string()),
        agent_id: id.clone(),
        status: ExecutionStatus::Running,
        started_at: now,
        completed_at: None,
        current_workflow_id: agent.workflows.first().cloned(),
        context: request.context,
        messages: Vec::new(),
        error: None,
    };
    
    // Update agent metadata
    agent.last_used_at = Some(now);
    agent.usage_count += 1;
    STORAGE.save(&agent).await?;
    
    // Save execution
    STORAGE.save_execution(&execution).await?;
    
    tracing::info!("Started execution: {} for agent: {}", execution.id, agent.name);
    
    // NOTE: Actual agent execution happens in the frontend using agentChatService
    // The frontend will call update_execution_status when complete
    // This allows the frontend to:
    // - Use the agent's custom master prompt
    // - Filter tools based on agent's allowed_tools
    // - Stream responses directly to the UI
    // - Handle tool execution with proper UI feedback
    
    Ok(Json(execution))
}

/// Get agent execution status (deprecated - use list_agent_executions instead)
pub async fn get_agent_status(
    State(_state): State<crate::AppState>,
    Path(id): Path<String>,
) -> Result<Json<Vec<AgentExecution>>, AppError> {
    // Redirect to list_agent_executions
    list_agent_executions(State(_state), Path(id)).await
}

/// List all executions for an agent
pub async fn list_agent_executions(
    State(_state): State<crate::AppState>,
    Path(agent_id): Path<String>,
) -> Result<Json<Vec<AgentExecution>>, AppError> {
    // Verify agent exists
    let _agent = STORAGE.load(&agent_id).await?;
    
    // Get all executions for this agent
    let executions = STORAGE.list_agent_executions(&agent_id).await?;
    
    Ok(Json(executions))
}

/// Get a specific execution by ID
pub async fn get_execution(
    State(_state): State<crate::AppState>,
    Path(execution_id): Path<String>,
) -> Result<Json<AgentExecution>, AppError> {
    let execution = STORAGE.get_execution(&execution_id).await?;
    Ok(Json(execution))
}

/// Update execution status
pub async fn update_execution_status(
    State(_state): State<crate::AppState>,
    Path(execution_id): Path<String>,
    Json(request): Json<UpdateExecutionStatusRequest>,
) -> Result<Json<AgentExecution>, AppError> {
    let mut execution = STORAGE.get_execution(&execution_id).await?;
    
    // Update status
    execution.status = request.status;
    
    // Set completion time if status is terminal
    if matches!(execution.status, ExecutionStatus::Completed | ExecutionStatus::Failed | ExecutionStatus::Cancelled) {
        execution.completed_at = Some(chrono::Utc::now().timestamp());
    }
    
    // Update error if provided
    if let Some(error) = request.error {
        execution.error = Some(error);
    }
    
    // Update messages if provided
    if let Some(messages) = request.messages {
        execution.messages = messages;
    }
    
    // Save updated execution
    STORAGE.save_execution(&execution).await?;
    
    tracing::info!(
        "Updated execution {} status to {:?}", 
        execution_id, 
        execution.status
    );
    
    Ok(Json(execution))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_agent_state_serialization() {
        let state = AgentState::On;
        let json = serde_json::to_string(&state).unwrap();
        assert_eq!(json, "\"on\"");
        
        let deserialized: AgentState = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, AgentState::On);
    }
    
    #[test]
    fn test_trigger_config_serialization() {
        let trigger = TriggerConfig::Keyword {
            keywords: vec!["test".to_string()],
            auto_activate: true,
        };
        
        let json = serde_json::to_string(&trigger).unwrap();
        let deserialized: TriggerConfig = serde_json::from_str(&json).unwrap();
        
        match deserialized {
            TriggerConfig::Keyword { keywords, auto_activate } => {
                assert_eq!(keywords, vec!["test".to_string()]);
                assert_eq!(auto_activate, true);
            }
            _ => panic!("Wrong trigger type"),
        }
    }
}

// Include comprehensive tests
#[cfg(test)]
#[path = "agents_tests.rs"]
mod agents_tests;
