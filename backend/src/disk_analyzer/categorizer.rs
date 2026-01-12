//! File categorization and safety classification

use super::types::{
    CleanupCandidate, CleanupCategory, PathAnalysis, SafetyLevel, CategorySummary,
};
use std::collections::HashMap;
use std::path::Path;

/// Categorizer for files and cleanup candidates
#[derive(Clone)]
pub struct FileCategorizer {
    cache_patterns: Vec<String>,
    temp_patterns: Vec<String>,
    download_patterns: Vec<String>,
    project_patterns: Vec<String>,
    system_patterns: Vec<String>,
}

impl FileCategorizer {
    pub fn new() -> Self {
        Self {
            cache_patterns: vec![
                ".cache".to_string(),
                "cache".to_string(),
                "Cache".to_string(),
                "node_modules".to_string(),
                ".npm".to_string(),
                ".yarn".to_string(),
                "target/debug".to_string(),
                "target/release".to_string(),
                "__pycache__".to_string(),
                ".pytest_cache".to_string(),
            ],
            temp_patterns: vec![
                "tmp".to_string(),
                "temp".to_string(),
                "Temp".to_string(),
                ".tmp".to_string(),
                "~".to_string(),
                ".swp".to_string(),
                ".bak".to_string(),
            ],
            download_patterns: vec![
                "Downloads".to_string(),
                "downloads".to_string(),
            ],
            project_patterns: vec![
                ".git".to_string(),
                "src".to_string(),
                "Cargo.toml".to_string(),
                "package.json".to_string(),
                ".project".to_string(),
                "pom.xml".to_string(),
            ],
            system_patterns: vec![
                "System".to_string(),
                "Windows".to_string(),
                "Program Files".to_string(),
                "/bin".to_string(),
                "/sbin".to_string(),
                "/usr".to_string(),
                "/etc".to_string(),
                "/var".to_string(),
                "/sys".to_string(),
                "/proc".to_string(),
            ],
        }
    }

    /// Categorize files from path analyses
    pub fn categorize_files(
        &self,
        analyses: &[PathAnalysis],
    ) -> HashMap<String, CategorySummary> {
        let mut categories: HashMap<String, CategorySummary> = HashMap::new();

        for analysis in analyses {
            self.categorize_path_analysis(analysis, &mut categories);
        }

        categories
    }

    /// Recursively categorize a path analysis
    fn categorize_path_analysis(
        &self,
        analysis: &PathAnalysis,
        categories: &mut HashMap<String, CategorySummary>,
    ) {
        // Categorize current path
        let category = self.determine_category(&analysis.path);
        
        let entry = categories.entry(category.clone()).or_insert_with(|| {
            CategorySummary {
                category: category.clone(),
                total_size: 0,
                file_count: 0,
                items: vec![],
            }
        });

        entry.total_size += analysis.total_size;
        entry.file_count += analysis.file_count;
        entry.items.push(analysis.path.clone());

        // Recursively categorize subdirectories
        for subdir in &analysis.subdirectories {
            self.categorize_path_analysis(subdir, categories);
        }
    }

    /// Determine the category for a path
    fn determine_category(&self, path: &Path) -> String {
        let path_str = path.to_string_lossy();

        if self.matches_patterns(&path_str, &self.cache_patterns) {
            return "caches".to_string();
        }

        if self.matches_patterns(&path_str, &self.temp_patterns) {
            return "temporary_files".to_string();
        }

        if self.matches_patterns(&path_str, &self.download_patterns) {
            return "downloads".to_string();
        }

        if self.matches_patterns(&path_str, &self.project_patterns) {
            return "projects".to_string();
        }

        "app_data".to_string()
    }

    /// Check if path matches any pattern
    fn matches_patterns(&self, path_str: &str, patterns: &[String]) -> bool {
        patterns.iter().any(|pattern| path_str.contains(pattern))
    }

    /// Identify cleanup candidates from analyses
    pub fn identify_cleanup_candidates(
        &self,
        analyses: &[PathAnalysis],
        min_size: u64,
    ) -> Vec<CleanupCandidate> {
        let mut candidates = Vec::new();

        for analysis in analyses {
            self.find_candidates_in_analysis(analysis, min_size, &mut candidates);
        }

        // Sort by size descending
        candidates.sort_by(|a, b| b.size.cmp(&a.size));

        candidates
    }

    /// Recursively find cleanup candidates
    fn find_candidates_in_analysis(
        &self,
        analysis: &PathAnalysis,
        min_size: u64,
        candidates: &mut Vec<CleanupCandidate>,
    ) {
        if analysis.total_size < min_size {
            return;
        }

        // Check if this is a cleanup candidate
        let (category, safety_level, description) = self.classify_for_cleanup(&analysis.path);

        if category != CleanupCategory::Other {
            candidates.push(CleanupCandidate {
                path: analysis.path.clone(),
                size: analysis.total_size,
                category,
                safety_level,
                description,
                estimated_savings: analysis.total_size,
            });
        }

        // Recursively check subdirectories
        for subdir in &analysis.subdirectories {
            self.find_candidates_in_analysis(subdir, min_size, candidates);
        }
    }

    /// Classify a path for cleanup with category and safety level
    pub fn classify_for_cleanup(&self, path: &Path) -> (CleanupCategory, SafetyLevel, String) {
        let path_str = path.to_string_lossy();

        // Check for system files first (highest risk)
        if self.matches_patterns(&path_str, &self.system_patterns) {
            return (
                CleanupCategory::Other,
                SafetyLevel::Risky,
                "System file or directory - do not delete".to_string(),
            );
        }

        // Cache files - safe to delete
        if self.matches_patterns(&path_str, &self.cache_patterns) {
            return (
                CleanupCategory::Cache,
                SafetyLevel::Safe,
                "Cache directory - safe to delete, will be regenerated".to_string(),
            );
        }

        // Temporary files - safe to delete
        if self.matches_patterns(&path_str, &self.temp_patterns) {
            return (
                CleanupCategory::TemporaryFiles,
                SafetyLevel::Safe,
                "Temporary files - safe to delete".to_string(),
            );
        }

        // Downloads - maybe safe
        if self.matches_patterns(&path_str, &self.download_patterns) {
            return (
                CleanupCategory::OldDownloads,
                SafetyLevel::Maybe,
                "Downloads folder - review before deleting".to_string(),
            );
        }

        // Project files - risky
        if self.matches_patterns(&path_str, &self.project_patterns) {
            return (
                CleanupCategory::Other,
                SafetyLevel::Risky,
                "Project directory - contains source code, review carefully".to_string(),
            );
        }

        // Default - other
        (
            CleanupCategory::Other,
            SafetyLevel::Maybe,
            "General file or directory - review before deleting".to_string(),
        )
    }

    /// Determine safety level for a path
    pub fn determine_safety_level(&self, path: &Path) -> SafetyLevel {
        let (_, safety_level, _) = self.classify_for_cleanup(path);
        safety_level
    }
}

impl Default for FileCategorizer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_cache_categorization() {
        let categorizer = FileCategorizer::new();
        
        let cache_path = PathBuf::from("/home/user/.cache/app");
        let category = categorizer.determine_category(&cache_path);
        assert_eq!(category, "caches");

        let (cleanup_cat, safety, _) = categorizer.classify_for_cleanup(&cache_path);
        assert_eq!(cleanup_cat, CleanupCategory::Cache);
        assert_eq!(safety, SafetyLevel::Safe);
    }

    #[test]
    fn test_temp_file_categorization() {
        let categorizer = FileCategorizer::new();
        
        let temp_path = PathBuf::from("/tmp/tempfile.tmp");
        let category = categorizer.determine_category(&temp_path);
        assert_eq!(category, "temporary_files");

        let (cleanup_cat, safety, _) = categorizer.classify_for_cleanup(&temp_path);
        assert_eq!(cleanup_cat, CleanupCategory::TemporaryFiles);
        assert_eq!(safety, SafetyLevel::Safe);
    }

    #[test]
    fn test_download_categorization() {
        let categorizer = FileCategorizer::new();
        
        let download_path = PathBuf::from("/home/user/Downloads/file.zip");
        let category = categorizer.determine_category(&download_path);
        assert_eq!(category, "downloads");

        let (cleanup_cat, safety, _) = categorizer.classify_for_cleanup(&download_path);
        assert_eq!(cleanup_cat, CleanupCategory::OldDownloads);
        assert_eq!(safety, SafetyLevel::Maybe);
    }

    #[test]
    fn test_project_categorization() {
        let categorizer = FileCategorizer::new();
        
        let project_path = PathBuf::from("/home/user/projects/myapp/src");
        let category = categorizer.determine_category(&project_path);
        assert_eq!(category, "projects");

        let (cleanup_cat, safety, _) = categorizer.classify_for_cleanup(&project_path);
        assert_eq!(cleanup_cat, CleanupCategory::Other);
        assert_eq!(safety, SafetyLevel::Risky);
    }

    #[test]
    fn test_system_file_categorization() {
        let categorizer = FileCategorizer::new();
        
        let system_path = PathBuf::from("/usr/bin/bash");
        let (cleanup_cat, safety, desc) = categorizer.classify_for_cleanup(&system_path);
        
        assert_eq!(cleanup_cat, CleanupCategory::Other);
        assert_eq!(safety, SafetyLevel::Risky);
        assert!(desc.contains("System"));
    }

    #[test]
    fn test_safety_level_ordering() {
        assert!(SafetyLevel::Safe < SafetyLevel::Maybe);
        assert!(SafetyLevel::Maybe < SafetyLevel::Risky);
    }
}
