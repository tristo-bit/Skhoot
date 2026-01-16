//! Terminal Manager - Manages multiple terminal sessions

use super::session::{TerminalSession, SessionConfig, SessionInfo};
use super::snapshot::SessionSnapshot;
use std::collections::HashMap;
use std::sync::Arc;
use std::path::PathBuf;
use tokio::sync::RwLock;
use chrono::{Utc, Duration};

/// Manages all terminal sessions
#[derive(Clone)]
pub struct TerminalManager {
    sessions: Arc<RwLock<HashMap<String, Arc<TerminalSession>>>>,
    snapshots: Arc<RwLock<HashMap<String, SessionSnapshot>>>,
    max_sessions: usize,
    session_timeout_mins: i64,
    hibernate_after_mins: i64,
    storage_path: PathBuf,
}

impl Default for TerminalManager {
    fn default() -> Self {
        // Allow configuration via environment variables
        let max_sessions = std::env::var("TERMINAL_MAX_SESSIONS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);
        
        let timeout_mins = std::env::var("TERMINAL_TIMEOUT_MINS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(60);
        
        let hibernate_after_mins = std::env::var("TERMINAL_HIBERNATE_AFTER_MINS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(5);
        
        let storage_path = std::env::var("TERMINAL_STORAGE_PATH")
            .ok()
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
                path.push(".skhoot");
                path.push("sessions");
                path
            });
        
        Self::new(max_sessions, timeout_mins, hibernate_after_mins, storage_path)
    }
}

impl TerminalManager {
    /// Create a new terminal manager
    pub fn new(
        max_sessions: usize,
        session_timeout_mins: i64,
        hibernate_after_mins: i64,
        storage_path: PathBuf,
    ) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            snapshots: Arc::new(RwLock::new(HashMap::new())),
            max_sessions,
            session_timeout_mins,
            hibernate_after_mins,
            storage_path,
        }
    }
    
    /// Ensure we have capacity for a new session
    /// Hibernates lowest priority session if needed
    async fn ensure_capacity(&self) -> Result<(), String> {
        let sessions = self.sessions.read().await;
        
        if sessions.len() >= self.max_sessions {
            drop(sessions); // Release read lock
            
            // Find lowest priority session to hibernate
            let to_hibernate = self.find_lowest_priority_session().await?;
            self.hibernate_session(&to_hibernate).await?;
        }
        
        Ok(())
    }
    
    /// Find the lowest priority active session
    async fn find_lowest_priority_session(&self) -> Result<String, String> {
        let sessions = self.sessions.read().await;
        let snapshots = self.snapshots.read().await;
        
        let mut lowest_score = f64::MAX;
        let mut lowest_id = None;
        
        for session_id in sessions.keys() {
            if let Some(snapshot) = snapshots.get(session_id) {
                let score = snapshot.priority_score();
                if score < lowest_score {
                    lowest_score = score;
                    lowest_id = Some(session_id.clone());
                }
            }
        }
        
        lowest_id.ok_or_else(|| "No sessions to hibernate".to_string())
    }
    
    /// Hibernate a session (save to disk, close PTY)
    pub async fn hibernate_session(&self, session_id: &str) -> Result<(), String> {
        // Get snapshot
        let snapshot = {
            let snapshots = self.snapshots.read().await;
            snapshots.get(session_id)
                .ok_or_else(|| format!("Session {} not found", session_id))?
                .clone()
        };
        
        // Save to disk
        let hibernated_path = self.storage_path.join("hibernated");
        snapshot.save(&hibernated_path).await?;
        
        // Close active session
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_id);
        
        tracing::info!("Hibernated session: {}", session_id);
        Ok(())
    }
    
    /// Restore a hibernated session
    pub async fn restore_session(&self, session_id: &str) -> Result<(), String> {
        // Check if already active
        {
            let sessions = self.sessions.read().await;
            if sessions.contains_key(session_id) {
                return Ok(()); // Already active
            }
        }
        
        // Ensure capacity
        self.ensure_capacity().await?;
        
        // Load snapshot from disk
        let hibernated_path = self.storage_path.join("hibernated");
        let snapshot = SessionSnapshot::load(session_id, &hibernated_path).await?;
        
        // Create new session with same config
        let config = SessionConfig {
            shell: snapshot.shell.clone(),
            cols: snapshot.cols,
            rows: snapshot.rows,
            env: snapshot.environment.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect(),
        };
        
        let session = TerminalSession::new(config)?;
        
        // Store session
        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.to_string(), Arc::new(session));
        
        // Update snapshot
        let mut snapshots = self.snapshots.write().await;
        snapshots.insert(session_id.to_string(), snapshot);
        
        // Delete hibernated file
        SessionSnapshot::delete(session_id, &hibernated_path).await?;
        
        tracing::info!("Restored session: {}", session_id);
        Ok(())
    }
    
    /// Check if session is hibernated
    pub async fn is_hibernated(&self, session_id: &str) -> bool {
        let sessions = self.sessions.read().await;
        if sessions.contains_key(session_id) {
            return false; // Active
        }
        
        let snapshots = self.snapshots.read().await;
        snapshots.contains_key(session_id)
    }
    
    /// Get all session IDs (active + hibernated)
    pub async fn get_all_session_ids(&self) -> Vec<String> {
        let sessions = self.sessions.read().await;
        let snapshots = self.snapshots.read().await;
        
        let mut ids: Vec<String> = sessions.keys().cloned().collect();
        for id in snapshots.keys() {
            if !sessions.contains_key(id) {
                ids.push(id.clone());
            }
        }
        
        ids
    }
    
    /// Create a new terminal session
    pub async fn create_session(&self, config: Option<SessionConfig>) -> Result<String, String> {
        // First, try to cleanup stale sessions
        self.cleanup_stale_sessions().await;
        
        // Ensure we have capacity (will hibernate if needed)
        self.ensure_capacity().await?;
        
        let config = config.unwrap_or_default();
        let session = TerminalSession::new(config.clone())?;
        let session_id = session.id.clone();
        
        // Create snapshot for tracking
        let snapshot = SessionSnapshot::new(
            session_id.clone(),
            config.shell.clone(),
            std::env::current_dir()
                .ok()
                .and_then(|p| p.to_str().map(String::from))
                .unwrap_or_else(|| "/".to_string()),
            config.cols,
            config.rows,
            "user".to_string(), // Default to user, can be updated
        );
        
        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.clone(), Arc::new(session));
        
        let mut snapshots = self.snapshots.write().await;
        snapshots.insert(session_id.clone(), snapshot);
        
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
        // Auto-restore if hibernated
        if self.is_hibernated(session_id).await {
            self.restore_session(session_id).await?;
        }
        
        let session = self.get_session(session_id).await
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        
        // Update snapshot
        let mut snapshots = self.snapshots.write().await;
        if let Some(snapshot) = snapshots.get_mut(session_id) {
            // Parse command if it looks like one
            if data.ends_with('\n') {
                let cmd = data.trim().to_string();
                snapshot.add_command(cmd, vec![]);
            }
        }
        
        session.write(data).await
    }
    
    /// Read from a session
    pub async fn read(&self, session_id: &str) -> Result<Vec<String>, String> {
        // If hibernated, return history without restoring
        if self.is_hibernated(session_id).await {
            let snapshots = self.snapshots.read().await;
            if let Some(snapshot) = snapshots.get(session_id) {
                let history = snapshot.format_history();
                return Ok(vec![history]);
            }
        }
        
        let session = self.get_session(session_id).await
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        
        let output = session.read().await;
        
        // Update snapshot with output
        let mut snapshots = self.snapshots.write().await;
        if let Some(snapshot) = snapshots.get_mut(session_id) {
            for line in &output {
                snapshot.add_output("stdout".to_string(), line.clone());
            }
        }
        
        Ok(output)
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
        
        // Hibernate idle sessions
        let hibernate_threshold = self.hibernate_after_mins;
        let snapshots = self.snapshots.read().await;
        let sessions = self.sessions.read().await;
        
        let to_hibernate: Vec<String> = snapshots
            .iter()
            .filter(|(id, snapshot)| {
                // Only hibernate active sessions
                sessions.contains_key(*id) && snapshot.should_hibernate(hibernate_threshold)
            })
            .map(|(id, _)| id.clone())
            .collect();
        
        drop(snapshots);
        drop(sessions);
        
        for id in to_hibernate {
            if let Err(e) = self.hibernate_session(&id).await {
                tracing::warn!("Failed to hibernate session {}: {}", id, e);
            }
        }
        
        // Archive very old hibernated sessions
        let sessions = self.sessions.read().await;
        let mut snapshots = self.snapshots.write().await;
        
        let stale: Vec<String> = snapshots
            .iter()
            .filter(|(id, snapshot)| {
                !sessions.contains_key(*id) && snapshot.last_activity < cutoff
            })
            .map(|(id, _)| id.clone())
            .collect();
        
        for id in stale {
            // Move to archived
            if let Some(snapshot) = snapshots.remove(&id) {
                let archived_path = self.storage_path.join("archived");
                if let Err(e) = snapshot.save(&archived_path).await {
                    tracing::warn!("Failed to archive session {}: {}", id, e);
                }
                
                // Delete from hibernated
                let hibernated_path = self.storage_path.join("hibernated");
                let _ = SessionSnapshot::delete(&id, &hibernated_path).await;
                
                tracing::info!("Archived stale session: {}", id);
            }
        }
    }
    
    /// Get session count
    pub async fn session_count(&self) -> usize {
        self.sessions.read().await.len()
    }
    
    /// Get session statistics
    pub async fn get_stats(&self) -> SessionStats {
        let sessions = self.sessions.read().await;
        let now = Utc::now();
        let timeout = Duration::minutes(self.session_timeout_mins);
        let cutoff = now - timeout;
        
        let active_count = sessions.values()
            .filter(|s| s.last_activity >= cutoff)
            .count();
        
        SessionStats {
            total: sessions.len(),
            active: active_count,
            stale: sessions.len() - active_count,
            max_allowed: self.max_sessions,
            available: self.max_sessions.saturating_sub(sessions.len()),
        }
    }
}

/// Session statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct SessionStats {
    pub total: usize,
    pub active: usize,
    pub stale: usize,
    pub max_allowed: usize,
    pub available: usize,
}
