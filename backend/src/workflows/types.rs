//! Workflow type definitions
//!
//! Core types for the workflow system including workflow definitions,
//! steps, triggers, and execution state.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Workflow type determines how and when a workflow is triggered
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowType {
    /// Automatically triggered based on conditions
    Hook,
    /// Step-by-step process with structured output
    Process,
    /// Manually triggered by user
    Manual,
}

impl Default for WorkflowType {
    fn default() -> Self {
        Self::Manual
    }
}

/// Workflow execution status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowStatus {
    Idle,
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

impl Default for WorkflowStatus {
    fn default() -> Self {
        Self::Idle
    }
}

/// Trigger type for hook workflows
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TriggerType {
    /// Triggered on file save
    OnFileSave { patterns: Vec<String> },
    /// Triggered on file create
    OnFileCreate { patterns: Vec<String> },
    /// Triggered on conversation message
    OnMessage { keywords: Vec<String> },
    /// Triggered on git commit
    OnGitCommit,
    /// Triggered on error detection
    OnError { error_patterns: Vec<String> },
    /// Triggered on schedule (cron-like)
    OnSchedule { cron: String },
    /// Triggered by AI detection (automatic)
    OnAIDetection { intent_patterns: Vec<String> },
    /// Custom trigger with condition expression
    Custom { condition: String },
}

/// Decision node in the workflow tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionNode {
    pub id: String,
    pub condition: String,
    pub true_branch: Option<String>,  // Step ID to go to if true
    pub false_branch: Option<String>, // Step ID to go to if false
}

/// A single step in a workflow
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkflowStep {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub order: u32,
    /// Optional decision node for branching
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision: Option<DecisionNode>,
    /// Next step ID (if no decision node)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_step: Option<String>,
    /// Expected output format
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,
    /// Whether this step requires user confirmation
    #[serde(default)]
    pub requires_confirmation: bool,
    /// Timeout in seconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_secs: Option<u64>,
    /// Variable name to store the output in
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_var: Option<String>,
    /// Optional loop configuration
    #[serde(skip_serializing_if = "Option::is_none", rename = "loop")]
    pub loop_config: Option<WorkflowLoop>,
    /// Interactive input request
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_request: Option<InputRequest>,
}

/// Loop configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkflowLoop {
    #[serde(rename = "type")]
    pub loop_type: String, // e.g., "foreach"
    pub source: String,
    pub item_var: String,
}

/// Input request configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InputRequest {
    pub enabled: bool,
    pub placeholder: Option<String>,
}

/// Output settings for workflow results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputSettings {
    /// Output folder path (relative to workspace)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folder: Option<String>,
    /// Output file naming pattern
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_pattern: Option<String>,
    /// Natural language description of output format
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format_description: Option<String>,
    /// Whether to append to existing files
    #[serde(default)]
    pub append_mode: bool,
    /// Whether to create timestamped outputs
    #[serde(default)]
    pub timestamped: bool,
}

impl Default for OutputSettings {
    fn default() -> Self {
        Self {
            folder: None,
            file_pattern: None,
            format_description: None,
            append_mode: false,
            timestamped: false,
        }
    }
}

/// Workflow behavior configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowBehavior {
    /// Whether workflow can be used as a tool call
    #[serde(default)]
    pub as_toolcall: bool,
    /// Whether to auto-retry on failure
    #[serde(default)]
    pub auto_retry: bool,
    /// Maximum retry attempts
    #[serde(default = "default_max_retries")]
    pub max_retries: u32,
    /// Whether to run in background
    #[serde(default)]
    pub background: bool,
    /// Whether to notify on completion
    #[serde(default = "default_true")]
    pub notify_on_complete: bool,
    /// Whether to log execution details
    #[serde(default = "default_true")]
    pub log_execution: bool,
}

fn default_max_retries() -> u32 {
    3
}
fn default_true() -> bool {
    true
}

impl Default for WorkflowBehavior {
    fn default() -> Self {
        Self {
            as_toolcall: false,
            auto_retry: false,
            max_retries: 3,
            background: false,
            notify_on_complete: true,
            log_execution: true,
        }
    }
}

/// Complete workflow definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub workflow_type: WorkflowType,
    pub steps: Vec<WorkflowStep>,
    /// Intent description for AI detection
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intent: Option<String>,
    /// Trigger configuration for hook workflows
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trigger: Option<TriggerType>,
    pub output_settings: OutputSettings,
    pub behavior: WorkflowBehavior,
    /// Metadata
    pub created_at: i64,
    pub updated_at: i64,
    pub run_count: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_run: Option<i64>,
    pub status: WorkflowStatus,
    /// Custom variables for the workflow
    #[serde(default)]
    pub variables: HashMap<String, String>,
}

impl Workflow {
    pub fn new(name: String, workflow_type: WorkflowType) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description: String::new(),
            category: "custom".to_string(),
            workflow_type,
            steps: Vec::new(),
            intent: None,
            trigger: None,
            output_settings: OutputSettings::default(),
            behavior: WorkflowBehavior::default(),
            created_at: now,
            updated_at: now,
            run_count: 0,
            last_run: None,
            status: WorkflowStatus::Idle,
            variables: HashMap::new(),
        }
    }
}

/// Workflow execution context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionContext {
    pub workflow_id: String,
    pub execution_id: String,
    pub current_step_id: Option<String>,
    pub variables: HashMap<String, serde_json::Value>,
    pub step_results: HashMap<String, StepResult>,
    pub started_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,
    pub status: WorkflowStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loop_state: Option<LoopState>,
}

/// State of an active loop
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoopState {
    pub step_id: String,
    pub items: Vec<serde_json::Value>,
    pub current_index: u32,
    pub item_var: String,
}

/// Result of a single step execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    pub step_id: String,
    pub success: bool,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub duration_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision_result: Option<bool>,
}

/// Workflow execution request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteWorkflowRequest {
    pub workflow_id: String,
    #[serde(default)]
    pub variables: HashMap<String, serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_step_id: Option<String>,
}

/// Workflow creation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub description: String,
    pub workflow_type: WorkflowType,
    #[serde(default)]
    pub category: Option<String>,
    pub steps: Vec<WorkflowStep>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trigger: Option<TriggerType>,
    #[serde(default)]
    pub output_settings: OutputSettings,
    #[serde(default)]
    pub behavior: WorkflowBehavior,
}
