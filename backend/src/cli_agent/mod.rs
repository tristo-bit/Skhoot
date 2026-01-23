//! CLI Agent Module
//!
//! Provides AI agent capabilities for Skhoot, enabling the AI to execute
//! terminal commands, read/write files, and interact with the user's system.
//!
//! This module is inspired by codex-main's agent architecture but adapted
//! for native integration with Skhoot's conversation UI.

pub mod agent;
pub mod executor;
pub mod instructions;
pub mod response;
pub mod session;
pub mod tools;
pub mod apply_patch;

pub use agent::{Agent, AgentConfig, AgentState};
pub use executor::{AgentExecutor, ExecutorConfig};
pub use instructions::SystemPrompt;
pub use response::{AgentResponse, ToolCallResult};
pub use session::{AgentSession, AgentSessionManager, SessionStatus};
pub use tools::{Tool, ToolCall, ToolDefinition, ToolRegistry, ToolResult, ToolResultMetadata};
