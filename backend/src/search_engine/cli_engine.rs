//! CLI-based search engine using system tools like ripgrep and fd
#![allow(dead_code)]

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;
use regex::Regex;

/// CLI-based search engine inspired by Codex CLI
/// Provides fast file operations using system tools
#[derive(Debug, Clone)]
pub struct CliEngine {
    pub working_directory: PathBuf,
    pub timeout_seconds: u64,
}

/// Configuration for CLI operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliConfig {
    pub use_ripgrep: bool,
    pub use_fd: bool,
    pub use_fzf: bool,
    pub timeout_seconds: u64,
    pub max_results: usize,
}

impl Default for CliConfig {
    fn default() -> Self {
        Self {
            use_ripgrep: true,
            use_fd: true,
            use_fzf: false,
            timeout_seconds: 30,
            max_results: 1000,
        }
    }
}

/// Result from CLI-based file operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliSearchResult {
    pub files: Vec<CliFileMatch>,
    pub command_used: String,
    pub execution_time_ms: u64,
    pub total_results: usize,
}

/// Individual file match from CLI tools
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliFileMatch {
    pub path: String,
    pub line_number: Option<usize>,
    pub content: Option<String>,
    pub match_type: CliMatchType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CliMatchType {
    FileName,
    FileContent,
    Both,
}

impl CliEngine {
    pub fn new(working_directory: PathBuf) -> Self {
        Self {
            working_directory,
            timeout_seconds: 30,
        }
    }

    /// Search for files using the best available CLI tool
    pub async fn search_files(&self, pattern: &str, config: &CliConfig) -> Result<CliSearchResult> {
        let start_time = std::time::Instant::now();

        // Try different CLI tools in order of preference
        let result = if config.use_fd && self.has_fd().await {
            self.search_with_fd(pattern, config).await
        } else if config.use_ripgrep && self.has_ripgrep().await {
            self.search_with_ripgrep_files(pattern, config).await
        } else {
            self.search_with_find(pattern, config).await
        };

        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(mut cli_result) => {
                cli_result.execution_time_ms = execution_time_ms;
                Ok(cli_result)
            }
            Err(e) => Err(e),
        }
    }

    /// Search file contents using ripgrep or grep
    pub async fn search_content(&self, pattern: &str, config: &CliConfig) -> Result<CliSearchResult> {
        let start_time = std::time::Instant::now();

        let result = if config.use_ripgrep && self.has_ripgrep().await {
            self.search_with_ripgrep_content(pattern, config).await
        } else {
            self.search_with_grep(pattern, config).await
        };

        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(mut cli_result) => {
                cli_result.execution_time_ms = execution_time_ms;
                Ok(cli_result)
            }
            Err(e) => Err(e),
        }
    }

    /// Get file information using ls or equivalent
    pub async fn get_file_info(&self, path: &str) -> Result<FileInfo> {
        let mut cmd = Command::new("ls");
        cmd.arg("-la")
           .arg(path)
           .current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(self.timeout_seconds),
            cmd.output()
        ).await
        .context("Command timed out")?
        .context("Failed to execute ls command")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("ls command failed: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        self.parse_ls_output(&output_str, path)
    }

    /// List directory contents
    pub async fn list_directory(&self, path: &str, recursive: bool) -> Result<Vec<String>> {
        let mut cmd = if recursive {
            let mut c = Command::new("find");
            c.arg(path).arg("-type").arg("f");
            c
        } else {
            let mut c = Command::new("ls");
            c.arg("-1").arg(path);
            c
        };

        cmd.current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(self.timeout_seconds),
            cmd.output()
        ).await
        .context("Command timed out")?
        .context("Failed to execute directory listing")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Directory listing failed: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }

        let files: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();

        Ok(files)
    }

    // Private helper methods

    async fn has_fd(&self) -> bool {
        Command::new("fd")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|status| status.success())
            .unwrap_or(false)
    }

    async fn has_ripgrep(&self) -> bool {
        Command::new("rg")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|status| status.success())
            .unwrap_or(false)
    }

    async fn search_with_fd(&self, pattern: &str, config: &CliConfig) -> Result<CliSearchResult> {
        let mut cmd = Command::new("fd");
        cmd.arg("--type").arg("f")
           .arg("--color").arg("never")
           .arg("--max-results").arg(config.max_results.to_string())
           .arg(pattern)
           .current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(config.timeout_seconds),
            cmd.output()
        ).await
        .context("fd command timed out")?
        .context("Failed to execute fd")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("fd command failed: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }

        let files: Vec<CliFileMatch> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|line| CliFileMatch {
                path: line.trim().to_string(),
                line_number: None,
                content: None,
                match_type: CliMatchType::FileName,
            })
            .collect();

        Ok(CliSearchResult {
            total_results: files.len(),
            files,
            command_used: "fd".to_string(),
            execution_time_ms: 0, // Will be set by caller
        })
    }

    async fn search_with_ripgrep_files(&self, pattern: &str, config: &CliConfig) -> Result<CliSearchResult> {
        let mut cmd = Command::new("rg");
        cmd.arg("--files")
           .arg("--color").arg("never")
           .arg("--max-count").arg(config.max_results.to_string())
           .current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(config.timeout_seconds),
            cmd.output()
        ).await
        .context("ripgrep command timed out")?
        .context("Failed to execute ripgrep")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("ripgrep command failed: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }

        let all_files: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|line| line.trim().to_string())
            .collect();

        // Filter files that match the pattern
        let pattern_regex = Regex::new(&format!("(?i){}", regex::escape(pattern)))
            .unwrap_or_else(|_| Regex::new(&regex::escape(pattern)).unwrap());

        let files: Vec<CliFileMatch> = all_files
            .into_iter()
            .filter(|file| pattern_regex.is_match(file))
            .take(config.max_results)
            .map(|path| CliFileMatch {
                path,
                line_number: None,
                content: None,
                match_type: CliMatchType::FileName,
            })
            .collect();

        Ok(CliSearchResult {
            total_results: files.len(),
            files,
            command_used: "rg --files".to_string(),
            execution_time_ms: 0,
        })
    }

    async fn search_with_ripgrep_content(&self, pattern: &str, config: &CliConfig) -> Result<CliSearchResult> {
        let mut cmd = Command::new("rg");
        cmd.arg("--line-number")
           .arg("--color").arg("never")
           .arg("--max-count").arg(config.max_results.to_string())
           .arg(pattern)
           .current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(config.timeout_seconds),
            cmd.output()
        ).await
        .context("ripgrep content search timed out")?
        .context("Failed to execute ripgrep content search")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("ripgrep content search failed: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }

        let files = self.parse_ripgrep_output(&String::from_utf8_lossy(&output.stdout))?;

        Ok(CliSearchResult {
            total_results: files.len(),
            files,
            command_used: "rg".to_string(),
            execution_time_ms: 0,
        })
    }

    async fn search_with_find(&self, pattern: &str, config: &CliConfig) -> Result<CliSearchResult> {
        let mut cmd = Command::new("find");
        cmd.arg(".")
           .arg("-type").arg("f")
           .arg("-name").arg(&format!("*{}*", pattern))
           .current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(config.timeout_seconds),
            cmd.output()
        ).await
        .context("find command timed out")?
        .context("Failed to execute find")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("find command failed: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }

        let files: Vec<CliFileMatch> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .take(config.max_results)
            .map(|line| CliFileMatch {
                path: line.trim().to_string(),
                line_number: None,
                content: None,
                match_type: CliMatchType::FileName,
            })
            .collect();

        Ok(CliSearchResult {
            total_results: files.len(),
            files,
            command_used: "find".to_string(),
            execution_time_ms: 0,
        })
    }

    async fn search_with_grep(&self, pattern: &str, config: &CliConfig) -> Result<CliSearchResult> {
        let mut cmd = Command::new("grep");
        cmd.arg("-r")
           .arg("-n")
           .arg("--color=never")
           .arg(pattern)
           .arg(".")
           .current_dir(&self.working_directory)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(config.timeout_seconds),
            cmd.output()
        ).await
        .context("grep command timed out")?
        .context("Failed to execute grep")?;

        if !output.status.success() && output.status.code() != Some(1) {
            // grep returns 1 when no matches found, which is not an error
            return Err(anyhow::anyhow!("grep command failed: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }

        let files = self.parse_grep_output(&String::from_utf8_lossy(&output.stdout))?;

        Ok(CliSearchResult {
            total_results: files.len(),
            files: files.into_iter().take(config.max_results).collect(),
            command_used: "grep".to_string(),
            execution_time_ms: 0,
        })
    }

    fn parse_ripgrep_output(&self, output: &str) -> Result<Vec<CliFileMatch>> {
        let mut files = Vec::new();
        
        for line in output.lines() {
            if let Some((file_part, content_part)) = line.split_once(':') {
                if let Some((line_num_str, content)) = content_part.split_once(':') {
                    if let Ok(line_number) = line_num_str.parse::<usize>() {
                        files.push(CliFileMatch {
                            path: file_part.to_string(),
                            line_number: Some(line_number),
                            content: Some(content.to_string()),
                            match_type: CliMatchType::FileContent,
                        });
                    }
                }
            }
        }

        Ok(files)
    }

    fn parse_grep_output(&self, output: &str) -> Result<Vec<CliFileMatch>> {
        let mut files = Vec::new();
        
        for line in output.lines() {
            if let Some((file_part, rest)) = line.split_once(':') {
                if let Some((line_num_str, content)) = rest.split_once(':') {
                    if let Ok(line_number) = line_num_str.parse::<usize>() {
                        files.push(CliFileMatch {
                            path: file_part.to_string(),
                            line_number: Some(line_number),
                            content: Some(content.to_string()),
                            match_type: CliMatchType::FileContent,
                        });
                    }
                } else {
                    // No line number, just file match
                    files.push(CliFileMatch {
                        path: file_part.to_string(),
                        line_number: None,
                        content: Some(rest.to_string()),
                        match_type: CliMatchType::FileContent,
                    });
                }
            }
        }

        Ok(files)
    }

    fn parse_ls_output(&self, output: &str, path: &str) -> Result<FileInfo> {
        // Parse ls -la output
        // Example: -rw-r--r-- 1 user group 1234 Jan 10 12:34 filename
        
        for line in output.lines() {
            if line.contains(path) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 9 {
                    let permissions = parts[0].to_string();
                    let size = parts[4].parse::<u64>().unwrap_or(0);
                    let _filename = parts[8..].join(" ");
                    
                    return Ok(FileInfo {
                        path: path.to_string(),
                        size: Some(size),
                        permissions: Some(permissions),
                        is_directory: parts[0].starts_with('d'),
                        is_executable: parts[0].contains('x'),
                    });
                }
            }
        }

        Err(anyhow::anyhow!("Could not parse file info for: {}", path))
    }
}

/// File information from CLI tools
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub size: Option<u64>,
    pub permissions: Option<String>,
    pub is_directory: bool,
    pub is_executable: bool,
}

/// TUI-based file browser inspired by ratatui
pub struct TuiFileBrowser {
    current_path: PathBuf,
    cli_engine: CliEngine,
}

impl TuiFileBrowser {
    pub fn new(initial_path: PathBuf) -> Self {
        let cli_engine = CliEngine::new(initial_path.clone());
        Self {
            current_path: initial_path,
            cli_engine,
        }
    }

    /// Get current directory listing for TUI display
    pub async fn get_current_listing(&self) -> Result<Vec<FileInfo>> {
        let files = self.cli_engine.list_directory(".", false).await?;
        let mut file_infos = Vec::new();

        for file in files {
            if let Ok(info) = self.cli_engine.get_file_info(&file).await {
                file_infos.push(info);
            }
        }

        Ok(file_infos)
    }

    /// Navigate to a different directory
    pub fn navigate_to(&mut self, path: PathBuf) {
        self.current_path = path.clone();
        self.cli_engine.working_directory = path;
    }

    /// Get current working directory
    pub fn current_directory(&self) -> &Path {
        &self.current_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_cli_engine_basic() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path().to_path_buf();

        // Create test files
        fs::write(temp_path.join("test.txt"), "hello world").unwrap();
        fs::write(temp_path.join("example.rs"), "fn main() {}").unwrap();

        let engine = CliEngine::new(temp_path);
        let config = CliConfig::default();

        let results = engine.search_files("test", &config).await.unwrap();
        assert!(!results.files.is_empty());
    }

    #[tokio::test]
    async fn test_directory_listing() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path().to_path_buf();

        fs::write(temp_path.join("file1.txt"), "content1").unwrap();
        fs::write(temp_path.join("file2.txt"), "content2").unwrap();

        let engine = CliEngine::new(temp_path);
        let files = engine.list_directory(".", false).await.unwrap();

        assert!(files.len() >= 2);
        assert!(files.iter().any(|f| f.contains("file1.txt")));
        assert!(files.iter().any(|f| f.contains("file2.txt")));
    }
}