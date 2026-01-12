//! Report generation for disk analysis

use super::error::DiskAnalyzerError;
use super::types::{
    CategorySummary, DiskAnalysisConfig, DiskAnalysisReport, PathAnalysis, SpaceConsumer,
    VisualizationData, SizeDistributionEntry, CategoryBreakdownEntry,
};
use super::categorizer::FileCategorizer;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

/// Generator for disk analysis reports
#[derive(Clone)]
pub struct ReportGenerator {
    categorizer: FileCategorizer,
}

impl ReportGenerator {
    pub fn new() -> Self {
        Self {
            categorizer: FileCategorizer::new(),
        }
    }

    /// Generate a complete disk analysis report
    pub fn generate_report(
        &self,
        path_analyses: Vec<PathAnalysis>,
        categories: HashMap<String, CategorySummary>,
        _config: DiskAnalysisConfig,
        timestamp: DateTime<Utc>,
    ) -> Result<DiskAnalysisReport, DiskAnalyzerError> {
        // Calculate total size
        let total_size: u64 = path_analyses.iter().map(|a| a.total_size).sum();

        // Identify top space consumers
        let top_consumers = self.identify_top_consumers(&path_analyses, 20);

        // Identify cleanup candidates
        let cleanup_candidates = self.categorizer.identify_cleanup_candidates(
            &path_analyses,
            1024 * 1024, // 1 MB minimum
        );

        // Generate visualization data
        let visualization_data = self.generate_visualization_data(
            &path_analyses,
            &categories,
            total_size,
        );

        Ok(DiskAnalysisReport {
            total_size,
            analyzed_paths: path_analyses,
            top_consumers,
            cleanup_candidates,
            categories,
            timestamp,
            visualization_data,
        })
    }

    /// Identify top space consumers
    fn identify_top_consumers(
        &self,
        analyses: &[PathAnalysis],
        limit: usize,
    ) -> Vec<SpaceConsumer> {
        let mut consumers = Vec::new();

        for analysis in analyses {
            self.collect_consumers(analysis, &mut consumers);
        }

        // Sort by size descending
        consumers.sort_by(|a, b| b.size.cmp(&a.size));

        // Take top N
        consumers.truncate(limit);

        consumers
    }

    /// Recursively collect space consumers
    fn collect_consumers(&self, analysis: &PathAnalysis, consumers: &mut Vec<SpaceConsumer>) {
        // Add current directory as a consumer
        if analysis.total_size > 0 {
            consumers.push(SpaceConsumer {
                path: analysis.path.clone(),
                size: analysis.total_size,
                percentage: 0.0, // Will be calculated later
                item_type: "directory".to_string(),
            });
        }

        // Add individual files
        for file in &analysis.files {
            if file.size > 0 {
                consumers.push(SpaceConsumer {
                    path: file.path.clone(),
                    size: file.size,
                    percentage: 0.0,
                    item_type: "file".to_string(),
                });
            }
        }

        // Recursively process subdirectories
        for subdir in &analysis.subdirectories {
            self.collect_consumers(subdir, consumers);
        }
    }

    /// Generate visualization data for UI display
    fn generate_visualization_data(
        &self,
        analyses: &[PathAnalysis],
        categories: &HashMap<String, CategorySummary>,
        total_size: u64,
    ) -> VisualizationData {
        let mut size_distribution = Vec::new();
        let mut category_breakdown = Vec::new();

        // Generate size distribution (top-level paths)
        for analysis in analyses {
            if total_size > 0 {
                let percentage = (analysis.total_size as f64 / total_size as f64) * 100.0;
                size_distribution.push(SizeDistributionEntry {
                    label: analysis.path.display().to_string(),
                    size: analysis.total_size,
                    percentage,
                });
            }
        }

        // Generate category breakdown
        let category_colors = Self::get_category_colors();
        for (category_name, summary) in categories {
            let color = category_colors
                .get(category_name.as_str())
                .unwrap_or(&"#808080")
                .to_string();

            category_breakdown.push(CategoryBreakdownEntry {
                category: category_name.clone(),
                size: summary.total_size,
                count: summary.file_count,
                color,
            });
        }

        // Sort by size descending
        category_breakdown.sort_by(|a, b| b.size.cmp(&a.size));

        VisualizationData {
            size_distribution,
            category_breakdown,
            timeline_data: vec![], // Timeline data would require historical tracking
        }
    }

    /// Get color mapping for categories
    fn get_category_colors() -> HashMap<&'static str, &'static str> {
        let mut colors = HashMap::new();
        colors.insert("caches", "#FF6B6B");
        colors.insert("temporary_files", "#FFA500");
        colors.insert("downloads", "#4ECDC4");
        colors.insert("projects", "#45B7D1");
        colors.insert("app_data", "#96CEB4");
        colors.insert("other", "#808080");
        colors
    }
}

impl Default for ReportGenerator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_report_generation() {
        let generator = ReportGenerator::new();
        
        // Create a simple path analysis
        let mut analysis = PathAnalysis::new(PathBuf::from("/test"), 0);
        analysis.total_size = 1000;
        analysis.file_count = 5;

        let categories = HashMap::new();
        let config = DiskAnalysisConfig::default();

        let result = generator.generate_report(
            vec![analysis],
            categories,
            config,
            Utc::now(),
        );

        assert!(result.is_ok());
        let report = result.unwrap();
        assert_eq!(report.total_size, 1000);
    }

    #[test]
    fn test_visualization_data_generation() {
        let generator = ReportGenerator::new();
        
        let mut analysis1 = PathAnalysis::new(PathBuf::from("/test1"), 0);
        analysis1.total_size = 600;
        
        let mut analysis2 = PathAnalysis::new(PathBuf::from("/test2"), 0);
        analysis2.total_size = 400;

        let categories = HashMap::new();
        let total_size = 1000;

        let viz_data = generator.generate_visualization_data(
            &[analysis1, analysis2],
            &categories,
            total_size,
        );

        assert_eq!(viz_data.size_distribution.len(), 2);
        assert_eq!(viz_data.size_distribution[0].percentage, 60.0);
        assert_eq!(viz_data.size_distribution[1].percentage, 40.0);
    }
}
