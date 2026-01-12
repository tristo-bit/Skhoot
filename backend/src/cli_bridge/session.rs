//! Session management for terminal operations

use super::error::CliError;
use super::types::{CommandHandle, CommandStatus};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Manages terminal sessions and their lifecycle
#[derive(Debug)]
pub struct SessionManager {
    sessions: HashMap<String, Session>,
    command_history: Vec<CommandHistoryEntry>,
}

impl SessionManager {
    /// Create a new session manager
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            command_history: Vec::new(),
        }
    }

    /// Create a new session and return its ID
    pub fn create_session(&mut self) -> String {
        let session_id = Uuid::new_v4().to_string();
        let session = Session::new(session_id.clone());
        self.sessions.insert(session_id.clone(), session);
        session_id
    }

    /// Register a command handle with a session
    pub fn register_command(
        &mut self,
        session_id: &str,
        handle: CommandHandle,
    ) -> Result<(), CliError> {
        let session = self.sessions.get_mut(session_id).ok_or_else(|| {
            CliError::SessionNotFound(session_id.to_string())
        })?;

        // Add to command history
        self.command_history.push(CommandHistoryEntry {
            session_id: session_id.to_string(),
            command: handle.command.clone(),
            args: handle.args.clone(),
            timestamp: Utc::now(),
            status: handle.status.clone(),
        });

        session.command_handle = handle;
        session.last_activity = Utc::now();
        session.state = SessionState::Running;
        Ok(())
    }

    /// Get a session by ID
    pub fn get_session(&self, session_id: &str) -> Result<&Session, CliError> {
        self.sessions
            .get(session_id)
            .ok_or_else(|| CliError::SessionNotFound(session_id.to_string()))
    }

    /// Get a mutable session by ID
    pub fn get_session_mut(&mut self, session_id: &str) -> Result<&mut Session, CliError> {
        self.sessions
            .get_mut(session_id)
            .ok_or_else(|| CliError::SessionNotFound(session_id.to_string()))
    }

    /// Remove a session
    pub fn remove_session(&mut self, session_id: &str) -> Result<(), CliError> {
        let session = self.sessions
            .remove(session_id)
            .ok_or_else(|| CliError::SessionNotFound(session_id.to_string()))?;
        
        // Update command history with final status
        if let Some(entry) = self.command_history.iter_mut()
            .filter(|e| e.session_id == session_id)
            .last() {
            entry.status = session.command_handle.status.clone();
        }
        
        Ok(())
    }

    /// List all active sessions
    pub fn list_sessions(&self) -> Vec<SessionInfo> {
        self.sessions
            .values()
            .map(|session| SessionInfo {
                session_id: session.session_id.clone(),
                created_at: session.created_at,
                last_activity: session.last_activity,
                command: session.command_handle.command.clone(),
                status: session.command_handle.status.clone(),
                state: session.state.clone(),
            })
            .collect()
    }

    /// Clean up stale sessions (older than timeout)
    pub fn cleanup_stale_sessions(&mut self, timeout_secs: i64) {
        let now = Utc::now();
        self.sessions.retain(|_, session| {
            let age = now.signed_duration_since(session.last_activity);
            age.num_seconds() < timeout_secs
        });
    }

    /// Get the number of active sessions
    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }

    /// Get session state by ID
    pub fn get_session_state(&self, session_id: &str) -> Result<SessionState, CliError> {
        let session = self.get_session(session_id)?;
        Ok(session.state.clone())
    }

    /// Update session state
    pub fn update_session_state(
        &mut self,
        session_id: &str,
        state: SessionState,
    ) -> Result<(), CliError> {
        let session = self.get_session_mut(session_id)?;
        session.state = state;
        session.last_activity = Utc::now();
        Ok(())
    }

    /// Get all sessions in a specific state
    pub fn get_sessions_by_state(&self, state: SessionState) -> Vec<SessionInfo> {
        self.sessions
            .values()
            .filter(|s| s.state == state)
            .map(|session| SessionInfo {
                session_id: session.session_id.clone(),
                created_at: session.created_at,
                last_activity: session.last_activity,
                command: session.command_handle.command.clone(),
                status: session.command_handle.status.clone(),
                state: session.state.clone(),
            })
            .collect()
    }

    /// Get command history for a session
    pub fn get_session_history(&self, session_id: &str) -> Vec<CommandHistoryEntry> {
        self.command_history
            .iter()
            .filter(|e| e.session_id == session_id)
            .cloned()
            .collect()
    }

    /// Get all command history
    pub fn get_all_history(&self) -> Vec<CommandHistoryEntry> {
        self.command_history.clone()
    }

    /// Get recent command history (last N commands)
    pub fn get_recent_history(&self, count: usize) -> Vec<CommandHistoryEntry> {
        let start = self.command_history.len().saturating_sub(count);
        self.command_history[start..].to_vec()
    }

    /// Clear command history
    pub fn clear_history(&mut self) {
        self.command_history.clear();
    }

    /// Get command history count
    pub fn history_count(&self) -> usize {
        self.command_history.len()
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Represents an active terminal session
#[derive(Debug, Clone)]
pub struct Session {
    pub session_id: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub command_handle: CommandHandle,
    pub state: SessionState,
}

impl Session {
    fn new(session_id: String) -> Self {
        let now = Utc::now();
        Self {
            session_id: session_id.clone(),
            created_at: now,
            last_activity: now,
            command_handle: CommandHandle::new(session_id, String::new(), Vec::new()),
            state: SessionState::Created,
        }
    }
}

/// Session state for lifecycle tracking
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionState {
    Created,
    Running,
    Completed,
    Failed,
    Terminated,
}

/// Information about a session for external queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub command: String,
    pub status: super::types::CommandStatus,
    pub state: SessionState,
}

/// Command history entry for tracking executed commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandHistoryEntry {
    pub session_id: String,
    pub command: String,
    pub args: Vec<String>,
    pub timestamp: DateTime<Utc>,
    pub status: CommandStatus,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_manager_creation() {
        let manager = SessionManager::new();
        assert_eq!(manager.session_count(), 0);
    }

    #[test]
    fn test_create_session() {
        let mut manager = SessionManager::new();
        let session_id = manager.create_session();
        assert!(!session_id.is_empty());
        assert_eq!(manager.session_count(), 1);
    }

    #[test]
    fn test_get_session() {
        let mut manager = SessionManager::new();
        let session_id = manager.create_session();
        let session = manager.get_session(&session_id);
        assert!(session.is_ok());
    }

    #[test]
    fn test_remove_session() {
        let mut manager = SessionManager::new();
        let session_id = manager.create_session();
        assert_eq!(manager.session_count(), 1);
        
        let result = manager.remove_session(&session_id);
        assert!(result.is_ok());
        assert_eq!(manager.session_count(), 0);
    }

    #[test]
    fn test_session_not_found() {
        let manager = SessionManager::new();
        let result = manager.get_session("nonexistent");
        assert!(matches!(result, Err(CliError::SessionNotFound(_))));
    }
}
