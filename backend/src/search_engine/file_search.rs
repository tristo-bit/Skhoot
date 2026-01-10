//! High-performance file search engine using fuzzy matching
#![allow(dead_code)]

use anyhow::Result;
use ignore::WalkBuilder;
use ignore::overrides::OverrideBuilder;
use serde::{Deserialize, Serialize};
use std::collections::BinaryHeap;
use std::cmp::Reverse;
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::cell::UnsafeCell;
use std::num::NonZero;
use tokio::task;

// Re-export nucleo for fuzzy matching
use nucleo_matcher::{Matcher, Utf32Str, Config};
use nucleo_matcher::pattern::{AtomKind, CaseMatching, Normalization, Pattern};

/// Configuration for file search operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSearchConfig {
    pub max_results: usize,
    pub threads: usize,
    pub respect_gitignore: bool,
    pub follow_symlinks: bool,
    pub include_hidden: bool,
    pub exclude_patterns: Vec<String>,
    pub include_patterns: Vec<String>,
}

impl Default for FileSearchConfig {
    fn default() -> Self {
        Self {
            max_results: 100,
            threads: 4,
            respect_gitignore: true,
            follow_symlinks: true,
            include_hidden: false,
            exclude_patterns: vec![
                "node_modules/**".to_string(),
                "target/**".to_string(),
                ".git/**".to_string(),
                "*.log".to_string(),
                "*.tmp".to_string(),
            ],
            include_patterns: vec![],
        }
    }
}

/// A single file match result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMatch {
    pub score: u32,
    pub path: String,
    pub relative_path: String,
    pub file_name: String,
    pub file_size: Option<u64>,
    pub modified: Option<chrono::DateTime<chrono::Utc>>,
    pub file_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indices: Option<Vec<u32>>, // Character indices for highlighting
}

/// Search results container
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSearchResults {
    pub matches: Vec<FileMatch>,
    pub total_matches: usize,
    pub search_time_ms: u64,
    pub query: String,
    pub truncated: bool,
}

/// High-performance file search engine optimized for AI usage
#[derive(Clone)]
pub struct FileSearchEngine {
    config: FileSearchConfig,
}

impl FileSearchEngine {
    pub fn new(config: FileSearchConfig) -> Self {
        Self { config }
    }

    /// Perform a fuzzy file search
    pub async fn search(
        &self,
        query: &str,
        search_dir: &Path,
        compute_indices: bool,
    ) -> Result<FileSearchResults> {
        let start_time = std::time::Instant::now();
        
        if query.trim().is_empty() {
            return Ok(FileSearchResults {
                matches: vec![],
                total_matches: 0,
                search_time_ms: start_time.elapsed().as_millis() as u64,
                query: query.to_string(),
                truncated: false,
            });
        }

        let cancel_flag = Arc::new(AtomicBool::new(false));
        let results = self.run_search(
            query,
            search_dir,
            cancel_flag,
            compute_indices,
        ).await?;

        let search_time_ms = start_time.elapsed().as_millis() as u64;
        
        let match_count = results.matches.len();
        let total_matches = results.total_matches;
        let truncated = match_count < total_matches;

        Ok(FileSearchResults {
            matches: results.matches,
            total_matches,
            search_time_ms,
            query: query.to_string(),
            truncated,
        })
    }

    /// Cancel an ongoing search (for future use with search handles)
    pub fn cancel_search(&self, _search_id: &str) {
        // Implementation for search cancellation
        // This would be used with a search manager to track ongoing searches
    }

    async fn run_search(
        &self,
        pattern_text: &str,
        search_directory: &Path,
        cancel_flag: Arc<AtomicBool>,
        compute_indices: bool,
    ) -> Result<InternalSearchResults> {
        let pattern = create_pattern(pattern_text);
        let limit = NonZero::new(self.config.max_results).unwrap_or(NonZero::new(100).unwrap());
        let threads = NonZero::new(self.config.threads).unwrap_or(NonZero::new(4).unwrap());

        // Run the CPU-intensive search in a blocking task
        let search_directory = search_directory.to_path_buf();
        let config = self.config.clone();
        
        task::spawn_blocking(move || {
            run_file_search(
                pattern,
                limit,
                &search_directory,
                config,
                threads,
                cancel_flag,
                compute_indices,
            )
        }).await?
    }
}

struct InternalSearchResults {
    matches: Vec<FileMatch>,
    total_matches: usize,
}

/// Core search implementation (blocking)
fn run_file_search(
    pattern: Pattern,
    limit: NonZero<usize>,
    search_directory: &Path,
    config: FileSearchConfig,
    threads: NonZero<usize>,
    cancel_flag: Arc<AtomicBool>,
    compute_indices: bool,
) -> Result<InternalSearchResults> {
    let worker_count = create_worker_count(threads);
    let best_matchers_per_worker: Vec<UnsafeCell<BestMatchesList>> = (0..worker_count.num_best_matches_lists)
        .map(|_| {
            UnsafeCell::new(BestMatchesList::new(
                limit.get(),
                pattern.clone(),
                Matcher::new(Config::DEFAULT),
            ))
        })
        .collect();

    // Setup directory walker
    let mut walk_builder = WalkBuilder::new(search_directory);
    walk_builder
        .threads(worker_count.num_walk_builder_threads)
        .hidden(!config.include_hidden)
        .follow_links(config.follow_symlinks)
        .require_git(false);

    if !config.respect_gitignore {
        walk_builder
            .git_ignore(false)
            .git_global(false)
            .git_exclude(false)
            .ignore(false)
            .parents(false);
    }

    // Add exclude patterns
    if !config.exclude_patterns.is_empty() {
        let mut override_builder = OverrideBuilder::new(search_directory);
        for exclude in &config.exclude_patterns {
            let exclude_pattern = format!("!{exclude}");
            override_builder.add(&exclude_pattern)?;
        }
        let override_matcher = override_builder.build()?;
        walk_builder.overrides(override_matcher);
    }

    let walker = walk_builder.build_parallel();
    let index_counter = AtomicUsize::new(0);

    // Run parallel file traversal
    walker.run(|| {
        let index = index_counter.fetch_add(1, Ordering::Relaxed);
        let best_list_ptr = best_matchers_per_worker[index].get();
        let best_list = unsafe { &mut *best_list_ptr };

        const CHECK_INTERVAL: usize = 1024;
        let mut processed = 0;
        let cancel = cancel_flag.clone();

        Box::new(move |entry| {
            if let Some(file_info) = get_file_info(&entry, search_directory) {
                best_list.insert(file_info);
            }

            processed += 1;
            if processed % CHECK_INTERVAL == 0 && cancel.load(Ordering::Relaxed) {
                ignore::WalkState::Quit
            } else {
                ignore::WalkState::Continue
            }
        })
    });

    // Check for cancellation
    if cancel_flag.load(Ordering::Relaxed) {
        return Ok(InternalSearchResults {
            matches: Vec::new(),
            total_matches: 0,
        });
    }

    // Merge results from all workers
    let mut global_heap: BinaryHeap<Reverse<(u32, FileInfo)>> = BinaryHeap::new();
    let mut total_matches = 0;

    for best_list_cell in best_matchers_per_worker.iter() {
        let best_list = unsafe { &*best_list_cell.get() };
        total_matches += best_list.num_matches;
        
        for &Reverse((score, ref file_info)) in best_list.binary_heap.iter() {
            if global_heap.len() < limit.get() {
                global_heap.push(Reverse((score, file_info.clone())));
            } else {
                if let Some(min_element) = global_heap.peek() {
                    if score > min_element.0.0 {
                        global_heap.pop();
                        global_heap.push(Reverse((score, file_info.clone())));
                    }
                }
            }
        }
    }

    // Convert to final results
    let mut raw_matches: Vec<(u32, FileInfo)> = global_heap.into_iter().map(|r| r.0).collect();
    sort_matches(&mut raw_matches);

    let mut matcher = if compute_indices {
        Some(Matcher::new(Config::DEFAULT))
    } else {
        None
    };

    let matches: Vec<FileMatch> = raw_matches
        .into_iter()
        .map(|(score, file_info)| {
            let indices = if compute_indices {
                let mut buf = Vec::<char>::new();
                let haystack: Utf32Str<'_> = Utf32Str::new(&file_info.relative_path, &mut buf);
                let mut idx_vec: Vec<u32> = Vec::new();
                if let Some(ref mut m) = matcher {
                    pattern.indices(haystack, m, &mut idx_vec);
                }
                idx_vec.sort_unstable();
                idx_vec.dedup();
                Some(idx_vec)
            } else {
                None
            };

            FileMatch {
                score,
                path: file_info.full_path,
                relative_path: file_info.relative_path,
                file_name: file_info.file_name,
                file_size: file_info.file_size,
                modified: file_info.modified,
                file_type: file_info.file_type,
                indices,
            }
        })
        .collect();

    Ok(InternalSearchResults {
        matches,
        total_matches,
    })
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct FileInfo {
    full_path: String,
    relative_path: String,
    file_name: String,
    file_size: Option<u64>,
    modified: Option<chrono::DateTime<chrono::Utc>>,
    file_type: String,
}

fn get_file_info(
    entry_result: &Result<ignore::DirEntry, ignore::Error>,
    search_directory: &Path,
) -> Option<FileInfo> {
    let entry = entry_result.as_ref().ok()?;
    
    if entry.file_type().is_some_and(|ft| ft.is_dir()) {
        return None;
    }

    let path = entry.path();
    let relative_path = path.strip_prefix(search_directory).ok()?.to_str()?.to_string();
    let file_name = path.file_name()?.to_str()?.to_string();
    let full_path = path.to_str()?.to_string();

    let metadata = std::fs::metadata(path).ok();
    let file_size = metadata.as_ref().map(|m| m.len());
    let modified = metadata.as_ref()
        .and_then(|m| m.modified().ok())
        .and_then(|t| chrono::DateTime::from_timestamp(
            t.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs() as i64, 0
        ));

    let file_type = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("unknown")
        .to_string();

    Some(FileInfo {
        full_path,
        relative_path,
        file_name,
        file_size,
        modified,
        file_type,
    })
}

/// Maintains the best matches for a worker thread
struct BestMatchesList {
    max_count: usize,
    num_matches: usize,
    pattern: Pattern,
    matcher: Matcher,
    binary_heap: BinaryHeap<Reverse<(u32, FileInfo)>>,
    utf32buf: Vec<char>,
}

impl BestMatchesList {
    fn new(max_count: usize, pattern: Pattern, matcher: Matcher) -> Self {
        Self {
            max_count,
            num_matches: 0,
            pattern,
            matcher,
            binary_heap: BinaryHeap::new(),
            utf32buf: Vec::new(),
        }
    }

    fn insert(&mut self, file_info: FileInfo) {
        let haystack: Utf32Str<'_> = Utf32Str::new(&file_info.relative_path, &mut self.utf32buf);
        
        if let Some(score) = self.pattern.score(haystack, &mut self.matcher) {
            self.num_matches += 1;

            if self.binary_heap.len() < self.max_count {
                self.binary_heap.push(Reverse((score, file_info)));
            } else {
                if let Some(min_element) = self.binary_heap.peek() {
                    if score > min_element.0.0 {
                        self.binary_heap.pop();
                        self.binary_heap.push(Reverse((score, file_info)));
                    }
                }
            }
        }
    }
}

struct WorkerCount {
    num_walk_builder_threads: usize,
    num_best_matches_lists: usize,
}

fn create_worker_count(num_workers: NonZero<usize>) -> WorkerCount {
    let num_walk_builder_threads = num_workers.get();
    let num_best_matches_lists = num_walk_builder_threads + 1;

    WorkerCount {
        num_walk_builder_threads,
        num_best_matches_lists,
    }
}

fn create_pattern(pattern: &str) -> Pattern {
    Pattern::new(
        pattern,
        CaseMatching::Smart,
        Normalization::Smart,
        AtomKind::Fuzzy,
    )
}

fn sort_matches(matches: &mut [(u32, FileInfo)]) {
    matches.sort_by(|a, b| {
        // Sort by score descending, then by path ascending
        match b.0.cmp(&a.0) {
            std::cmp::Ordering::Equal => a.1.relative_path.cmp(&b.1.relative_path),
            other => other,
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_file_search_basic() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        // Create test files
        fs::write(temp_path.join("test.rs"), "fn main() {}").unwrap();
        fs::write(temp_path.join("README.md"), "# Test").unwrap();
        fs::create_dir(temp_path.join("src")).unwrap();
        fs::write(temp_path.join("src").join("lib.rs"), "pub mod test;").unwrap();

        let engine = FileSearchEngine::new(FileSearchConfig::default());
        let results = engine.search("test", temp_path, false).await.unwrap();

        assert!(!results.matches.is_empty());
        assert!(results.matches.iter().any(|m| m.file_name.contains("test")));
    }

    #[tokio::test]
    async fn test_empty_query() {
        let temp_dir = TempDir::new().unwrap();
        let engine = FileSearchEngine::new(FileSearchConfig::default());
        let results = engine.search("", temp_dir.path(), false).await.unwrap();

        assert!(results.matches.is_empty());
        assert_eq!(results.total_matches, 0);
    }
}