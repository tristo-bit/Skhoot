// Library exports for use by binaries and external crates

pub mod cli_engine;
pub mod cli_bridge;
pub mod cli_agent;
pub mod search_engine;
pub mod disk_analyzer;
pub mod terminal;
pub mod api_key_storage;
pub mod ai;
pub mod error;

// Re-export commonly used types
pub use search_engine::{FileSearchEngine, FileSearchConfig, FileMatch};
pub use cli_bridge::{CliBridge, SessionManager, CommandExecutor, CliError};
pub use cli_agent::{Agent, AgentConfig, AgentState, AgentExecutor, AgentSession, AgentSessionManager, SystemPrompt, Tool, ToolCall, ToolDefinition, ToolRegistry, AgentResponse, ToolCallResult, SessionStatus, ExecutorConfig, ToolResult, ToolResultMetadata};
pub use disk_analyzer::{DiskAnalyzer, DiskAnalysisConfig, DiskAnalysisReport};
pub use terminal::TerminalManager;
pub use api_key_storage::KeyStorage;
pub use ai::AIManager;
pub use error::AppError;
