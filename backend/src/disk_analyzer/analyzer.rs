use super::types::*;
use anyhow::{Context, Result};
use chrono::Utc;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct DiskAnalyzer {
    config: DiskAnalysisConfig,
}

impl DiskAnalyzer {
    pub fn new(config: DiskAnalysisConfig) -> Self {
        Self { config }
    }

    /// Analyze disk usage for configured paths
    pub fn analyze(&self) -> Result<DiskAnalysisReport> {
        let mut analyzed_paths = Vec::new();
        let mut all_entries: Vec<(PathBuf, u64)> = Vec::new();

        for path in &self.config.paths {
            let analysis = self.analyze_path(path)?;
            analyzed_paths.push(analysis.clone());
            
            // Collect entries for top consumers
            self.collect_entries(path, &mut all_entries)?;
        }

        let total_size: u64 = analyzed_paths.iter().map(|p| p.size).sum();
        
        // Calculate top consumers
        all_entries.sort_by(|a, b| b.1.cmp(&a.1));
        let top_consumers: Vec<SpaceConsumer> = all_entries
            .iter()
            .take(20)
            .map(|(path, size)| SpaceConsumer {
                path: path.clone(),
                size: *size,
                percentage: if total_size > 0 {
                    (*size as f64 / total_size as f64) * 100.0
                } else {
                    0.0
                },
            })
            .collect();

        Ok(DiskAnalysisReport {
            total_size,
            analyzed_paths,
            top_consumers,
            cleanup_candidates: vec![],
            categories: HashMap::new(),
            timestamp: Utc::now(),
        })
    }

    /// Analyze a single path
    fn analyze_path(&self, path: &Path) -> Result<PathAnalysis> {
        let mut total_size = 0u64;
        let mut file_count = 0usize;
        let mut dir_count = 0usize;

        let walker = self.create_walker(path);

        for entry in walker {
            let entry = entry.context("Failed to read directory entry")?;
            let metadata = entry.metadata().context("Failed to read metadata")?;

            if metadata.is_file() {
                // Use apparent size (file size) rather than block size
                total_size += metadata.len();
                file_count += 1;
            } else if metadata.is_dir() {
                dir_count += 1;
            }
        }

        Ok(PathAnalysis {
            path: path.to_path_buf(),
            size: total_size,
            file_count,
            dir_count,
        })
    }

    /// Create a WalkDir walker with configured options
    fn create_walker(&self, path: &Path) -> WalkDir {
        let mut walker = WalkDir::new(path);

        if let Some(max_depth) = self.config.max_depth {
            walker = walker.max_depth(max_depth);
        }

        if !self.config.follow_symlinks {
            walker = walker.follow_links(false);
        }

        walker
    }

    /// Collect all entries with their sizes for top consumer calculation
    fn collect_entries(&self, path: &Path, entries: &mut Vec<(PathBuf, u64)>) -> Result<()> {
        let walker = self.create_walker(path);

        for entry in walker {
            let entry = entry.context("Failed to read directory entry")?;
            let metadata = entry.metadata().context("Failed to read metadata")?;

            if metadata.is_file() && metadata.len() >= self.config.min_size_threshold {
                entries.push((entry.path().to_path_buf(), metadata.len()));
            }
        }

        Ok(())
    }

    /// Get the apparent size of a file or directory
    pub fn get_apparent_size(path: &Path) -> Result<u64> {
        if !path.exists() {
            return Ok(0);
        }

        let metadata = fs::metadata(path).context("Failed to read metadata")?;

        if metadata.is_file() {
            Ok(metadata.len())
        } else if metadata.is_dir() {
            let mut total = 0u64;
            for entry in WalkDir::new(path).follow_links(false) {
                if let Ok(entry) = entry {
                    if let Ok(meta) = entry.metadata() {
                        if meta.is_file() {
                            total += meta.len();
                        }
                    }
                }
            }
            Ok(total)
        } else {
            Ok(0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_analyze_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let config = DiskAnalysisConfig {
            paths: vec![temp_dir.path().to_path_buf()],
            ..Default::default()
        };

        let analyzer = DiskAnalyzer::new(config);
        let report = analyzer.analyze().unwrap();

        assert_eq!(report.total_size, 0);
        assert_eq!(report.analyzed_paths.len(), 1);
        assert_eq!(report.analyzed_paths[0].file_count, 0);
    }

    #[test]
    fn test_analyze_with_files() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "Hello, World!").unwrap();

        let config = DiskAnalysisConfig {
            paths: vec![temp_dir.path().to_path_buf()],
            ..Default::default()
        };

        let analyzer = DiskAnalyzer::new(config);
        let report = analyzer.analyze().unwrap();

        assert_eq!(report.total_size, 13); // "Hello, World!" is 13 bytes
        assert_eq!(report.analyzed_paths[0].file_count, 1);
    }

    #[test]
    fn test_depth_limiting() {
        let temp_dir = TempDir::new().unwrap();
        
        // Create nested directories
        let level1 = temp_dir.path().join("level1");
        let level2 = level1.join("level2");
        let level3 = level2.join("level3");
        
        fs::create_dir_all(&level3).unwrap();
        fs::write(level1.join("file1.txt"), "level1").unwrap();
        fs::write(level2.join("file2.txt"), "level2").unwrap();
        fs::write(level3.join("file3.txt"), "level3").unwrap();

        // Analyze with depth limit of 2
        let config = DiskAnalysisConfig {
            paths: vec![temp_dir.path().to_path_buf()],
            max_depth: Some(2),
            ..Default::default()
        };

        let analyzer = DiskAnalyzer::new(config);
        let report = analyzer.analyze().unwrap();

        // Should only see files at level1 and level2, not level3
        assert_eq!(report.analyzed_paths[0].file_count, 2);
    }

    #[test]
    fn test_apparent_size_calculation() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let content = "A".repeat(1000);
        fs::write(&file_path, &content).unwrap();

        let size = DiskAnalyzer::get_apparent_size(&file_path).unwrap();
        assert_eq!(size, 1000);
    }
}
