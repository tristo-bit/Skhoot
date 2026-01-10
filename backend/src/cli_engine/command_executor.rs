//! Command executor for CLI operations - utility module for file operations
#![allow(dead_code)]

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};

/// Command executor for CLI operations inspired by Codex CLI
#[derive(Debug, Clone)]
pub struct CommandExecutor {
    working_directory: PathBuf,
    timeout_seconds: u64,
}

/// Result of command execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub execution_time_ms: u64,
}

/// Configuration for command execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutorConfig {
    pub timeout_seconds: u64,
    pub capture_output: bool,
    pub inherit_env: bool,
    pub shell: Option<String>,
}

impl Default for ExecutorConfig {
    fn default() -> Self {
        Self {
            timeout_seconds: 30,
            capture_output: true,
            inherit_env: true,
            shell: None,
        }
    }
}

impl CommandExecutor {
    pub fn new(working_directory: PathBuf) -> Self {
        Self {
            working_directory,
            timeout_seconds: 30,
        }
    }

    /// Execute a shell command
    pub async fn execute(&self, command: &str, config: Option<ExecutorConfig>) -> Result<CommandResult> {
        let config = config.unwrap_or_default();
        let start_time = std::time::Instant::now();

        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = Command::new("cmd");
            c.args(["/C", command]);
            c
        } else {
            let shell = config.shell.as_deref().unwrap_or("/bin/sh");
            let mut c = Command::new(shell);
            c.args(["-c", command]);
            c
        };

        cmd.current_dir(&self.working_directory);

        if config.capture_output {
            cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
        }

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(config.timeout_seconds),
            cmd.output()
        ).await
        .context("Command execution timed out")?
        .context("Failed to execute command")?;

        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(CommandResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code(),
            execution_time_ms,
        })
    }

    /// Execute a command and stream output
    pub async fn execute_streaming<F>(&self, command: &str, mut callback: F) -> Result<CommandResult>
    where
        F: FnMut(String) + Send,
    {
        let start_time = std::time::Instant::now();

        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = Command::new("cmd");
            c.args(["/C", command]);
            c
        } else {
            let mut c = Command::new("sh");
            c.args(["-c", command]);
            c
        };

        cmd.current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let mut child = cmd.spawn().context("Failed to spawn command")?;

        let stdout = child.stdout.take().context("Failed to get stdout")?;
        let stderr = child.stderr.take().context("Failed to get stderr")?;

        let mut stdout_reader = BufReader::new(stdout).lines();
        let mut stderr_reader = BufReader::new(stderr).lines();

        let mut stdout_output = String::new();
        let mut stderr_output = String::new();

        // Read stdout
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            stdout_output.push_str(&line);
            stdout_output.push('\n');
            callback(format!("stdout: {}", line));
        }

        // Read stderr  
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            stderr_output.push_str(&line);
            stderr_output.push('\n');
            callback(format!("stderr: {}", line));
        }

        let status = child.wait().await.context("Failed to wait for command")?;
        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(CommandResult {
            success: status.success(),
            stdout: stdout_output,
            stderr: stderr_output,
            exit_code: status.code(),
            execution_time_ms,
        })
    }

    /// Open a file with the system default application
    pub async fn open_file(&self, file_path: &Path) -> Result<CommandResult> {
        let command = if cfg!(target_os = "windows") {
            format!("start \"\" \"{}\"", file_path.display())
        } else if cfg!(target_os = "macos") {
            format!("open \"{}\"", file_path.display())
        } else {
            format!("xdg-open \"{}\"", file_path.display())
        };

        self.execute(&command, None).await
    }

    /// List directory contents
    pub async fn list_directory(&self, path: &Path, detailed: bool) -> Result<Vec<String>> {
        let command = if detailed {
            if cfg!(target_os = "windows") {
                format!("dir \"{}\" /A", path.display())
            } else {
                format!("ls -la \"{}\"", path.display())
            }
        } else {
            if cfg!(target_os = "windows") {
                format!("dir \"{}\" /B", path.display())
            } else {
                format!("ls \"{}\"", path.display())
            }
        };

        let result = self.execute(&command, None).await?;
        
        if !result.success {
            return Err(anyhow::anyhow!("Directory listing failed: {}", result.stderr));
        }

        let files: Vec<String> = result.stdout
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();

        Ok(files)
    }

    /// Get file information
    pub async fn get_file_info(&self, file_path: &Path) -> Result<FileInfo> {
        let command = if cfg!(target_os = "windows") {
            format!("dir \"{}\" /Q", file_path.display())
        } else {
            format!("stat \"{}\"", file_path.display())
        };

        let result = self.execute(&command, None).await?;
        
        if !result.success {
            return Err(anyhow::anyhow!("Failed to get file info: {}", result.stderr));
        }

        // Parse the output (simplified for demo)
        Ok(FileInfo {
            path: file_path.to_string_lossy().to_string(),
            size: None, // Would parse from stat output
            permissions: None, // Would parse from stat output
            modified: None, // Would parse from stat output
            is_directory: file_path.is_dir(),
            is_executable: false, // Would determine from permissions
        })
    }

    /// Search for files using find/dir
    pub async fn find_files(&self, pattern: &str, recursive: bool) -> Result<Vec<String>> {
        let command = if cfg!(target_os = "windows") {
            if recursive {
                format!("dir \"*{}*\" /S /B", pattern)
            } else {
                format!("dir \"*{}*\" /B", pattern)
            }
        } else {
            if recursive {
                format!("find . -name \"*{}*\" -type f", pattern)
            } else {
                format!("find . -maxdepth 1 -name \"*{}*\" -type f", pattern)
            }
        };

        let result = self.execute(&command, None).await?;
        
        if !result.success {
            return Ok(Vec::new()); // No matches found
        }

        let files: Vec<String> = result.stdout
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();

        Ok(files)
    }

    /// Search file contents using grep/findstr
    pub async fn search_content(&self, pattern: &str, file_pattern: Option<&str>) -> Result<Vec<ContentMatch>> {
        let command = if cfg!(target_os = "windows") {
            match file_pattern {
                Some(fp) => format!("findstr /S /N \"{}\" \"{}\"", pattern, fp),
                None => format!("findstr /S /N \"{}\" *.*", pattern),
            }
        } else {
            match file_pattern {
                Some(fp) => format!("grep -rn \"{}\" \"{}\"", pattern, fp),
                None => format!("grep -rn \"{}\" .", pattern),
            }
        };

        let result = self.execute(&command, None).await?;
        
        if !result.success {
            return Ok(Vec::new()); // No matches found
        }

        let matches = self.parse_grep_output(&result.stdout)?;
        Ok(matches)
    }

    /// Execute git commands
    pub async fn git_command(&self, args: &[&str]) -> Result<CommandResult> {
        let mut cmd = Command::new("git");
        cmd.args(args)
           .current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = cmd.output().await.context("Failed to execute git command")?;

        Ok(CommandResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code(),
            execution_time_ms: 0, // Would measure in real implementation
        })
    }

    /// Check if a command is available
    pub async fn command_exists(&self, command: &str) -> bool {
        let check_cmd = if cfg!(target_os = "windows") {
            format!("where {}", command)
        } else {
            format!("which {}", command)
        };

        self.execute(&check_cmd, Some(ExecutorConfig {
            timeout_seconds: 5,
            capture_output: true,
            inherit_env: true,
            shell: None,
        })).await
        .map(|result| result.success)
        .unwrap_or(false)
    }

    /// Get system information
    pub async fn get_system_info(&self) -> Result<SystemInfo> {
        let os_info = if cfg!(target_os = "windows") {
            self.execute("systeminfo | findstr /B /C:\"OS Name\" /C:\"OS Version\"", None).await?
        } else {
            self.execute("uname -a", None).await?
        };

        let cpu_info = if cfg!(target_os = "windows") {
            self.execute("wmic cpu get name", None).await?
        } else {
            self.execute("cat /proc/cpuinfo | grep 'model name' | head -1", None).await?
        };

        Ok(SystemInfo {
            os: os_info.stdout.trim().to_string(),
            cpu: cpu_info.stdout.trim().to_string(),
            working_directory: self.working_directory.clone(),
        })
    }

    // Private helper methods

    fn parse_grep_output(&self, output: &str) -> Result<Vec<ContentMatch>> {
        let mut matches = Vec::new();
        
        for line in output.lines() {
            if let Some((file_part, rest)) = line.split_once(':') {
                if let Some((line_num_str, content)) = rest.split_once(':') {
                    if let Ok(line_number) = line_num_str.parse::<usize>() {
                        matches.push(ContentMatch {
                            file_path: file_part.to_string(),
                            line_number,
                            content: content.to_string(),
                            column: None,
                        });
                    }
                }
            }
        }

        Ok(matches)
    }
}

/// File information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub size: Option<u64>,
    pub permissions: Option<String>,
    pub modified: Option<chrono::DateTime<chrono::Utc>>,
    pub is_directory: bool,
    pub is_executable: bool,
}

/// Content match from grep/findstr
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentMatch {
    pub file_path: String,
    pub line_number: usize,
    pub content: String,
    pub column: Option<usize>,
}

/// System information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub cpu: String,
    pub working_directory: PathBuf,
}

/// Utility functions for common CLI operations
pub struct CliUtils;

impl CliUtils {
    /// Create a new command executor for the current directory
    pub fn current_dir_executor() -> Result<CommandExecutor> {
        let current_dir = std::env::current_dir()
            .context("Failed to get current directory")?;
        Ok(CommandExecutor::new(current_dir))
    }

    /// Execute a quick command and return just the output
    pub async fn quick_command(command: &str) -> Result<String> {
        let executor = Self::current_dir_executor()?;
        let result = executor.execute(command, None).await?;
        
        if result.success {
            Ok(result.stdout.trim().to_string())
        } else {
            Err(anyhow::anyhow!("Command failed: {}", result.stderr))
        }
    }

    /// Check if we're in a git repository
    pub async fn is_git_repo() -> bool {
        Self::quick_command("git rev-parse --git-dir").await.is_ok()
    }

    /// Get current git branch
    pub async fn current_git_branch() -> Result<String> {
        Self::quick_command("git branch --show-current").await
    }

    /// Get git status
    pub async fn git_status() -> Result<String> {
        Self::quick_command("git status --porcelain").await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_command_executor_basic() {
        let temp_dir = TempDir::new().unwrap();
        let executor = CommandExecutor::new(temp_dir.path().to_path_buf());

        let result = executor.execute("echo hello", None).await.unwrap();
        assert!(result.success);
        assert!(result.stdout.contains("hello"));
    }

    #[tokio::test]
    async fn test_list_directory() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        // Create test files
        fs::write(temp_path.join("test1.txt"), "content1").unwrap();
        fs::write(temp_path.join("test2.txt"), "content2").unwrap();

        let executor = CommandExecutor::new(temp_path.to_path_buf());
        let files = executor.list_directory(temp_path, false).await.unwrap();

        assert!(files.len() >= 2);
    }

    #[tokio::test]
    async fn test_find_files() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        fs::write(temp_path.join("test.rs"), "fn main() {}").unwrap();
        fs::write(temp_path.join("other.txt"), "content").unwrap();

        let executor = CommandExecutor::new(temp_path.to_path_buf());
        let files = executor.find_files("test", false).await.unwrap();

        assert!(!files.is_empty());
        assert!(files.iter().any(|f| f.contains("test")));
    }

    #[tokio::test]
    async fn test_command_exists() {
        let temp_dir = TempDir::new().unwrap();
        let executor = CommandExecutor::new(temp_dir.path().to_path_buf());

        // Test for a command that should exist on most systems
        let exists = executor.command_exists("echo").await;
        assert!(exists);

        // Test for a command that shouldn't exist
        let not_exists = executor.command_exists("nonexistent_command_12345").await;
        assert!(!not_exists);
    }
}