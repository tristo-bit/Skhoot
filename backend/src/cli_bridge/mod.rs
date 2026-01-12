//! CLI Bridge Module
//! 
//! Provides secure terminal operations and session management for Skhoot.
//! This module implements the bridge between the frontend and system terminal,
//! with security sandboxing, session tracking, and comprehensive error handling.

pub mod session;
pub mod executor;
pub mod error;
pub mod types;
pub mod pty;

#[cfg(test)]
mod tests;

pub use session::{SessionManager, SessionInfo, SessionState, CommandHistoryEntry};
pub use executor::CommandExecutor;
pub use error::{CliError, ErrorReport, ErrorSeverity};
pub use types::{CommandHandle, CommandStatus, TerminalOutput, OutputType, SecurityConfig, ProcessType};
pub use pty::PtySession;

use std::sync::Arc;
use tokio::sync::RwLock;

/// Main CLI Bridge structure that coordinates terminal operations
#[derive(Clone)]
pub struct CliBridge {
    session_manager: Arc<RwLock<SessionManager>>,
    executor: Arc<CommandExecutor>,
}

impl CliBridge {
    /// Create a new CLI Bridge instance
    pub fn new() -> Self {
        Self {
            session_manager: Arc::new(RwLock::new(SessionManager::new())),
            executor: Arc::new(CommandExecutor::new()),
        }
    }

    /// Execute a command and return a handle for tracking
    pub async fn execute_command(
        &self,
        cmd: String,
        args: Vec<String>,
    ) -> Result<CommandHandle, CliError> {
        // Validate command
        self.executor.validate_command(&cmd, &args).await?;

        // Create session
        let session_id = {
            let mut manager = self.session_manager.write().await;
            manager.create_session()
        };

        // Execute command with sandboxing
        let handle = self.executor.spawn_command(session_id.clone(), cmd, args).await?;

        // Register session
        {
            let mut manager = self.session_manager.write().await;
            manager.register_command(&session_id, handle.clone())?;
        }

        Ok(handle)
    }

    /// Execute a command with PTY (pseudo-terminal) support for full terminal emulation
    pub async fn execute_command_pty(
        &self,
        cmd: String,
        args: Vec<String>,
        cols: Option<u16>,
        rows: Option<u16>,
    ) -> Result<CommandHandle, CliError> {
        // Validate command
        self.executor.validate_command(&cmd, &args).await?;

        // Create session
        let session_id = {
            let mut manager = self.session_manager.write().await;
            manager.create_session()
        };

        // Execute command with PTY
        let handle = self.executor.spawn_command_pty(
            session_id.clone(),
            cmd,
            args,
            cols,
            rows,
        ).await?;

        // Register session
        {
            let mut manager = self.session_manager.write().await;
            manager.register_command(&session_id, handle.clone())?;
        }

        Ok(handle)
    }

    /// Resize a PTY terminal
    pub async fn resize_pty(
        &self,
        session_id: &str,
        cols: u16,
        rows: u16,
    ) -> Result<(), CliError> {
        self.executor.resize_pty(session_id, cols, rows).await
    }

    /// Write input to an interactive command
    pub async fn write_input(
        &self,
        session_id: String,
        input: String,
    ) -> Result<(), CliError> {
        let manager = self.session_manager.read().await;
        let session = manager.get_session(&session_id)?;
        
        self.executor.write_stdin(&session.command_handle, input).await
    }

    /// Read output from a command
    pub async fn read_output(
        &self,
        session_id: String,
    ) -> Result<Vec<TerminalOutput>, CliError> {
        let manager = self.session_manager.read().await;
        let session = manager.get_session(&session_id)?;
        
        self.executor.read_output(&session.command_handle).await
    }

    /// Terminate a session
    pub async fn terminate_session(
        &self,
        session_id: String,
    ) -> Result<(), CliError> {
        let mut manager = self.session_manager.write().await;
        let session = manager.get_session(&session_id)?;
        
        self.executor.terminate(&session.command_handle).await?;
        manager.remove_session(&session_id)?;
        
        Ok(())
    }

    /// List all active sessions
    pub async fn list_active_sessions(&self) -> Vec<SessionInfo> {
        let manager = self.session_manager.read().await;
        manager.list_sessions()
    }

    /// Get session state
    pub async fn get_session_state(&self, session_id: &str) -> Result<SessionState, CliError> {
        let manager = self.session_manager.read().await;
        manager.get_session_state(session_id)
    }

    /// Update session state
    pub async fn update_session_state(
        &self,
        session_id: &str,
        state: SessionState,
    ) -> Result<(), CliError> {
        let mut manager = self.session_manager.write().await;
        manager.update_session_state(session_id, state)
    }

    /// Get sessions by state
    pub async fn get_sessions_by_state(&self, state: SessionState) -> Vec<SessionInfo> {
        let manager = self.session_manager.read().await;
        manager.get_sessions_by_state(state)
    }

    /// Get command history for a session
    pub async fn get_session_history(&self, session_id: &str) -> Vec<CommandHistoryEntry> {
        let manager = self.session_manager.read().await;
        manager.get_session_history(session_id)
    }

    /// Get all command history
    pub async fn get_all_history(&self) -> Vec<CommandHistoryEntry> {
        let manager = self.session_manager.read().await;
        manager.get_all_history()
    }

    /// Get recent command history
    pub async fn get_recent_history(&self, count: usize) -> Vec<CommandHistoryEntry> {
        let manager = self.session_manager.read().await;
        manager.get_recent_history(count)
    }

    /// Clear command history
    pub async fn clear_history(&self) {
        let mut manager = self.session_manager.write().await;
        manager.clear_history();
    }

    /// Cleanup stale sessions
    pub async fn cleanup_stale_sessions(&self, timeout_secs: i64) {
        let mut manager = self.session_manager.write().await;
        manager.cleanup_stale_sessions(timeout_secs);
    }

    /// Get the current security configuration
    pub async fn get_security_config(&self) -> types::SecurityConfig {
        self.executor.get_security_config().await
    }

    /// Update the security configuration
    pub async fn set_security_config(&self, config: types::SecurityConfig) {
        self.executor.set_security_config(config).await;
    }

    /// Check if sandboxing is currently enabled
    pub async fn is_sandbox_enabled(&self) -> bool {
        self.executor.is_sandbox_enabled().await
    }
}

impl Default for CliBridge {
    fn default() -> Self {
        Self::new()
    }
}
