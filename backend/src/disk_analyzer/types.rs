use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

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
            categorization_rules: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskAnalysisReport {
    pub total_size: u64,
    pub analyzed_paths: Vec<PathAnalysis>,
    pub top_consumers: Vec<SpaceConsumer>,
    pub cleanup_candidates: Vec<CleanupCandidate>,
    pub categories: HashMap<String, CategorySummary>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathAnalysis {
    pub path: PathBuf,
    pub size: u64,
    pub file_count: usize,
    pub dir_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceConsumer {
    pub path: PathBuf,
    pub size: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupCandidate {
    pub path: PathBuf,
    pub size: u64,
    pub category: CleanupCategory,
    pub safety_level: SafetyLevel,
    pub description: String,
    pub estimated_savings: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CleanupCategory {
    Cache,
    Temporary,
    Downloads,
    Projects,
    AppData,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum SafetyLevel {
    Safe,   // Caches, temp files - safe to delete
    Maybe,  // Old downloads, unused apps - user should review
    Risky,  // Projects, documents - requires careful review
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorySummary {
    pub total_size: u64,
    pub file_count: usize,
    pub safety_level: SafetyLevel,
}
