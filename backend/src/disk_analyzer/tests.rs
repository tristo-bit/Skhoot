use super::*;
use proptest::prelude::*;
use std::fs;
use tempfile::TempDir;

// Feature: terminal-disk-management, Property 9: Directory scanning and space calculation
// For any disk analysis initiation, the analyzer should scan configured directories and calculate space usage
// Validates: Requirements 2.1
#[cfg(test)]
mod property_tests {
    use super::*;

    // Helper function to create a test directory structure
    fn create_test_structure(temp_dir: &TempDir, files: Vec<(String, usize)>) -> u64 {
        let mut total_size = 0u64;
        for (name, size) in files {
            let path = temp_dir.path().join(&name);
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).unwrap();
            }
            let content = "A".repeat(size);
            fs::write(&path, &content).unwrap();
            total_size += size as u64;
        }
        total_size
    }

    // Generator for file structures
    fn file_structure_strategy() -> impl Strategy<Value = Vec<(String, usize)>> {
        prop::collection::vec(
            (
                prop::string::string_regex("[a-z]{1,10}\\.txt").unwrap(),
                1usize..10000,
            ),
            1..20,
        )
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // Feature: terminal-disk-management, Property 9: Directory scanning and space calculation
        #[test]
        fn prop_directory_scanning_calculates_space(files in file_structure_strategy()) {
            let temp_dir = TempDir::new().unwrap();
            let expected_size = create_test_structure(&temp_dir, files.clone());

            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                ..Default::default()
            };

            let analyzer = DiskAnalyzer::new(config);
            let report = analyzer.analyze().unwrap();

            // Property: The total size should match the sum of all file sizes
            prop_assert_eq!(report.total_size, expected_size);
            
            // Property: The file count should match the number of files created
            prop_assert_eq!(report.analyzed_paths[0].file_count, files.len());
        }
    }

    // Feature: terminal-disk-management, Property 10: Directory traversal depth limiting
    // For any directory analysis with specified depth, traversal should stop at the configured depth level
    // Validates: Requirements 2.2
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_depth_limiting_respects_max_depth(
            depth_limit in 1usize..5,
            files_per_level in 1usize..5,
        ) {
            let temp_dir = TempDir::new().unwrap();
            
            // Create nested directory structure with files at each level
            let mut expected_files = 0;
            for level in 0..=depth_limit {
                let mut level_path = temp_dir.path().to_path_buf();
                for i in 0..level {
                    level_path = level_path.join(format!("level{}", i));
                }
                fs::create_dir_all(&level_path).unwrap();
                
                for i in 0..files_per_level {
                    let file_path = level_path.join(format!("file{}.txt", i));
                    fs::write(&file_path, "content").unwrap();
                    expected_files += 1;
                }
            }
            
            // Create one more level that should be excluded
            let mut excluded_path = temp_dir.path().to_path_buf();
            for i in 0..=depth_limit {
                excluded_path = excluded_path.join(format!("level{}", i));
            }
            fs::create_dir_all(&excluded_path).unwrap();
            fs::write(excluded_path.join("excluded.txt"), "excluded").unwrap();

            let config = DiskAnalysisConfig {
                paths: vec![temp_dir.path().to_path_buf()],
                max_depth: Some(depth_limit + 1), // +1 because walkdir counts from root
                ..Default::default()
            };

            let analyzer = DiskAnalyzer::new(config);
            let report = analyzer.analyze().unwrap();

            // Property: Files beyond max_depth should not be counted
            prop_assert_eq!(report.analyzed_paths[0].file_count, expected_files);
        }
    }

    // Feature: terminal-disk-management, Property 11: Apparent size calculation
    // For any file size calculation, the analyzer should use apparent size rather than block size
    // Validates: Requirements 2.3
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_apparent_size_matches_file_size(file_size in 1usize..100000) {
            let temp_dir = TempDir::new().unwrap();
            let file_path = temp_dir.path().join("test.txt");
            let content = "A".repeat(file_size);
            fs::write(&file_path, &content).unwrap();

            let calculated_size = DiskAnalyzer::get_apparent_size(&file_path).unwrap();

            // Property: Apparent size should exactly match the file content size
            prop_assert_eq!(calculated_size, file_size as u64);
        }

        #[test]
        fn prop_apparent_size_directory_sums_files(files in file_structure_strategy()) {
            let temp_dir = TempDir::new().unwrap();
            let expected_size = create_test_structure(&temp_dir, files);

            let calculated_size = DiskAnalyzer::get_apparent_size(temp_dir.path()).unwrap();

            // Property: Directory apparent size should be sum of all file sizes
            prop_assert_eq!(calculated_size, expected_size);
        }
    }
}
