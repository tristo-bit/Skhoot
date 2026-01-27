//! Integration tests for CLI Bridge

use super::*;

#[tokio::test]
async fn test_cli_bridge_regular_command() {
    let bridge = CliBridge::new();
    
    let result = bridge.execute_command(
        "echo".to_string(),
        vec!["hello".to_string()],
        None,
    ).await;
    
    assert!(result.is_ok());
    let handle = result.unwrap();
    assert_eq!(handle.command, "echo");
}

#[tokio::test]
async fn test_cli_bridge_pty_command() {
    let bridge = CliBridge::new();
    
    let result = bridge.execute_command_pty(
        "echo".to_string(),
        vec!["hello from PTY".to_string()],
        None,
        Some(80),
        Some(24),
    ).await;
    
    assert!(result.is_ok());
    let handle = result.unwrap();
    assert_eq!(handle.command, "echo");
}

#[tokio::test]
async fn test_cli_bridge_pty_resize() {
    let bridge = CliBridge::new();
    
    // Create PTY session
    let handle = bridge.execute_command_pty(
        "bash".to_string(),
        vec![],
        None,
        Some(80),
        Some(24),
    ).await.unwrap();
    
    // Resize the PTY
    let result = bridge.resize_pty(&handle.session_id, 100, 30).await;
    assert!(result.is_ok());
    
    // Clean up
    let _ = bridge.terminate_session(handle.session_id).await;
}

#[tokio::test]
async fn test_cli_bridge_write_to_pty() {
    let bridge = CliBridge::new();
    
    // Create PTY session with bash
    let handle = bridge.execute_command_pty(
        "bash".to_string(),
        vec![],
        None,
        Some(80),
        Some(24),
    ).await.unwrap();
    
    // Write a command
    let result = bridge.write_input(handle.session_id.clone(), "echo test".to_string()).await;
    assert!(result.is_ok());
    
    // Give it a moment to process
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    // Read output
    let output = bridge.read_output(handle.session_id.clone()).await;
    assert!(output.is_ok());
    
    // Clean up
    let _ = bridge.terminate_session(handle.session_id).await;
}

#[tokio::test]
async fn test_cli_bridge_mixed_sessions() {
    let bridge = CliBridge::new();
    
    // Create a regular session
    let regular_handle = bridge.execute_command(
        "echo".to_string(),
        vec!["regular".to_string()],
        None,
    ).await.unwrap();
    
    // Create a PTY session
    let pty_handle = bridge.execute_command_pty(
        "echo".to_string(),
        vec!["pty".to_string()],
        None,
        Some(80),
        Some(24),
    ).await.unwrap();
    
    // Both should be in the session list
    let sessions = bridge.list_active_sessions().await;
    assert_eq!(sessions.len(), 2);
    
    // Clean up
    let _ = bridge.terminate_session(regular_handle.session_id).await;
    let _ = bridge.terminate_session(pty_handle.session_id).await;
}

#[tokio::test]
async fn test_pty_ansi_codes_preserved() {
    let bridge = CliBridge::new();
    
    // Create PTY session
    let handle = bridge.execute_command_pty(
        "echo".to_string(),
        vec!["-e".to_string(), "\\033[31mRed Text\\033[0m".to_string()],
        None,
        Some(80),
        Some(24),
    ).await.unwrap();
    
    // Give it time to execute
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    // Read output
    let output = bridge.read_output(handle.session_id.clone()).await.unwrap();
    
    // PTY output should have ansi_formatted flag set
    if !output.is_empty() {
        assert!(output[0].ansi_formatted);
    }
    
    // Clean up
    let _ = bridge.terminate_session(handle.session_id).await;
}
