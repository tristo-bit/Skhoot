//! Unified search manager coordinating multiple search engines
#![allow(dead_code)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use super::file_search::{FileSearchEngine, FileSearchConfig, FileSearchResults};
use super::cli_engine::{CliEngine, CliConfig, CliSearchResult};

/// Unified search manager that coordinates between different search engines
/// and provides AI-optimized search capabilities
#[derive(Clone)]
pub struct SearchManager {
    file_search_engine: FileSearchEngine,
    cli_engine: CliEngine,
    active_searches: Arc<RwLock<HashMap<String, SearchHandle>>>,
    search_history: Arc<RwLock<Vec<SearchHistoryEntry>>>,
    pub config: SearchManagerConfig,
}

/// Configuration for the search manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchManagerConfig {
    pub default_search_mode: SearchMode,
    pub enable_search_suggestions: bool,
    pub max_concurrent_searches: usize,
    pub search_timeout_seconds: u64,
    pub cache_results: bool,
    pub file_search_config: FileSearchConfig,
    pub cli_config: CliConfig,
}

impl Default for SearchManagerConfig {
    fn default() -> Self {
        Self {
            default_search_mode: SearchMode::Hybrid,
            enable_search_suggestions: true,
            max_concurrent_searches: 5,
            search_timeout_seconds: 30,
            cache_results: true,
            file_search_config: FileSearchConfig::default(),
            cli_config: CliConfig::default(),
        }
    }
}

/// Different search modes available
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchMode {
    /// Use only the Rust-based fuzzy search engine
    RustEngine,
    /// Use only CLI tools (ripgrep, fd, etc.)
    CliOnly,
    /// Use both engines and merge results
    Hybrid,
    /// Automatically choose the best engine based on query
    Auto,
}

/// Handle for tracking ongoing searches
#[derive(Debug, Clone)]
pub struct SearchHandle {
    pub id: String,
    pub query: String,
    pub mode: SearchMode,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub status: SearchStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchStatus {
    Running,
    Completed,
    Failed(String),
    Cancelled,
}

/// Entry in search history for learning and optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHistoryEntry {
    pub id: String,
    pub query: String,
    pub mode: SearchMode,
    pub results_count: usize,
    pub execution_time_ms: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub user_selected_result: Option<String>,
}

/// Unified search results combining different engines
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedSearchResults {
    pub search_id: String,
    pub query: String,
    pub mode: SearchMode,
    pub file_results: Option<FileSearchResults>,
    pub cli_results: Option<CliSearchResult>,
    pub merged_results: Vec<MergedSearchResult>,
    pub total_execution_time_ms: u64,
    pub suggestions: Vec<SearchSuggestion>,
}

/// A merged result from multiple search engines
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergedSearchResult {
    pub path: String,
    pub relevance_score: f64,
    pub source_engine: String,
    pub file_type: String,
    pub size: Option<u64>,
    pub modified: Option<chrono::DateTime<chrono::Utc>>,
    pub snippet: Option<String>,
    pub line_number: Option<usize>,
}

/// Search suggestions for improving queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchSuggestion {
    pub suggestion: String,
    pub reason: String,
    pub confidence: f64,
}

/// Context for AI-driven search optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchContext {
    pub current_file: Option<String>,
    pub recent_files: Vec<String>,
    pub project_type: Option<String>,
    pub search_intent: SearchIntent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchIntent {
    FindFile,
    FindContent,
    Explore,
    Debug,
    Refactor,
    Unknown,
}

impl SearchManager {
    pub fn new(working_directory: PathBuf, config: SearchManagerConfig) -> Self {
        let file_search_engine = FileSearchEngine::new(config.file_search_config.clone());
        let cli_engine = CliEngine::new(working_directory);

        Self {
            file_search_engine,
            cli_engine,
            active_searches: Arc::new(RwLock::new(HashMap::new())),
            search_history: Arc::new(RwLock::new(Vec::new())),
            config,
        }
    }

    /// Perform a unified search using the configured strategy
    pub async fn search(
        &self,
        query: &str,
        search_dir: &Path,
        context: Option<SearchContext>,
    ) -> Result<UnifiedSearchResults> {
        let search_id = Uuid::new_v4().to_string();
        let start_time = std::time::Instant::now();

        // Determine search mode
        let mode = self.determine_search_mode(query, context.as_ref()).await;

        // Create search handle
        let handle = SearchHandle {
            id: search_id.clone(),
            query: query.to_string(),
            mode: mode.clone(),
            started_at: chrono::Utc::now(),
            status: SearchStatus::Running,
        };

        // Register the search
        {
            let mut active = self.active_searches.write().await;
            active.insert(search_id.clone(), handle);
        }

        // Execute search based on mode
        let (file_results, cli_results) = match mode {
            SearchMode::RustEngine => {
                let file_res = self.file_search_engine.search(query, search_dir, true).await?;
                (Some(file_res), None)
            }
            SearchMode::CliOnly => {
                let cli_res = self.cli_engine.search_files(query, &self.config.cli_config).await?;
                (None, Some(cli_res))
            }
            SearchMode::Hybrid => {
                let (file_res, cli_res) = tokio::try_join!(
                    self.file_search_engine.search(query, search_dir, true),
                    self.cli_engine.search_files(query, &self.config.cli_config)
                )?;
                (Some(file_res), Some(cli_res))
            }
            SearchMode::Auto => {
                // Start with Rust engine, fall back to CLI if needed
                match self.file_search_engine.search(query, search_dir, true).await {
                    Ok(file_res) if !file_res.matches.is_empty() => (Some(file_res), None),
                    _ => {
                        let cli_res = self.cli_engine.search_files(query, &self.config.cli_config).await?;
                        (None, Some(cli_res))
                    }
                }
            }
        };

        // Merge results
        let merged_results = self.merge_results(&file_results, &cli_results);

        // Generate suggestions
        let suggestions = if self.config.enable_search_suggestions {
            self.generate_suggestions(query, &merged_results, context.as_ref()).await
        } else {
            vec![]
        };

        let total_execution_time_ms = start_time.elapsed().as_millis() as u64;

        // Update search status
        {
            let mut active = self.active_searches.write().await;
            if let Some(handle) = active.get_mut(&search_id) {
                handle.status = SearchStatus::Completed;
            }
        }

        // Add to history
        self.add_to_history(&search_id, query, &mode, &merged_results, total_execution_time_ms).await;

        Ok(UnifiedSearchResults {
            search_id,
            query: query.to_string(),
            mode,
            file_results,
            cli_results,
            merged_results,
            total_execution_time_ms,
            suggestions,
        })
    }

    /// Search file contents across all engines
    pub async fn search_content(
        &self,
        query: &str,
        _search_dir: &Path,
        context: Option<SearchContext>,
    ) -> Result<UnifiedSearchResults> {
        let search_id = Uuid::new_v4().to_string();
        let start_time = std::time::Instant::now();

        // For content search, prefer CLI tools
        let cli_results = self.cli_engine.search_content(query, &self.config.cli_config).await?;

        let merged_results = self.merge_results(&None, &Some(cli_results.clone()));
        let suggestions = if self.config.enable_search_suggestions {
            self.generate_suggestions(query, &merged_results, context.as_ref()).await
        } else {
            vec![]
        };

        let total_execution_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(UnifiedSearchResults {
            search_id,
            query: query.to_string(),
            mode: SearchMode::CliOnly,
            file_results: None,
            cli_results: Some(cli_results),
            merged_results,
            total_execution_time_ms,
            suggestions,
        })
    }

    /// Cancel an ongoing search
    pub async fn cancel_search(&self, search_id: &str) -> Result<()> {
        let mut active = self.active_searches.write().await;
        if let Some(handle) = active.get_mut(search_id) {
            handle.status = SearchStatus::Cancelled;
            // TODO: Implement actual cancellation of underlying search operations
        }
        Ok(())
    }

    /// Get search history for analysis and optimization
    pub async fn get_search_history(&self, limit: Option<usize>) -> Vec<SearchHistoryEntry> {
        let history = self.search_history.read().await;
        let limit = limit.unwrap_or(100);
        history.iter().rev().take(limit).cloned().collect()
    }

    /// Analyze search patterns to detect when file search should be suggested
    pub async fn should_suggest_file_search(&self, prompt: &str) -> bool {
        // AI-driven detection of file search intent
        let file_search_indicators = [
            "find file", "search for", "locate", "where is", "show me",
            "list files", "files containing", "in the project", "source code",
            "implementation", "definition", "usage", "references", "imports",
            "config", "settings", "documentation", "readme", "changelog",
            ".rs", ".js", ".py", ".ts", ".json", ".md", ".txt", ".yml", ".yaml",
        ];

        let prompt_lower = prompt.to_lowercase();
        
        // Check for direct indicators
        for indicator in &file_search_indicators {
            if prompt_lower.contains(indicator) {
                return true;
            }
        }

        // Check for file extensions
        let extension_pattern = regex::Regex::new(r"\.\w{1,4}\b").unwrap();
        if extension_pattern.is_match(&prompt_lower) {
            return true;
        }

        // Check for path-like patterns
        let path_pattern = regex::Regex::new(r"[/\\]\w+|src/|lib/|components/|utils/").unwrap();
        if path_pattern.is_match(&prompt_lower) {
            return true;
        }

        false
    }

    /// Get active searches
    pub async fn get_active_searches(&self) -> Vec<SearchHandle> {
        let active = self.active_searches.read().await;
        active.values().cloned().collect()
    }

    // Private helper methods

    async fn determine_search_mode(&self, query: &str, context: Option<&SearchContext>) -> SearchMode {
        match &self.config.default_search_mode {
            SearchMode::Auto => {
                // Intelligent mode selection based on query characteristics
                if query.len() < 3 {
                    SearchMode::RustEngine // Better for short fuzzy queries
                } else if query.contains('"') || query.contains('*') || query.contains('?') {
                    SearchMode::CliOnly // Better for regex/glob patterns
                } else if let Some(ctx) = context {
                    match ctx.search_intent {
                        SearchIntent::FindContent => SearchMode::CliOnly,
                        SearchIntent::FindFile => SearchMode::RustEngine,
                        _ => SearchMode::Hybrid,
                    }
                } else {
                    SearchMode::Hybrid
                }
            }
            mode => mode.clone(),
        }
    }

    fn merge_results(
        &self,
        file_results: &Option<FileSearchResults>,
        cli_results: &Option<CliSearchResult>,
    ) -> Vec<MergedSearchResult> {
        let mut merged = Vec::new();

        // Add file search results
        if let Some(file_res) = file_results {
            for file_match in &file_res.matches {
                merged.push(MergedSearchResult {
                    path: file_match.path.clone(), // Use full path, not relative
                    relevance_score: (file_match.score as f64) / 1000.0, // Normalize score
                    source_engine: "rust-fuzzy".to_string(),
                    file_type: file_match.file_type.clone(),
                    size: file_match.file_size,
                    modified: file_match.modified,
                    snippet: None,
                    line_number: None,
                });
            }
        }

        // Add CLI results
        if let Some(cli_res) = cli_results {
            for cli_match in &cli_res.files {
                merged.push(MergedSearchResult {
                    path: cli_match.path.clone(),
                    relevance_score: 0.8, // Default score for CLI matches
                    source_engine: cli_res.command_used.clone(),
                    file_type: Path::new(&cli_match.path)
                        .extension()
                        .and_then(|ext| ext.to_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    size: None,
                    modified: None,
                    snippet: cli_match.content.clone(),
                    line_number: cli_match.line_number,
                });
            }
        }

        // Sort by relevance score
        merged.sort_by(|a, b| b.relevance_score.partial_cmp(&a.relevance_score).unwrap());

        // Remove duplicates (prefer higher scoring results)
        let mut seen_paths = std::collections::HashSet::new();
        merged.retain(|result| seen_paths.insert(result.path.clone()));

        merged
    }

    async fn generate_suggestions(
        &self,
        query: &str,
        results: &[MergedSearchResult],
        context: Option<&SearchContext>,
    ) -> Vec<SearchSuggestion> {
        let mut suggestions = Vec::new();

        // Suggest refinements if too many results
        if results.len() > 50 {
            suggestions.push(SearchSuggestion {
                suggestion: format!("Try a more specific query like '{} *.rs' or '{} src/'", query, query),
                reason: "Too many results found".to_string(),
                confidence: 0.8,
            });
        }

        // Suggest alternative search if no results
        if results.is_empty() {
            suggestions.push(SearchSuggestion {
                suggestion: format!("Try searching for content with: '{}'", query),
                reason: "No files found matching the name".to_string(),
                confidence: 0.7,
            });

            // Suggest fuzzy alternatives
            if query.len() > 3 {
                let fuzzy_query = query.chars().map(|c| c.to_string()).collect::<Vec<_>>().join(".*");
                suggestions.push(SearchSuggestion {
                    suggestion: fuzzy_query,
                    reason: "Try a fuzzy pattern match".to_string(),
                    confidence: 0.6,
                });
            }
        }

        // Context-based suggestions
        if let Some(ctx) = context {
            if let Some(current_file) = &ctx.current_file {
                let current_dir = Path::new(current_file).parent()
                    .and_then(|p| p.to_str())
                    .unwrap_or("");
                
                if !current_dir.is_empty() && !query.contains(current_dir) {
                    suggestions.push(SearchSuggestion {
                        suggestion: format!("{} {}/", query, current_dir),
                        reason: "Search in current directory".to_string(),
                        confidence: 0.9,
                    });
                }
            }
        }

        suggestions
    }

    async fn add_to_history(
        &self,
        search_id: &str,
        query: &str,
        mode: &SearchMode,
        results: &[MergedSearchResult],
        execution_time_ms: u64,
    ) {
        let entry = SearchHistoryEntry {
            id: search_id.to_string(),
            query: query.to_string(),
            mode: mode.clone(),
            results_count: results.len(),
            execution_time_ms,
            timestamp: chrono::Utc::now(),
            user_selected_result: None,
        };

        let mut history = self.search_history.write().await;
        history.push(entry);

        // Keep only last 1000 entries
        let history_len = history.len();
        if history_len > 1000 {
            history.drain(0..history_len - 1000);
        }
    }
}

/// Factory for creating search managers with different configurations
pub struct SearchManagerFactory;

impl SearchManagerFactory {
    /// Create a search manager optimized for AI assistance
    pub fn create_ai_optimized(working_directory: PathBuf) -> SearchManager {
        let mut config = SearchManagerConfig::default();
        config.default_search_mode = SearchMode::Auto;
        config.enable_search_suggestions = true;
        config.file_search_config.max_results = 50;
        config.cli_config.max_results = 100;
        
        SearchManager::new(working_directory, config)
    }

    /// Create a search manager optimized for performance
    pub fn create_performance_optimized(working_directory: PathBuf) -> SearchManager {
        let mut config = SearchManagerConfig::default();
        config.default_search_mode = SearchMode::RustEngine;
        config.enable_search_suggestions = false;
        config.file_search_config.threads = 8;
        config.file_search_config.max_results = 200;
        
        SearchManager::new(working_directory, config)
    }

    /// Create a search manager with custom configuration
    pub fn create_custom(working_directory: PathBuf, config: SearchManagerConfig) -> SearchManager {
        SearchManager::new(working_directory, config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_search_manager_basic() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path().to_path_buf();

        // Create test files
        fs::write(temp_path.join("test.rs"), "fn main() {}").unwrap();
        fs::write(temp_path.join("lib.rs"), "pub mod test;").unwrap();

        let manager = SearchManagerFactory::create_ai_optimized(temp_path.clone());
        let results = manager.search("test", &temp_path, None).await.unwrap();

        assert!(!results.merged_results.is_empty());
        assert!(results.merged_results.iter().any(|r| r.path.contains("test")));
    }

    #[tokio::test]
    async fn test_search_intent_detection() {
        let temp_dir = TempDir::new().unwrap();
        let manager = SearchManagerFactory::create_ai_optimized(temp_dir.path().to_path_buf());

        assert!(manager.should_suggest_file_search("find the main.rs file").await);
        assert!(manager.should_suggest_file_search("where is the config.json?").await);
        assert!(manager.should_suggest_file_search("show me all .ts files").await);
        assert!(!manager.should_suggest_file_search("what is the weather today?").await);
    }

    #[tokio::test]
    async fn test_search_suggestions() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path().to_path_buf();

        let manager = SearchManagerFactory::create_ai_optimized(temp_path.clone());
        let results = manager.search("nonexistent", &temp_path, None).await.unwrap();

        assert!(!results.suggestions.is_empty());
        assert!(results.suggestions.iter().any(|s| s.reason.contains("No files found")));
    }
}