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
}

impl WorkflowStorage {
    pub fn new() -> Self {
        let storage = Self {
            workflows: Arc::new(RwLock::new(HashMap::new())),
        };
        
        // Initialize with default workflows synchronously
        // The actual initialization happens in init_defaults
        storage
    }

    /// Initialize default workflows
    pub async fn init_defaults(&self) {
        let defaults = Self::create_default_workflows();
        let mut workflows = self.workflows.write().await;
        for workflow in defaults {
            workflows.insert(workflow.id.clone(), workflow);
        }
    }

    /// Create default workflows
    fn create_default_workflows() -> Vec<Workflow> {
        vec![
            Self::create_steering_file_workflow(),
            Self::create_auto_workflow_workflow(),
            Self::create_error_search_workflow(),
        ]
    }

    fn create_steering_file_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Create Agent Steering File".to_string(),
            WorkflowType::Process,
        );
        workflow.id = "default-steering-file".to_string();
        workflow.category = "default".to_string();
        workflow.description = "Create a structured steering file for agent behavior configuration".to_string();
        workflow.intent = Some("create steering file, agent configuration, behavior rules".to_string());
        workflow.steps = vec![
            WorkflowStep {
                id: "s1".to_string(),
                name: "Analyze Context".to_string(),
                prompt: "Analyze the current project structure and identify the purpose and context for the steering file. What behaviors should the agent follow?".to_string(),
                order: 1,
                decision: None,
                next_step: Some("s2".to_string()),
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s2".to_string(),
                name: "Define Rules".to_string(),
                prompt: "Based on the analysis, define specific rules and guidelines for the agent. Include coding standards, file organization, and interaction patterns.".to_string(),
                order: 2,
                decision: None,
                next_step: Some("s3".to_string()),
                output_format: Some("yaml".to_string()),
                requires_confirmation: true,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s3".to_string(),
                name: "Generate File".to_string(),
                prompt: "Generate the complete steering file in the proper format. Save it to .kiro/steering/ directory.".to_string(),
                order: 3,
                decision: None,
                next_step: None,
                output_format: Some("file".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: Some(".kiro/steering".to_string()),
            file_pattern: Some("{name}.md".to_string()),
            format_description: Some("Markdown file with YAML frontmatter".to_string()),
            append_mode: false,
            timestamped: false,
        };
        workflow
    }

    fn create_auto_workflow_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Create Workflow from Conversation".to_string(),
            WorkflowType::Hook,
        );
        workflow.id = "default-auto-workflow".to_string();
        workflow.category = "default".to_string();
        workflow.description = "Automatically detect and create workflows from conversation patterns".to_string();
        workflow.intent = Some("create workflow, automate task, save as workflow".to_string());
        workflow.trigger = Some(TriggerType::OnAIDetection {
            intent_patterns: vec![
                "create a workflow".to_string(),
                "save this as a workflow".to_string(),
                "automate this".to_string(),
                "make this repeatable".to_string(),
            ],
        });
        workflow.steps = vec![
            WorkflowStep {
                id: "s1".to_string(),
                name: "Extract Pattern".to_string(),
                prompt: "Analyze the conversation history and extract the repeatable pattern. Identify the key steps, inputs, and expected outputs.".to_string(),
                order: 1,
                decision: Some(DecisionNode {
                    id: "d1".to_string(),
                    condition: "Is this a valid workflow pattern?".to_string(),
                    true_branch: Some("s2".to_string()),
                    false_branch: Some("s_invalid".to_string()),
                }),
                next_step: None,
                output_format: Some("json".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s_invalid".to_string(),
                name: "Invalid Pattern".to_string(),
                prompt: "Explain why this cannot be converted to a workflow and suggest alternatives.".to_string(),
                order: 2,
                decision: None,
                next_step: None,
                output_format: None,
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
            WorkflowStep {
                id: "s2".to_string(),
                name: "Define Workflow".to_string(),
                prompt: "Create the workflow definition with proper steps, triggers, and output settings. Ask the user for workflow name and type.".to_string(),
                order: 3,
                decision: None,
                next_step: Some("s3".to_string()),
                output_format: Some("json".to_string()),
                requires_confirmation: true,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s3".to_string(),
                name: "Save Workflow".to_string(),
                prompt: "Save the workflow using the create_workflow tool and confirm creation to the user.".to_string(),
                order: 4,
                decision: None,
                next_step: None,
                output_format: None,
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
        ];
        workflow.behavior.as_toolcall = true;
        workflow
    }

    fn create_error_search_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Search for Errors and Logic Enhancements".to_string(),
            WorkflowType::Manual,
        );
        workflow.id = "default-error-search".to_string();
        workflow.category = "default".to_string();
        workflow.description = "Analyze codebase for errors, bugs, and potential logic improvements".to_string();
        workflow.intent = Some("find errors, search bugs, logic enhancement, code review".to_string());
        workflow.steps = vec![
            WorkflowStep {
                id: "s1".to_string(),
                name: "Scan Codebase".to_string(),
                prompt: "Scan the codebase for potential errors, type issues, and common bug patterns. Focus on the most critical files first.".to_string(),
                order: 1,
                decision: None,
                next_step: Some("s2".to_string()),
                output_format: Some("json".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(180),
            },
            WorkflowStep {
                id: "s2".to_string(),
                name: "Analyze Logic".to_string(),
                prompt: "Analyze the code logic for potential improvements, edge cases, and optimization opportunities.".to_string(),
                order: 2,
                decision: Some(DecisionNode {
                    id: "d1".to_string(),
                    condition: "Are there critical issues that need immediate attention?".to_string(),
                    true_branch: Some("s3_critical".to_string()),
                    false_branch: Some("s3_normal".to_string()),
                }),
                next_step: None,
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s3_critical".to_string(),
                name: "Critical Issues Report".to_string(),
                prompt: "Generate a prioritized report of critical issues with suggested fixes. Highlight security vulnerabilities and data integrity risks.".to_string(),
                order: 3,
                decision: None,
                next_step: Some("s4".to_string()),
                output_format: Some("markdown".to_string()),
                requires_confirmation: true,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s3_normal".to_string(),
                name: "Enhancement Report".to_string(),
                prompt: "Generate a report of suggested enhancements and optimizations, organized by priority and effort required.".to_string(),
                order: 3,
                decision: None,
                next_step: Some("s4".to_string()),
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s4".to_string(),
                name: "Summary".to_string(),
                prompt: "Provide an executive summary of findings with actionable next steps.".to_string(),
                order: 4,
                decision: None,
                next_step: None,
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: Some("reports".to_string()),
            file_pattern: Some("code-analysis-{timestamp}.md".to_string()),
            format_description: Some("Markdown report with findings and recommendations".to_string()),
            append_mode: false,
            timestamped: true,
        };
        workflow
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
        workflow
    }

    /// Update a workflow
    pub async fn update(&self, id: &str, workflow: Workflow) -> Option<Workflow> {
        let mut workflows = self.workflows.write().await;
        if workflows.contains_key(id) {
            let mut updated = workflow;
            updated.updated_at = chrono::Utc::now().timestamp();
            workflows.insert(id.to_string(), updated.clone());
            Some(updated)
        } else {
            None
        }
    }

    /// Delete a workflow
    pub async fn delete(&self, id: &str) -> bool {
        self.workflows.write().await.remove(id).is_some()
    }

    /// Update workflow status
    pub async fn update_status(&self, id: &str, status: WorkflowStatus) {
        if let Some(workflow) = self.workflows.write().await.get_mut(id) {
            workflow.status = status;
            workflow.updated_at = chrono::Utc::now().timestamp();
        }
    }

    /// Increment run count
    pub async fn increment_run_count(&self, id: &str) {
        if let Some(workflow) = self.workflows.write().await.get_mut(id) {
            workflow.run_count += 1;
            workflow.last_run = Some(chrono::Utc::now().timestamp());
            workflow.updated_at = chrono::Utc::now().timestamp();
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
