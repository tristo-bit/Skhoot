//! Disk Analyzer Module
//! 
//! Provides disk space analysis, file categorization, and cleanup recommendations.
//! This module scans file systems to identify space usage patterns and generate
//! structured reports with cleanup candidates.

pub mod types;
pub mod scanner;
pub mod categorizer;
pub mod report;
pub mod error;

#[cfg(test)]
mod tests;

pub use types::{
    DiskAnalysisReport, DiskAnalysisConfig, PathAnalysis, SpaceConsumer,
    CleanupCandidate, CleanupCategory, SafetyLevel, CategorySummary,
    FileMetadata, VisualizationData,
};
pub use scanner::DiskScanner;
pub use categorizer::FileCategorizer;
pub use report::ReportGenerator;
pub use error::DiskAnalyzerError;

use std::path::PathBuf;
use chrono::Utc;

/// Main Disk Analyzer structure
#[derive(Clone)]
pub struct DiskAnalyzer {
    scanner: DiskScanner,
    categorizer: FileCategorizer,
    report_generator: ReportGenerator,
}

impl DiskAnalyzer {
    /// Create a new Disk Analyzer instance
    pub fn new() -> Self {
        Self {
            scanner: DiskScanner::new(),
            categorizer: FileCategorizer::new(),
            report_generator: ReportGenerator::new(),
        }
    }

    /// Analyze disk usage for the given configuration
    pub async fn analyze(&self, config: DiskAnalysisConfig) -> Result<DiskAnalysisReport, DiskAnalyzerError> {
        // Scan directories
        let path_analyses = self.scanner.scan_paths(&config).await?;

        // Categorize files
        let categorized = self.categorizer.categorize_files(&path_analyses);

        // Generate report
        let report = self.report_generator.generate_report(
            path_analyses,
            categorized,
            config,
            Utc::now(),
        )?;

        Ok(report)
    }

    /// Quick scan for a single directory
    pub async fn quick_scan(&self, path: PathBuf, max_depth: Option<usize>) -> Result<PathAnalysis, DiskAnalyzerError> {
        let config = DiskAnalysisConfig {
            paths: vec![path],
            max_depth,
            follow_symlinks: false,
            exclude_patterns: vec![],
            min_size_threshold: 0,
            categorization_rules: Default::default(),
        };

        let analyses = self.scanner.scan_paths(&config).await?;
        
        analyses.into_iter().next()
            .ok_or_else(|| DiskAnalyzerError::ScanFailed("No results from scan".to_string()))
    }
}

impl Default for DiskAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}
