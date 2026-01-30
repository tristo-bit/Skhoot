//! Workflow storage and persistence
//!
//! Handles workflow CRUD operations and persistence.

use super::types::*;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Workflow storage manager
pub struct WorkflowStorage {
    workflows: Arc<RwLock<HashMap<String, Workflow>>>,
    storage_path: std::path::PathBuf,
}

impl WorkflowStorage {
    pub fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let storage_path = home.join(".skhoot").join("workflows");
        
        if !storage_path.exists() {
            let _ = std::fs::create_dir_all(&storage_path);
        }

        Self {
            workflows: Arc::new(RwLock::new(HashMap::new())),
            storage_path,
        }
    }

    /// Initialize and load workflows
    pub async fn init_defaults(&self) {
        // First load from disk
        self.load_from_disk().await;
        
        // Then add defaults if they don't exist
        let defaults = Self::create_default_workflows();
        let mut workflows = self.workflows.write().await;
        for workflow in defaults {
            // Update default workflows even if they exist, to ensure they are the latest versions
            workflows.insert(workflow.id.clone(), workflow.clone());
            let _ = self.save_to_file(&workflow);
        }
    }

    async fn load_from_disk(&self) {
        if let Ok(entries) = std::fs::read_dir(&self.storage_path) {
            let mut workflows = self.workflows.write().await;
            for entry in entries.flatten() {
                if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = std::fs::read_to_string(entry.path()) {
                        if let Ok(workflow) = serde_json::from_str::<Workflow>(&content) {
                            workflows.insert(workflow.id.clone(), workflow);
                        }
                    }
                }
            }
        }
    }

    fn save_to_file(&self, workflow: &Workflow) -> std::io::Result<()> {
        let file_path = self.storage_path.join(format!("{}.json", workflow.id));
        let content = serde_json::to_string_pretty(workflow)?;
        std::fs::write(file_path, content)
    }

    /// Create default workflows
    fn create_default_workflows() -> Vec<Workflow> {
        vec![]
    }

    /// Get a workflow by ID
    pub async fn get(&self, id: &str) -> Option<Workflow> {
        self.workflows.read().await.get(id).cloned()
    }

    /// List all workflows
    pub async fn list(&self) -> Vec<Workflow> {
        self.workflows.read().await.values().cloned().collect()
    }

    /// List workflows by category
    pub async fn list_by_category(&self, category: &str) -> Vec<Workflow> {
        self.workflows.read().await
            .values()
            .filter(|w| w.category == category)
            .cloned()
            .collect()
    }

    /// List workflows by type
    pub async fn list_by_type(&self, workflow_type: WorkflowType) -> Vec<Workflow> {
        self.workflows.read().await
            .values()
            .filter(|w| w.workflow_type == workflow_type)
            .cloned()
            .collect()
    }

    /// Create a new workflow
    pub async fn create(&self, request: CreateWorkflowRequest) -> Workflow {
        let now = chrono::Utc::now().timestamp();
        let workflow = Workflow {
            id: uuid::Uuid::new_v4().to_string(),
            name: request.name,
            description: request.description,
            category: request.category.unwrap_or_else(|| "custom".to_string()),
            workflow_type: request.workflow_type,
            steps: request.steps,
            intent: request.intent,
            trigger: request.trigger,
            output_settings: request.output_settings,
            behavior: request.behavior,
            created_at: now,
            updated_at: now,
            run_count: 0,
            last_run: None,
            status: WorkflowStatus::Idle,
            variables: HashMap::new(),
        };

        self.workflows.write().await.insert(workflow.id.clone(), workflow.clone());
        let _ = self.save_to_file(&workflow);
        workflow
    }

    /// Update a workflow
    pub async fn update(&self, id: &str, workflow: Workflow) -> Option<Workflow> {
        let mut workflows = self.workflows.write().await;
        if workflows.contains_key(id) {
            let mut updated = workflow;
            updated.updated_at = chrono::Utc::now().timestamp();
            workflows.insert(id.to_string(), updated.clone());
            let _ = self.save_to_file(&updated);
            Some(updated)
        } else {
            None
        }
    }

    /// Delete a workflow
    pub async fn delete(&self, id: &str) -> bool {
        let deleted = self.workflows.write().await.remove(id).is_some();
        if deleted {
            let file_path = self.storage_path.join(format!("{}.json", id));
            let _ = std::fs::remove_file(file_path);
        }
        deleted
    }

    /// Update workflow status
    pub async fn update_status(&self, id: &str, status: WorkflowStatus) {
        let mut workflows = self.workflows.write().await;
        if let Some(workflow) = workflows.get_mut(id) {
            workflow.status = status;
            workflow.updated_at = chrono::Utc::now().timestamp();
            let _ = self.save_to_file(workflow);
        }
    }

    /// Increment run count
    pub async fn increment_run_count(&self, id: &str) {
        let mut workflows = self.workflows.write().await;
        if let Some(workflow) = workflows.get_mut(id) {
            workflow.run_count += 1;
            workflow.last_run = Some(chrono::Utc::now().timestamp());
            workflow.updated_at = chrono::Utc::now().timestamp();
            let _ = self.save_to_file(workflow);
        }
    }

    /// Get workflows that can be used as tool calls
    pub async fn get_toolcall_workflows(&self) -> Vec<Workflow> {
        self.workflows.read().await
            .values()
            .filter(|w| w.behavior.as_toolcall)
            .cloned()
            .collect()
    }
}

impl Default for WorkflowStorage {
    fn default() -> Self {
        Self::new()
    }
}
