//! Property-based tests for Disk Analyzer

use super::*;
use proptest::prelude::*;
use std::fs;
use tempfile::TempDir;

// Feature: terminal-disk-management, Property 9: Directory scanning and space calculation
// For any disk analysis initiation, the analyzer should scan configured directories and calculate space usage
#[tokio::test]
async fn property_directory_scanning_and_space_calculation() {
    proptest!(|(
        num_files in 1usize..10,
        file_sizes in prop::collection::vec(1u64..1000, 1..10)
    )| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_dir = TempDir::new().unwrap();
            let mut expected_total = 0u64;

            // Create files with known sizes
            for (i, &size) in file_sizes.iter().enumerate().take(num_files) {
                let content = "A".repeat(size as usize);
                let file_path = temp_dir.path().join(format!("file_{}.txt", i));
                fs::write(&file_path, content).unwrap();
                expected_total += size;
            }

            // Scan the directory
            let analyzer = DiskAnalyzer::new();
            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: None,
                follow_symlinks: false,
                exclude_patterns: vec![],
                min_size_threshold: 0,
                categorization_rules: Default::default(),
            };

            let result = analyzer.analyze(config).await;
            prop_assert!(result.is_ok(), "Analysis should succeed");

            let report = result.unwrap();
            
            // Property: Total size should equal sum of file sizes
            prop_assert_eq!(report.total_size, expected_total, 
                "Total size should match sum of file sizes");
            
            // Property: Should have scanned the configured path
            prop_assert_eq!(report.analyzed_paths.len(), 1,
                "Should have analyzed exactly one path");
            
            // Property: File count should match number of files created
            let actual_file_count = report.analyzed_paths[0].file_count;
            prop_assert_eq!(actual_file_count, num_files,
                "File count should match number of files created");

            Ok(())
        }).unwrap();
    });
}

// Feature: terminal-disk-management, Property 10: Directory traversal depth limiting
// For any directory analysis with specified depth, traversal should stop at the configured depth level
#[tokio::test]
async fn property_depth_limiting() {
    proptest!(|(
        max_depth in 1usize..5,
        content_size in 10u64..100
    )| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_dir = TempDir::new().unwrap();
            
            // Create nested directory structure deeper than max_depth
            let mut current_path = temp_dir.path().to_path_buf();
            for i in 0..10 {
                current_path = current_path.join(format!("level_{}", i));
                fs::create_dir_all(&current_path).unwrap();
                
                // Add a file at each level
                let file_path = current_path.join("file.txt");
                fs::write(&file_path, "A".repeat(content_size as usize)).unwrap();
            }

            // Scan with depth limit
            let analyzer = DiskAnalyzer::new();
            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: Some(max_depth),
                follow_symlinks: false,
                exclude_patterns: vec![],
                min_size_threshold: 0,
                categorization_rules: Default::default(),
            };

            let result = analyzer.analyze(config).await;
            prop_assert!(result.is_ok(), "Analysis should succeed");

            let report = result.unwrap();
            
            // Property: Should not traverse deeper than max_depth
            fn check_max_depth(analysis: &PathAnalysis, max_depth: usize) -> bool {
                if analysis.depth >= max_depth {
                    // Should not have subdirectories at max depth
                    return analysis.subdirectories.is_empty();
                }
                // Recursively check subdirectories
                analysis.subdirectories.iter().all(|sub| check_max_depth(sub, max_depth))
            }

            for analysis in &report.analyzed_paths {
                prop_assert!(check_max_depth(analysis, max_depth),
                    "Should not traverse deeper than max_depth");
            }

            Ok(())
        }).unwrap();
    });
}

// Feature: terminal-disk-management, Property 11: Apparent size calculation
// For any file size calculation, the analyzer should use apparent size rather than block size
#[tokio::test]
async fn property_apparent_size_calculation() {
    proptest!(|(
        file_sizes in prop::collection::vec(1u64..10000, 1..20)
    )| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_dir = TempDir::new().unwrap();
            let mut expected_sizes = Vec::new();

            // Create files with exact known sizes
            for (i, &size) in file_sizes.iter().enumerate() {
                let content = "B".repeat(size as usize);
                let file_path = temp_dir.path().join(format!("file_{}.dat", i));
                fs::write(&file_path, &content).unwrap();
                expected_sizes.push((file_path.file_name().unwrap().to_string_lossy().to_string(), size));
            }

            // Scan the directory
            let analyzer = DiskAnalyzer::new();
            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: None,
                follow_symlinks: false,
                exclude_patterns: vec![],
                min_size_threshold: 0,
                categorization_rules: Default::default(),
            };

            let result = analyzer.analyze(config).await;
            prop_assert!(result.is_ok(), "Analysis should succeed");

            let report = result.unwrap();
            let analysis = &report.analyzed_paths[0];
            
            // Property: Each file's reported size should match its apparent size (content length)
            for (expected_name, expected_size) in expected_sizes {
                let found_file = analysis.files.iter()
                    .find(|f| f.path.file_name().unwrap().to_string_lossy() == expected_name);
                
                prop_assert!(found_file.is_some(), 
                    "File {} should be found in analysis", expected_name);
                
                let file = found_file.unwrap();
                prop_assert_eq!(file.size, expected_size,
                    "File {} should have apparent size {} (not block size)", 
                    expected_name, expected_size);
            }

            // Property: Total size should be sum of apparent sizes
            let expected_total: u64 = file_sizes.iter().sum();
            prop_assert_eq!(report.total_size, expected_total,
                "Total size should be sum of apparent sizes");

            Ok(())
        }).unwrap();
    });
}

// Feature: terminal-disk-management, Property 13: File categorization by type
// For any analyzed file, it should be categorized by type based on its path
#[tokio::test]
async fn property_file_categorization() {
    proptest!(|(
        num_cache_files in 1usize..5,
        num_temp_files in 1usize..5,
        num_download_files in 1usize..5
    )| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_dir = TempDir::new().unwrap();
            
            // Create cache directory
            let cache_dir = temp_dir.path().join(".cache");
            fs::create_dir(&cache_dir).unwrap();
            for i in 0..num_cache_files {
                fs::write(cache_dir.join(format!("cache_{}.dat", i)), "cache").unwrap();
            }

            // Create temp directory
            let temp_files_dir = temp_dir.path().join("tmp");
            fs::create_dir(&temp_files_dir).unwrap();
            for i in 0..num_temp_files {
                fs::write(temp_files_dir.join(format!("temp_{}.tmp", i)), "temp").unwrap();
            }

            // Create downloads directory
            let downloads_dir = temp_dir.path().join("Downloads");
            fs::create_dir(&downloads_dir).unwrap();
            for i in 0..num_download_files {
                fs::write(downloads_dir.join(format!("download_{}.zip", i)), "download").unwrap();
            }

            // Analyze
            let analyzer = DiskAnalyzer::new();
            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: None,
                follow_symlinks: false,
                exclude_patterns: vec![],
                min_size_threshold: 0,
                categorization_rules: DiskAnalysisConfig::default_categorization_rules(),
            };

            let result = analyzer.analyze(config).await;
            prop_assert!(result.is_ok(), "Analysis should succeed");

            let report = result.unwrap();
            
            // Property: Cache files should be categorized as "caches"
            let cache_category = report.categories.get("caches");
            prop_assert!(cache_category.is_some(), "Should have caches category");
            
            // Property: Temp files should be categorized as "temporary_files"
            let temp_category = report.categories.get("temporary_files");
            prop_assert!(temp_category.is_some(), "Should have temporary_files category");
            
            // Property: Downloads should be categorized as "downloads"
            let download_category = report.categories.get("downloads");
            prop_assert!(download_category.is_some(), "Should have downloads category");

            Ok(())
        }).unwrap();
    });
}

// Feature: terminal-disk-management, Property 14: Safety level classification
// For any cleanup candidate, it should be classified with an appropriate safety level
#[tokio::test]
async fn property_safety_classification() {
    proptest!(|(
        num_cache_items in 1usize..5,
        num_project_items in 1usize..5
    )| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_dir = TempDir::new().unwrap();
            
            // Create cache directory (should be Safe)
            let cache_dir = temp_dir.path().join(".cache");
            fs::create_dir(&cache_dir).unwrap();
            for i in 0..num_cache_items {
                fs::write(cache_dir.join(format!("cache_{}.dat", i)), "A".repeat(1024 * 1024)).unwrap();
            }

            // Create project directory (should be Risky)
            let project_dir = temp_dir.path().join("myproject");
            fs::create_dir(&project_dir).unwrap();
            let src_dir = project_dir.join("src");
            fs::create_dir(&src_dir).unwrap();
            for i in 0..num_project_items {
                fs::write(src_dir.join(format!("file_{}.rs", i)), "A".repeat(1024 * 1024)).unwrap();
            }

            // Analyze
            let analyzer = DiskAnalyzer::new();
            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: None,
                follow_symlinks: false,
                exclude_patterns: vec![],
                min_size_threshold: 1024 * 1024, // 1 MB minimum
                categorization_rules: DiskAnalysisConfig::default_categorization_rules(),
            };

            let result = analyzer.analyze(config).await;
            prop_assert!(result.is_ok(), "Analysis should succeed");

            let report = result.unwrap();
            
            // Property: Cache directories should have Safe safety level
            let cache_candidates: Vec<_> = report.cleanup_candidates.iter()
                .filter(|c| c.path.to_string_lossy().contains(".cache"))
                .collect();
            
            for candidate in cache_candidates {
                prop_assert_eq!(candidate.safety_level, SafetyLevel::Safe,
                    "Cache items should have Safe safety level");
            }

            // Property: Project directories should NOT be in cleanup candidates or be Risky
            let project_candidates: Vec<_> = report.cleanup_candidates.iter()
                .filter(|c| c.path.to_string_lossy().contains("src"))
                .collect();
            
            for candidate in project_candidates {
                prop_assert_eq!(candidate.safety_level, SafetyLevel::Risky,
                    "Project items should have Risky safety level if included");
            }

            Ok(())
        }).unwrap();
    });
}

// Feature: terminal-disk-management, Property 12: Structured report generation
// For any completed analysis, a structured report should be generated containing top space consumers
#[tokio::test]
async fn property_report_generation() {
    proptest!(|(
        num_files in 5usize..20,
        file_sizes in prop::collection::vec(1000u64..100000, 5..20)
    )| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_dir = TempDir::new().unwrap();

            // Create files with varying sizes
            for (i, &size) in file_sizes.iter().enumerate().take(num_files) {
                let content = "X".repeat(size as usize);
                fs::write(temp_dir.path().join(format!("file_{}.dat", i)), content).unwrap();
            }

            // Analyze
            let analyzer = DiskAnalyzer::new();
            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: None,
                follow_symlinks: false,
                exclude_patterns: vec![],
                min_size_threshold: 0,
                categorization_rules: Default::default(),
            };

            let result = analyzer.analyze(config).await;
            prop_assert!(result.is_ok(), "Analysis should succeed");

            let report = result.unwrap();
            
            // Property: Report should have top space consumers
            prop_assert!(!report.top_consumers.is_empty(),
                "Report should contain top space consumers");
            
            // Property: Top consumers should be sorted by size (descending)
            for i in 1..report.top_consumers.len() {
                prop_assert!(report.top_consumers[i-1].size >= report.top_consumers[i].size,
                    "Top consumers should be sorted by size descending");
            }

            // Property: Report should have timestamp
            prop_assert!(report.timestamp <= chrono::Utc::now(),
                "Report timestamp should be valid");

            // Property: Report should have analyzed paths
            prop_assert_eq!(report.analyzed_paths.len(), 1,
                "Report should have analyzed the configured path");

            Ok(())
        }).unwrap();
    });
}

// Feature: terminal-disk-management, Property 15: Visual representation data generation
// For any disk analysis presentation, visualization data structures should be generated
#[tokio::test]
async fn property_visualization_data() {
    proptest!(|(
        num_dirs in 2usize..5,
        files_per_dir in 1usize..5
    )| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let temp_dir = TempDir::new().unwrap();

            // Create multiple directories with files
            for dir_idx in 0..num_dirs {
                let dir_path = temp_dir.path().join(format!("dir_{}", dir_idx));
                fs::create_dir(&dir_path).unwrap();
                
                for file_idx in 0..files_per_dir {
                    let content = "V".repeat(1000 * (dir_idx + 1));
                    fs::write(dir_path.join(format!("file_{}.txt", file_idx)), content).unwrap();
                }
            }

            // Analyze
            let analyzer = DiskAnalyzer::new();
            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: None,
                follow_symlinks: false,
                exclude_patterns: vec![],
                min_size_threshold: 0,
                categorization_rules: Default::default(),
            };

            let result = analyzer.analyze(config).await;
            prop_assert!(result.is_ok(), "Analysis should succeed");

            let report = result.unwrap();
            
            // Property: Visualization data should be present
            let viz_data = &report.visualization_data;
            
            // Property: Size distribution should have entries
            prop_assert!(!viz_data.size_distribution.is_empty(),
                "Visualization should have size distribution data");
            
            // Property: Percentages in size distribution should sum to ~100%
            let total_percentage: f64 = viz_data.size_distribution.iter()
                .map(|e| e.percentage)
                .sum();
            prop_assert!((total_percentage - 100.0).abs() < 1.0,
                "Size distribution percentages should sum to approximately 100%");

            // Property: Category breakdown should have entries
            prop_assert!(!viz_data.category_breakdown.is_empty(),
                "Visualization should have category breakdown data");
            
            // Property: Each category entry should have a color
            for category in &viz_data.category_breakdown {
                prop_assert!(!category.color.is_empty(),
                    "Each category should have a color assigned");
            }

            Ok(())
        }).unwrap();
    });
}
