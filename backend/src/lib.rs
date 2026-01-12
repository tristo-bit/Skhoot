// Library exports for use by binaries and external crates

pub mod cli_engine;
pub mod cli_bridge;
pub mod search_engine;
pub mod disk_analyzer;

// Re-export commonly used types
pub use search_engine::{FileSearchEngine, FileSearchConfig, FileMatch};
pub use cli_bridge::{CliBridge, SessionManager, CommandExecutor, CliError};
pub use disk_analyzer::{DiskAnalyzer, DiskAnalysisReport, DiskAnalysisConfig, DiskAnalyzerError};
