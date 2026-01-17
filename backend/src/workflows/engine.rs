//! Workflow execution engine
//!
//! Handles workflow execution with tree-of-decision branching logic.

use super::types::*;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Workflow execution engine
pub struct WorkflowEngine {
    /// Active executions
    executions: Arc<RwLock<HashMap<String, ExecutionContext>>>,
    /// Workflow storage reference
    storage: Arc<super::storage::WorkflowStorage>,
}

impl WorkflowEngine {
    pub fn new(storage: Arc<super::storage::WorkflowStorage>) -> Self {
        Self {
            executions: Arc::new(RwLock::new(HashMap::new())),
            storage,
        }
    }

    /// Start workflow execution
    pub async fn execute(&self, request: ExecuteWorkflowRequest) -> Result<ExecutionContext, String> {
        let workflow = self.storage.get(&request.workflow_id).await
            .ok_or_else(|| format!("Workflow {} not found", request.workflow_id))?;

        let execution_id = uuid::Uuid::new_v4().to_string();
        let first_step = request.start_step_id
            .or_else(|| workflow.steps.first().map(|s| s.id.clone()));

        let context = ExecutionContext {
            workflow_id: workflow.id.clone(),
            execution_id: execution_id.clone(),
            current_step_id: first_step,
            variables: request.variables,
            step_results: HashMap::new(),
            started_at: chrono::Utc::now().timestamp(),
            completed_at: None,
            status: WorkflowStatus::Running,
        };

        self.executions.write().await.insert(execution_id.clone(), context.clone());
        
        // Update workflow status
        self.storage.update_status(&workflow.id, WorkflowStatus::Running).await;

        Ok(context)
    }

    /// Execute a single step and determine next step
    pub async fn execute_step(
        &self,
        execution_id: &str,
        step_output: String,
        decision_result: Option<bool>,
    ) -> Result<Option<String>, String> {
        let mut executions = self.executions.write().await;
        let context = executions.get_mut(execution_id)
            .ok_or_else(|| format!("Execution {} not found", execution_id))?;

        let workflow = self.storage.get(&context.workflow_id).await
            .ok_or_else(|| "Workflow not found".to_string())?;

        let current_step_id = context.current_step_id.clone()
            .ok_or_else(|| "No current step".to_string())?;

        let current_step = workflow.steps.iter()
            .find(|s| s.id == current_step_id)
            .ok_or_else(|| "Step not found".to_string())?;

        // Record step result
        let result = StepResult {
            step_id: current_step_id.clone(),
            success: true,
            output: step_output,
            error: None,
            duration_ms: 0,
            decision_result,
        };
        context.step_results.insert(current_step_id.clone(), result);

        // Determine next step using tree-of-decision logic
        let next_step_id = if let Some(decision) = &current_step.decision {
            match decision_result {
                Some(true) => decision.true_branch.clone(),
                Some(false) => decision.false_branch.clone(),
                None => current_step.next_step.clone(),
            }
        } else {
            current_step.next_step.clone()
        };

        context.current_step_id = next_step_id.clone();

        // Check if workflow is complete
        if next_step_id.is_none() {
            context.status = WorkflowStatus::Completed;
            context.completed_at = Some(chrono::Utc::now().timestamp());
            self.storage.update_status(&context.workflow_id, WorkflowStatus::Completed).await;
            self.storage.increment_run_count(&context.workflow_id).await;
        }

        Ok(next_step_id)
    }

    /// Get current execution context
    pub async fn get_execution(&self, execution_id: &str) -> Option<ExecutionContext> {
        self.executions.read().await.get(execution_id).cloned()
    }

    /// Cancel workflow execution
    pub async fn cancel(&self, execution_id: &str) -> Result<(), String> {
        let mut executions = self.executions.write().await;
        if let Some(context) = executions.get_mut(execution_id) {
            context.status = WorkflowStatus::Cancelled;
            context.completed_at = Some(chrono::Utc::now().timestamp());
            self.storage.update_status(&context.workflow_id, WorkflowStatus::Idle).await;
            Ok(())
        } else {
            Err(format!("Execution {} not found", execution_id))
        }
    }

    /// Get all active executions
    pub async fn list_active(&self) -> Vec<ExecutionContext> {
        self.executions.read().await
            .values()
            .filter(|e| e.status == WorkflowStatus::Running)
            .cloned()
            .collect()
    }
}
