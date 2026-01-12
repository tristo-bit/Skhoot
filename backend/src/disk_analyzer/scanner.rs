//! Directory scanning and file metadata extraction

use super::error::DiskAnalyzerError;
use super::types::{DiskAnalysisConfig, FileMetadata, PathAnalysis};
use chrono::{DateTime, Utc};
use std::fs;
use std::path::Path;
use tokio::task;

/// Scanner for directory traversal and file analysis
#[derive(Clone)]
pub struct DiskScanner;

impl DiskScanner {
    pub fn new() -> Self {
        Self
    }

    /// Scan multiple paths according to configuration
    pub async fn scan_paths(
        &self,
        config: &DiskAnalysisConfig,
    ) -> Result<Vec<PathAnalysis>, DiskAnalyzerError> {
        let mut results = Vec::new();

        for path in &config.paths {
            match self.scan_path(path, config, 0).await {
                Ok(analysis) => results.push(analysis),
                Err(e) if e.is_recoverable() => {
                    tracing::warn!("Skipping path {:?}: {}", path, e);
                    continue;
                }
                Err(e) => return Err(e),
            }
        }

        Ok(results)
    }

    /// Scan a single path recursively
    pub async fn scan_path(
        &self,
        path: &Path,
        config: &DiskAnalysisConfig,
        current_depth: usize,
    ) -> Result<PathAnalysis, DiskAnalyzerError> {
        // Check depth limit
        if let Some(max_depth) = config.max_depth {
            if current_depth >= max_depth {
                return Err(DiskAnalyzerError::DepthLimitExceeded);
            }
        }

        // Check if path exists
        if !path.exists() {
            return Err(DiskAnalyzerError::PathNotFound(
                path.display().to_string(),
            ));
        }

        let path_buf = path.to_path_buf();
        let config_clone = config.clone();

        // Run blocking I/O in a separate thread
        let analysis = task::spawn_blocking(move || {
            Self::scan_path_blocking(&path_buf, &config_clone, current_depth)
        })
        .await
        .map_err(|e| DiskAnalyzerError::Internal(format!("Task join error: {}", e)))??;

        Ok(analysis)
    }

    /// Blocking version of scan_path for use in spawn_blocking
    fn scan_path_blocking(
        path: &Path,
        config: &DiskAnalysisConfig,
        current_depth: usize,
    ) -> Result<PathAnalysis, DiskAnalyzerError> {
        let mut analysis = PathAnalysis::new(path.to_path_buf(), current_depth);

        // Check if it's a directory
        let metadata = fs::metadata(path)?;
        
        if !metadata.is_dir() {
            // It's a file, just add it
            let file_meta = Self::extract_file_metadata(path)?;
            if file_meta.size >= config.min_size_threshold {
                analysis.files.push(file_meta);
            }
            analysis.calculate_total_size();
            return Ok(analysis);
        }

        // Read directory entries
        let entries = match fs::read_dir(path) {
            Ok(entries) => entries,
            Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => {
                return Err(DiskAnalyzerError::AccessDenied(
                    path.display().to_string(),
                ));
            }
            Err(e) => return Err(e.into()),
        };

        for entry in entries {
            let entry = match entry {
                Ok(e) => e,
                Err(e) => {
                    tracing::warn!("Failed to read entry in {:?}: {}", path, e);
                    continue;
                }
            };

            let entry_path = entry.path();

            // Check exclude patterns
            if Self::should_exclude(&entry_path, &config.exclude_patterns) {
                continue;
            }

            let entry_metadata = match entry.metadata() {
                Ok(m) => m,
                Err(e) => {
                    tracing::warn!("Failed to read metadata for {:?}: {}", entry_path, e);
                    continue;
                }
            };

            // Handle symlinks
            if entry_metadata.is_symlink() && !config.follow_symlinks {
                continue;
            }

            if entry_metadata.is_dir() {
                // Recursively scan subdirectory
                if let Some(max_depth) = config.max_depth {
                    if current_depth + 1 >= max_depth {
                        continue;
                    }
                }

                match Self::scan_path_blocking(&entry_path, config, current_depth + 1) {
                    Ok(subdir_analysis) => {
                        analysis.subdirectories.push(subdir_analysis);
                    }
                    Err(DiskAnalyzerError::AccessDenied(_)) => {
                        tracing::warn!("Access denied to {:?}", entry_path);
                        continue;
                    }
                    Err(DiskAnalyzerError::DepthLimitExceeded) => {
                        continue;
                    }
                    Err(e) => {
                        tracing::warn!("Failed to scan {:?}: {}", entry_path, e);
                        continue;
                    }
                }
            } else if entry_metadata.is_file() {
                // Extract file metadata
                match Self::extract_file_metadata(&entry_path) {
                    Ok(file_meta) => {
                        if file_meta.size >= config.min_size_threshold {
                            analysis.files.push(file_meta);
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to extract metadata for {:?}: {}", entry_path, e);
                        continue;
                    }
                }
            }
        }

        // Calculate totals
        analysis.file_count = analysis.count_files();
        analysis.directory_count = analysis.count_directories();
        analysis.calculate_total_size();

        Ok(analysis)
    }

    /// Extract metadata from a file
    fn extract_file_metadata(path: &Path) -> Result<FileMetadata, DiskAnalyzerError> {
        let metadata = fs::metadata(path)?;
        
        // Get apparent size (actual file size, not disk usage)
        let size = metadata.len();

        // Get modified time
        let modified = metadata
            .modified()?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| DiskAnalyzerError::Internal(format!("Time conversion error: {}", e)))?;
        
        let modified_datetime = DateTime::from_timestamp(modified.as_secs() as i64, 0)
            .unwrap_or_else(|| Utc::now());

        Ok(FileMetadata::new(path.to_path_buf(), size, modified_datetime))
    }

    /// Check if a path should be excluded based on patterns
    fn should_exclude(path: &Path, patterns: &[String]) -> bool {
        let path_str = path.to_string_lossy();
        
        for pattern in patterns {
            if path_str.contains(pattern) {
                return true;
            }
        }
        
        false
    }
}

impl Default for DiskScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_scan_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let scanner = DiskScanner::new();
        let config = DiskAnalysisConfig::default();

        let result = scanner.scan_path(temp_dir.path(), &config, 0).await;
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        assert_eq!(analysis.files.len(), 0);
        assert_eq!(analysis.subdirectories.len(), 0);
        assert_eq!(analysis.total_size, 0);
    }

    #[tokio::test]
    async fn test_scan_with_files() {
        let temp_dir = TempDir::new().unwrap();
        
        // Create test files
        fs::write(temp_dir.path().join("file1.txt"), "Hello").unwrap();
        fs::write(temp_dir.path().join("file2.txt"), "World").unwrap();

        let scanner = DiskScanner::new();
        let config = DiskAnalysisConfig::default();

        let result = scanner.scan_path(temp_dir.path(), &config, 0).await;
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        assert_eq!(analysis.files.len(), 2);
        assert!(analysis.total_size > 0);
    }

    #[tokio::test]
    async fn test_depth_limiting() {
        let temp_dir = TempDir::new().unwrap();
        
        // Create nested directories
        let level1 = temp_dir.path().join("level1");
        let level2 = level1.join("level2");
        let level3 = level2.join("level3");
        
        fs::create_dir_all(&level3).unwrap();
        fs::write(level3.join("deep_file.txt"), "Deep content").unwrap();

        let scanner = DiskScanner::new();
        let mut config = DiskAnalysisConfig::default();
        config.max_depth = Some(2);

        let result = scanner.scan_path(temp_dir.path(), &config, 0).await;
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        // Should not reach level3 due to depth limit
        assert!(analysis.subdirectories.len() > 0);
    }

    #[tokio::test]
    async fn test_apparent_size_calculation() {
        let temp_dir = TempDir::new().unwrap();
        
        // Create a file with known content
        let content = "A".repeat(1000);
        fs::write(temp_dir.path().join("test.txt"), &content).unwrap();

        let scanner = DiskScanner::new();
        let config = DiskAnalysisConfig::default();

        let result = scanner.scan_path(temp_dir.path(), &config, 0).await;
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        assert_eq!(analysis.files.len(), 1);
        // Apparent size should be 1000 bytes
        assert_eq!(analysis.files[0].size, 1000);
        assert_eq!(analysis.total_size, 1000);
    }

    #[tokio::test]
    async fn test_exclude_patterns() {
        let temp_dir = TempDir::new().unwrap();
        
        // Create files and directories
        fs::write(temp_dir.path().join("keep.txt"), "Keep").unwrap();
        fs::write(temp_dir.path().join("exclude.log"), "Exclude").unwrap();
        
        let cache_dir = temp_dir.path().join(".cache");
        fs::create_dir(&cache_dir).unwrap();
        fs::write(cache_dir.join("cached.txt"), "Cached").unwrap();

        let scanner = DiskScanner::new();
        let mut config = DiskAnalysisConfig::default();
        config.exclude_patterns = vec![".cache".to_string(), ".log".to_string()];

        let result = scanner.scan_path(temp_dir.path(), &config, 0).await;
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        // Should only have keep.txt
        assert_eq!(analysis.files.len(), 1);
        assert!(analysis.files[0].path.ends_with("keep.txt"));
    }
}
