//! Agent Tool Executor
//!
//! Executes agent tools using the existing cli_bridge infrastructure.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tokio::time::timeout;

use crate::cli_bridge::{CliBridge, CliError};
use crate::search_engine::{CliEngine, CliConfig};
use std::collections::HashMap;
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
            // IMPORTANT: get_session returns Option<Arc<TerminalSession>>
            // If the session is HIBERNATED, it returns None by default unless we restore it first.
            // But manager.write() handles auto-restore!
            // However, get_session() here is used as a check.
            
            // Fix: Use manager.is_known_session() or simply verify if we can write to it.
            // Or better, just try to write! manager.write() handles restoration.
            // If manager.write() fails with "Session not found", THEN we know it's gone.
            
            // Let's try to write directly.
            
            // Resolve workdir for the persistent session
            let workdir = args.get("workdir")
                .and_then(|v| v.as_str())
                .map(|s| self.resolve_path(s))
                .unwrap_or_else(|| self.config.working_directory.clone());

            // Write command to PTY (append newline)
            // We prepend a directory change to ensure we execute in the requested context
            // Note: We use Set-Location -LiteralPath on Windows to handle special characters in paths
            let cmd_with_newline = if cfg!(target_os = "windows") {
                // PowerShell handles paths with spaces/special chars best with -LiteralPath
                format!("Set-Location -LiteralPath '{}'; if ($?) {{ {} }}\n", workdir.display(), command)
            } else {
                // Bash/Sh - usage of && ensures we don't run if cd fails
                format!("cd \"{}\" && {}\n", workdir.display(), command)
            };
            
            // Get current history length to read only new output
            // We do this before write to establish baseline
            // Note: get_history_len might fail if hibernated, but let's try.
            let start_len = manager.get_history_len(session_id).await.unwrap_or(0);

            match manager.write(session_id, &cmd_with_newline).await {
                Ok(_) => {
                    // Success! It was a valid session (or restored successfully)
                    
                    // Wait briefly for output (heuristic)
                    // Increased wait time for Windows/Prod environments where initialization might be slower
                    let wait_time = if cfg!(target_os = "windows") { 1000 } else { 500 };
                    tokio::time::sleep(Duration::from_millis(wait_time)).await;
                    
                    // Read only new lines since we sent the command
                    // Note: if session was restored, start_len might be 0 or small, 
                    // but read_from handles bounds checks.
                    let (output_lines, _) = manager.read_from(session_id, start_len).await
                        .map_err(|e| ExecutorError::FileOperation(format!("Failed to read from terminal: {}", e)))?;
                    
                    let output = output_lines.join("");
                    
                    return Ok((output, Some(ToolResultMetadata {
                        working_directory: None, 
                        ..Default::default()
                    })));
                },
                Err(e) => {
                    // Write failed.
                    // If error is "Session not found", it effectively means we can't use persistent shell.
                    // Fallthrough to ephemeral? Or logging error?
                    // "Not found" suggests the ID is wrong or session was deleted.
                    // Let's log and fallthrough to ephemeral as fallback.
                    eprintln!("[AgentExecutor] Failed to write to persistent session {}: {}", session_id, e);
                }
            }
        }

        // Fallback to ephemeral execution if no persistent session
        
        let workdir = args.get("workdir")
            .and_then(|v| v.as_str())
            .map(|s| self.resolve_path(s))
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
            self.cli_bridge.execute_command(program, cmd_args, Some(workdir.clone())),
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
        
        // Use CliEngine for smarter search
        let mut config = CliConfig::default();
        // Fetch more results initially to allow for clustering analysis if needed
        config.max_results = if max_results < 1000 { 1000 } else { max_results };
        config.timeout_seconds = 15; // Reasonable timeout

        let engine = CliEngine::new(path.clone());
        
        let result = match search_type {
            "content" => engine.search_content(pattern, &config).await,
            _ => engine.search_files(pattern, &config).await
        };

        match result {
            Ok(search_result) => {
                let total = search_result.files.len();
                // If the user requested a specific max_results (and it's small), we should probably respect it for the output list
                // But the requirement says "if results exceed a threshold (e.g. 50), asking for refinement"
                let summary_threshold = 50;
                
                let output = if total == 0 {
                    format!("No files found matching '{}'", pattern)
                } else if total <= summary_threshold {
                    // Return raw list
                    let mut out = format!("Found {} files:\n", total);
                    for file in search_result.files.iter().take(max_results) {
                         let line_info = if let Some(ln) = file.line_number {
                             format!(":{}", ln)
                         } else {
                             String::new()
                         };
                         // File paths from CliEngine are relative to its working directory (which is 'path')
                         // We present them as is
                         out.push_str(&format!("{}{}\n", file.path, line_info));
                    }
                    out
                } else {
                    // Summary mode
                    let mut out = format!("Found {} files matching '{}'. Displaying top results.\n", total, pattern);
                    
                    // Clustering logic
                    let mut clusters: HashMap<String, usize> = HashMap::new();
                    for file in &search_result.files {
                        let path_parts: Vec<&str> = file.path.split('/').collect();
                        let key = if path_parts.len() > 0 {
                            if path_parts[0] == "." && path_parts.len() > 1 {
                                path_parts[1].to_string()
                            } else {
                                path_parts[0].to_string()
                            }
                        } else {
                            "root".to_string()
                        };
                        *clusters.entry(key).or_insert(0) += 1;
                    }
                    
                    out.push_str("\nDistribution:\n");
                    let mut sorted_clusters: Vec<(String, usize)> = clusters.into_iter().collect();
                    sorted_clusters.sort_by(|a, b| b.1.cmp(&a.1));
                    
                    for (dir, count) in sorted_clusters.iter().take(5) {
                        let percentage = (*count as f64 / total as f64) * 100.0;
                        out.push_str(&format!("- {}/ : {} matches ({:.1}%)\n", dir, count, percentage));
                    }
                    
                    out.push_str(&format!("\nTop {} results (ranked by relevance):\n", std::cmp::min(20, max_results)));
                    // We take the top 20, or whatever max_results is if it's smaller than 20 (though default is 100)
                    // The requirement says "return the top 20 most valuable results"
                    let limit = std::cmp::min(20, max_results);
                    
                    for file in search_result.files.iter().take(limit) {
                         let line_info = if let Some(ln) = file.line_number {
                             format!(":{}", ln)
                         } else {
                             String::new()
                         };
                         out.push_str(&format!("{}{}\n", file.path, line_info));
                    }
                    
                    out.push_str("\nTip: Too many results. Please refine your search query (e.g. use more specific keywords) or specify a subdirectory in the 'path' argument.");
                    out
                };
                
                Ok((output, Some(ToolResultMetadata {
                    working_directory: Some(path.to_string_lossy().to_string()),
                    ..Default::default()
                })))
            },
            Err(e) => {
                 Err(ExecutorError::FileOperation(format!("Search failed: {}", e)))
            }
        }
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
