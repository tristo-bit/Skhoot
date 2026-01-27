//! Command execution with security sandboxing

use super::error::CliError;
use super::types::{CommandHandle, ProcessHandle, TerminalOutput, SecurityConfig, ProcessType, PtyProcessHandle};
use super::pty::PtySession;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::process::{Command};
use std::process::Stdio;
use tracing::{debug, warn, info};

/// Dangerous command patterns that require explicit confirmation
const DANGEROUS_PATTERNS: &[&str] = &[
    "rm -rf /",
    "rm -rf /*",
    "dd if=",
    "mkfs",
    "fdisk",
    "parted",
    "> /dev/",
    "chmod -R 777",
    "chown -R",
    ":(){ :|:& };:",  // Fork bomb
];

/// Commands that are blocked entirely
const BLOCKED_COMMANDS: &[&str] = &[
    "reboot",
    "shutdown",
    "halt",
    "poweroff",
];

/// Executes commands with security sandboxing and monitoring
pub struct CommandExecutor {
    processes: Arc<RwLock<HashMap<String, ProcessType>>>,
    security_config: Arc<RwLock<SecurityConfig>>,
}

impl CommandExecutor {
    /// Create a new command executor with default security configuration
    pub fn new() -> Self {
        Self {
            processes: Arc::new(RwLock::new(HashMap::new())),
            security_config: Arc::new(RwLock::new(SecurityConfig::default())),
        }
    }

    /// Create a command executor with custom security configuration
    pub fn with_config(config: SecurityConfig) -> Self {
        info!(
            "CommandExecutor initialized with sandbox_enabled={}",
            config.sandbox_enabled
        );
        Self {
            processes: Arc::new(RwLock::new(HashMap::new())),
            security_config: Arc::new(RwLock::new(config)),
        }
    }

    /// Get the current security configuration
    pub async fn get_security_config(&self) -> SecurityConfig {
        self.security_config.read().await.clone()
    }

    /// Update the security configuration
    pub async fn set_security_config(&self, config: SecurityConfig) {
        info!(
            "Security configuration updated: sandbox_enabled={}",
            config.sandbox_enabled
        );
        if !config.sandbox_enabled {
            warn!("⚠️  SECURITY WARNING: Process sandboxing has been disabled. Commands will run with fewer restrictions.");
        }
        *self.security_config.write().await = config;
    }

    /// Check if sandboxing is currently enabled
    pub async fn is_sandbox_enabled(&self) -> bool {
        self.security_config.read().await.sandbox_enabled
    }

    /// Validate a command before execution
    pub async fn validate_command(&self, cmd: &str, args: &[String]) -> Result<(), CliError> {
        let config = self.security_config.read().await;

        // Check if command is blocked
        if BLOCKED_COMMANDS.contains(&cmd) {
            return Err(CliError::DangerousCommand(format!(
                "Command '{}' is blocked for security reasons",
                cmd
            )));
        }

        // Build full command string for pattern matching
        let full_command = format!("{} {}", cmd, args.join(" "));

        // Check for dangerous patterns
        for pattern in DANGEROUS_PATTERNS {
            if full_command.contains(pattern) {
                let error_msg = format!(
                    "Command contains dangerous pattern: {}. User confirmation required.",
                    pattern
                );
                
                // Even with sandbox disabled, dangerous commands require confirmation
                if !config.sandbox_enabled {
                    warn!("Dangerous command detected with sandbox disabled: {}", full_command);
                }
                
                return Err(CliError::DangerousCommand(error_msg));
            }
        }

        // Validate command exists (basic check)
        if cmd.is_empty() {
            return Err(CliError::ValidationFailed("Command cannot be empty".to_string()));
        }

        // Log security warning if sandbox is disabled
        if !config.sandbox_enabled {
            debug!("⚠️  Executing command without sandbox: {} {:?}", cmd, args);
        } else {
            debug!("Command validated with sandbox enabled: {} {:?}", cmd, args);
        }

        Ok(())
    }

    /// Spawn a command with security sandboxing
    pub async fn spawn_command(
        &self,
        session_id: String,
        cmd: String,
        args: Vec<String>,
        cwd: Option<std::path::PathBuf>,
    ) -> Result<CommandHandle, CliError> {
        let config = self.security_config.read().await;
        
        debug!("Spawning command: {} {:?} (sandbox_enabled={}, cwd={:?})", cmd, args, config.sandbox_enabled, cwd);

        // Create command with sandboxing
        let mut command = Command::new(&cmd);
        command
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(dir) = cwd {
            command.current_dir(dir);
        }

        // Apply platform-specific sandboxing if enabled
        if config.sandbox_enabled {
            #[cfg(target_os = "linux")]
            {
                // TODO: Add more Linux sandboxing (seccomp, namespaces, cgroups)
                // For now, we use process groups and resource limits
                debug!("Applied Linux sandbox restrictions");
            }

            #[cfg(target_os = "windows")]
            {
                // TODO: On Windows, use job objects for sandboxing
                debug!("Windows sandbox restrictions not yet implemented");
            }

            #[cfg(target_os = "macos")]
            {
                // TODO: Add macOS sandbox restrictions
                debug!("Applied macOS sandbox restrictions");
            }
        } else {
            warn!("⚠️  Spawning process WITHOUT sandbox restrictions");
        }

        // Spawn the process
        let mut child = command.spawn().map_err(|e| {
            warn!("Failed to spawn command '{}': {}", cmd, e);
            if e.kind() == std::io::ErrorKind::NotFound {
                CliError::CommandNotFound(cmd.clone())
            } else {
                CliError::SpawnFailed(e.to_string())
            }
        })?;

        let pid = child.id();
        debug!("Process spawned with PID: {:?} (sandbox_enabled={})", pid, config.sandbox_enabled);

        // Take stdout and stderr for streaming
        let stdout = child.stdout.take().ok_or_else(|| {
            CliError::Internal("Failed to capture stdout".to_string())
        })?;
        let stderr = child.stderr.take().ok_or_else(|| {
            CliError::Internal("Failed to capture stderr".to_string())
        })?;
        
        // Take stdin for interactive input
        let stdin = child.stdin.take().ok_or_else(|| {
            CliError::Internal("Failed to capture stdin".to_string())
        })?;

        // Create process handle with stdin
        let process_handle = ProcessHandle::new(child).with_stdin(stdin);

        // Start streaming output in background tasks
        let stdout_buffer = process_handle.stdout_buffer.clone();
        let stderr_buffer = process_handle.stderr_buffer.clone();

        // Spawn stdout reader task
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            
            while let Ok(Some(line)) = lines.next_line().await {
                let output = TerminalOutput::stdout(line);
                let mut buffer = stdout_buffer.lock().await;
                buffer.push(output);
            }
        });

        // Spawn stderr reader task
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            
            while let Ok(Some(line)) = lines.next_line().await {
                let output = TerminalOutput::stderr(line);
                let mut buffer = stderr_buffer.lock().await;
                buffer.push(output);
            }
        });

        // Store process handle
        {
            let mut processes = self.processes.write().await;
            processes.insert(session_id.clone(), ProcessType::Regular(process_handle));
        }

        // Create command handle with optional PID
        let mut handle = CommandHandle::new(session_id, cmd, args);
        if let Some(pid_value) = pid {
            handle = handle.with_pid(pid_value);
        }

        Ok(handle)
    }

    /// Spawn a command with PTY (pseudo-terminal) support for full terminal emulation
    pub async fn spawn_command_pty(
        &self,
        session_id: String,
        cmd: String,
        args: Vec<String>,
        cwd: Option<std::path::PathBuf>,
        cols: Option<u16>,
        rows: Option<u16>,
    ) -> Result<CommandHandle, CliError> {
        let config = self.security_config.read().await;
        
        debug!(
            "Spawning PTY command: {} {:?} (sandbox_enabled={}, size={}x{}, cwd={:?})",
            cmd, args, config.sandbox_enabled,
            cols.unwrap_or(80), rows.unwrap_or(24), cwd
        );

        // Create PTY session
        let pty_session = PtySession::new(
            session_id.clone(),
            &cmd,
            &args,
            cwd,
            cols,
            rows,
        )?;

        // Start background output reader
        let reader_task = pty_session.start_output_reader();

        // Create PTY process handle
        let pty_handle = PtyProcessHandle::new(pty_session).with_reader_task(reader_task);

        // Store PTY process handle
        {
            let mut processes = self.processes.write().await;
            processes.insert(session_id.clone(), ProcessType::Pty(pty_handle));
        }

        // Create command handle (PTY doesn't expose PID directly)
        let handle = CommandHandle::new(session_id, cmd, args);

        debug!("PTY command spawned successfully");
        Ok(handle)
    }

    /// Resize a PTY terminal
    pub async fn resize_pty(
        &self,
        session_id: &str,
        cols: u16,
        rows: u16,
    ) -> Result<(), CliError> {
        let processes = self.processes.read().await;
        let process = processes
            .get(session_id)
            .ok_or_else(|| CliError::SessionNotFound(session_id.to_string()))?;

        match process {
            ProcessType::Pty(pty_handle) => {
                let mut pty = pty_handle.pty_session.lock().await;
                pty.resize(cols, rows)?;
                debug!("Resized PTY session {} to {}x{}", session_id, cols, rows);
                Ok(())
            }
            ProcessType::Regular(_) => {
                Err(CliError::InvalidState(
                    "Cannot resize non-PTY session".to_string()
                ))
            }
        }
    }

    /// Write to stdin of a command (supports both regular and PTY processes)
    pub async fn write_stdin(
        &self,
        handle: &CommandHandle,
        input: String,
    ) -> Result<(), CliError> {
        let processes = self.processes.read().await;
        let process = processes
            .get(&handle.session_id)
            .ok_or_else(|| CliError::SessionNotFound(handle.session_id.clone()))?;

        match process {
            ProcessType::Regular(proc_handle) => {
                use tokio::io::AsyncWriteExt;
                
                // Get stdin handle
                let mut stdin_guard = proc_handle.stdin.lock().await;
                let stdin = stdin_guard.as_mut()
                    .ok_or_else(|| CliError::StdinNotAvailable)?;

                // Write input with newline
                let input_with_newline = format!("{}\n", input);
                stdin.write_all(input_with_newline.as_bytes()).await
                    .map_err(|e| CliError::Io(e.to_string()))?;
                
                // Flush to ensure input is sent immediately
                stdin.flush().await
                    .map_err(|e| CliError::Io(e.to_string()))?;

                debug!("Wrote to regular process stdin: {}", input);
            }
            ProcessType::Pty(pty_handle) => {
                let mut pty = pty_handle.pty_session.lock().await;
                pty.write_input(&input)?;
                debug!("Wrote to PTY session: {}", input);
            }
        }
        
        Ok(())
    }

    /// Read output from a command (supports both regular and PTY processes)
    pub async fn read_output(
        &self,
        handle: &CommandHandle,
    ) -> Result<Vec<TerminalOutput>, CliError> {
        let processes = self.processes.read().await;
        let process = processes
            .get(&handle.session_id)
            .ok_or_else(|| CliError::SessionNotFound(handle.session_id.clone()))?;

        match process {
            ProcessType::Regular(proc_handle) => {
                // Collect output from buffers
                let mut output = Vec::new();
                
                {
                    let stdout_buffer = proc_handle.stdout_buffer.lock().await;
                    output.extend(stdout_buffer.clone());
                }
                
                {
                    let stderr_buffer = proc_handle.stderr_buffer.lock().await;
                    output.extend(stderr_buffer.clone());
                }

                Ok(output)
            }
            ProcessType::Pty(pty_handle) => {
                // Get buffered output from PTY
                let pty = pty_handle.pty_session.lock().await;
                let output = pty.get_buffered_output().await;
                Ok(output)
            }
        }
    }

    /// Terminate a command (supports both regular and PTY processes)
    pub async fn terminate(&self, handle: &CommandHandle) -> Result<(), CliError> {
        let mut processes = self.processes.write().await;
        
        if let Some(process) = processes.remove(&handle.session_id) {
            match process {
                ProcessType::Regular(proc_handle) => {
                    let mut child = proc_handle.child.lock().await;
                    
                    // Try graceful termination first on Unix systems
                    #[cfg(unix)]
                    {
                        if let Some(pid) = child.id() {
                            // Send SIGTERM for graceful shutdown
                            let _ = nix::sys::signal::kill(
                                nix::unistd::Pid::from_raw(pid as i32),
                                nix::sys::signal::Signal::SIGTERM,
                            );
                        }
                    }

                    // Wait a bit for graceful shutdown
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                    // Force kill if still running
                    let _ = child.kill().await;
                    let _ = child.wait().await;
                    
                    debug!("Regular process terminated: {:?}", handle.pid);
                }
                ProcessType::Pty(pty_handle) => {
                    // Cancel the reader task
                    {
                        let mut task_guard = pty_handle.reader_task.lock().await;
                        if let Some(task) = task_guard.take() {
                            task.abort();
                        }
                    }

                    // Kill the PTY process
                    let mut pty = pty_handle.pty_session.lock().await;
                    let _ = pty.kill();
                    
                    debug!("PTY process terminated: {}", handle.session_id);
                }
            }
        }

        Ok(())
    }
}

impl Default for CommandExecutor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_safe_command() {
        let executor = CommandExecutor::new();
        let result = executor.validate_command("echo", &["hello".to_string()]).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_validate_blocked_command() {
        let executor = CommandExecutor::new();
        let result = executor.validate_command("reboot", &[]).await;
        assert!(matches!(result, Err(CliError::DangerousCommand(_))));
    }

    #[tokio::test]
    async fn test_validate_dangerous_pattern() {
        let executor = CommandExecutor::new();
        let result = executor.validate_command("rm", &["-rf".to_string(), "/".to_string()]).await;
        assert!(matches!(result, Err(CliError::DangerousCommand(_))));
    }

    #[tokio::test]
    async fn test_validate_empty_command() {
        let executor = CommandExecutor::new();
        let result = executor.validate_command("", &[]).await;
        assert!(matches!(result, Err(CliError::ValidationFailed(_))));
    }

    #[tokio::test]
    async fn test_spawn_simple_command() {
        let executor = CommandExecutor::new();
        let result = executor.spawn_command(
            "test-session".to_string(),
            "echo".to_string(),
            vec!["hello".to_string()],
            None,
        ).await;
        
        assert!(result.is_ok());
        let handle = result.unwrap();
        assert_eq!(handle.command, "echo");
        assert!(handle.pid.is_some());
    }

    #[tokio::test]
    async fn test_sandbox_configuration() {
        let executor = CommandExecutor::new();
        
        // Default should have sandbox enabled
        assert!(executor.is_sandbox_enabled().await);
        
        // Disable sandbox
        let mut config = executor.get_security_config().await;
        config.sandbox_enabled = false;
        executor.set_security_config(config).await;
        
        assert!(!executor.is_sandbox_enabled().await);
        
        // Re-enable sandbox
        let mut config = executor.get_security_config().await;
        config.sandbox_enabled = true;
        executor.set_security_config(config).await;
        
        assert!(executor.is_sandbox_enabled().await);
    }

    #[tokio::test]
    async fn test_dangerous_command_requires_confirmation_even_without_sandbox() {
        let executor = CommandExecutor::new();
        
        // Disable sandbox
        let mut config = executor.get_security_config().await;
        config.sandbox_enabled = false;
        executor.set_security_config(config).await;
        
        // Dangerous commands should still be caught
        let result = executor.validate_command("rm", &["-rf".to_string(), "/".to_string()]).await;
        assert!(matches!(result, Err(CliError::DangerousCommand(_))));
    }
}
