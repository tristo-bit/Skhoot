// Library exports for use by binaries and external crates

pub mod cli_engine;
pub mod search_engine;

// Re-export commonly used types
pub use search_engine::{FileSearchEngine, FileSearchConfig, FileMatch};
