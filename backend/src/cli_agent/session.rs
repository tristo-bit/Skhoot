//! Agent Session Management
//!
//! Manages agent sessions tied to conversations, including message history
//! and tool call tracking.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;

use super::agent::{Agent, AgentConfig, AgentState};
use super::tools::{ToolCall, ToolResult};

/// A message in the agent conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    /// Unique message identifier
    pub id: String,
    /// Message role (user, assistant, system, tool)
    pub role: MessageRole,
    /// Message content
    pub content: String,
    /// Tool calls made by the assistant (if any)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    /// Tool call ID this message is responding to (for tool role)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    /// Timestamp
    pub timestamp: u64,
}

/// Message role
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
    Tool,
}

impl AgentMessage {
    /// Create a new user message
    pub fn user(content: String) -> Self {
        Self {
            id: generate_id(),
            role: MessageRole::User,
            content,
            tool_calls: None,
            tool_call_id: None,
            timestamp: current_timestamp(),
        }
    }

    /// Create a new assistant message
    pub fn assistant(content: String) -> Self {
        Self {
            id: generate_id(),
            role: MessageRole::Assistant,
            content,
            tool_calls: None,
            tool_call_id: None,
            timestamp: current_timestamp(),
        }
    }

    /// Create an assistant message with tool calls
    pub fn assistant_with_tools(content: String, tool_calls: Vec<ToolCall>) -> Self {
        Self {
            id: generate_id(),
            role: MessageRole::Assistant,
            content,
            tool_calls: Some(tool_calls),
            tool_call_id: None,
            timestamp: current_timestamp(),
        }
    }

    /// Create a tool result message
    pub fn tool_result(tool_call_id: String, content: String) -> Self {
        Self {
            id: generate_id(),
            role: MessageRole::Tool,
            content,
            tool_calls: None,
            tool_call_id: Some(tool_call_id),
            timestamp: current_timestamp(),
        }
    }

    /// Create a system message
    pub fn system(content: String) -> Self {
        Self {
            id: generate_id(),
            role: MessageRole::System,
            content,
            tool_calls: None,
            tool_call_id: None,
            timestamp: current_timestamp(),
        }
    }
}

/// Agent session tied to a conversation
pub struct AgentSession {
    /// Session identifier (matches conversation ID)
    pub id: String,
    /// The agent instance
    pub agent: Agent,
    /// Message history
    messages: Vec<AgentMessage>,
    /// Pending tool calls awaiting results
    pending_tool_calls: HashMap<String, ToolCall>,
    /// Tool call results
    tool_results: HashMap<String, ToolResult>,
    /// Session creation time
    pub created_at: u64,
    /// Last activity time
    pub last_activity: u64,
}

impl AgentSession {
    /// Create a new session
    pub fn new(id: String, config: AgentConfig) -> Self {
        let agent = Agent::with_config(format!("agent-{}", id), config);
        let now = current_timestamp();
        
        Self {
            id,
            agent,
            messages: Vec::new(),
            pending_tool_calls: HashMap::new(),
            tool_results: HashMap::new(),
            created_at: now,
            last_activity: now,
        }
    }

    /// Initialize the session
    pub fn initialize(&mut self) -> Result<(), super::agent::AgentError> {
        self.agent.initialize()
    }

    /// Get the agent state
    pub fn state(&self) -> AgentState {
        self.agent.state()
    }

    /// Add a user message
    pub fn add_user_message(&mut self, content: String) -> AgentMessage {
        let message = AgentMessage::user(content);
        self.messages.push(message.clone());
        self.touch();
        message
    }

    /// Add an assistant message
    pub fn add_assistant_message(&mut self, content: String) -> AgentMessage {
        let message = AgentMessage::assistant(content);
        self.messages.push(message.clone());
        self.touch();
        message
    }

    /// Add an assistant message with tool calls
    pub fn add_assistant_message_with_tools(
        &mut self,
        content: String,
        tool_calls: Vec<ToolCall>,
    ) -> AgentMessage {
        // Track pending tool calls
        for tc in &tool_calls {
            self.pending_tool_calls.insert(tc.id.clone(), tc.clone());
        }
        
        let message = AgentMessage::assistant_with_tools(content, tool_calls);
        self.messages.push(message.clone());
        self.touch();
        message
    }

    /// Add a tool result
    pub fn add_tool_result(&mut self, result: ToolResult) -> AgentMessage {
        let tool_call_id = result.tool_call_id.clone();
        
        // Remove from pending
        self.pending_tool_calls.remove(&tool_call_id);
        
        // Store result
        self.tool_results.insert(tool_call_id.clone(), result.clone());
        
        // Create message
        let content = if result.success {
            result.output.clone()
        } else {
            format!("Error: {}", result.error.as_deref().unwrap_or("Unknown error"))
        };
        
        let message = AgentMessage::tool_result(tool_call_id, content);
        self.messages.push(message.clone());
        self.touch();
        message
    }

    /// Get all messages
    pub fn messages(&self) -> &[AgentMessage] {
        &self.messages
    }

    /// Get messages for API request (formatted for AI provider)
    pub fn messages_for_api(&self) -> Vec<AgentMessage> {
        self.messages.clone()
    }

    /// Check if there are pending tool calls
    pub fn has_pending_tool_calls(&self) -> bool {
        !self.pending_tool_calls.is_empty()
    }

    /// Get pending tool calls
    pub fn pending_tool_calls(&self) -> Vec<&ToolCall> {
        self.pending_tool_calls.values().collect()
    }

    /// Get a specific tool result
    pub fn get_tool_result(&self, tool_call_id: &str) -> Option<&ToolResult> {
        self.tool_results.get(tool_call_id)
    }

    /// Clear message history (keep system prompt)
    pub fn clear_history(&mut self) {
        self.messages.retain(|m| m.role == MessageRole::System);
        self.pending_tool_calls.clear();
        self.tool_results.clear();
        self.touch();
    }

    /// Get message count
    pub fn message_count(&self) -> usize {
        self.messages.len()
    }

    /// Update last activity timestamp
    fn touch(&mut self) {
        self.last_activity = current_timestamp();
        self.agent.touch();
    }

    /// Get session duration
    pub fn duration(&self) -> Duration {
        Duration::from_secs(self.last_activity - self.created_at)
    }
}

/// Session status for serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStatus {
    pub id: String,
    pub state: AgentState,
    pub message_count: usize,
    pub pending_tool_calls: usize,
    pub created_at: u64,
    pub last_activity: u64,
    pub config: AgentConfig,
}

impl From<&AgentSession> for SessionStatus {
    fn from(session: &AgentSession) -> Self {
        Self {
            id: session.id.clone(),
            state: session.state(),
            message_count: session.message_count(),
            pending_tool_calls: session.pending_tool_calls.len(),
            created_at: session.created_at,
            last_activity: session.last_activity,
            config: session.agent.config.clone(),
        }
    }
}

/// Manages multiple agent sessions
pub struct AgentSessionManager {
    sessions: Arc<RwLock<HashMap<String, AgentSession>>>,
    /// Default configuration for new sessions
    default_config: AgentConfig,
}

impl AgentSessionManager {
    /// Create a new session manager
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            default_config: AgentConfig::default(),
        }
    }

    /// Create with custom default configuration
    pub fn with_default_config(config: AgentConfig) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            default_config: config,
        }
    }

    /// Set default configuration
    pub async fn set_default_config(&mut self, config: AgentConfig) {
        self.default_config = config;
    }

    /// Create a new session
    pub async fn create_session(&self, id: String) -> Result<SessionStatus, SessionError> {
        self.create_session_with_config(id, self.default_config.clone()).await
    }

    /// Create a session with custom configuration
    pub async fn create_session_with_config(
        &self,
        id: String,
        config: AgentConfig,
    ) -> Result<SessionStatus, SessionError> {
        let mut sessions = self.sessions.write().await;
        
        if sessions.contains_key(&id) {
            return Err(SessionError::AlreadyExists(id));
        }

        let mut session = AgentSession::new(id.clone(), config);
        session.initialize().map_err(|e| SessionError::InitializationFailed(e.to_string()))?;
        
        let status = SessionStatus::from(&session);
        sessions.insert(id, session);
        
        Ok(status)
    }

    /// Get a session by ID
    pub async fn get_session(&self, id: &str) -> Option<SessionStatus> {
        let sessions = self.sessions.read().await;
        sessions.get(id).map(SessionStatus::from)
    }

    /// Check if a session exists
    pub async fn has_session(&self, id: &str) -> bool {
        let sessions = self.sessions.read().await;
        sessions.contains_key(id)
    }

    /// Execute a function with mutable access to a session
    pub async fn with_session<F, R>(&self, id: &str, f: F) -> Result<R, SessionError>
    where
        F: FnOnce(&mut AgentSession) -> R,
    {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(id)
            .ok_or_else(|| SessionError::NotFound(id.to_string()))?;
        Ok(f(session))
    }

    /// Execute an async function with mutable access to a session
    pub async fn with_session_async<F, Fut, R>(&self, id: &str, f: F) -> Result<R, SessionError>
    where
        F: FnOnce(&mut AgentSession) -> Fut,
        Fut: std::future::Future<Output = R>,
    {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(id)
            .ok_or_else(|| SessionError::NotFound(id.to_string()))?;
        Ok(f(session).await)
    }

    /// Remove a session
    pub async fn remove_session(&self, id: &str) -> Result<(), SessionError> {
        let mut sessions = self.sessions.write().await;
        sessions.remove(id)
            .ok_or_else(|| SessionError::NotFound(id.to_string()))?;
        Ok(())
    }

    /// List all sessions
    pub async fn list_sessions(&self) -> Vec<SessionStatus> {
        let sessions = self.sessions.read().await;
        sessions.values().map(SessionStatus::from).collect()
    }

    /// Get active session count
    pub async fn active_count(&self) -> usize {
        let sessions = self.sessions.read().await;
        sessions.values()
            .filter(|s| s.state().is_active())
            .count()
    }

    /// Cleanup inactive sessions older than the specified duration
    pub async fn cleanup_inactive(&self, max_idle: Duration) {
        let mut sessions = self.sessions.write().await;
        let now = current_timestamp();
        let max_idle_secs = max_idle.as_secs();
        
        sessions.retain(|_, session| {
            let idle_secs = now - session.last_activity;
            idle_secs < max_idle_secs || session.state().is_active()
        });
    }
}

impl Default for AgentSessionManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Session errors
#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    #[error("Session not found: {0}")]
    NotFound(String),
    
    #[error("Session already exists: {0}")]
    AlreadyExists(String),
    
    #[error("Session initialization failed: {0}")]
    InitializationFailed(String),
    
    #[error("Session is not active")]
    NotActive,
    
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Generate a unique ID
fn generate_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    
    let count = COUNTER.fetch_add(1, Ordering::SeqCst);
    let timestamp = current_timestamp();
    format!("{}-{}", timestamp, count)
}

/// Get current timestamp in seconds
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_creation() {
        let user_msg = AgentMessage::user("Hello".to_string());
        assert_eq!(user_msg.role, MessageRole::User);
        assert_eq!(user_msg.content, "Hello");
        
        let assistant_msg = AgentMessage::assistant("Hi there".to_string());
        assert_eq!(assistant_msg.role, MessageRole::Assistant);
    }

    #[test]
    fn test_session_creation() {
        let mut session = AgentSession::new("test-session".to_string(), AgentConfig::default());
        assert!(session.initialize().is_ok());
        assert_eq!(session.state(), AgentState::Ready);
    }

    #[test]
    fn test_session_messages() {
        let mut session = AgentSession::new("test-session".to_string(), AgentConfig::default());
        session.initialize().unwrap();
        
        session.add_user_message("Hello".to_string());
        session.add_assistant_message("Hi!".to_string());
        
        assert_eq!(session.message_count(), 2);
    }

    #[tokio::test]
    async fn test_session_manager() {
        let manager = AgentSessionManager::new();
        
        // Create session
        let status = manager.create_session("session-1".to_string()).await.unwrap();
        assert_eq!(status.id, "session-1");
        assert_eq!(status.state, AgentState::Ready);
        
        // Check exists
        assert!(manager.has_session("session-1").await);
        assert!(!manager.has_session("session-2").await);
        
        // List sessions
        let sessions = manager.list_sessions().await;
        assert_eq!(sessions.len(), 1);
        
        // Remove session
        manager.remove_session("session-1").await.unwrap();
        assert!(!manager.has_session("session-1").await);
    }
}
