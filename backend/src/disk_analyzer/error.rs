//! Error types for Disk Analyzer operations

use thiserror::Error;

/// Errors that can occur during disk analysis
#[derive(Error, Debug, Clone)]
pub enum DiskAnalyzerError {
    #[error("Path not found: {0}")]
    PathNotFound(String),

    #[error("Access denied: {0}")]
    AccessDenied(String),

    #[error("Scan failed: {0}")]
    ScanFailed(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Categorization failed: {0}")]
    CategorizationFailed(String),

    #[error("Report generation failed: {0}")]
    ReportGenerationFailed(String),

    #[error("Depth limit exceeded")]
    DepthLimitExceeded,

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<std::io::Error> for DiskAnalyzerError {
    fn from(err: std::io::Error) -> Self {
        DiskAnalyzerError::Io(err.to_string())
    }
}

impl DiskAnalyzerError {
    /// Check if this error is recoverable
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            DiskAnalyzerError::AccessDenied(_) | DiskAnalyzerError::PathNotFound(_)
        )
    }
}
