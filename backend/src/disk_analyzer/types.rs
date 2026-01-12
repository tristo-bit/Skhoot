//! Type definitions for Disk Analyzer

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Configuration for disk analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskAnalysisConfig {
    pub paths: Vec<PathBuf>,
    pub max_depth: Option<usize>,
    pub follow_symlinks: bool,
    pub exclude_patterns: Vec<String>,
    pub min_size_threshold: u64,
    pub categorization_rules: HashMap<String, Vec<String>>,
}

impl Default for DiskAnalysisConfig {
    fn default() -> Self {
        Self {
            paths: vec![],
            max_depth: None,
            follow_symlinks: false,
            exclude_patterns: vec![],
            min_size_threshold: 0,
            categorization_rules: Self::default_categorization_rules(),
        }
    }
}

impl DiskAnalysisConfig {
    /// Get default categorization rules
    pub fn default_categorization_rules() -> HashMap<String, Vec<String>> {
        let mut rules = HashMap::new();
        
        rules.insert("caches".to_string(), vec![
            ".cache".to_string(),
            "cache".to_string(),
            "Cache".to_string(),
            "node_modules".to_string(),
            ".npm".to_string(),
            ".yarn".to_string(),
            "target/debug".to_string(),
            "target/release".to_string(),
        ]);
        
        rules.insert("downloads".to_string(), vec![
            "Downloads".to_string(),
            "downloads".to_string(),
        ]);
        
        rules.insert("projects".to_string(), vec![
            ".git".to_string(),
            "src".to_string(),
            "Cargo.toml".to_string(),
            "package.json".to_string(),
        ]);
        
        rules.insert("app_data".to_string(), vec![
            ".config".to_string(),
            ".local".to_string(),
            "AppData".to_string(),
            "Application Support".to_string(),
        ]);
        
        rules
    }
}

/// Complete disk analysis report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskAnalysisReport {
    pub total_size: u64,
    pub analyzed_paths: Vec<PathAnalysis>,
    pub top_consumers: Vec<SpaceConsumer>,
    pub cleanup_candidates: Vec<CleanupCandidate>,
    pub categories: HashMap<String, CategorySummary>,
    pub timestamp: DateTime<Utc>,
    pub visualization_data: VisualizationData,
}

/// Analysis of a single path
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathAnalysis {
    pub path: PathBuf,
    pub total_size: u64,
    pub file_count: usize,
    pub directory_count: usize,
    pub files: Vec<FileMetadata>,
    pub subdirectories: Vec<PathAnalysis>,
    pub depth: usize,
}

impl PathAnalysis {
    pub fn new(path: PathBuf, depth: usize) -> Self {
        Self {
            path,
            total_size: 0,
            file_count: 0,
            directory_count: 0,
            files: vec![],
            subdirectories: vec![],
            depth,
        }
    }

    /// Calculate total size recursively
    pub fn calculate_total_size(&mut self) {
        let files_size: u64 = self.files.iter().map(|f| f.size).sum();
        let subdirs_size: u64 = self.subdirectories.iter().map(|d| d.total_size).sum();
        self.total_size = files_size + subdirs_size;
    }

    /// Count files recursively
    pub fn count_files(&self) -> usize {
        let subdir_files: usize = self.subdirectories.iter().map(|d| d.count_files()).sum();
        self.files.len() + subdir_files
    }

    /// Count directories recursively
    pub fn count_directories(&self) -> usize {
        let subdir_count: usize = self.subdirectories.iter().map(|d| d.count_directories()).sum();
        self.subdirectories.len() + subdir_count
    }
}

/// Metadata for a single file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: PathBuf,
    pub size: u64,
    pub modified: DateTime<Utc>,
    pub file_type: String,
    pub is_hidden: bool,
}

impl FileMetadata {
    pub fn new(path: PathBuf, size: u64, modified: DateTime<Utc>) -> Self {
        let file_type = path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        let is_hidden = path
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.starts_with('.'))
            .unwrap_or(false);

        Self {
            path,
            size,
            modified,
            file_type,
            is_hidden,
        }
    }
}

/// Top space consumer entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceConsumer {
    pub path: PathBuf,
    pub size: u64,
    pub percentage: f64,
    pub item_type: String, // "file" or "directory"
}

/// Cleanup candidate with safety classification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupCandidate {
    pub path: PathBuf,
    pub size: u64,
    pub category: CleanupCategory,
    pub safety_level: SafetyLevel,
    pub description: String,
    pub estimated_savings: u64,
}

/// Category of cleanup candidate
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CleanupCategory {
    Cache,
    TemporaryFiles,
    OldDownloads,
    UnusedApplications,
    DuplicateFiles,
    LargeFiles,
    Other,
}

impl CleanupCategory {
    pub fn as_str(&self) -> &str {
        match self {
            CleanupCategory::Cache => "cache",
            CleanupCategory::TemporaryFiles => "temporary_files",
            CleanupCategory::OldDownloads => "old_downloads",
            CleanupCategory::UnusedApplications => "unused_applications",
            CleanupCategory::DuplicateFiles => "duplicate_files",
            CleanupCategory::LargeFiles => "large_files",
            CleanupCategory::Other => "other",
        }
    }
}

/// Safety level for cleanup operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum SafetyLevel {
    Safe,   // Caches, temp files - safe to delete
    Maybe,  // Old downloads, unused apps - user should review
    Risky,  // Projects, documents - requires careful review
}

impl SafetyLevel {
    pub fn as_str(&self) -> &str {
        match self {
            SafetyLevel::Safe => "safe",
            SafetyLevel::Maybe => "maybe",
            SafetyLevel::Risky => "risky",
        }
    }
}

/// Summary for a category
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorySummary {
    pub category: String,
    pub total_size: u64,
    pub file_count: usize,
    pub items: Vec<PathBuf>,
}

/// Visualization data for UI display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizationData {
    pub size_distribution: Vec<SizeDistributionEntry>,
    pub category_breakdown: Vec<CategoryBreakdownEntry>,
    pub timeline_data: Vec<TimelineEntry>,
}

impl Default for VisualizationData {
    fn default() -> Self {
        Self {
            size_distribution: vec![],
            category_breakdown: vec![],
            timeline_data: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SizeDistributionEntry {
    pub label: String,
    pub size: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryBreakdownEntry {
    pub category: String,
    pub size: u64,
    pub count: usize,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub date: DateTime<Utc>,
    pub size: u64,
    pub file_count: usize,
}
