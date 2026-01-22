//! High-level file operations - utility module for advanced file management
#![allow(dead_code)]

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::cli_engine::command_executor::CommandExecutor;

/// High-level file operations that combine CLI tools with native Rust operations
#[derive(Debug, Clone)]
pub struct FileOperations {
    executor: CommandExecutor,
    working_directory: PathBuf,
}

/// File operation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOpResult {
    pub success: bool,
    pub message: String,
    pub files_affected: Vec<String>,
    pub execution_time_ms: u64,
}

/// File metadata with extended information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtendedFileInfo {
    pub path: String,
    pub relative_path: String,
    pub size: u64,
    pub modified: Option<chrono::DateTime<chrono::Utc>>,
    pub created: Option<chrono::DateTime<chrono::Utc>>,
    pub is_directory: bool,
    pub is_file: bool,
    pub is_symlink: bool,
    pub permissions: Option<String>,
    pub file_type: String,
    pub mime_type: Option<String>,
    pub line_count: Option<usize>,
    pub git_status: Option<String>,
}

/// Directory tree structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryTree {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub children: Vec<DirectoryTree>,
    pub file_count: usize,
    pub directory_count: usize,
}

impl FileOperations {
    pub fn new(working_directory: PathBuf) -> Self {
        let executor = CommandExecutor::new(working_directory.clone());
        Self {
            executor,
            working_directory,
        }
    }

    /// Get comprehensive file information
    pub async fn get_file_info(&self, file_path: &Path) -> Result<ExtendedFileInfo> {
        let _start_time = std::time::Instant::now();
        
        let metadata = fs::metadata(file_path).await
            .context("Failed to get file metadata")?;

        let relative_path = file_path.strip_prefix(&self.working_directory)
            .unwrap_or(file_path)
            .to_string_lossy()
            .to_string();

        let file_type = if metadata.is_dir() {
            "directory".to_string()
        } else {
            file_path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("unknown")
                .to_string()
        };

        let mime_type = if metadata.is_file() {
            mime_guess::from_path(file_path).first_raw().map(|s| s.to_string())
        } else {
            None
        };

        let line_count = if metadata.is_file() && self.is_text_file(file_path).await {
            self.count_lines(file_path).await.ok()
        } else {
            None
        };

        let git_status = self.get_git_file_status(file_path).await.ok();

        let permissions = if cfg!(unix) {
            self.get_unix_permissions(file_path).await.ok()
        } else {
            None
        };

        Ok(ExtendedFileInfo {
            path: file_path.to_string_lossy().to_string(),
            relative_path,
            size: metadata.len(),
            modified: metadata.modified().ok()
                .and_then(|t| chrono::DateTime::from_timestamp(
                    t.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs() as i64, 0
                )),
            created: metadata.created().ok()
                .and_then(|t| chrono::DateTime::from_timestamp(
                    t.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs() as i64, 0
                )),
            is_directory: metadata.is_dir(),
            is_file: metadata.is_file(),
            is_symlink: metadata.is_symlink(),
            permissions,
            file_type,
            mime_type,
            line_count,
            git_status,
        })
    }

    /// Build a directory tree structure
    pub async fn build_directory_tree(&self, root_path: &Path, max_depth: Option<usize>) -> Result<DirectoryTree> {
        self.build_tree_recursive(root_path, 0, max_depth.unwrap_or(10)).await
    }

    /// Search for files with advanced filtering
    pub async fn advanced_file_search(&self, criteria: &SearchCriteria) -> Result<Vec<ExtendedFileInfo>> {
        let mut results = Vec::new();
        
        // Use different search strategies based on criteria
        if criteria.use_git_ls_files && self.is_git_repository().await {
            results.extend(self.git_file_search(criteria).await?);
        } else if criteria.use_find_command {
            results.extend(self.find_command_search(criteria).await?);
        } else {
            results.extend(self.native_file_search(criteria).await?);
        }

        // Apply additional filters
        self.apply_filters(&mut results, criteria).await;

        Ok(results)
    }

    /// Copy files with progress tracking
    pub async fn copy_files(&self, sources: &[PathBuf], destination: &Path) -> Result<FileOpResult> {
        let start_time = std::time::Instant::now();
        let mut files_affected = Vec::new();

        for source in sources {
            let dest_path = if destination.is_dir() {
                destination.join(source.file_name().unwrap_or_default())
            } else {
                destination.to_path_buf()
            };

            if source.is_dir() {
                self.copy_directory_recursive(source, &dest_path).await?;
            } else {
                fs::copy(source, &dest_path).await
                    .context(format!("Failed to copy {} to {}", source.display(), dest_path.display()))?;
            }

            files_affected.push(source.to_string_lossy().to_string());
        }

        Ok(FileOpResult {
            success: true,
            message: format!("Copied {} files", files_affected.len()),
            files_affected,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    /// Move/rename files
    pub async fn move_files(&self, sources: &[PathBuf], destination: &Path) -> Result<FileOpResult> {
        let start_time = std::time::Instant::now();
        let mut files_affected = Vec::new();

        for source in sources {
            let dest_path = if destination.is_dir() {
                destination.join(source.file_name().unwrap_or_default())
            } else {
                destination.to_path_buf()
            };

            fs::rename(source, &dest_path).await
                .context(format!("Failed to move {} to {}", source.display(), dest_path.display()))?;

            files_affected.push(source.to_string_lossy().to_string());
        }

        Ok(FileOpResult {
            success: true,
            message: format!("Moved {} files", files_affected.len()),
            files_affected,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    /// Delete files safely
    pub async fn delete_files(&self, paths: &[PathBuf], confirm: bool) -> Result<FileOpResult> {
        let start_time = std::time::Instant::now();
        let mut files_affected = Vec::new();

        if !confirm {
            return Err(anyhow::anyhow!("Deletion requires confirmation"));
        }

        for path in paths {
            if path.is_dir() {
                fs::remove_dir_all(path).await
                    .context(format!("Failed to delete directory {}", path.display()))?;
            } else {
                fs::remove_file(path).await
                    .context(format!("Failed to delete file {}", path.display()))?;
            }

            files_affected.push(path.to_string_lossy().to_string());
        }

        Ok(FileOpResult {
            success: true,
            message: format!("Deleted {} items", files_affected.len()),
            files_affected,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    /// Create directory structure
    pub async fn create_directories(&self, paths: &[PathBuf]) -> Result<FileOpResult> {
        let start_time = std::time::Instant::now();
        let mut files_affected = Vec::new();

        for path in paths {
            fs::create_dir_all(path).await
                .context(format!("Failed to create directory {}", path.display()))?;
            files_affected.push(path.to_string_lossy().to_string());
        }

        Ok(FileOpResult {
            success: true,
            message: format!("Created {} directories", files_affected.len()),
            files_affected,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    /// Read file content with encoding detection
    pub async fn read_file_content(&self, file_path: &Path) -> Result<String> {
        let mut file = fs::File::open(file_path).await
            .context("Failed to open file")?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).await
            .context("Failed to read file")?;

        // Try UTF-8 first
        match String::from_utf8(buffer.clone()) {
            Ok(content) => Ok(content),
            Err(_) => {
                // Try to detect encoding
                let (content, _, _) = encoding_rs::UTF_8.decode(&buffer);
                Ok(content.to_string())
            }
        }
    }

    /// Write file content with backup
    pub async fn write_file_content(&self, file_path: &Path, content: &str, create_backup: bool) -> Result<FileOpResult> {
        let start_time = std::time::Instant::now();

        if create_backup && file_path.exists() {
            let extension = file_path.extension().unwrap_or_default().to_string_lossy();
            
            // Try zstd compression first
            let zstd_ext = format!("{}.backup.zst", extension);
            let zstd_backup_path = file_path.with_extension(&zstd_ext);
            let zstd_cmd = format!("zstd -q -f \"{}\" -o \"{}\"", file_path.display(), zstd_backup_path.display());
            
            let zstd_success = match self.executor.execute(&zstd_cmd, None).await {
                Ok(res) => res.success,
                Err(_) => false,
            };

            if !zstd_success {
                // Fallback to gzip compression
                let gzip_ext = format!("{}.backup.gz", extension);
                let gzip_backup_path = file_path.with_extension(&gzip_ext);
                let gzip_cmd = format!("gzip -c \"{}\" > \"{}\"", file_path.display(), gzip_backup_path.display());
                
                let gzip_success = match self.executor.execute(&gzip_cmd, None).await {
                    Ok(res) => res.success,
                    Err(_) => false,
                };

                if !gzip_success {
                    // Fallback to simple copy
                    let backup_ext = format!("{}.backup", extension);
                    let backup_path = file_path.with_extension(&backup_ext);
                    fs::copy(file_path, &backup_path).await
                        .context("Failed to create backup")?;
                }
            }
        }

        let mut file = fs::File::create(file_path).await
            .context("Failed to create file")?;

        file.write_all(content.as_bytes()).await
            .context("Failed to write file content")?;

        file.flush().await.context("Failed to flush file")?;

        Ok(FileOpResult {
            success: true,
            message: "File written successfully".to_string(),
            files_affected: vec![file_path.to_string_lossy().to_string()],
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    /// Get disk usage information
    pub async fn get_disk_usage(&self, path: &Path) -> Result<DiskUsage> {
        let _result = if cfg!(target_os = "windows") {
            self.executor.execute(&format!("dir \"{}\" /-c", path.display()), None).await?
        } else {
            self.executor.execute(&format!("du -sh \"{}\"", path.display()), None).await?
        };

        // Parse the output (simplified)
        Ok(DiskUsage {
            path: path.to_string_lossy().to_string(),
            total_size: 0, // Would parse from command output
            file_count: 0, // Would parse from command output
            directory_count: 0, // Would parse from command output
        })
    }

    // Private helper methods

    async fn build_tree_recursive(&self, path: &Path, depth: usize, max_depth: usize) -> Result<DirectoryTree> {
        let metadata = fs::metadata(path).await?;
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

        if !metadata.is_dir() {
            return Ok(DirectoryTree {
                path: path.to_string_lossy().to_string(),
                name,
                is_directory: false,
                size: Some(metadata.len()),
                children: vec![],
                file_count: 1,
                directory_count: 0,
            });
        }

        let mut children = Vec::new();
        let mut file_count = 0;
        let mut directory_count = 0;

        if depth < max_depth {
            let mut entries = fs::read_dir(path).await?;
            while let Some(entry) = entries.next_entry().await? {
                let child_tree = Box::pin(self.build_tree_recursive(&entry.path(), depth + 1, max_depth)).await?;
                file_count += child_tree.file_count;
                directory_count += child_tree.directory_count;
                children.push(child_tree);
            }
        }

        if metadata.is_dir() {
            directory_count += 1;
        }

        Ok(DirectoryTree {
            path: path.to_string_lossy().to_string(),
            name,
            is_directory: true,
            size: None,
            children,
            file_count,
            directory_count,
        })
    }

    async fn is_text_file(&self, file_path: &Path) -> bool {
        if let Some(mime_type) = mime_guess::from_path(file_path).first_raw() {
            mime_type.starts_with("text/") || 
            mime_type == "application/json" ||
            mime_type == "application/xml"
        } else {
            false
        }
    }

    async fn count_lines(&self, file_path: &Path) -> Result<usize> {
        let content = self.read_file_content(file_path).await?;
        Ok(content.lines().count())
    }

    async fn get_git_file_status(&self, file_path: &Path) -> Result<String> {
        let relative_path = file_path.strip_prefix(&self.working_directory)?;
        let result = self.executor.git_command(&["status", "--porcelain", &relative_path.to_string_lossy()]).await?;
        
        if result.success && !result.stdout.trim().is_empty() {
            Ok(result.stdout.trim().to_string())
        } else {
            Ok("unmodified".to_string())
        }
    }

    async fn get_unix_permissions(&self, file_path: &Path) -> Result<String> {
        let result = self.executor.execute(&format!("stat -c '%a' \"{}\"", file_path.display()), None).await?;
        Ok(result.stdout.trim().to_string())
    }

    async fn is_git_repository(&self) -> bool {
        self.executor.git_command(&["rev-parse", "--git-dir"]).await
            .map(|r| r.success)
            .unwrap_or(false)
    }

    async fn git_file_search(&self, criteria: &SearchCriteria) -> Result<Vec<ExtendedFileInfo>> {
        let mut args = vec!["ls-files"];
        
        if let Some(pattern) = &criteria.name_pattern {
            args.push(pattern);
        }

        let result = self.executor.git_command(&args).await?;
        
        if !result.success {
            return Ok(vec![]);
        }

        let mut files = Vec::new();
        for line in result.stdout.lines() {
            let path = self.working_directory.join(line.trim());
            if let Ok(info) = self.get_file_info(&path).await {
                files.push(info);
            }
        }

        Ok(files)
    }

    async fn find_command_search(&self, criteria: &SearchCriteria) -> Result<Vec<ExtendedFileInfo>> {
        let mut command = "find . -type f".to_string();
        
        if let Some(pattern) = &criteria.name_pattern {
            command.push_str(&format!(" -name \"{}\"", pattern));
        }

        if let Some(size) = &criteria.size_filter {
            command.push_str(&format!(" -size {}", size));
        }

        let result = self.executor.execute(&command, None).await?;
        
        if !result.success {
            return Ok(vec![]);
        }

        let mut files = Vec::new();
        for line in result.stdout.lines() {
            let path = PathBuf::from(line.trim());
            if let Ok(info) = self.get_file_info(&path).await {
                files.push(info);
            }
        }

        Ok(files)
    }

    async fn native_file_search(&self, criteria: &SearchCriteria) -> Result<Vec<ExtendedFileInfo>> {
        let mut files = Vec::new();
        self.search_directory_recursive(&self.working_directory, criteria, &mut files, 0, 10).await?;
        Ok(files)
    }

    async fn search_directory_recursive(
        &self,
        dir: &Path,
        criteria: &SearchCriteria,
        results: &mut Vec<ExtendedFileInfo>,
        depth: usize,
        max_depth: usize,
    ) -> Result<()> {
        if depth > max_depth {
            return Ok(());
        }

        let mut entries = fs::read_dir(dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            
            if path.is_dir() && criteria.recursive {
                Box::pin(self.search_directory_recursive(&path, criteria, results, depth + 1, max_depth)).await?;
            } else if path.is_file() {
                if self.matches_criteria(&path, criteria).await {
                    if let Ok(info) = self.get_file_info(&path).await {
                        results.push(info);
                    }
                }
            }
        }

        Ok(())
    }

    async fn matches_criteria(&self, path: &Path, criteria: &SearchCriteria) -> bool {
        // Check name pattern
        if let Some(pattern) = &criteria.name_pattern {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            if !name.contains(pattern) {
                return false;
            }
        }

        // Check file extension
        if !criteria.extensions.is_empty() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if !criteria.extensions.contains(&ext.to_string()) {
                    return false;
                }
            } else {
                return false;
            }
        }

        true
    }

    async fn apply_filters(&self, results: &mut Vec<ExtendedFileInfo>, criteria: &SearchCriteria) {
        results.retain(|info| {
            // Apply size filter
            if let Some(min_size) = criteria.min_size {
                if info.size < min_size {
                    return false;
                }
            }

            if let Some(max_size) = criteria.max_size {
                if info.size > max_size {
                    return false;
                }
            }

            true
        });

        // Sort results
        match criteria.sort_by {
            SortBy::Name => results.sort_by(|a, b| a.path.cmp(&b.path)),
            SortBy::Size => results.sort_by(|a, b| b.size.cmp(&a.size)),
            SortBy::Modified => results.sort_by(|a, b| b.modified.cmp(&a.modified)),
        }

        // Limit results
        if let Some(limit) = criteria.limit {
            results.truncate(limit);
        }
    }

    async fn copy_directory_recursive(&self, source: &Path, destination: &Path) -> Result<()> {
        fs::create_dir_all(destination).await?;

        let mut entries = fs::read_dir(source).await?;
        while let Some(entry) = entries.next_entry().await? {
            let source_path = entry.path();
            let dest_path = destination.join(entry.file_name());

            if source_path.is_dir() {
                Box::pin(self.copy_directory_recursive(&source_path, &dest_path)).await?;
            } else {
                fs::copy(&source_path, &dest_path).await?;
            }
        }

        Ok(())
    }
}

/// Search criteria for advanced file operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCriteria {
    pub name_pattern: Option<String>,
    pub extensions: Vec<String>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub size_filter: Option<String>, // For find command
    pub recursive: bool,
    pub use_git_ls_files: bool,
    pub use_find_command: bool,
    pub sort_by: SortBy,
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SortBy {
    Name,
    Size,
    Modified,
}

impl Default for SearchCriteria {
    fn default() -> Self {
        Self {
            name_pattern: None,
            extensions: vec![],
            min_size: None,
            max_size: None,
            size_filter: None,
            recursive: true,
            use_git_ls_files: true,
            use_find_command: false,
            sort_by: SortBy::Name,
            limit: None,
        }
    }
}

/// Disk usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskUsage {
    pub path: String,
    pub total_size: u64,
    pub file_count: usize,
    pub directory_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_file_operations_basic() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path().to_path_buf();

        let ops = FileOperations::new(temp_path.clone());

        // Create test file
        let test_file = temp_path.join("test.txt");
        fs::write(&test_file, "Hello, World!").unwrap();

        let info = ops.get_file_info(&test_file).await.unwrap();
        assert_eq!(info.size, 13);
        assert!(info.is_file);
        assert!(!info.is_directory);
    }

    #[tokio::test]
    async fn test_directory_tree() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        // Create directory structure
        fs::create_dir(temp_path.join("subdir")).unwrap();
        fs::write(temp_path.join("file1.txt"), "content1").unwrap();
        fs::write(temp_path.join("subdir").join("file2.txt"), "content2").unwrap();

        let ops = FileOperations::new(temp_path.to_path_buf());
        let tree = ops.build_directory_tree(temp_path, Some(2)).await.unwrap();

        assert!(tree.is_directory);
        assert!(tree.file_count >= 2);
        assert!(tree.directory_count >= 1);
    }

    #[tokio::test]
    async fn test_advanced_search() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        fs::write(temp_path.join("test.rs"), "fn main() {}").unwrap();
        fs::write(temp_path.join("test.txt"), "content").unwrap();

        let ops = FileOperations::new(temp_path.to_path_buf());
        let criteria = SearchCriteria {
            extensions: vec!["rs".to_string()],
            ..Default::default()
        };

        let results = ops.advanced_file_search(&criteria).await.unwrap();
        assert!(!results.is_empty());
        assert!(results.iter().any(|r| r.path.contains("test.rs")));
    }

    #[tokio::test]
    async fn test_write_file_content_backup_compression() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path().to_path_buf();
        let ops = FileOperations::new(temp_path.clone());

        let file_path = temp_path.join("test.txt");
        let content = "Test content for backup compression";

        // Create initial file
        ops.write_file_content(&file_path, content, false).await.unwrap();

        // Update file with backup enabled
        let new_content = "New content";
        ops.write_file_content(&file_path, new_content, true).await.unwrap();

        // Check for backup files
        // Since we might not have zstd/gzip in the test environment, we check for any of the 3 possibilities
        let has_zst = temp_path.join("test.txt.backup.zst").exists();
        let has_gz = temp_path.join("test.txt.backup.gz").exists();
        let has_plain = temp_path.join("test.txt.backup").exists();

        assert!(has_zst || has_gz || has_plain, "Backup file should be created");
        
        // Check content
        assert_eq!(fs::read_to_string(&file_path).unwrap(), new_content);
    }
}