//! Error types for CLI Bridge operations

use thiserror::Error;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Errors that can occur during CLI bridge operations
#[derive(Error, Debug, Clone)]
pub enum CliError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Session already exists: {0}")]
    SessionAlreadyExists(String),

    #[error("Command validation failed: {0}")]
    ValidationFailed(String),

    #[error("Dangerous command detected: {0}")]
    DangerousCommand(String),

    #[error("Command execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Process spawn failed: {0}")]
    SpawnFailed(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Timeout: command exceeded maximum execution time")]
    Timeout,

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Resource limit exceeded: {0}")]
    ResourceLimitExceeded(String),

    #[error("Invalid session state: {0}")]
    InvalidState(String),

    #[error("Stdin not available for this command")]
    StdinNotAvailable,

    #[error("Command not found: {0}")]
    CommandNotFound(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<std::io::Error> for CliError {
    fn from(err: std::io::Error) -> Self {
        CliError::Io(err.to_string())
    }
}

impl CliError {
    /// Create a detailed error with context
    pub fn with_context(self, context: &str) -> Self {
        match self {
            CliError::ExecutionFailed(msg) => {
                CliError::ExecutionFailed(format!("{}: {}", context, msg))
            }
            CliError::Internal(msg) => {
                CliError::Internal(format!("{}: {}", context, msg))
            }
            other => other,
        }
    }

    /// Check if this error is recoverable
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            CliError::Timeout
                | CliError::ResourceLimitExceeded(_)
                | CliError::ExecutionFailed(_)
        )
    }

    /// Get error severity level
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            CliError::DangerousCommand(_) | CliError::PermissionDenied(_) => ErrorSeverity::Critical,
            CliError::SessionNotFound(_) | CliError::ValidationFailed(_) => ErrorSeverity::Warning,
            CliError::Timeout | CliError::ResourceLimitExceeded(_) => ErrorSeverity::Error,
            _ => ErrorSeverity::Error,
        }
    }

    /// Convert error to a detailed error report
    pub fn to_error_report(&self) -> ErrorReport {
        ErrorReport {
            error_type: self.error_type_name(),
            message: self.to_string(),
            severity: self.severity(),
            recoverable: self.is_recoverable(),
            timestamp: Utc::now(),
            context: self.get_context(),
            suggestions: self.get_suggestions(),
        }
    }

    /// Get the error type name
    fn error_type_name(&self) -> String {
        match self {
            CliError::SessionNotFound(_) => "SessionNotFound".to_string(),
            CliError::SessionAlreadyExists(_) => "SessionAlreadyExists".to_string(),
            CliError::ValidationFailed(_) => "ValidationFailed".to_string(),
            CliError::DangerousCommand(_) => "DangerousCommand".to_string(),
            CliError::ExecutionFailed(_) => "ExecutionFailed".to_string(),
            CliError::SpawnFailed(_) => "SpawnFailed".to_string(),
            CliError::Io(_) => "IoError".to_string(),
            CliError::Timeout => "Timeout".to_string(),
            CliError::PermissionDenied(_) => "PermissionDenied".to_string(),
            CliError::ResourceLimitExceeded(_) => "ResourceLimitExceeded".to_string(),
            CliError::InvalidState(_) => "InvalidState".to_string(),
            CliError::StdinNotAvailable => "StdinNotAvailable".to_string(),
            CliError::CommandNotFound(_) => "CommandNotFound".to_string(),
            CliError::Internal(_) => "InternalError".to_string(),
        }
    }

    /// Get additional context for the error
    fn get_context(&self) -> Vec<String> {
        match self {
            CliError::SessionNotFound(id) => vec![
                format!("Session ID: {}", id),
                "The session may have been terminated or never existed".to_string(),
            ],
            CliError::DangerousCommand(pattern) => vec![
                format!("Dangerous pattern detected: {}", pattern),
                "This command requires explicit user confirmation".to_string(),
            ],
            CliError::CommandNotFound(cmd) => vec![
                format!("Command: {}", cmd),
                "The command may not be installed or not in PATH".to_string(),
            ],
            CliError::PermissionDenied(details) => vec![
                format!("Permission issue: {}", details),
                "Check file permissions and user privileges".to_string(),
            ],
            CliError::Timeout => vec![
                "Command exceeded maximum execution time".to_string(),
                "Consider increasing timeout or optimizing the command".to_string(),
            ],
            _ => vec![],
        }
    }

    /// Get suggestions for resolving the error
    fn get_suggestions(&self) -> Vec<String> {
        match self {
            CliError::SessionNotFound(_) => vec![
                "Verify the session ID is correct".to_string(),
                "Check if the session was already terminated".to_string(),
                "List active sessions to see available sessions".to_string(),
            ],
            CliError::CommandNotFound(cmd) => vec![
                format!("Install the '{}' command", cmd),
                "Check if the command is in your PATH".to_string(),
                "Verify the command name spelling".to_string(),
            ],
            CliError::DangerousCommand(_) => vec![
                "Review the command carefully before confirming".to_string(),
                "Consider using a safer alternative".to_string(),
                "Ensure you have backups before proceeding".to_string(),
            ],
            CliError::PermissionDenied(_) => vec![
                "Run with appropriate permissions".to_string(),
                "Check file/directory ownership".to_string(),
                "Verify user has necessary privileges".to_string(),
            ],
            CliError::Timeout => vec![
                "Increase the timeout limit".to_string(),
                "Optimize the command for better performance".to_string(),
                "Break the operation into smaller steps".to_string(),
            ],
            CliError::ValidationFailed(_) => vec![
                "Check command syntax".to_string(),
                "Verify all required arguments are provided".to_string(),
            ],
            _ => vec!["Check logs for more details".to_string()],
        }
    }
}

/// Error severity levels for logging and reporting
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Warning,
    Error,
    Critical,
}

/// Detailed error report with context and suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorReport {
    pub error_type: String,
    pub message: String,
    pub severity: ErrorSeverity,
    pub recoverable: bool,
    pub timestamp: DateTime<Utc>,
    pub context: Vec<String>,
    pub suggestions: Vec<String>,
}

impl ErrorReport {
    /// Format the error report as a human-readable string
    pub fn format(&self) -> String {
        let mut output = String::new();
        
        output.push_str(&format!("Error: {} ({})\n", self.error_type, 
            match self.severity {
                ErrorSeverity::Warning => "Warning",
                ErrorSeverity::Error => "Error",
                ErrorSeverity::Critical => "Critical",
            }
        ));
        output.push_str(&format!("Message: {}\n", self.message));
        output.push_str(&format!("Time: {}\n", self.timestamp.format("%Y-%m-%d %H:%M:%S UTC")));
        output.push_str(&format!("Recoverable: {}\n", self.recoverable));
        
        if !self.context.is_empty() {
            output.push_str("\nContext:\n");
            for ctx in &self.context {
                output.push_str(&format!("  - {}\n", ctx));
            }
        }
        
        if !self.suggestions.is_empty() {
            output.push_str("\nSuggestions:\n");
            for suggestion in &self.suggestions {
                output.push_str(&format!("  - {}\n", suggestion));
            }
        }
        
        output
    }
}
