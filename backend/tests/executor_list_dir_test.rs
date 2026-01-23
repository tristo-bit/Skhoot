use skhoot_backend::cli_agent::{AgentExecutor, ExecutorConfig, ToolCall};
use std::path::PathBuf;

#[tokio::test]
async fn test_list_directory_tilde_expansion() {
    let executor = AgentExecutor::new();
    
    // Test resolving home directory
    if let Some(home) = dirs::home_dir() {
        let home_desktop = home.join("Desktop");
        
        // Only run if Desktop exists, otherwise test is invalid
        if home_desktop.exists() {
            let tool_call = ToolCall {
                id: "test_list".to_string(),
                name: "list_directory".to_string(),
                arguments: serde_json::json!({
                    "path": "~/Desktop"
                }),
            };
            
            let result = executor.execute(&tool_call).await;
            
            assert!(result.success, "Failed to list ~/Desktop: {}", result.error.unwrap_or_default());
            assert!(result.output.len() > 0, "Output should not be empty");
        } else {
            println!("Skipping test: ~/Desktop does not exist");
        }
    }
}
