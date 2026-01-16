//! Terminal Session Snapshot and Hibernation

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;

/// Complete snapshot of a terminal session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSnapshot {
    pub session_id: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub shell: String,
    pub working_directory: String,
    pub environment: HashMap<String, String>,
    
    // Terminal history
    pub command_history: Vec<CommandEntry>,
    pub output_history: Vec<OutputEntry>,
    
    // Terminal dimensions
    pub cols: u16,
    pub rows: u16,
    
    // Metadata
    pub tags: Vec<String>,
    pub created_by: String, // "ai" or "user"
}

/// Command history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandEntry {
    pub command: String,
    pub args: Vec<String>,
    pub timestamp: DateTime<Utc>,
    pub exit_code: Option<i32>,
    pub duration_ms: Option<u64>,
}

/// Output history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputEntry {
    pub output_type: String, // "stdout", "stderr", "system"
    pub content: String,
    pub timestamp: DateTime<Utc>,
}

impl SessionSnapshot {
    /// Create a new snapshot
    pub fn new(
        session_id: String,
        shell: String,
        working_directory: String,
        cols: u16,
        rows: u16,
        created_by: String,
    ) -> Self {
        let now = Utc::now();
        Self {
            session_id,
            created_at: now,
            last_activity: now,
            shell,
            working_directory,
            environment: HashMap::new(),
            command_history: Vec::new(),
            output_history: Vec::new(),
            cols,
            rows,
            tags: Vec::new(),
            created_by,
        }
    }
    
    /// Add a command to history
    pub fn add_command(&mut self, command: String, args: Vec<String>) {
        self.command_history.push(CommandEntry {
            command,
            args,
            timestamp: Utc::now(),
            exit_code: None,
            duration_ms: None,
        });
        self.last_activity = Utc::now();
    }
    
    /// Add output to history
    pub fn add_output(&mut self, output_type: String, content: String) {
        self.output_history.push(OutputEntry {
            output_type,
            content,
            timestamp: Utc::now(),
        });
        self.last_activity = Utc::now();
    }
    
    /// Calculate priority score for hibernation
    /// Higher score = keep active longer
    pub fn priority_score(&self) -> f64 {
        let now = Utc::now();
        let age_hours = (now - self.last_activity).num_hours() as f64;
        let command_count = self.command_history.len() as f64;
        let is_user_created = self.created_by != "ai";
        
        // Base score
        let mut score = 100.0;
        
        // Older sessions have lower priority
        score -= age_hours * 10.0;
        
        // More active sessions have higher priority
        score += command_count * 2.0;
        
        // User-created sessions have higher priority
        if is_user_created {
            score += 50.0;
        }
        
        // Recent activity boosts priority
        let minutes_since_activity = (now - self.last_activity).num_minutes() as f64;
        if minutes_since_activity < 5.0 {
            score += 100.0; // Very recent activity
        } else if minutes_since_activity < 15.0 {
            score += 50.0; // Recent activity
        }
        
        score.max(0.0)
    }
    
    /// Check if session should be hibernated
    pub fn should_hibernate(&self, idle_threshold_mins: i64) -> bool {
        let now = Utc::now();
        let idle_minutes = (now - self.last_activity).num_minutes();
        idle_minutes >= idle_threshold_mins
    }
    
    /// Save snapshot to disk
    pub async fn save(&self, base_path: &PathBuf) -> Result<(), String> {
        let path = base_path.join(format!("{}.json", self.session_id));
        
        // Ensure directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        // Serialize to JSON
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize snapshot: {}", e))?;
        
        // Write to file
        fs::write(&path, json)
            .await
            .map_err(|e| format!("Failed to write snapshot: {}", e))?;
        
        tracing::info!("Saved session snapshot: {}", self.session_id);
        Ok(())
    }
    
    /// Load snapshot from disk
    pub async fn load(session_id: &str, base_path: &PathBuf) -> Result<Self, String> {
        let path = base_path.join(format!("{}.json", session_id));
        
        // Read file
        let json = fs::read_to_string(&path)
            .await
            .map_err(|e| format!("Failed to read snapshot: {}", e))?;
        
        // Deserialize
        let snapshot: SessionSnapshot = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to deserialize snapshot: {}", e))?;
        
        tracing::info!("Loaded session snapshot: {}", session_id);
        Ok(snapshot)
    }
    
    /// Delete snapshot from disk
    pub async fn delete(session_id: &str, base_path: &PathBuf) -> Result<(), String> {
        let path = base_path.join(format!("{}.json", session_id));
        
        if path.exists() {
            fs::remove_file(&path)
                .await
                .map_err(|e| format!("Failed to delete snapshot: {}", e))?;
            
            tracing::info!("Deleted session snapshot: {}", session_id);
        }
        
        Ok(())
    }
    
    /// Get formatted history for display
    pub fn format_history(&self) -> String {
        let mut output = String::new();
        
        output.push_str(&format!("Session: {}\n", self.session_id));
        output.push_str(&format!("Created: {}\n", self.created_at));
        output.push_str(&format!("Last Activity: {}\n", self.last_activity));
        output.push_str(&format!("Working Directory: {}\n", self.working_directory));
        output.push_str("\n--- Command History ---\n");
        
        for cmd in &self.command_history {
            output.push_str(&format!(
                "[{}] {} {}\n",
                cmd.timestamp.format("%H:%M:%S"),
                cmd.command,
                cmd.args.join(" ")
            ));
        }
        
        output.push_str("\n--- Output History ---\n");
        for out in &self.output_history {
            output.push_str(&format!(
                "[{}] [{}] {}\n",
                out.timestamp.format("%H:%M:%S"),
                out.output_type,
                out.content.trim()
            ));
        }
        
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_priority_score() {
        let mut snapshot = SessionSnapshot::new(
            "test".to_string(),
            "/bin/bash".to_string(),
            "/home/user".to_string(),
            80,
            24,
            "user".to_string(),
        );
        
        // New user session should have high priority
        let score = snapshot.priority_score();
        assert!(score > 100.0);
        
        // AI session should have lower priority
        snapshot.created_by = "ai".to_string();
        let ai_score = snapshot.priority_score();
        assert!(ai_score < score);
    }
    
    #[test]
    fn test_should_hibernate() {
        let snapshot = SessionSnapshot::new(
            "test".to_string(),
            "/bin/bash".to_string(),
            "/home/user".to_string(),
            80,
            24,
            "user".to_string(),
        );
        
        // Fresh session should not hibernate
        assert!(!snapshot.should_hibernate(5));
    }
}
