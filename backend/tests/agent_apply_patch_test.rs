use skhoot_backend::cli_agent::{AgentExecutor, ExecutorConfig, ToolCall};
use tempfile::tempdir;
use std::fs;

#[tokio::test]
async fn test_agent_apply_patch_tool() {
    // 1. Setup temporary directory
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("hello.txt");
    
    // 2. Create initial file
    fs::write(&file_path, "Hello World\n").unwrap();
    
    // 3. Configure executor
    let config = ExecutorConfig {
        working_directory: dir.path().to_path_buf(),
        allow_writes: true,
        ..Default::default()
    };
    let executor = AgentExecutor::with_config(config);

    // 4. Create patch content
    let patch = format!(
        "*** Begin Patch\n*** Update File: hello.txt\n@@\n-Hello World\n+Hello Universe\n*** End Patch"
    );

    // 5. Create tool call
    let tool_call = ToolCall {
        id: "call_1".to_string(),
        name: "apply_patch".to_string(),
        arguments: serde_json::json!({
            "patch": patch
        }),
    };

    // 6. Execute
    let result = executor.execute(&tool_call).await;

    // 7. Verify result
    assert!(result.success, "Tool execution failed: {:?}", result.error);
    
    // 8. Verify file content
    let new_content = fs::read_to_string(&file_path).unwrap();
    assert_eq!(new_content, "Hello Universe\n");
}
