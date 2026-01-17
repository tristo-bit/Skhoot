//! Workflow trigger management
//!
//! Handles automatic workflow triggering based on various conditions.

use super::types::*;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Manages workflow triggers and automatic execution
pub struct TriggerManager {
    /// Registered triggers by workflow ID
    triggers: Arc<RwLock<HashMap<String, TriggerType>>>,
    /// Storage reference
    storage: Arc<super::storage::WorkflowStorage>,
}

impl TriggerManager {
    pub fn new(storage: Arc<super::storage::WorkflowStorage>) -> Self {
        Self {
            triggers: Arc::new(RwLock::new(HashMap::new())),
            storage,
        }
    }

    /// Initialize triggers from stored workflows
    pub async fn init(&self) {
        let workflows = self.storage.list_by_type(WorkflowType::Hook).await;
        let mut triggers = self.triggers.write().await;
        
        for workflow in workflows {
            if let Some(trigger) = workflow.trigger {
                triggers.insert(workflow.id, trigger);
            }
        }
    }

    /// Register a trigger for a workflow
    pub async fn register(&self, workflow_id: String, trigger: TriggerType) {
        self.triggers.write().await.insert(workflow_id, trigger);
    }

    /// Unregister a trigger
    pub async fn unregister(&self, workflow_id: &str) {
        self.triggers.write().await.remove(workflow_id);
    }

    /// Check if a file save event should trigger any workflows
    pub async fn check_file_save(&self, file_path: &str) -> Vec<String> {
        let triggers = self.triggers.read().await;
        let mut triggered = Vec::new();

        for (workflow_id, trigger) in triggers.iter() {
            if let TriggerType::OnFileSave { patterns } = trigger {
                if Self::matches_patterns(file_path, patterns) {
                    triggered.push(workflow_id.clone());
                }
            }
        }

        triggered
    }

    /// Check if a file create event should trigger any workflows
    pub async fn check_file_create(&self, file_path: &str) -> Vec<String> {
        let triggers = self.triggers.read().await;
        let mut triggered = Vec::new();

        for (workflow_id, trigger) in triggers.iter() {
            if let TriggerType::OnFileCreate { patterns } = trigger {
                if Self::matches_patterns(file_path, patterns) {
                    triggered.push(workflow_id.clone());
                }
            }
        }

        triggered
    }

    /// Check if a message should trigger any workflows
    pub async fn check_message(&self, message: &str) -> Vec<String> {
        let triggers = self.triggers.read().await;
        let mut triggered = Vec::new();
        let message_lower = message.to_lowercase();

        for (workflow_id, trigger) in triggers.iter() {
            match trigger {
                TriggerType::OnMessage { keywords } => {
                    if keywords.iter().any(|k| message_lower.contains(&k.to_lowercase())) {
                        triggered.push(workflow_id.clone());
                    }
                }
                TriggerType::OnAIDetection { intent_patterns } => {
                    if intent_patterns.iter().any(|p| message_lower.contains(&p.to_lowercase())) {
                        triggered.push(workflow_id.clone());
                    }
                }
                _ => {}
            }
        }

        triggered
    }

    /// Check if an error should trigger any workflows
    pub async fn check_error(&self, error_message: &str) -> Vec<String> {
        let triggers = self.triggers.read().await;
        let mut triggered = Vec::new();

        for (workflow_id, trigger) in triggers.iter() {
            if let TriggerType::OnError { error_patterns } = trigger {
                if error_patterns.iter().any(|p| error_message.contains(p)) {
                    triggered.push(workflow_id.clone());
                }
            }
        }

        triggered
    }

    /// Check if git commit should trigger any workflows
    pub async fn check_git_commit(&self) -> Vec<String> {
        let triggers = self.triggers.read().await;
        triggers.iter()
            .filter_map(|(id, t)| {
                if matches!(t, TriggerType::OnGitCommit) {
                    Some(id.clone())
                } else {
                    None
                }
            })
            .collect()
    }

    /// Helper to check if a path matches any of the patterns
    fn matches_patterns(path: &str, patterns: &[String]) -> bool {
        patterns.iter().any(|pattern| {
            if pattern.contains('*') {
                // Simple glob matching
                let parts: Vec<&str> = pattern.split('*').collect();
                if parts.len() == 2 {
                    let (prefix, suffix) = (parts[0], parts[1]);
                    path.starts_with(prefix) && path.ends_with(suffix)
                } else {
                    path.contains(pattern.trim_matches('*'))
                }
            } else {
                path.ends_with(pattern) || path.contains(pattern)
            }
        })
    }

    /// Get all registered triggers
    pub async fn list(&self) -> HashMap<String, TriggerType> {
        self.triggers.read().await.clone()
    }
}
