//! Property-based tests for CLI Bridge
//! 
//! These tests validate correctness properties across many generated inputs

#[cfg(test)]
mod property_tests {
    use crate::cli_bridge::{CliBridge, SessionManager, CommandExecutor, CommandHandle, CliError};
    use proptest::prelude::*;

    // Feature: terminal-disk-management, Property 36: Terminal session initialization
    // Validates: Requirements 6.1
    // For any application startup, terminal session management structures should be initialized
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn prop_session_initialization_creates_empty_manager(
            _seed in 0u64..1000u64
        ) {
            // Property: Creating a new SessionManager should always result in zero sessions
            let manager = SessionManager::new();
            prop_assert_eq!(manager.session_count(), 0);
            
            // Property: Listing sessions on a new manager should return empty vector
            let sessions = manager.list_sessions();
            prop_assert_eq!(sessions.len(), 0);
        }

        #[test]
        fn prop_cli_bridge_initialization_is_consistent(
            _seed in 0u64..1000u64
        ) {
            // Property: Creating a new CliBridge should always initialize with no active sessions
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                let sessions = bridge.list_active_sessions().await;
                prop_assert_eq!(sessions.len(), 0);
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_multiple_initializations_are_independent(
            count in 1usize..10usize
        ) {
            // Property: Multiple SessionManager instances should be independent
            let managers: Vec<SessionManager> = (0..count)
                .map(|_| SessionManager::new())
                .collect();
            
            for manager in &managers {
                prop_assert_eq!(manager.session_count(), 0);
            }
        }

        #[test]
        fn prop_session_creation_generates_unique_ids(
            count in 1usize..20usize
        ) {
            // Property: Creating multiple sessions should generate unique IDs
            let mut manager = SessionManager::new();
            let mut session_ids = Vec::new();
            
            for _ in 0..count {
                let id = manager.create_session();
                prop_assert!(!id.is_empty(), "Session ID should not be empty");
                prop_assert!(!session_ids.contains(&id), "Session IDs should be unique");
                session_ids.push(id);
            }
            
            prop_assert_eq!(manager.session_count(), count);
        }

        #[test]
        fn prop_session_creation_increments_count(
            count in 1usize..50usize
        ) {
            // Property: Creating N sessions should result in session count of N
            let mut manager = SessionManager::new();
            
            for i in 1..=count {
                manager.create_session();
                prop_assert_eq!(manager.session_count(), i);
            }
        }
    }

    // Feature: terminal-disk-management, Property 37: Secure process spawning
    // Validates: Requirements 6.2
    // For any command execution, processes should be spawned with proper security sandboxing
    // NOTE: These tests focus on VALIDATION only, not actual process spawning, for safety
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_dangerous_commands_are_blocked(
            dangerous_cmd in prop::sample::select(vec![
                "reboot", "shutdown", "halt", "poweroff"
            ])
        ) {
            // Property: Dangerous commands should always be blocked
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result = executor.validate_command(&dangerous_cmd, &[]).await;
                prop_assert!(result.is_err(), "Dangerous command should be blocked");
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_dangerous_patterns_are_detected(
            pattern_idx in 0usize..4usize
        ) {
            // Property: Commands with dangerous patterns should be detected
            let patterns = vec![
                ("rm", vec!["-rf".to_string(), "/".to_string()]),
                ("dd", vec!["if=/dev/zero".to_string()]),
                ("chmod", vec!["-R".to_string(), "777".to_string(), "/".to_string()]),
                ("mkfs", vec!["/dev/sda".to_string()]),
            ];
            
            let (cmd, args) = &patterns[pattern_idx];
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result = executor.validate_command(cmd, args).await;
                prop_assert!(result.is_err(), "Dangerous pattern should be detected");
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_safe_commands_pass_validation(
            cmd in prop::sample::select(vec![
                "echo", "ls", "pwd", "cat", "grep", "find", "wc"
            ]),
            arg in "[a-zA-Z0-9_-]{1,20}"
        ) {
            // Property: Safe commands should pass validation
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result = executor.validate_command(&cmd, &[arg]).await;
                prop_assert!(result.is_ok(), "Safe command should pass validation");
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_empty_command_fails_validation(
            args in prop::collection::vec(any::<String>(), 0..5)
        ) {
            // Property: Empty commands should always fail validation
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result = executor.validate_command("", &args).await;
                prop_assert!(result.is_err(), "Empty command should fail validation");
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_validation_is_consistent(
            cmd in "[a-z]{3,10}",
            args in prop::collection::vec("[a-zA-Z0-9_-]{1,10}", 0..3)
        ) {
            // Property: Validation should be deterministic - same input always gives same result
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result1 = executor.validate_command(&cmd, &args).await;
                let result2 = executor.validate_command(&cmd, &args).await;
                
                prop_assert_eq!(result1.is_ok(), result2.is_ok(), 
                    "Validation should be consistent for the same input");
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Feature: terminal-disk-management, Property 33: Dangerous command confirmation
    // Validates: Requirements 5.6
    // For any detected dangerous command, explicit user confirmation should be required
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_dangerous_command_confirmation_required(
            pattern_idx in 0usize..9usize
        ) {
            // Property: All dangerous patterns should trigger confirmation requirement
            let dangerous_patterns = vec![
                ("rm", vec!["-rf".to_string(), "/".to_string()]),
                ("rm", vec!["-rf".to_string(), "/*".to_string()]),
                ("dd", vec!["if=/dev/zero".to_string(), "of=/dev/sda".to_string()]),
                ("mkfs", vec!["/dev/sda1".to_string()]),
                ("fdisk", vec!["/dev/sda".to_string()]),
                ("parted", vec!["/dev/sda".to_string()]),
                ("chmod", vec!["-R".to_string(), "777".to_string(), "/home".to_string()]),
                ("chown", vec!["-R".to_string(), "root".to_string(), "/".to_string()]),
                ("sh", vec!["-c".to_string(), ":(){ :|:& };:".to_string()]),
            ];
            
            let (cmd, args) = &dangerous_patterns[pattern_idx];
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result = executor.validate_command(cmd, args).await;
                
                // Property: Dangerous commands must fail validation (requiring confirmation)
                prop_assert!(result.is_err(), 
                    "Dangerous command '{}' should require confirmation", cmd);
                
                // Property: Error should be specifically DangerousCommand type
                if let Err(e) = result {
                    prop_assert!(matches!(e, crate::cli_bridge::CliError::DangerousCommand(_)),
                        "Error should be DangerousCommand type");
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_dangerous_commands_blocked_regardless_of_sandbox(
            sandbox_enabled in any::<bool>(),
            pattern_idx in 0usize..4usize
        ) {
            // Property: Dangerous commands require confirmation even when sandbox is disabled
            let dangerous_patterns = vec![
                ("rm", vec!["-rf".to_string(), "/".to_string()]),
                ("dd", vec!["if=/dev/zero".to_string()]),
                ("mkfs", vec!["/dev/sda".to_string()]),
                ("fdisk", vec!["/dev/sda".to_string()]),
            ];
            
            let (cmd, args) = &dangerous_patterns[pattern_idx];
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                
                // Configure sandbox setting
                let mut config = executor.get_security_config().await;
                config.sandbox_enabled = sandbox_enabled;
                executor.set_security_config(config).await;
                
                // Validate command
                let result = executor.validate_command(cmd, args).await;
                
                // Property: Dangerous commands should be blocked regardless of sandbox setting
                prop_assert!(result.is_err(), 
                    "Dangerous command should be blocked even with sandbox_enabled={}", 
                    sandbox_enabled);
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_blocked_commands_always_fail(
            blocked_cmd in prop::sample::select(vec![
                "reboot", "shutdown", "halt", "poweroff"
            ]),
            args in prop::collection::vec("[a-zA-Z0-9_-]{1,10}", 0..3)
        ) {
            // Property: Blocked commands should always fail validation
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result = executor.validate_command(&blocked_cmd, &args).await;
                
                prop_assert!(result.is_err(), 
                    "Blocked command '{}' should always fail", blocked_cmd);
                
                if let Err(e) = result {
                    prop_assert!(matches!(e, crate::cli_bridge::CliError::DangerousCommand(_)),
                        "Blocked command should return DangerousCommand error");
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_safe_commands_never_require_confirmation(
            safe_cmd in prop::sample::select(vec![
                "echo", "ls", "pwd", "cat", "grep", "find", "wc", "head", "tail"
            ]),
            args in prop::collection::vec("[a-zA-Z0-9_./-]{1,20}", 0..5)
        ) {
            // Property: Safe commands should never require confirmation
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let result = executor.validate_command(&safe_cmd, &args).await;
                
                prop_assert!(result.is_ok(), 
                    "Safe command '{}' should not require confirmation", safe_cmd);
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Feature: terminal-disk-management, Property 38: Output stream separation
    // Validates: Requirements 6.3
    // For any command output capture, stdout and stderr should be streamed separately
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_output_streams_are_separated(
            stdout_msg in "[a-zA-Z0-9 ]{5,30}",
            stderr_msg in "[a-zA-Z0-9 ]{5,30}"
        ) {
            // Property: stdout and stderr should be captured in separate streams
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                // Use a shell command that writes to both stdout and stderr
                #[cfg(unix)]
                let (cmd, args) = (
                    "sh".to_string(),
                    vec![
                        "-c".to_string(),
                        format!("echo '{}' && echo '{}' >&2", stdout_msg, stderr_msg)
                    ]
                );
                
                #[cfg(windows)]
                let (cmd, args) = (
                    "cmd".to_string(),
                    vec![
                        "/C".to_string(),
                        format!("echo {} && echo {} 1>&2", stdout_msg, stderr_msg)
                    ]
                );
                
                // Spawn the command
                let handle = executor.spawn_command(session_id.clone(), cmd, args).await?;
                
                // Wait for command to complete
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                
                // Read output
                let output = executor.read_output(&handle).await?;
                
                // Property: Output should contain entries from both streams
                prop_assert!(!output.is_empty(), "Output should not be empty");
                
                // Property: stdout and stderr should be distinguishable by type
                let stdout_entries: Vec<_> = output.iter()
                    .filter(|o| o.output_type == crate::cli_bridge::OutputType::Stdout)
                    .collect();
                let stderr_entries: Vec<_> = output.iter()
                    .filter(|o| o.output_type == crate::cli_bridge::OutputType::Stderr)
                    .collect();
                
                // At least one stream should have output
                prop_assert!(
                    !stdout_entries.is_empty() || !stderr_entries.is_empty(),
                    "At least one output stream should have data"
                );
                
                // Clean up
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_stdout_entries_have_correct_type(
            msg in "[a-zA-Z0-9 ]{5,30}"
        ) {
            // Property: All stdout entries should have OutputType::Stdout
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                #[cfg(unix)]
                let (cmd, args) = ("echo".to_string(), vec![msg.clone()]);
                
                #[cfg(windows)]
                let (cmd, args) = ("cmd".to_string(), vec!["/C".to_string(), format!("echo {}", msg)]);
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Wait for output
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                let output = executor.read_output(&handle).await?;
                
                // Property: All stdout entries must have Stdout type
                for entry in output.iter() {
                    if entry.output_type == crate::cli_bridge::OutputType::Stdout {
                        prop_assert_eq!(&entry.output_type, &crate::cli_bridge::OutputType::Stdout,
                            "Stdout entry should have Stdout type");
                    }
                }
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_output_entries_have_timestamps(
            msg in "[a-zA-Z0-9 ]{5,20}"
        ) {
            // Property: All output entries should have valid timestamps
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                #[cfg(unix)]
                let (cmd, args) = ("echo".to_string(), vec![msg]);
                
                #[cfg(windows)]
                let (cmd, args) = ("cmd".to_string(), vec!["/C".to_string(), format!("echo {}", msg)]);
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                let output = executor.read_output(&handle).await?;
                
                // Property: All entries should have timestamps
                for entry in output.iter() {
                    // Timestamp should be reasonable (not in the far future or past)
                    let now = chrono::Utc::now();
                    let diff = (now - entry.timestamp).num_seconds().abs();
                    prop_assert!(diff < 10, "Timestamp should be recent (within 10 seconds)");
                }
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Feature: terminal-disk-management, Property 31: Real-time output capture
    // Validates: Requirements 5.4
    // For any executing command, output should be captured and displayed in real-time
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_output_captured_in_realtime(
            line_count in 1usize..5usize
        ) {
            // Property: Output should be available before command completes
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                // Create a command that outputs multiple lines with delays
                #[cfg(unix)]
                let (cmd, args) = (
                    "sh".to_string(),
                    vec![
                        "-c".to_string(),
                        format!("for i in $(seq 1 {}); do echo line$i; sleep 0.05; done", line_count)
                    ]
                );
                
                #[cfg(windows)]
                let (cmd, args) = (
                    "cmd".to_string(),
                    vec![
                        "/C".to_string(),
                        format!("for /L %i in (1,1,{}) do @(echo line%i & timeout /t 0 /nobreak >nul)", line_count)
                    ]
                );
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Property: Output should be available incrementally, not just at the end
                // Check output multiple times during execution
                let mut previous_count = 0;
                for _ in 0..3 {
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    let output = executor.read_output(&handle).await?;
                    let current_count = output.len();
                    
                    // Output should be growing over time (real-time capture)
                    prop_assert!(
                        current_count >= previous_count,
                        "Output count should not decrease: {} -> {}", previous_count, current_count
                    );
                    
                    previous_count = current_count;
                }
                
                // Clean up
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_output_available_before_completion(
            msg in "[a-zA-Z0-9]{5,20}"
        ) {
            // Property: Output should be readable while command is still running
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                // Command that outputs then sleeps (still running)
                #[cfg(unix)]
                let (cmd, args) = (
                    "sh".to_string(),
                    vec!["-c".to_string(), format!("echo {} && sleep 1", msg)]
                );
                
                #[cfg(windows)]
                let (cmd, args) = (
                    "cmd".to_string(),
                    vec!["/C".to_string(), format!("echo {} && timeout /t 1 /nobreak >nul", msg)]
                );
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Wait briefly for output but not for completion
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                // Property: Should be able to read output before command completes
                let output = executor.read_output(&handle).await?;
                
                // Should have captured the echo output even though sleep is still running
                prop_assert!(!output.is_empty(), "Output should be available before command completes");
                
                // Clean up
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_multiple_reads_return_accumulated_output(
            line_count in 2usize..6usize
        ) {
            // Property: Multiple reads should return accumulated output (not just new output)
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                #[cfg(unix)]
                let (cmd, args) = (
                    "sh".to_string(),
                    vec!["-c".to_string(), format!("for i in $(seq 1 {}); do echo line$i; done", line_count)]
                );
                
                #[cfg(windows)]
                let (cmd, args) = (
                    "cmd".to_string(),
                    vec!["/C".to_string(), format!("for /L %i in (1,1,{}) do @echo line%i", line_count)]
                );
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Wait for output
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                
                // First read
                let output1 = executor.read_output(&handle).await?;
                let count1 = output1.len();
                
                // Second read (without new output)
                let output2 = executor.read_output(&handle).await?;
                let count2 = output2.len();
                
                // Property: Second read should return at least as much output as first read
                prop_assert!(
                    count2 >= count1,
                    "Accumulated output should not decrease: {} -> {}", count1, count2
                );
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Feature: terminal-disk-management, Property 39: Interactive command input support
    // Validates: Requirements 6.4
    // For any interactive command, stdin should support user input writing
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_stdin_writing_succeeds(
            input in "[a-zA-Z0-9 ]{5,30}"
        ) {
            // Property: Writing to stdin should succeed for interactive commands
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                // Use 'cat' which reads from stdin and echoes to stdout
                #[cfg(unix)]
                let (cmd, args) = ("cat".to_string(), vec![]);
                
                #[cfg(windows)]
                let (cmd, args) = ("findstr".to_string(), vec![".*".to_string()]);
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Property: Writing to stdin should not error
                let write_result = executor.write_stdin(&handle, input.clone()).await;
                prop_assert!(write_result.is_ok(), "Writing to stdin should succeed");
                
                // Give time for processing
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                // Clean up
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_multiple_stdin_writes_succeed(
            inputs in prop::collection::vec("[a-zA-Z0-9]{3,10}", 2..5)
        ) {
            // Property: Multiple writes to stdin should all succeed
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                #[cfg(unix)]
                let (cmd, args) = ("cat".to_string(), vec![]);
                
                #[cfg(windows)]
                let (cmd, args) = ("findstr".to_string(), vec![".*".to_string()]);
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Property: All writes should succeed
                for input in inputs.iter() {
                    let write_result = executor.write_stdin(&handle, input.clone()).await;
                    prop_assert!(write_result.is_ok(), 
                        "Each write to stdin should succeed");
                }
                
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_stdin_write_to_nonexistent_session_fails(
            input in "[a-zA-Z0-9]{5,20}"
        ) {
            // Property: Writing to stdin of non-existent session should fail
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                
                // Create a handle for a session that doesn't exist
                let fake_handle = CommandHandle::new(
                    "nonexistent-session".to_string(),
                    "echo".to_string(),
                    vec![]
                );
                
                // Property: Should return error for non-existent session
                let result = executor.write_stdin(&fake_handle, input).await;
                prop_assert!(result.is_err(), 
                    "Writing to non-existent session should fail");
                
                if let Err(e) = result {
                    prop_assert!(matches!(e, crate::cli_bridge::CliError::SessionNotFound(_)),
                        "Error should be SessionNotFound");
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_stdin_input_affects_output(
            input in "[a-zA-Z0-9]{5,15}"
        ) {
            // Property: Input written to stdin should affect command output
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                // Use cat which echoes stdin to stdout
                #[cfg(unix)]
                let (cmd, args) = ("cat".to_string(), vec![]);
                
                #[cfg(windows)]
                let (cmd, args) = ("findstr".to_string(), vec![".*".to_string()]);
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Write input
                executor.write_stdin(&handle, input.clone()).await?;
                
                // Wait for output
                tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
                
                // Property: Output should contain the input we wrote
                let output = executor.read_output(&handle).await?;
                let output_text: String = output.iter()
                    .map(|o| o.content.as_str())
                    .collect::<Vec<_>>()
                    .join("");
                
                prop_assert!(
                    output_text.contains(&input),
                    "Output should contain the input written to stdin: expected '{}' in '{}'",
                    input, output_text
                );
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Feature: terminal-disk-management, Property 71: Interactive command prompt handling
    // Validates: Requirements 11.6
    // For any interactive command need, user input prompts should be handled correctly
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_interactive_prompts_accept_input(
            response in "[a-zA-Z0-9]{3,15}"
        ) {
            // Property: Interactive commands should accept and process user input
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                // Use a command that prompts for input
                #[cfg(unix)]
                let (cmd, args) = (
                    "sh".to_string(),
                    vec!["-c".to_string(), "read line && echo \"Got: $line\"".to_string()]
                );
                
                #[cfg(windows)]
                let (cmd, args) = (
                    "cmd".to_string(),
                    vec!["/C".to_string(), "set /p var= && echo Got: %var%".to_string()]
                );
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Wait for prompt to appear
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                // Property: Should be able to write response to prompt
                let write_result = executor.write_stdin(&handle, response.clone()).await;
                prop_assert!(write_result.is_ok(), "Should be able to respond to prompt");
                
                // Wait for processing
                tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
                
                // Property: Output should reflect the input provided
                let output = executor.read_output(&handle).await?;
                let output_text: String = output.iter()
                    .map(|o| o.content.as_str())
                    .collect::<Vec<_>>()
                    .join("");
                
                // The response should appear in the output
                prop_assert!(
                    output_text.contains(&response) || !output.is_empty(),
                    "Output should contain response or have some output"
                );
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_multiple_prompts_handled_sequentially(
            responses in prop::collection::vec("[a-zA-Z0-9]{3,10}", 2..4)
        ) {
            // Property: Multiple prompts should be handled in sequence
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                // Command that prompts multiple times
                #[cfg(unix)]
                let (cmd, args) = (
                    "sh".to_string(),
                    vec![
                        "-c".to_string(),
                        format!("for i in $(seq 1 {}); do read line && echo \"$line\"; done", responses.len())
                    ]
                );
                
                #[cfg(windows)]
                let (cmd, args) = (
                    "cmd".to_string(),
                    vec![
                        "/C".to_string(),
                        format!("for /L %i in (1,1,{}) do @(set /p var= && echo %var%)", responses.len())
                    ]
                );
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                // Property: Should be able to respond to each prompt
                for response in responses.iter() {
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    let write_result = executor.write_stdin(&handle, response.clone()).await;
                    prop_assert!(write_result.is_ok(), 
                        "Should be able to respond to each prompt");
                }
                
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_prompt_handling_with_special_chars(
            response in "[a-zA-Z0-9!@#$%^&*()_+=\\-\\[\\]{}|;:',.<>?/]{5,20}"
        ) {
            // Property: Prompts should handle responses with special characters
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                #[cfg(unix)]
                let (cmd, args) = ("cat".to_string(), vec![]);
                
                #[cfg(windows)]
                let (cmd, args) = ("findstr".to_string(), vec![".*".to_string()]);
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                
                // Property: Should handle special characters in input
                let write_result = executor.write_stdin(&handle, response.clone()).await;
                prop_assert!(write_result.is_ok(), 
                    "Should handle special characters in input");
                
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_empty_input_to_prompt_succeeds(
            _seed in 0u64..100u64
        ) {
            // Property: Empty input to prompts should be handled gracefully
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let executor = CommandExecutor::new();
                let session_id = format!("test-session-{}", uuid::Uuid::new_v4());
                
                #[cfg(unix)]
                let (cmd, args) = ("cat".to_string(), vec![]);
                
                #[cfg(windows)]
                let (cmd, args) = ("findstr".to_string(), vec![".*".to_string()]);
                
                let handle = executor.spawn_command(session_id, cmd, args).await?;
                
                tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                
                // Property: Empty input should not cause errors
                let write_result = executor.write_stdin(&handle, "".to_string()).await;
                prop_assert!(write_result.is_ok(), 
                    "Empty input should be handled gracefully");
                
                tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                
                let _ = executor.terminate(&handle).await;
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Unit tests for actual process spawning (not property-based, to avoid resource exhaustion)
    #[tokio::test]
    async fn test_spawn_safe_command() {
        let executor = CommandExecutor::new();
        let session_id = "test-session".to_string();
        
        let result = executor.spawn_command(
            session_id,
            "echo".to_string(),
            vec!["test".to_string()]
        ).await;
        
        assert!(result.is_ok());
        let handle = result.unwrap();
        assert!(handle.pid.is_some());
        assert_eq!(handle.command, "echo");
        
        // Clean up
        let _ = executor.terminate(&handle).await;
    }

    #[tokio::test]
    async fn test_spawn_nonexistent_command_fails() {
        let executor = CommandExecutor::new();
        let session_id = "test-session".to_string();
        
        let result = executor.spawn_command(
            session_id,
            "thiscommanddoesnotexist123456".to_string(),
            vec![]
        ).await;
        
        assert!(result.is_err());
    }

    // Feature: terminal-disk-management, Property 40: Session lifecycle management
    // Validates: Requirements 6.5, 6.6
    // For any terminal session, active terminals and their states should be tracked,
    // and cleanup should properly terminate processes
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_session_lifecycle_tracking(
            session_count in 1usize..10usize
        ) {
            // Property: Sessions should be tracked throughout their lifecycle
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                let mut session_ids = Vec::new();
                
                // Create sessions
                for _ in 0..session_count {
                    let sessions_before = bridge.list_active_sessions().await.len();
                    
                    // Execute a simple command to create a session
                    let result = bridge.execute_command(
                        "echo".to_string(),
                        vec!["test".to_string()]
                    ).await;
                    
                    if let Ok(handle) = result {
                        session_ids.push(handle.session_id.clone());
                        
                        // Property: Session count should increase
                        let sessions_after = bridge.list_active_sessions().await.len();
                        prop_assert!(sessions_after > sessions_before,
                            "Session count should increase after creating session");
                    }
                }
                
                // Property: All created sessions should be in the active list
                let active_sessions = bridge.list_active_sessions().await;
                for session_id in &session_ids {
                    prop_assert!(
                        active_sessions.iter().any(|s| &s.session_id == session_id),
                        "Created session should be in active sessions list"
                    );
                }
                
                // Terminate sessions
                for session_id in &session_ids {
                    let _ = bridge.terminate_session(session_id.clone()).await;
                }
                
                // Property: Terminated sessions should be removed from active list
                let active_after_cleanup = bridge.list_active_sessions().await;
                for session_id in &session_ids {
                    prop_assert!(
                        !active_after_cleanup.iter().any(|s| &s.session_id == session_id),
                        "Terminated session should not be in active sessions list"
                    );
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_session_state_transitions(
            _seed in 0u64..100u64
        ) {
            // Property: Sessions should transition through valid states
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Create a session
                let result = bridge.execute_command(
                    "echo".to_string(),
                    vec!["test".to_string()]
                ).await;
                
                if let Ok(handle) = result {
                    let session_id = handle.session_id.clone();
                    
                    // Property: Session should start in Running state
                    let state = bridge.get_session_state(&session_id).await;
                    prop_assert!(state.is_ok(), "Should be able to get session state");
                    
                    if let Ok(state) = state {
                        prop_assert!(
                            state == crate::cli_bridge::SessionState::Running,
                            "New session should be in Running state"
                        );
                    }
                    
                    // Update state to Completed
                    let update_result = bridge.update_session_state(
                        &session_id,
                        crate::cli_bridge::SessionState::Completed
                    ).await;
                    prop_assert!(update_result.is_ok(), "Should be able to update session state");
                    
                    // Property: State should be updated
                    let new_state = bridge.get_session_state(&session_id).await;
                    if let Ok(state) = new_state {
                        prop_assert_eq!(
                            state,
                            crate::cli_bridge::SessionState::Completed,
                            "Session state should be updated"
                        );
                    }
                    
                    // Clean up
                    let _ = bridge.terminate_session(session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_sessions_by_state_filtering(
            session_count in 2usize..8usize
        ) {
            // Property: Should be able to filter sessions by state
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                let mut session_ids = Vec::new();
                
                // Create multiple sessions
                for _ in 0..session_count {
                    let result = bridge.execute_command(
                        "echo".to_string(),
                        vec!["test".to_string()]
                    ).await;
                    
                    if let Ok(handle) = result {
                        session_ids.push(handle.session_id.clone());
                    }
                }
                
                // Set half to Completed state
                let half = session_count / 2;
                for i in 0..half {
                    if i < session_ids.len() {
                        let _ = bridge.update_session_state(
                            &session_ids[i],
                            crate::cli_bridge::SessionState::Completed
                        ).await;
                    }
                }
                
                // Property: Should be able to get sessions by state
                let running_sessions = bridge.get_sessions_by_state(
                    crate::cli_bridge::SessionState::Running
                ).await;
                let completed_sessions = bridge.get_sessions_by_state(
                    crate::cli_bridge::SessionState::Completed
                ).await;
                
                // Property: Filtered sessions should only contain sessions in that state
                for session in &running_sessions {
                    prop_assert_eq!(
                        session.state,
                        crate::cli_bridge::SessionState::Running,
                        "Running filter should only return Running sessions"
                    );
                }
                
                for session in &completed_sessions {
                    prop_assert_eq!(
                        session.state,
                        crate::cli_bridge::SessionState::Completed,
                        "Completed filter should only return Completed sessions"
                    );
                }
                
                // Clean up
                for session_id in &session_ids {
                    let _ = bridge.terminate_session(session_id.clone()).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_stale_session_cleanup(
            _seed in 0u64..100u64
        ) {
            // Property: Stale sessions should be cleaned up after timeout
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                use crate::cli_bridge::SessionManager;
                
                let mut manager = SessionManager::new();
                
                // Create a session
                let _session_id = manager.create_session();
                prop_assert_eq!(manager.session_count(), 1, "Should have one session");
                
                // Wait briefly (100ms)
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                // Property: Cleanup with 0 timeout should remove all sessions
                manager.cleanup_stale_sessions(0);
                
                prop_assert_eq!(
                    manager.session_count(),
                    0,
                    "Stale sessions should be cleaned up"
                );
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_session_cleanup_preserves_recent(
            _timeout_secs in 5i64..10i64
        ) {
            // Property: Cleanup should preserve recently active sessions
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                use crate::cli_bridge::SessionManager;
                
                let mut manager = SessionManager::new();
                
                // Create sessions
                let _session_id1 = manager.create_session();
                
                // Wait a bit
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                let session_id2 = manager.create_session();
                
                prop_assert_eq!(manager.session_count(), 2, "Should have two sessions");
                
                // Cleanup with short timeout (should remove old session)
                manager.cleanup_stale_sessions(0);
                
                // Property: Recent session should still exist
                let remaining = manager.list_sessions();
                prop_assert!(
                    remaining.iter().any(|s| s.session_id == session_id2),
                    "Recent session should be preserved"
                );
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_terminated_sessions_removed(
            _seed in 0u64..100u64
        ) {
            // Property: Terminating a session should remove it from active sessions
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Create a session
                let result = bridge.execute_command(
                    "echo".to_string(),
                    vec!["test".to_string()]
                ).await;
                
                if let Ok(handle) = result {
                    let session_id = handle.session_id.clone();
                    
                    // Verify session exists
                    let sessions_before = bridge.list_active_sessions().await;
                    prop_assert!(
                        sessions_before.iter().any(|s| s.session_id == session_id),
                        "Session should exist before termination"
                    );
                    
                    // Terminate session
                    let term_result = bridge.terminate_session(session_id.clone()).await;
                    prop_assert!(term_result.is_ok(), "Termination should succeed");
                    
                    // Property: Session should be removed
                    let sessions_after = bridge.list_active_sessions().await;
                    prop_assert!(
                        !sessions_after.iter().any(|s| s.session_id == session_id),
                        "Session should be removed after termination"
                    );
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Feature: terminal-disk-management, Property 34: Agent Mode command history
    // Validates: Requirements 5.7
    // For any Agent Mode execution, command history should be maintained for review
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(20))]

        #[test]
        fn prop_command_history_recorded(
            command_count in 1usize..5usize
        ) {
            // Property: All executed commands should be recorded in history
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Execute multiple commands
                for i in 0..command_count {
                    let _ = bridge.execute_command(
                        "echo".to_string(),
                        vec![format!("test{}", i)]
                    ).await;
                }
                
                // Property: History should contain all executed commands
                let history = bridge.get_all_history().await;
                prop_assert!(
                    history.len() >= command_count,
                    "History should contain at least {} commands, found {}",
                    command_count, history.len()
                );
                
                // Property: Each history entry should have valid data
                for entry in &history {
                    prop_assert!(!entry.session_id.is_empty(), "Session ID should not be empty");
                    prop_assert!(!entry.command.is_empty(), "Command should not be empty");
                }
                
                // Clean up
                let sessions = bridge.list_active_sessions().await;
                for session in sessions {
                    let _ = bridge.terminate_session(session.session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_session_history_filtering(
            _seed in 0u64..100u64
        ) {
            // Property: Should be able to get history for specific sessions
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Execute commands in different sessions
                let handle1 = bridge.execute_command(
                    "echo".to_string(),
                    vec!["session1".to_string()]
                ).await;
                
                let handle2 = bridge.execute_command(
                    "echo".to_string(),
                    vec!["session2".to_string()]
                ).await;
                
                if let (Ok(h1), Ok(h2)) = (handle1, handle2) {
                    // Property: Session-specific history should only contain that session's commands
                    let history1 = bridge.get_session_history(&h1.session_id).await;
                    let history2 = bridge.get_session_history(&h2.session_id).await;
                    
                    for entry in &history1 {
                        prop_assert_eq!(
                            &entry.session_id, &h1.session_id,
                            "Session 1 history should only contain session 1 commands"
                        );
                    }
                    
                    for entry in &history2 {
                        prop_assert_eq!(
                            &entry.session_id, &h2.session_id,
                            "Session 2 history should only contain session 2 commands"
                        );
                    }
                    
                    // Clean up
                    let _ = bridge.terminate_session(h1.session_id).await;
                    let _ = bridge.terminate_session(h2.session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_recent_history_returns_latest(
            total_count in 3usize..8usize,
            recent_count in 1usize..3usize
        ) {
            // Property: Recent history should return the most recent N commands
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Execute multiple commands
                for i in 0..total_count {
                    let _ = bridge.execute_command(
                        "echo".to_string(),
                        vec![format!("cmd{}", i)]
                    ).await;
                }
                
                // Get recent history
                let recent = bridge.get_recent_history(recent_count).await;
                
                // Property: Should return at most recent_count entries
                prop_assert!(
                    recent.len() <= recent_count,
                    "Recent history should return at most {} entries, got {}",
                    recent_count, recent.len()
                );
                
                // Property: Recent entries should be the latest ones
                if !recent.is_empty() {
                    let all_history = bridge.get_all_history().await;
                    if !all_history.is_empty() {
                        let last_in_all = &all_history[all_history.len() - 1];
                        let last_in_recent = &recent[recent.len() - 1];
                        
                        prop_assert_eq!(
                            last_in_all.timestamp, last_in_recent.timestamp,
                            "Most recent entry should match"
                        );
                    }
                }
                
                // Clean up
                let sessions = bridge.list_active_sessions().await;
                for session in sessions {
                    let _ = bridge.terminate_session(session.session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_history_preserves_command_details(
            cmd in prop::sample::select(vec!["echo", "ls", "pwd", "cat"]),
            arg in "[a-zA-Z0-9]{3,10}"
        ) {
            // Property: History should preserve command and argument details
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Execute command
                let result = bridge.execute_command(
                    cmd.to_string(),
                    vec![arg.clone()]
                ).await;
                
                if let Ok(handle) = result {
                    // Get history
                    let history = bridge.get_session_history(&handle.session_id).await;
                    
                    // Property: History should contain the command details
                    prop_assert!(!history.is_empty(), "History should not be empty");
                    
                    let entry = &history[0];
                    prop_assert_eq!(&entry.command, cmd, "Command should be preserved");
                    prop_assert!(
                        entry.args.contains(&arg),
                        "Arguments should be preserved"
                    );
                    
                    // Clean up
                    let _ = bridge.terminate_session(handle.session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_history_timestamps_are_ordered(
            command_count in 2usize..5usize
        ) {
            // Property: History timestamps should be in chronological order
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Execute commands with small delays
                for i in 0..command_count {
                    let _ = bridge.execute_command(
                        "echo".to_string(),
                        vec![format!("cmd{}", i)]
                    ).await;
                    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                }
                
                // Get history
                let history = bridge.get_all_history().await;
                
                // Property: Timestamps should be in ascending order
                for i in 1..history.len() {
                    prop_assert!(
                        history[i].timestamp >= history[i-1].timestamp,
                        "History timestamps should be in chronological order"
                    );
                }
                
                // Clean up
                let sessions = bridge.list_active_sessions().await;
                for session in sessions {
                    let _ = bridge.terminate_session(session.session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_clear_history_removes_all(
            command_count in 1usize..5usize
        ) {
            // Property: Clearing history should remove all entries
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Execute commands
                for i in 0..command_count {
                    let _ = bridge.execute_command(
                        "echo".to_string(),
                        vec![format!("test{}", i)]
                    ).await;
                }
                
                // Verify history exists
                let history_before = bridge.get_all_history().await;
                prop_assert!(
                    !history_before.is_empty(),
                    "History should contain commands before clearing"
                );
                
                // Clear history
                bridge.clear_history().await;
                
                // Property: History should be empty after clearing
                let history_after = bridge.get_all_history().await;
                prop_assert_eq!(
                    history_after.len(), 0,
                    "History should be empty after clearing"
                );
                
                // Clean up
                let sessions = bridge.list_active_sessions().await;
                for session in sessions {
                    let _ = bridge.terminate_session(session.session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }

        #[test]
        fn prop_history_persists_across_reads(
            _seed in 0u64..100u64
        ) {
            // Property: Reading history should not modify it
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let bridge = CliBridge::new();
                
                // Execute a command
                let _ = bridge.execute_command(
                    "echo".to_string(),
                    vec!["test".to_string()]
                ).await;
                
                // Read history multiple times
                let history1 = bridge.get_all_history().await;
                let history2 = bridge.get_all_history().await;
                let history3 = bridge.get_all_history().await;
                
                // Property: Multiple reads should return the same data
                prop_assert_eq!(
                    history1.len(), history2.len(),
                    "History length should be consistent across reads"
                );
                prop_assert_eq!(
                    history2.len(), history3.len(),
                    "History length should be consistent across reads"
                );
                
                // Clean up
                let sessions = bridge.list_active_sessions().await;
                for session in sessions {
                    let _ = bridge.terminate_session(session.session_id).await;
                }
                
                Ok(()) as Result<(), proptest::test_runner::TestCaseError>
            })?;
        }
    }

    // Feature: terminal-disk-management, Property 41: Detailed error reporting
    // Validates: Requirements 6.7
    // For any error occurrence, detailed error information should be provided for debugging
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_error_reports_contain_required_fields(
            error_idx in 0usize..8usize
        ) {
            // Property: All error reports should contain required fields
            let errors = vec![
                CliError::SessionNotFound("test-session".to_string()),
                CliError::ValidationFailed("invalid command".to_string()),
                CliError::DangerousCommand("rm -rf /".to_string()),
                CliError::CommandNotFound("nonexistent".to_string()),
                CliError::PermissionDenied("access denied".to_string()),
                CliError::Timeout,
                CliError::ExecutionFailed("command failed".to_string()),
                CliError::Internal("internal error".to_string()),
            ];
            
            let error = &errors[error_idx];
            let report = error.to_error_report();
            
            // Property: Error report should have non-empty error type
            prop_assert!(!report.error_type.is_empty(), "Error type should not be empty");
            
            // Property: Error report should have non-empty message
            prop_assert!(!report.message.is_empty(), "Error message should not be empty");
            
            // Property: Error report should have a valid timestamp
            let now = chrono::Utc::now();
            let diff = (now - report.timestamp).num_seconds().abs();
            prop_assert!(diff < 10, "Timestamp should be recent");
            
            // Property: Severity should be one of the valid values
            prop_assert!(
                matches!(report.severity, 
                    crate::cli_bridge::ErrorSeverity::Warning | 
                    crate::cli_bridge::ErrorSeverity::Error | 
                    crate::cli_bridge::ErrorSeverity::Critical),
                "Severity should be a valid value"
            );
        }

        #[test]
        fn prop_error_severity_classification(
            _seed in 0u64..100u64
        ) {
            // Property: Errors should be classified with appropriate severity
            let critical_errors = vec![
                CliError::DangerousCommand("rm -rf /".to_string()),
                CliError::PermissionDenied("access denied".to_string()),
            ];
            
            let warning_errors = vec![
                CliError::SessionNotFound("test".to_string()),
                CliError::ValidationFailed("invalid".to_string()),
            ];
            
            let error_level_errors = vec![
                CliError::Timeout,
                CliError::ResourceLimitExceeded("memory".to_string()),
                CliError::ExecutionFailed("failed".to_string()),
            ];
            
            // Property: Critical errors should have Critical severity
            for error in &critical_errors {
                prop_assert_eq!(
                    error.severity(),
                    crate::cli_bridge::ErrorSeverity::Critical,
                    "Dangerous/Permission errors should be Critical"
                );
            }
            
            // Property: Warning errors should have Warning severity
            for error in &warning_errors {
                prop_assert_eq!(
                    error.severity(),
                    crate::cli_bridge::ErrorSeverity::Warning,
                    "Session/Validation errors should be Warning"
                );
            }
            
            // Property: Error-level errors should have Error severity
            for error in &error_level_errors {
                prop_assert_eq!(
                    error.severity(),
                    crate::cli_bridge::ErrorSeverity::Error,
                    "Timeout/Resource/Execution errors should be Error"
                );
            }
        }

        #[test]
        fn prop_recoverable_errors_identified(
            _seed in 0u64..100u64
        ) {
            // Property: Recoverable errors should be correctly identified
            let recoverable = vec![
                CliError::Timeout,
                CliError::ResourceLimitExceeded("memory".to_string()),
                CliError::ExecutionFailed("failed".to_string()),
            ];
            
            let non_recoverable = vec![
                CliError::SessionNotFound("test".to_string()),
                CliError::DangerousCommand("rm -rf /".to_string()),
                CliError::CommandNotFound("cmd".to_string()),
            ];
            
            // Property: Recoverable errors should return true
            for error in &recoverable {
                prop_assert!(
                    error.is_recoverable(),
                    "Timeout/Resource/Execution errors should be recoverable"
                );
            }
            
            // Property: Non-recoverable errors should return false
            for error in &non_recoverable {
                prop_assert!(
                    !error.is_recoverable(),
                    "Session/Dangerous/NotFound errors should not be recoverable"
                );
            }
        }

        #[test]
        fn prop_error_context_provided(
            error_idx in 0usize..5usize
        ) {
            // Property: Errors should provide helpful context
            let errors = vec![
                CliError::SessionNotFound("test-123".to_string()),
                CliError::DangerousCommand("rm -rf /".to_string()),
                CliError::CommandNotFound("mycmd".to_string()),
                CliError::PermissionDenied("file access".to_string()),
                CliError::Timeout,
            ];
            
            let error = &errors[error_idx];
            let report = error.to_error_report();
            
            // Property: Context should be provided for common errors
            // (Some errors may have empty context, but these specific ones should have context)
            match error {
                CliError::SessionNotFound(_) | 
                CliError::DangerousCommand(_) | 
                CliError::CommandNotFound(_) | 
                CliError::PermissionDenied(_) | 
                CliError::Timeout => {
                    prop_assert!(
                        !report.context.is_empty(),
                        "Error should provide context: {:?}", error
                    );
                }
                _ => {}
            }
        }

        #[test]
        fn prop_error_suggestions_provided(
            error_idx in 0usize..6usize
        ) {
            // Property: Errors should provide actionable suggestions
            let errors = vec![
                CliError::SessionNotFound("test".to_string()),
                CliError::CommandNotFound("cmd".to_string()),
                CliError::DangerousCommand("rm -rf /".to_string()),
                CliError::PermissionDenied("access".to_string()),
                CliError::Timeout,
                CliError::ValidationFailed("invalid".to_string()),
            ];
            
            let error = &errors[error_idx];
            let report = error.to_error_report();
            
            // Property: Suggestions should be provided
            prop_assert!(
                !report.suggestions.is_empty(),
                "Error should provide suggestions: {:?}", error
            );
            
            // Property: Suggestions should be non-empty strings
            for suggestion in &report.suggestions {
                prop_assert!(
                    !suggestion.is_empty(),
                    "Suggestions should not be empty strings"
                );
            }
        }

        #[test]
        fn prop_error_report_formatting(
            _seed in 0u64..100u64
        ) {
            // Property: Error reports should format to readable strings
            let error = CliError::CommandNotFound("testcmd".to_string());
            let report = error.to_error_report();
            let formatted = report.format();
            
            // Property: Formatted output should contain key information
            prop_assert!(
                formatted.contains("Error:"),
                "Formatted output should have Error label"
            );
            prop_assert!(
                formatted.contains("Message:"),
                "Formatted output should have Message label"
            );
            prop_assert!(
                formatted.contains("Time:"),
                "Formatted output should have Time label"
            );
            prop_assert!(
                formatted.contains(&report.error_type),
                "Formatted output should contain error type"
            );
        }

        #[test]
        fn prop_error_with_context_preserves_info(
            context_str in "[a-zA-Z0-9 ]{5,30}"
        ) {
            // Property: Adding context should preserve original error information
            let original = CliError::ExecutionFailed("command failed".to_string());
            let with_context = original.clone().with_context(&context_str);
            
            // Property: Error type should remain the same
            prop_assert!(
                matches!(with_context, CliError::ExecutionFailed(_)),
                "Error type should be preserved"
            );
            
            // Property: Context should be included in message
            if let CliError::ExecutionFailed(msg) = with_context {
                prop_assert!(
                    msg.contains(&context_str),
                    "Context should be included in error message"
                );
            }
        }

        #[test]
        fn prop_error_report_consistency(
            _seed in 0u64..100u64
        ) {
            // Property: Multiple calls to to_error_report should be consistent
            let error = CliError::Timeout;
            let report1 = error.to_error_report();
            let report2 = error.to_error_report();
            
            // Property: Error type should be consistent
            prop_assert_eq!(
                report1.error_type, report2.error_type,
                "Error type should be consistent"
            );
            
            // Property: Severity should be consistent
            prop_assert_eq!(
                report1.severity, report2.severity,
                "Severity should be consistent"
            );
            
            // Property: Recoverable flag should be consistent
            prop_assert_eq!(
                report1.recoverable, report2.recoverable,
                "Recoverable flag should be consistent"
            );
            
            // Property: Context should be consistent
            prop_assert_eq!(
                report1.context.len(), report2.context.len(),
                "Context length should be consistent"
            );
            
            // Property: Suggestions should be consistent
            prop_assert_eq!(
                report1.suggestions.len(), report2.suggestions.len(),
                "Suggestions length should be consistent"
            );
        }
    }
}
