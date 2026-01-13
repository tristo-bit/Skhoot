//! Terminal Manager - Manages multiple terminal sessions

use super::session::{TerminalSession, SessionConfig, SessionInfo};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{Utc, Duration};

/// Manages all terminal sessions
#[derive(Clone)]
pub struct TerminalManager {
    sessions: Arc<RwLock<HashMap<String, Arc<TerminalSession>>>>,
    max_sessions: usize,
    session_timeout_mins: i64,
}

impl Default for TerminalManager {
    fn default() -> Self {
        Self::new(10, 60) // Max 10 sessions, 60 min timeout
    }
}

impl TerminalManager {
    /// Create a new terminal manager
    pub fn new(max_sessions: usize, session_timeout_mins: i64) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            max_sessions,
            session_timeout_mins,
        }
    }
    
    /// Create a new terminal session
    pub async fn create_session(&self, config: Option<SessionConfig>) -> Result<String, String> {
        let sessions = self.sessions.read().await;
        if sessions.len() >= self.max_sessions {
            return Err(format!("Maximum sessions ({}) reached", self.max_sessions));
        }
        drop(sessions);
        
        let config = config.unwrap_or_default();
        let session = TerminalSession::new(config)?;
        let session_id = session.id.clone();
        
        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.clone(), Arc::new(session));
        
        tracing::info!("Created terminal session: {}", session_id);
        Ok(session_id)
    }
    
    /// Get a session by ID
    pub async fn get_session(&self, session_id: &str) -> Option<Arc<TerminalSession>> {
        let sessions = self.sessions.read().await;
        sessions.get(session_id).cloned()
    }
    
    /// Write to a session
    pub async fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let session = self.get_session(session_id).await
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        session.write(data).await
    }
    
    /// Read from a session
    pub async fn read(&self, session_id: &str) -> Result<Vec<String>, String> {
        let session = self.get_session(session_id).await
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        Ok(session.read().await)
    }
    
    /// Close a session
    pub async fn close_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        tracing::info!("Closed terminal session: {}", session_id);
        Ok(())
    }
    
    /// List all sessions
    pub async fn list_sessions(&self) -> Vec<SessionInfo> {
        let sessions = self.sessions.read().await;
        sessions.values().map(|s| s.info()).collect()
    }
    
    /// Cleanup stale sessions
    pub async fn cleanup_stale_sessions(&self) {
        let timeout = Duration::minutes(self.session_timeout_mins);
        let cutoff = Utc::now() - timeout;
        
        let mut sessions = self.sessions.write().await;
        let stale: Vec<String> = sessions
            .iter()
            .filter(|(_, s)| s.last_activity < cutoff)
            .map(|(id, _)| id.clone())
            .collect();
        
        for id in stale {
            sessions.remove(&id);
            tracing::info!("Cleaned up stale session: {}", id);
        }
    }
    
    /// Get session count
    pub async fn session_count(&self) -> usize {
        self.sessions.read().await.len()
    }
}
