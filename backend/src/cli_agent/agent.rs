//! Core Agent State Machine
//!
//! Manages the agent lifecycle, state transitions, and message processing.

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;

use super::instructions::SystemPrompt;
use super::tools::{Tool, ToolCall, ToolRegistry, ToolResult};

/// Agent configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// AI provider to use (openai, anthropic, google)
    pub provider: String,
    /// Model identifier
    pub model: String,
    /// Temperature for generation (0.0 - 1.0)
    pub temperature: f32,
    /// Maximum tokens for response
    pub max_tokens: u32,
    /// Working directory for command execution
    pub working_directory: String,
    /// Enabled tools
    pub enabled_tools: Vec<Tool>,
    /// Timeout for tool execution in milliseconds
    pub tool_timeout_ms: u64,
    /// Maximum number of tool calls per turn
    pub max_tool_calls_per_turn: u32,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            provider: "google".to_string(),
            model: "gemini-2.0-flash".to_string(),
            temperature: 0.7,
            max_tokens: 4096,
            working_directory: std::env::current_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| ".".to_string()),
            enabled_tools: Tool::all(),
            tool_timeout_ms: 30000,
            max_tool_calls_per_turn: 10,
        }
    }
}

/// Agent state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentState {
    /// Agent is initializing
    Initializing,
    /// Agent is ready to receive messages
    Ready,
    /// Agent is processing a message
    Processing,
    /// Agent is executing a tool
    ExecutingTool,
    /// Agent is waiting for user input
    WaitingForInput,
    /// Agent encountered an error
    Error,
    /// Agent session has ended
    Terminated,
}

impl AgentState {
    /// Check if the agent can accept new messages
    pub fn can_accept_message(&self) -> bool {
        matches!(self, AgentState::Ready | AgentState::WaitingForInput)
    }

    /// Check if the agent is in an active state
    pub fn is_active(&self) -> bool {
        !matches!(self, AgentState::Error | AgentState::Terminated)
    }
}

/// Events emitted by the agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    /// Agent state changed
    StateChanged { 
        from: AgentState, 
        to: AgentState 
    },
    /// Agent started processing a message
    ProcessingStarted { 
        message_id: String 
    },
    /// Agent is executing a tool
    ToolExecutionStarted { 
        tool_call: ToolCall 
    },
    /// Tool execution completed
    ToolExecutionCompleted { 
        result: ToolResult 
    },
    /// Agent generated a text response
    TextGenerated { 
        text: String, 
        is_complete: bool 
    },
    /// Agent completed processing
    ProcessingCompleted { 
        message_id: String 
    },
    /// Agent encountered an error
    ErrorOccurred { 
        error: String 
    },
}

/// Core agent structure
pub struct Agent {
    /// Unique agent identifier
    pub id: String,
    /// Agent configuration
    pub config: AgentConfig,
    /// Current state
    state: AgentState,
    /// System prompt
    system_prompt: SystemPrompt,
    /// Tool registry
    tool_registry: ToolRegistry,
    /// Event sender for broadcasting agent events
    event_tx: Option<mpsc::UnboundedSender<AgentEvent>>,
    /// Creation timestamp
    created_at: Instant,
    /// Last activity timestamp
    last_activity: Instant,
}

impl Agent {
    /// Create a new agent with default configuration
    pub fn new(id: String) -> Self {
        Self::with_config(id, AgentConfig::default())
    }

    /// Create a new agent with custom configuration
    pub fn with_config(id: String, config: AgentConfig) -> Self {
        let tool_registry = ToolRegistry::with_tools(config.enabled_tools.clone());
        let now = Instant::now();
        
        Self {
            id,
            config,
            state: AgentState::Initializing,
            system_prompt: SystemPrompt::default_skhoot(),
            tool_registry,
            event_tx: None,
            created_at: now,
            last_activity: now,
        }
    }

    /// Set the event sender for broadcasting events
    pub fn with_event_sender(mut self, tx: mpsc::UnboundedSender<AgentEvent>) -> Self {
        self.event_tx = Some(tx);
        self
    }

    /// Initialize the agent and transition to Ready state
    pub fn initialize(&mut self) -> Result<(), AgentError> {
        if self.state != AgentState::Initializing {
            return Err(AgentError::InvalidStateTransition {
                from: self.state,
                to: AgentState::Ready,
            });
        }
        
        self.transition_to(AgentState::Ready);
        Ok(())
    }

    /// Get current state
    pub fn state(&self) -> AgentState {
        self.state
    }

    /// Get the tool registry
    pub fn tool_registry(&self) -> &ToolRegistry {
        &self.tool_registry
    }

    /// Get the system prompt
    pub fn system_prompt(&self) -> &SystemPrompt {
        &self.system_prompt
    }

    /// Build the complete system prompt with context
    pub fn build_system_prompt(&self) -> String {
        let os_info = std::env::consts::OS;
        self.system_prompt.build_with_context(&self.config.working_directory, os_info)
    }

    /// Get agent uptime
    pub fn uptime(&self) -> Duration {
        self.created_at.elapsed()
    }

    /// Get time since last activity
    pub fn idle_time(&self) -> Duration {
        self.last_activity.elapsed()
    }

    /// Update last activity timestamp
    pub fn touch(&mut self) {
        self.last_activity = Instant::now();
    }

    /// Transition to a new state
    fn transition_to(&mut self, new_state: AgentState) {
        let old_state = self.state;
        self.state = new_state;
        self.touch();
        
        self.emit_event(AgentEvent::StateChanged {
            from: old_state,
            to: new_state,
        });
    }

    /// Emit an event to listeners
    fn emit_event(&self, event: AgentEvent) {
        if let Some(tx) = &self.event_tx {
            let _ = tx.send(event);
        }
    }

    /// Start processing a message
    pub fn start_processing(&mut self, message_id: String) -> Result<(), AgentError> {
        if !self.state.can_accept_message() {
            return Err(AgentError::NotReady(self.state));
        }
        
        self.transition_to(AgentState::Processing);
        self.emit_event(AgentEvent::ProcessingStarted { message_id });
        Ok(())
    }

    /// Start tool execution
    pub fn start_tool_execution(&mut self, tool_call: ToolCall) -> Result<(), AgentError> {
        if self.state != AgentState::Processing {
            return Err(AgentError::InvalidStateTransition {
                from: self.state,
                to: AgentState::ExecutingTool,
            });
        }
        
        // Validate tool is enabled
        if !self.tool_registry.is_enabled(&tool_call.name) {
            return Err(AgentError::ToolNotEnabled(tool_call.name));
        }
        
        self.transition_to(AgentState::ExecutingTool);
        self.emit_event(AgentEvent::ToolExecutionStarted { tool_call });
        Ok(())
    }

    /// Complete tool execution
    pub fn complete_tool_execution(&mut self, result: ToolResult) -> Result<(), AgentError> {
        if self.state != AgentState::ExecutingTool {
            return Err(AgentError::InvalidStateTransition {
                from: self.state,
                to: AgentState::Processing,
            });
        }
        
        self.emit_event(AgentEvent::ToolExecutionCompleted { result });
        self.transition_to(AgentState::Processing);
        Ok(())
    }

    /// Emit text generation event
    pub fn emit_text(&self, text: String, is_complete: bool) {
        self.emit_event(AgentEvent::TextGenerated { text, is_complete });
    }

    /// Complete message processing
    pub fn complete_processing(&mut self, message_id: String) -> Result<(), AgentError> {
        if self.state != AgentState::Processing {
            return Err(AgentError::InvalidStateTransition {
                from: self.state,
                to: AgentState::Ready,
            });
        }
        
        self.emit_event(AgentEvent::ProcessingCompleted { message_id });
        self.transition_to(AgentState::Ready);
        Ok(())
    }

    /// Set error state
    pub fn set_error(&mut self, error: String) {
        self.emit_event(AgentEvent::ErrorOccurred { error });
        self.transition_to(AgentState::Error);
    }

    /// Terminate the agent
    pub fn terminate(&mut self) {
        self.transition_to(AgentState::Terminated);
    }

    /// Reset from error state
    pub fn reset(&mut self) -> Result<(), AgentError> {
        if self.state != AgentState::Error {
            return Err(AgentError::InvalidStateTransition {
                from: self.state,
                to: AgentState::Ready,
            });
        }
        
        self.transition_to(AgentState::Ready);
        Ok(())
    }
}

/// Agent errors
#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum AgentError {
    #[error("Invalid state transition from {from:?} to {to:?}")]
    InvalidStateTransition { from: AgentState, to: AgentState },
    
    #[error("Agent not ready, current state: {0:?}")]
    NotReady(AgentState),
    
    #[error("Tool not enabled: {0}")]
    ToolNotEnabled(String),
    
    #[error("Tool execution failed: {0}")]
    ToolExecutionFailed(String),
    
    #[error("Configuration error: {0}")]
    ConfigError(String),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_creation() {
        let agent = Agent::new("test-agent".to_string());
        assert_eq!(agent.state(), AgentState::Initializing);
    }

    #[test]
    fn test_agent_initialization() {
        let mut agent = Agent::new("test-agent".to_string());
        assert!(agent.initialize().is_ok());
        assert_eq!(agent.state(), AgentState::Ready);
    }

    #[test]
    fn test_state_transitions() {
        let mut agent = Agent::new("test-agent".to_string());
        agent.initialize().unwrap();
        
        // Start processing
        agent.start_processing("msg-1".to_string()).unwrap();
        assert_eq!(agent.state(), AgentState::Processing);
        
        // Complete processing
        agent.complete_processing("msg-1".to_string()).unwrap();
        assert_eq!(agent.state(), AgentState::Ready);
    }

    #[test]
    fn test_tool_execution_flow() {
        let mut agent = Agent::new("test-agent".to_string());
        agent.initialize().unwrap();
        agent.start_processing("msg-1".to_string()).unwrap();
        
        let tool_call = ToolCall {
            id: "call-1".to_string(),
            name: "shell".to_string(),
            arguments: serde_json::json!({"command": "echo hello"}),
        };
        
        agent.start_tool_execution(tool_call).unwrap();
        assert_eq!(agent.state(), AgentState::ExecutingTool);
        
        let result = ToolResult {
            tool_call_id: "call-1".to_string(),
            success: true,
            output: "hello".to_string(),
            error: None,
            metadata: None,
        };
        
        agent.complete_tool_execution(result).unwrap();
        assert_eq!(agent.state(), AgentState::Processing);
    }

    #[test]
    fn test_error_handling() {
        let mut agent = Agent::new("test-agent".to_string());
        agent.initialize().unwrap();
        
        agent.set_error("Test error".to_string());
        assert_eq!(agent.state(), AgentState::Error);
        
        agent.reset().unwrap();
        assert_eq!(agent.state(), AgentState::Ready);
    }
}
