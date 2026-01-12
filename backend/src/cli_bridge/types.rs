//! Type definitions for CLI Bridge

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Security configuration for command execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub sandbox_enabled: bool,
    pub require_confirmation_for_dangerous: bool,
    pub dangerous_command_patterns: Vec<String>,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            sandbox_enabled: true,  // Sandbox enabled by default for security
            require_confirmation_for_dangerous: true,
            dangerous_command_patterns: vec![
                "rm -rf /".to_string(),
                "dd if=".to_string(),
                "mkfs".to_string(),
                "fdisk".to_string(),
            ],
        }
    }
}

/// Handle for tracking a command execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandHandle {
    pub session_id: String,
    pub command: String,
    pub args: Vec<String>,
    #[serde(skip)]
    pub pid: Option<u32>,
    pub status: CommandStatus,
    pub start_time: DateTime<Utc>,
}

impl CommandHandle {
    pub fn new(session_id: String, command: String, args: Vec<String>) -> Self {
        Self {
            session_id,
            command,
            args,
            pid: None,
            status: CommandStatus::Pending,
            start_time: Utc::now(),
        }
    }

    pub fn with_pid(mut self, pid: u32) -> Self {
        self.pid = Some(pid);
        self.status = CommandStatus::Running;
        self
    }
}

/// Status of a command execution
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommandStatus {
    Pending,
    Running,
    Completed { exit_code: i32 },
    Failed { error: String },
    Cancelled,
}

/// Terminal output with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalOutput {
    pub timestamp: DateTime<Utc>,
    #[serde(rename = "type")]
    pub output_type: OutputType,
    pub content: String,
    pub ansi_formatted: bool,
}

impl TerminalOutput {
    pub fn stdout(content: String) -> Self {
        Self {
            timestamp: Utc::now(),
            output_type: OutputType::Stdout,
            content,
            ansi_formatted: false,
        }
    }

    pub fn stderr(content: String) -> Self {
        Self {
            timestamp: Utc::now(),
            output_type: OutputType::Stderr,
            content,
            ansi_formatted: false,
        }
    }

    pub fn system(content: String) -> Self {
        Self {
            timestamp: Utc::now(),
            output_type: OutputType::System,
            content,
            ansi_formatted: false,
        }
    }
}

/// Type of terminal output
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OutputType {
    Stdout,
    Stderr,
    System,
}

/// Internal process wrapper for managing child processes
#[derive(Debug)]
pub struct ProcessHandle {
    pub child: Arc<Mutex<tokio::process::Child>>,
    pub stdin: Arc<Mutex<Option<tokio::process::ChildStdin>>>,
    pub stdout_buffer: Arc<Mutex<Vec<TerminalOutput>>>,
    pub stderr_buffer: Arc<Mutex<Vec<TerminalOutput>>>,
}

impl ProcessHandle {
    pub fn new(child: tokio::process::Child) -> Self {
        Self {
            child: Arc::new(Mutex::new(child)),
            stdin: Arc::new(Mutex::new(None)),
            stdout_buffer: Arc::new(Mutex::new(Vec::new())),
            stderr_buffer: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn with_stdin(mut self, stdin: tokio::process::ChildStdin) -> Self {
        self.stdin = Arc::new(Mutex::new(Some(stdin)));
        self
    }
}
