//! Agent Tool Executor
//!
//! Executes agent tools using the existing cli_bridge infrastructure.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tokio::time::timeout;

use crate::cli_bridge::{CliBridge, CliError};
use crate::terminal::TerminalManager;
use super::tools::{Tool, ToolCall, ToolResult, ToolResultMetadata};
use super::apply_patch::apply_patch;
use std::sync::Arc;

/// Tool execution configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutorConfig {
    /// Default timeout for tool execution
    pub default_timeout_ms: u64,
    /// Working directory for commands
    pub working_directory: PathBuf,
    /// Maximum output size in bytes
    pub max_output_size: usize,
    /// Whether to allow write operations
    pub allow_writes: bool,
    /// Optional terminal session ID for persistent shell
    pub terminal_session_id: Option<String>,
}

impl Default for ExecutorConfig {
    fn default() -> Self {
        Self {
            default_timeout_ms: 30000,
            working_directory: std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
            max_output_size: 1024 * 1024, // 1MB
            allow_writes: true,
            terminal_session_id: None,
        }
    }
}

/// Agent tool executor
pub struct AgentExecutor {
    /// CLI bridge for command execution
    cli_bridge: CliBridge,
    /// Persistent Terminal Manager (Optional)
    terminal_manager: Option<TerminalManager>,
    /// Executor configuration
    config: ExecutorConfig,
}

impl AgentExecutor {
    /// Create a new executor with default configuration
    pub fn new() -> Self {
        Self {
            cli_bridge: CliBridge::new(),
            terminal_manager: None,
            config: ExecutorConfig::default(),
        }
    }

    /// Create an executor with custom configuration
    pub fn with_config(config: ExecutorConfig) -> Self {
        Self {
            cli_bridge: CliBridge::new(),
            terminal_manager: None,
            config,
        }
    }

    /// Set the terminal manager for persistent shell support
    pub fn with_terminal_manager(mut self, manager: TerminalManager) -> Self {
        self.terminal_manager = Some(manager);
        self
    }

    /// Set the working directory
    pub fn set_working_directory(&mut self, path: PathBuf) {
        self.config.working_directory = path;
    }

    /// Execute a tool call
    pub async fn execute(&self, tool_call: &ToolCall) -> ToolResult {
        let start = Instant::now();
        
        let tool = match tool_call.name.as_str() {
            "shell" => Tool::Shell,
            "read_file" => Tool::ReadFile,
            "write_file" => Tool::WriteFile,
            "list_directory" => Tool::ListDirectory,
            "search_files" => Tool::SearchFiles,
            "apply_patch" => Tool::ApplyPatch,
            _ => {
                return ToolResult {
                    tool_call_id: tool_call.id.clone(),
                    success: false,
                    output: String::new(),
                    error: Some(format!("Unknown tool: {}", tool_call.name)),
                    metadata: None,
                };
            }
        };

        let result = match tool {
            Tool::Shell => self.execute_shell(tool_call).await,
            Tool::ReadFile => self.execute_read_file(tool_call).await,
            Tool::WriteFile => self.execute_write_file(tool_call).await,
            Tool::ListDirectory => self.execute_list_directory(tool_call).await,
            Tool::SearchFiles => self.execute_search_files(tool_call).await,
            Tool::ApplyPatch => self.execute_apply_patch(tool_call).await,
        };

        let duration_ms = start.elapsed().as_millis() as u64;

        match result {
            Ok((output, metadata)) => ToolResult {
                tool_call_id: tool_call.id.clone(),
                success: true,
                output,
                error: None,
                metadata: Some(ToolResultMetadata {
                    duration_ms: Some(duration_ms),
                    ..metadata.unwrap_or_default()
                }),
            },
            Err(e) => ToolResult {
                tool_call_id: tool_call.id.clone(),
                success: false,
                output: String::new(),
                error: Some(e.to_string()),
                metadata: Some(ToolResultMetadata {
                    duration_ms: Some(duration_ms),
                    ..Default::default()
                }),
            },
        }
    }

    /// Execute a shell command
    async fn execute_shell(
        &self,
        tool_call: &ToolCall,
    ) -> Result<(String, Option<ToolResultMetadata>), ExecutorError> {
        let args = &tool_call.arguments;
        
        let command = args.get("command")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ExecutorError::MissingArgument("command".to_string()))?;
        
        // If we have a terminal session and manager, use persistent shell
        if let (Some(manager), Some(session_id)) = (&self.terminal_manager, &self.config.terminal_session_id) {
            // Check if session is active/exists
            if manager.get_session(session_id).await.is_some() {
                // Get current history length to read only new output
                let start_len = manager.get_history_len(session_id).await.unwrap_or(0);

                // Write command to PTY (append newline)
                let cmd_with_newline = format!("{}\n", command);
                manager.write(session_id, &cmd_with_newline).await
                    .map_err(|e| ExecutorError::FileOperation(format!("Failed to write to terminal: {}", e)))?;
                
                // Wait briefly for output (heuristic)
                tokio::time::sleep(Duration::from_millis(500)).await;
                
                // Read only new lines since we sent the command
                let (output_lines, _) = manager.read_from(session_id, start_len).await
                    .map_err(|e| ExecutorError::FileOperation(format!("Failed to read from terminal: {}", e)))?;
                
                // Filter out the echoed command if possible (heuristic)
                // PTY usually echoes the command back as the first line(s).
                // We'll join everything for now, but this specific read avoids the "history repeat" issue.
                let output = output_lines.join("");
                
                return Ok((output, Some(ToolResultMetadata {
                    working_directory: None, // We don't track CWD easily in PTY mode yet
                    ..Default::default()
                })));
            }
        }

        // Fallback to ephemeral execution if no persistent session
        
        let workdir = args.get("workdir")
            .and_then(|v| v.as_str())
            .map(PathBuf::from)
            .unwrap_or_else(|| self.config.working_directory.clone());
        
        let timeout_ms = args.get("timeout_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(self.config.default_timeout_ms);

        // Parse command into program and arguments
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            return Err(ExecutorError::InvalidArgument("Empty command".to_string()));
        }

        // Use absolute path for shell to avoid PATH issues in some environments
        let (program, cmd_args) = if cfg!(target_os = "windows") {
            ("cmd".to_string(), vec!["/C".to_string(), command.to_string()])
        } else {
            ("/bin/sh".to_string(), vec!["-c".to_string(), command.to_string()])
        };

        // Execute command with timeout
        let handle = timeout(
            Duration::from_millis(timeout_ms),
            self.cli_bridge.execute_command(program, cmd_args),
        )
        .await
        .map_err(|_| ExecutorError::Timeout(timeout_ms))?
        .map_err(ExecutorError::CliBridge)?;

        // Wait for command to complete and collect output
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        let output = self.cli_bridge.read_output(handle.session_id.clone()).await
            .map_err(ExecutorError::CliBridge)?;

        // Combine stdout and stderr
        let mut combined_output = String::new();
        for line in output {
            combined_output.push_str(&line.content);
            combined_output.push('\n');
        }

        // Truncate if too large
        if combined_output.len() > self.config.max_output_size {
            combined_output.truncate(self.config.max_output_size);
            combined_output.push_str("\n... [output truncated]");
        }

        // Cleanup session
        let _ = self.cli_bridge.terminate_session(handle.session_id).await;

        Ok((combined_output, Some(ToolResultMetadata {
            working_directory: Some(workdir.to_string_lossy().to_string()),
            ..Default::default()
        })))
    }

    /// Execute read_file tool
    async fn execute_read_file(
        &self,
        tool_call: &ToolCall,
    ) -> Result<(String, Option<ToolResultMetadata>), ExecutorError> {
        let args = &tool_call.arguments;
        
        let path_str = args.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ExecutorError::MissingArgument("path".to_string()))?;
        
        let path = self.resolve_path(path_str);
        
        let start_line = args.get("start_line")
            .and_then(|v| v.as_u64())
            .map(|v| v as usize)
            .unwrap_or(1);
        
        let end_line = args.get("end_line")
            .and_then(|v| v.as_u64())
            .map(|v| v as usize);

        // Read file
        let content = tokio::fs::read_to_string(&path).await
            .map_err(|e| ExecutorError::FileOperation(format!("Failed to read {}: {}", path.display(), e)))?;

        // Apply line range
        let lines: Vec<&str> = content.lines().collect();
        let total_lines = lines.len();
        
        let start_idx = start_line.saturating_sub(1).min(total_lines);
        let end_idx = end_line.map(|e| e.min(total_lines)).unwrap_or(total_lines);
        
        let selected_lines: Vec<&str> = lines[start_idx..end_idx].to_vec();
        let output = selected_lines.join("\n");

        // Truncate if too large
        let final_output = if output.len() > self.config.max_output_size {
            let mut truncated = output[..self.config.max_output_size].to_string();
            truncated.push_str("\n... [content truncated]");
            truncated
        } else {
            output
        };

        Ok((final_output, None))
    }

    /// Execute write_file tool
    async fn execute_write_file(
        &self,
        tool_call: &ToolCall,
    ) -> Result<(String, Option<ToolResultMetadata>), ExecutorError> {
        if !self.config.allow_writes {
            return Err(ExecutorError::PermissionDenied("Write operations are disabled".to_string()));
        }

        let args = &tool_call.arguments;
        
        let path_str = args.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ExecutorError::MissingArgument("path".to_string()))?;
        
        let content = args.get("content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ExecutorError::MissingArgument("content".to_string()))?;
        
        let mode = args.get("mode")
            .and_then(|v| v.as_str())
            .unwrap_or("overwrite");

        let path = self.resolve_path(path_str);

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| ExecutorError::FileOperation(format!("Failed to create directory: {}", e)))?;
        }

        // Write or append
        match mode {
            "append" => {
                use tokio::io::AsyncWriteExt;
                let mut file = tokio::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&path)
                    .await
                    .map_err(|e| ExecutorError::FileOperation(format!("Failed to open {}: {}", path.display(), e)))?;
                
                file.write_all(content.as_bytes()).await
                    .map_err(|e| ExecutorError::FileOperation(format!("Failed to write: {}", e)))?;
            }
            _ => {
                tokio::fs::write(&path, content).await
                    .map_err(|e| ExecutorError::FileOperation(format!("Failed to write {}: {}", path.display(), e)))?;
            }
        }

        Ok((format!("Successfully wrote {} bytes to {}", content.len(), path.display()), None))
    }

    /// Execute list_directory tool
    async fn execute_list_directory(
        &self,
        tool_call: &ToolCall,
    ) -> Result<(String, Option<ToolResultMetadata>), ExecutorError> {
        let args = &tool_call.arguments;
        
        let path_str = args.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ExecutorError::MissingArgument("path".to_string()))?;
        
        let depth = args.get("depth")
            .and_then(|v| v.as_u64())
            .unwrap_or(1) as usize;
        
        let include_hidden = args.get("include_hidden")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let path = self.resolve_path(path_str);

        let entries = self.list_dir_recursive(&path, depth, include_hidden, 0).await?;
        
        Ok((entries.join("\n"), None))
    }

    /// Recursively list directory contents (non-recursive implementation to avoid boxing)
    async fn list_dir_recursive(
        &self,
        path: &Path,
        max_depth: usize,
        include_hidden: bool,
        _current_depth: usize,
    ) -> Result<Vec<String>, ExecutorError> {
        let mut entries = Vec::new();
        let mut stack: Vec<(PathBuf, usize)> = vec![(path.to_path_buf(), 0)];

        while let Some((current_path, depth)) = stack.pop() {
            if depth > max_depth {
                continue;
            }

            let indent = "  ".repeat(depth);

            let mut dir = tokio::fs::read_dir(&current_path).await
                .map_err(|e| ExecutorError::FileOperation(format!("Failed to read directory {}: {}", current_path.display(), e)))?;

            let mut dir_entries = Vec::new();
            while let Some(entry) = dir.next_entry().await
                .map_err(|e| ExecutorError::FileOperation(format!("Failed to read entry: {}", e)))? 
            {
                let name = entry.file_name().to_string_lossy().to_string();
                
                // Skip hidden files if not requested
                if !include_hidden && name.starts_with('.') {
                    continue;
                }

                let metadata = entry.metadata().await
                    .map_err(|e| ExecutorError::FileOperation(format!("Failed to get metadata: {}", e)))?;

                let type_indicator = if metadata.is_dir() { "/" } else { "" };
                let size = if metadata.is_file() {
                    format!(" ({} bytes)", metadata.len())
                } else {
                    String::new()
                };

                dir_entries.push((name.clone(), format!("{}{}{}{}", indent, name, type_indicator, size), metadata.is_dir(), entry.path()));
            }

            // Sort entries
            dir_entries.sort_by(|a, b| a.0.cmp(&b.0));

            for (_, formatted, is_dir, entry_path) in dir_entries {
                entries.push(formatted);
                
                // Add directories to stack for processing
                if is_dir && depth < max_depth {
                    stack.push((entry_path, depth + 1));
                }
            }
        }

        Ok(entries)
    }

    /// Execute search_files tool
    async fn execute_search_files(
        &self,
        tool_call: &ToolCall,
    ) -> Result<(String, Option<ToolResultMetadata>), ExecutorError> {
        let args = &tool_call.arguments;
        
        let pattern = args.get("pattern")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ExecutorError::MissingArgument("pattern".to_string()))?;
        
        let path_str = args.get("path")
            .and_then(|v| v.as_str())
            .unwrap_or(".");
        
        let search_type = args.get("search_type")
            .and_then(|v| v.as_str())
            .unwrap_or("filename");
        
        let max_results = args.get("max_results")
            .and_then(|v| v.as_u64())
            .unwrap_or(100) as usize;

        let path = self.resolve_path(path_str);

        // Use shell commands for search (more reliable cross-platform)
        let command = match search_type {
            "content" => {
                if cfg!(target_os = "windows") {
                    format!("findstr /s /n /i \"{}\" *", pattern)
                } else {
                    format!("grep -rn \"{}\" . 2>/dev/null | head -n {}", pattern, max_results)
                }
            }
            _ => {
                // filename search
                if cfg!(target_os = "windows") {
                    format!("dir /s /b *{}*", pattern)
                } else {
                    format!("find . -name \"{}\" 2>/dev/null | head -n {}", pattern, max_results)
                }
            }
        };

        // Execute search command
        let search_call = ToolCall {
            id: format!("{}-search", tool_call.id),
            name: "shell".to_string(),
            arguments: serde_json::json!({
                "command": command,
                "workdir": path.to_string_lossy()
            }),
        };

        self.execute_shell(&search_call).await
    }

    /// Execute apply_patch tool
    async fn execute_apply_patch(
        &self,
        tool_call: &ToolCall,
    ) -> Result<(String, Option<ToolResultMetadata>), ExecutorError> {
        if !self.config.allow_writes {
            return Err(ExecutorError::PermissionDenied("Write operations are disabled".to_string()));
        }

        let args = &tool_call.arguments;
        
        let patch_content = args.get("patch")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ExecutorError::MissingArgument("patch".to_string()))?;

        // Switch to the working directory to apply the patch correctly
        let original_dir = std::env::current_dir().map_err(|e| ExecutorError::FileOperation(e.to_string()))?;
        std::env::set_current_dir(&self.config.working_directory)
            .map_err(|e| ExecutorError::FileOperation(format!("Failed to set working directory: {}", e)))?;

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();

        let result = apply_patch(patch_content, &mut stdout, &mut stderr);

        // Restore original directory
        let _ = std::env::set_current_dir(original_dir);

        let output_str = String::from_utf8_lossy(&stdout).to_string();
        let error_str = String::from_utf8_lossy(&stderr).to_string();

        match result {
            Ok(_) => Ok((output_str, None)),
            Err(e) => Err(ExecutorError::FileOperation(format!("Patch application failed: {}\nOutput: {}\nError: {}", e, output_str, error_str))),
        }
    }

    /// Resolve a path relative to working directory
    pub fn resolve_path(&self, path_str: &str) -> PathBuf {
        let path = Path::new(path_str);

        // 1. Handle absolute paths
        if path.is_absolute() {
            return path.to_path_buf();
        }

        // 2. Handle tilde expansion
        if path_str.starts_with("~/") || path_str == "~" {
            // Try standard dirs crate first
            if let Some(home) = dirs::home_dir() {
                if path_str == "~" {
                    return home;
                }
                return home.join(&path_str[2..]);
            }
            
            // Fallback: Check HOME env var directly (Linux/macOS) if dirs crate fails
            // This happens in some sandboxed/bundled environments where user context is partial
            if let Ok(home_str) = std::env::var("HOME") {
                let home = PathBuf::from(home_str);
                if path_str == "~" {
                    return home;
                }
                return home.join(&path_str[2..]);
            }
        }

        // 3. Heuristic for common absolute paths missing leading slash on Unix-like systems
        #[cfg(unix)]
        {
            if path_str.starts_with("home/") || 
               path_str.starts_with("usr/") || 
               path_str.starts_with("etc/") || 
               path_str.starts_with("var/") ||
               path_str.starts_with("opt/") ||
               path_str.starts_with("tmp/") ||
               path_str.starts_with("Users/") ||
               path_str.starts_with("mnt/") {
                return PathBuf::from(format!("/{}", path_str));
            }
        }

        // 4. Try relative to CWD first
        let relative_path = self.config.working_directory.join(path);
        if relative_path.exists() {
            return relative_path;
        }

        // 5. Fallback: Try relative to User Home (e.g., "Desktop" -> "~/Desktop")
        if let Some(home) = dirs::home_dir() {
            let home_path = home.join(path);
            if home_path.exists() {
                return home_path;
            }
        }

        // Default to CWD relative if nothing else matches (legacy behavior)
        relative_path
    }
}

impl Default for AgentExecutor {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for ToolResultMetadata {
    fn default() -> Self {
        Self {
            exit_code: None,
            duration_ms: None,
            working_directory: None,
        }
    }
}

/// Executor errors
#[derive(Debug, thiserror::Error)]
pub enum ExecutorError {
    #[error("Missing required argument: {0}")]
    MissingArgument(String),
    
    #[error("Invalid argument: {0}")]
    InvalidArgument(String),
    
    #[error("Command timed out after {0}ms")]
    Timeout(u64),
    
    #[error("File operation failed: {0}")]
    FileOperation(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("CLI bridge error: {0}")]
    CliBridge(#[from] CliError),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_executor_creation() {
        let executor = AgentExecutor::new();
        assert!(executor.config.allow_writes);
    }

    #[tokio::test]
    async fn test_resolve_path_absolute() {
        let executor = AgentExecutor::new();
        let path = executor.resolve_path("/absolute/path");
        assert!(path.is_absolute());
    }

    #[tokio::test]
    async fn test_resolve_path_relative() {
        let executor = AgentExecutor::new();
        let path = executor.resolve_path("relative/path");
        assert!(path.ends_with("relative/path"));
    }

    #[test]
    fn test_resolve_path_home_heuristic() {
        let executor = AgentExecutor::new();
        // This test only makes sense on Unix where we enabled the heuristic
        #[cfg(unix)]
        {
            let path = executor.resolve_path("home/user/project");
            assert_eq!(path, PathBuf::from("/home/user/project"));
        }
    }

    #[test]
    fn test_resolve_path_tilde() {
        let executor = AgentExecutor::new();
        if let Some(home) = dirs::home_dir() {
            let path = executor.resolve_path("~/project");
            assert_eq!(path, home.join("project"));
            
            let path_home = executor.resolve_path("~");
            assert_eq!(path_home, home);
        }
    }
}
