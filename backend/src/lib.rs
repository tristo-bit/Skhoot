// Library exports for use by binaries and external crates

pub mod cli_engine;
pub mod cli_bridge;
pub mod cli_agent;
pub mod search_engine;
pub mod disk_analyzer;
pub mod terminal;
pub mod api_key_storage;
pub mod ai;
pub mod kiro_bridge;
pub mod error;
pub mod workflows;
pub mod content_extraction;

// Re-export commonly used types
pub use search_engine::{FileSearchEngine, FileSearchConfig, FileMatch};
pub use cli_bridge::{CliBridge, SessionManager, CommandExecutor, CliError};
pub use cli_agent::{Agent, AgentConfig, AgentState, AgentExecutor, AgentSession, AgentSessionManager, SystemPrompt, Tool, ToolCall, ToolDefinition, ToolRegistry, AgentResponse, ToolCallResult, SessionStatus, ExecutorConfig, ToolResult, ToolResultMetadata};
pub use disk_analyzer::{DiskAnalyzer, DiskAnalysisConfig, DiskAnalysisReport};
pub use terminal::{TerminalManager, SessionConfig};
pub use api_key_storage::KeyStorage;
pub use ai::AIManager;
pub use error::AppError;
pub use workflows::{Workflow, WorkflowType, WorkflowStatus, WorkflowStep, WorkflowEngine, WorkflowStorage, TriggerManager, TriggerType, CreateWorkflowRequest, ExecuteWorkflowRequest};
pub use content_extraction::{PageExtract, ContentExtractionError, ExtractionMethod, Metadata, SsrfValidator, HttpFetcher, MetadataExtractor, MainContentExtractor, CacheManager, ContentExtractionSystem, SearchGatherResponse, WebSearchResult};
