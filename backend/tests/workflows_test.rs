use skhoot_backend::workflows::{WorkflowStorage, WorkflowEngine, ExecuteWorkflowRequest, WorkflowStatus};
use std::collections::HashMap;
use std::sync::Arc;

#[tokio::test]
async fn test_default_workflows_init() {
    let storage = WorkflowStorage::new();
    storage.init_defaults().await;
    
    let defaults = storage.list().await;
    // Now we expect 7 default workflows
    assert_eq!(defaults.len(), 7, "Should have 7 default workflows");
    
    // Check original workflows
    let steering = storage.get("default-steering-file").await;
    assert!(steering.is_some(), "Steering workflow should exist");
    
    let auto = storage.get("default-auto-workflow").await;
    assert!(auto.is_some(), "Auto workflow should exist");
    
    let error_search = storage.get("default-error-search").await;
    assert!(error_search.is_some(), "Error search workflow should exist");

    // Check newly added workflows
    let gatherer = storage.get("agent-gatherer-workflow").await;
    assert!(gatherer.is_some(), "Agent Gatherer workflow should exist");

    let designer = storage.get("agent-designer-workflow").await;
    assert!(designer.is_some(), "Agent Designer workflow should exist");

    let builder = storage.get("agent-builder-workflow").await;
    assert!(builder.is_some(), "Agent Builder workflow should exist");

    let meal_planner = storage.get("demo-meal-planner").await;
    assert!(meal_planner.is_some(), "Healthy Meal Planner workflow should exist");
}

#[tokio::test]
async fn test_steering_file_workflow_execution() {
    let storage = Arc::new(WorkflowStorage::new());
    storage.init_defaults().await;
    let engine = WorkflowEngine::new(storage.clone());
    
    let request = ExecuteWorkflowRequest {
        workflow_id: "default-steering-file".to_string(),
        variables: HashMap::new(),
        start_step_id: None,
    };
    
    let context = engine.execute(request).await.expect("Failed to start workflow");
    let execution_id = &context.execution_id;
    
    // Step 1: Analyze Context
    let current = engine.get_execution(execution_id).await.unwrap();
    assert_eq!(current.current_step_id, Some("s1".to_string()));
    
    let next = engine.execute_step(execution_id, "Analysis result".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s2".to_string()));
    
    // Step 2: Define Rules
    let next = engine.execute_step(execution_id, "Rules defined".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s3".to_string()));
    
    // Step 3: Generate File
    let next = engine.execute_step(execution_id, "File generated".to_string(), None).await.unwrap();
    assert_eq!(next, None, "Should be finished");
    
    let final_state = engine.get_execution(execution_id).await.unwrap();
    assert_eq!(final_state.status, WorkflowStatus::Completed);
}

#[tokio::test]
async fn test_auto_workflow_execution_valid() {
    let storage = Arc::new(WorkflowStorage::new());
    storage.init_defaults().await;
    let engine = WorkflowEngine::new(storage.clone());
    
    let request = ExecuteWorkflowRequest {
        workflow_id: "default-auto-workflow".to_string(),
        variables: HashMap::new(),
        start_step_id: None,
    };
    
    let context = engine.execute(request).await.expect("Failed to start workflow");
    let execution_id = &context.execution_id;
    
    // Step 1: Extract Pattern (with decision = True)
    let current = engine.get_execution(execution_id).await.unwrap();
    assert_eq!(current.current_step_id, Some("s1".to_string()));
    
    // Simulating decision: Is this a valid workflow pattern? -> Yes
    let next = engine.execute_step(execution_id, "Pattern extracted".to_string(), Some(true)).await.unwrap();
    assert_eq!(next, Some("s2".to_string()));
    
    // Step 2: Define Workflow
    let next = engine.execute_step(execution_id, "Workflow defined".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s3".to_string()));
    
    // Step 3: Save Workflow
    let next = engine.execute_step(execution_id, "Workflow saved".to_string(), None).await.unwrap();
    assert_eq!(next, None);
    
    let final_state = engine.get_execution(execution_id).await.unwrap();
    assert_eq!(final_state.status, WorkflowStatus::Completed);
}

#[tokio::test]
async fn test_auto_workflow_execution_invalid() {
    let storage = Arc::new(WorkflowStorage::new());
    storage.init_defaults().await;
    let engine = WorkflowEngine::new(storage.clone());
    
    let request = ExecuteWorkflowRequest {
        workflow_id: "default-auto-workflow".to_string(),
        variables: HashMap::new(),
        start_step_id: None,
    };
    
    let context = engine.execute(request).await.expect("Failed to start workflow");
    let execution_id = &context.execution_id;
    
    // Step 1: Extract Pattern (with decision = False)
    let current = engine.get_execution(execution_id).await.unwrap();
    assert_eq!(current.current_step_id, Some("s1".to_string()));
    
    // Simulating decision: Is this a valid workflow pattern? -> No
    let next = engine.execute_step(execution_id, "Invalid pattern".to_string(), Some(false)).await.unwrap();
    assert_eq!(next, Some("s_invalid".to_string()));
    
    // Step Invalid: Explain why
    let next = engine.execute_step(execution_id, "Explanation".to_string(), None).await.unwrap();
    assert_eq!(next, None);
    
    let final_state = engine.get_execution(execution_id).await.unwrap();
    assert_eq!(final_state.status, WorkflowStatus::Completed);
}

#[tokio::test]
async fn test_error_search_workflow_critical() {
    let storage = Arc::new(WorkflowStorage::new());
    storage.init_defaults().await;
    let engine = WorkflowEngine::new(storage.clone());
    
    let request = ExecuteWorkflowRequest {
        workflow_id: "default-error-search".to_string(),
        variables: HashMap::new(),
        start_step_id: None,
    };
    
    let context = engine.execute(request).await.expect("Failed to start workflow");
    let execution_id = &context.execution_id;
    
    // Step 1: Scan Codebase
    let next = engine.execute_step(execution_id, "Scan results".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s2".to_string()));
    
    // Step 2: Analyze Logic (Decision: Critical?) -> Yes
    let next = engine.execute_step(execution_id, "Analysis".to_string(), Some(true)).await.unwrap();
    assert_eq!(next, Some("s3_critical".to_string()));
    
    // Step 3: Critical Report
    let next = engine.execute_step(execution_id, "Critical report".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s4".to_string()));
    
    // Step 4: Summary
    let next = engine.execute_step(execution_id, "Summary".to_string(), None).await.unwrap();
    assert_eq!(next, None);
}

#[tokio::test]
async fn test_meal_planner_workflow() {
    let storage = Arc::new(WorkflowStorage::new());
    storage.init_defaults().await;
    let engine = WorkflowEngine::new(storage.clone());
    
    let request = ExecuteWorkflowRequest {
        workflow_id: "demo-meal-planner".to_string(),
        variables: HashMap::new(),
        start_step_id: None,
    };
    
    let context = engine.execute(request).await.expect("Failed to start workflow");
    let execution_id = &context.execution_id;
    
    // Step 1: Find Recipes
    let next = engine.execute_step(execution_id, "Recipes found".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s2".to_string()));
    
    // Step 2: Check Prices
    let next = engine.execute_step(execution_id, "Prices checked".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s3".to_string()));
    
    // Step 3: Create Plan
    let next = engine.execute_step(execution_id, "Plan created".to_string(), None).await.unwrap();
    assert_eq!(next, Some("s4".to_string()));
    
    // Step 4: Generate HTML
    let next = engine.execute_step(execution_id, "HTML generated".to_string(), None).await.unwrap();
    assert_eq!(next, None);
    
    let final_state = engine.get_execution(execution_id).await.unwrap();
    assert_eq!(final_state.status, WorkflowStatus::Completed);
}
