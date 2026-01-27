use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ActivityType {
    SearchSelection,
    FileRead,
    FileWrite,
    FileCreated,    // External/Internal creation
    FileModified,   // External modification
    Downloaded,     // Detected in Downloads folder
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub path: String,
    pub activity_type: ActivityType,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<HashMap<String, String>>, // Extra info like file size, etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryManagerConfig {
    pub max_entries: usize,
    pub storage_path: PathBuf,
}

impl Default for HistoryManagerConfig {
    fn default() -> Self {
        let mut storage_path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        storage_path.push(".skhoot");
        storage_path.push("history.json");

        Self {
            max_entries: 100,
            storage_path,
        }
    }
}

pub struct HistoryManager {
    entries: Arc<RwLock<VecDeque<HistoryEntry>>>,
    config: HistoryManagerConfig,
}

impl HistoryManager {
    pub fn new(config: Option<HistoryManagerConfig>) -> Self {
        let config = config.unwrap_or_default();
        let entries = if config.storage_path.exists() {
            if let Ok(content) = fs::read_to_string(&config.storage_path) {
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                VecDeque::new()
            }
        } else {
            VecDeque::new()
        };

        Self {
            entries: Arc::new(RwLock::new(entries)),
            config,
        }
    }

    pub async fn add_entry(&self, path: String, activity_type: ActivityType) {
        let mut entries = self.entries.write().await;
        
        // Remove existing entry for this path if it exists (to move it to top)
        // Only if it's the same activity type or we want to deduplicate by path globally?
        // Let's deduplicate by path globally for the "Recent List" view.
        if let Some(pos) = entries.iter().position(|e| e.path == path) {
            entries.remove(pos);
        }

        let entry = HistoryEntry {
            path,
            activity_type,
            timestamp: Utc::now(),
            metadata: None,
        };

        entries.push_front(entry);

        if entries.len() > self.config.max_entries {
            entries.pop_back();
        }

        // Persist asynchronously (fire and forget logic in real app, but here we wait)
        self.save(&entries);
    }

    pub async fn get_recent(&self, limit: usize) -> Vec<HistoryEntry> {
        let entries = self.entries.read().await;
        entries.iter().take(limit).cloned().collect()
    }

    fn save(&self, entries: &VecDeque<HistoryEntry>) {
        if let Some(parent) = self.config.storage_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(
            &self.config.storage_path, 
            serde_json::to_string_pretty(entries).unwrap_or_default()
        );
    }
}
