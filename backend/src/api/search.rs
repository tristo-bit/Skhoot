use axum::{
    extract::{Query, State, Path},
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::search_engine::{
    SearchContext, SearchIntent, UnifiedSearchResults,
    SearchMode, MergedSearchResult,
    HistoryEntry, ActivityType,
};
use crate::error::AppError;

/// API endpoints for file search functionality
pub fn search_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/search/files", get(search_files))
        .route("/search/documents", get(search_documents))
        .route("/search/content", get(search_content))
        .route("/search/suggest", post(get_search_suggestions))
        .route("/search/history", get(get_search_history))
        .route("/search/active", get(get_active_searches))
        .route("/search/:search_id/cancel", post(cancel_search))
        .route("/search/config", get(get_search_config))
        .route("/search/config", post(update_search_config))
        .route("/files/open", post(open_file_location))
        .route("/files/reveal", post(reveal_file_in_explorer))
        .route("/files/properties", post(show_file_properties))
        .route("/files/open-with", post(open_with_dialog))
        .route("/files/read", get(read_file_content))
        .route("/files/write", post(write_file))
        .route("/files/recent", get(get_recent_files))
        .route("/files/image", get(read_image_file))
}

#[allow(dead_code)]

/// Query parameters for file search
#[derive(Debug, Deserialize)]
pub struct FileSearchQuery {
    pub q: String,                    // Search query
    pub mode: Option<String>,         // Search mode: rust, cli, hybrid, auto
    pub max_results: Option<usize>,   // Maximum number of results
    pub include_indices: Option<bool>, // Include character indices for highlighting
    pub file_types: Option<String>,   // Comma-separated file extensions
    pub exclude_dirs: Option<String>, // Comma-separated directories to exclude
    pub search_path: Option<String>,  // Custom search path (defaults to user home)
    pub unrestricted: Option<bool>,   // Enable deep search (hidden files, ignore .gitignore)
}

/// Query parameters for content search
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ContentSearchQuery {
    pub q: String,                    // Search query
    pub context_lines: Option<usize>, // Number of context lines around matches
    pub case_sensitive: Option<bool>, // Case sensitive search
    pub regex: Option<bool>,          // Use regex pattern
    pub file_types: Option<String>,   // Comma-separated file extensions
    pub search_path: Option<String>,  // Custom search path (defaults to user home)
}

/// Request body for search suggestions
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SearchSuggestionRequest {
    pub prompt: String,
    pub current_file: Option<String>,
    pub recent_files: Option<Vec<String>>,
    pub project_type: Option<String>,
}

/// Response for search suggestions
#[derive(Debug, Serialize)]
pub struct SearchSuggestionResponse {
    pub should_suggest_file_search: bool,
    pub suggested_queries: Vec<String>,
    pub search_intent: String,
    pub confidence: f64,
}

/// Search configuration response
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchConfigResponse {
    pub default_mode: String,
    pub max_results: usize,
    pub enable_suggestions: bool,
    pub available_modes: Vec<String>,
    pub cli_tools_available: HashMap<String, bool>,
}

/// File search endpoint - now uses true hybrid search by default
pub async fn search_files(
    Query(params): Query<FileSearchQuery>,
    State(state): State<crate::AppState>,
) -> Result<Json<UnifiedSearchResults>, AppError> {
    use crate::search_engine::CliConfig;
    
    // Use custom search path if provided, otherwise default to user's home directory
    let search_dir = if let Some(ref custom_path) = params.search_path {
        // Handle tilde expansion for custom paths
        if custom_path.starts_with("~/") || custom_path == "~" {
            if let Some(home) = dirs::home_dir() {
                if custom_path == "~" {
                    home
                } else {
                    home.join(&custom_path[2..])
                }
            } else {
                PathBuf::from(custom_path)
            }
        } else {
            PathBuf::from(custom_path)
        }
    } else {
        // Default to user's home directory for broader search
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
    };
    
    // Ensure search directory is absolute (canonicalize if possible)
    let search_dir = search_dir.canonicalize().unwrap_or(search_dir);

    // Parse search mode
    let mode = match params.mode.as_deref() {
        Some("rust") => SearchMode::RustEngine,
        Some("cli") => SearchMode::CliOnly,
        Some("hybrid") => SearchMode::Hybrid,
        Some("auto") | _ => SearchMode::Hybrid, // Default to hybrid for best results
    };

    // Create search context
    let context = SearchContext {
        current_file: None,
        recent_files: vec![],
        project_type: detect_project_type(&search_dir).await,
        search_intent: SearchIntent::FindFile,
    };

    let start_time = std::time::Instant::now();
    
    // For hybrid mode, run both fuzzy and CLI searches in parallel
    if matches!(mode, SearchMode::Hybrid | SearchMode::Auto) {
        let mut cli_config = CliConfig::default();
        // Propagate unrestricted flag to CLI config
        if params.unrestricted.unwrap_or(false) {
            cli_config.unrestricted = true;
        }

        let cli_engine = crate::search_engine::CliEngine::new(search_dir.clone());
        
        // Parse query for CLI search (split by comma for multiple terms)
        let keywords: Vec<&str> = params.q.split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();
        
        // Parse file types if provided
        let extensions: Vec<&str> = params.file_types
            .as_ref()
            .map(|ft| ft.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect())
            .unwrap_or_default();
        
        // Run both searches in parallel - always use glob search for CLI (more powerful)
        let cli_future = cli_engine.search_files_with_globs(&keywords, &extensions, &search_dir, &cli_config);
        let fuzzy_future = state.file_search_manager.search(&params.q, &search_dir, Some(context));
        
        let (cli_result, fuzzy_result) = tokio::join!(cli_future, fuzzy_future);
        
        let total_execution_time_ms = start_time.elapsed().as_millis() as u64;
        
        // Merge results from both searches
        let mut merged_results: Vec<MergedSearchResult> = Vec::new();
        let mut seen_paths: std::collections::HashSet<String> = std::collections::HashSet::new();
        
        // Add CLI results first (they're exact pattern matches, higher priority for document searches)
        if let Ok(cli_res) = &cli_result {
            for f in &cli_res.files {
                if seen_paths.insert(f.path.clone()) {
                    let path = std::path::Path::new(&f.path);
                    merged_results.push(MergedSearchResult {
                        path: f.path.clone(),
                        relevance_score: 1.0, // CLI glob matches are exact
                        source_engine: format!("cli-glob ({})", cli_res.command_used),
                        file_type: path.extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        size: None,
                        modified: None,
                        snippet: f.content.clone(),
                        line_number: f.line_number,
                    });
                }
            }
        }
        
        // Add fuzzy results (filter by extension if specified)
        if let Ok(fuzzy_res) = &fuzzy_result {
            for r in &fuzzy_res.merged_results {
                // Skip if already found by CLI search
                if seen_paths.contains(&r.path) {
                    continue;
                }
                
                // Filter by extension if specified
                if !extensions.is_empty() {
                    let file_ext = r.file_type.to_lowercase();
                    if !extensions.iter().any(|e| e.to_lowercase() == file_ext) {
                        continue;
                    }
                }
                
                if seen_paths.insert(r.path.clone()) {
                    merged_results.push(MergedSearchResult {
                        path: r.path.clone(),
                        relevance_score: r.relevance_score * 0.9, // Slightly lower than CLI
                        source_engine: format!("fuzzy ({})", r.source_engine),
                        file_type: r.file_type.clone(),
                        size: r.size,
                        modified: r.modified,
                        snippet: r.snippet.clone(),
                        line_number: r.line_number,
                    });
                }
            }
        }
        
        // Sort by relevance score
        merged_results.sort_by(|a, b| b.relevance_score.partial_cmp(&a.relevance_score).unwrap_or(std::cmp::Ordering::Equal));
        
        let unified = UnifiedSearchResults {
            search_id: uuid::Uuid::new_v4().to_string(),
            query: params.q.clone(),
            mode: SearchMode::Hybrid,
            file_results: fuzzy_result.ok().and_then(|r| r.file_results),
            cli_results: cli_result.ok(),
            merged_results,
            total_execution_time_ms,
            suggestions: vec![],
        };
        
        return Ok(Json(unified));
    }

    // Single mode search (rust-only or cli-only)
    let results = state.file_search_manager
        .search(&params.q, &search_dir, Some(context))
        .await
        .map_err(|e| AppError::Internal(format!("Search failed: {}", e)))?;

    Ok(Json(results))
}

/// Query parameters for document search (like Codex CLI)
#[derive(Debug, Deserialize)]
pub struct DocumentSearchQuery {
    pub keywords: String,             // Comma-separated keywords to search for in filenames
    pub extensions: String,           // Comma-separated file extensions (pdf,pptx,doc)
    pub search_path: Option<String>,  // Custom search path (defaults to user home)
}

/// Document search endpoint - uses CLI tools like Codex CLI
/// Searches for documents by filename patterns and extensions
pub async fn search_documents(
    Query(params): Query<DocumentSearchQuery>,
    State(state): State<crate::AppState>,
) -> Result<Json<UnifiedSearchResults>, AppError> {
    use crate::search_engine::CliConfig;
    
    // Use custom search path if provided, otherwise default to user's home directory
    let search_dir = if let Some(ref custom_path) = params.search_path {
        PathBuf::from(custom_path)
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
    };
    
    let search_dir = search_dir.canonicalize().unwrap_or(search_dir);

    // Parse keywords and extensions
    let keywords: Vec<&str> = params.keywords.split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    
    let extensions: Vec<&str> = params.extensions.split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    let cli_config = CliConfig::default();
    let cli_engine = crate::search_engine::CliEngine::new(search_dir.clone());
    
    // Run HYBRID search: both CLI glob search AND fuzzy search in parallel
    let start_time = std::time::Instant::now();
    
    // 1. CLI glob search (like Codex CLI) - finds exact extension + name pattern matches
    let cli_future = cli_engine.search_files_with_globs(&keywords, &extensions, &search_dir, &cli_config);
    
    // 2. Fuzzy search - finds files with similar names
    let fuzzy_query = keywords.join(",");
    let context = SearchContext {
        current_file: None,
        recent_files: vec![],
        project_type: detect_project_type(&search_dir).await,
        search_intent: SearchIntent::FindFile,
    };
    let fuzzy_future = state.file_search_manager.search(&fuzzy_query, &search_dir, Some(context));
    
    // Run both searches in parallel
    let (cli_result, fuzzy_result) = tokio::join!(cli_future, fuzzy_future);
    
    let total_execution_time_ms = start_time.elapsed().as_millis() as u64;
    
    // Merge results from both searches
    let mut merged_results: Vec<MergedSearchResult> = Vec::new();
    let mut seen_paths: std::collections::HashSet<String> = std::collections::HashSet::new();
    
    // Add CLI results first (they're exact matches, higher priority)
    if let Ok(cli_res) = &cli_result {
        for f in &cli_res.files {
            if seen_paths.insert(f.path.clone()) {
                let path = std::path::Path::new(&f.path);
                merged_results.push(MergedSearchResult {
                    path: f.path.clone(),
                    relevance_score: 1.0, // CLI matches are exact
                    source_engine: format!("cli-glob ({})", cli_res.command_used),
                    file_type: path.extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    size: None,
                    modified: None,
                    snippet: f.content.clone(),
                    line_number: f.line_number,
                });
            }
        }
    }
    
    // Add fuzzy results (filter by extension if specified)
    if let Ok(fuzzy_res) = &fuzzy_result {
        for r in &fuzzy_res.merged_results {
            // Skip if already found by CLI search
            if seen_paths.contains(&r.path) {
                continue;
            }
            
            // Filter by extension if extensions were specified
            if !extensions.is_empty() {
                let file_ext = r.file_type.to_lowercase();
                if !extensions.iter().any(|e| e.to_lowercase() == file_ext) {
                    continue;
                }
            }
            
            if seen_paths.insert(r.path.clone()) {
                merged_results.push(MergedSearchResult {
                    path: r.path.clone(),
                    relevance_score: r.relevance_score * 0.9, // Slightly lower priority than CLI
                    source_engine: format!("fuzzy ({})", r.source_engine),
                    file_type: r.file_type.clone(),
                    size: r.size,
                    modified: r.modified,
                    snippet: r.snippet.clone(),
                    line_number: r.line_number,
                });
            }
        }
    }
    
    // Sort by relevance score
    merged_results.sort_by(|a, b| b.relevance_score.partial_cmp(&a.relevance_score).unwrap_or(std::cmp::Ordering::Equal));
    
    // Build suggestions
    let mut suggestions = Vec::new();
    if merged_results.is_empty() {
        suggestions.push(crate::search_engine::SearchSuggestion {
            suggestion: format!("Try searching with fewer keywords or different extensions"),
            reason: "No files found matching the criteria".to_string(),
            confidence: 0.8,
        });
    }
    
    let cli_results_opt = cli_result.ok();
    
    let unified = UnifiedSearchResults {
        search_id: uuid::Uuid::new_v4().to_string(),
        query: params.keywords.clone(),
        mode: SearchMode::Hybrid,
        file_results: fuzzy_result.ok().and_then(|r| r.file_results),
        cli_results: cli_results_opt,
        merged_results,
        total_execution_time_ms,
        suggestions,
    };

    Ok(Json(unified))
}

/// Content search endpoint
pub async fn search_content(
    Query(params): Query<ContentSearchQuery>,
    State(state): State<crate::AppState>,
) -> Result<Json<UnifiedSearchResults>, AppError> {
    // Use custom search path if provided, otherwise default to user's home directory
    let search_dir = if let Some(ref custom_path) = params.search_path {
        PathBuf::from(custom_path)
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
    };
    
    // Ensure search directory is absolute (canonicalize if possible)
    let search_dir = search_dir.canonicalize().unwrap_or(search_dir);

    let context = SearchContext {
        current_file: None,
        recent_files: vec![],
        project_type: detect_project_type(&search_dir).await,
        search_intent: SearchIntent::FindContent,
    };

    let results = state.file_search_manager
        .search_content(&params.q, &search_dir, Some(context))
        .await
        .map_err(|e| AppError::Internal(format!("Content search failed: {}", e)))?;

    Ok(Json(results))
}

/// Get search suggestions based on AI prompt analysis
pub async fn get_search_suggestions(
    State(state): State<crate::AppState>,
    Json(request): Json<SearchSuggestionRequest>,
) -> Result<Json<SearchSuggestionResponse>, AppError> {
    let should_suggest = state.file_search_manager
        .should_suggest_file_search(&request.prompt)
        .await;

    let search_intent = analyze_search_intent(&request.prompt);
    let suggested_queries = generate_query_suggestions(&request.prompt, &search_intent);

    let response = SearchSuggestionResponse {
        should_suggest_file_search: should_suggest,
        suggested_queries,
        search_intent: format!("{:?}", search_intent),
        confidence: if should_suggest { 0.8 } else { 0.2 },
    };

    Ok(Json(response))
}

/// Get search history
pub async fn get_search_history(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<crate::AppState>,
) -> Result<Json<Vec<crate::search_engine::SearchHistoryEntry>>, AppError> {
    let limit = params.get("limit")
        .and_then(|l| l.parse().ok())
        .unwrap_or(50);

    let history = state.file_search_manager.get_search_history(Some(limit)).await;
    Ok(Json(history))
}

/// Get active searches
pub async fn get_active_searches(
    State(state): State<crate::AppState>,
) -> Result<Json<Vec<String>>, AppError> {
    // For now, return a simple list of search IDs
    // In a real implementation, you'd return proper SearchHandle data
    let active_searches = state.file_search_manager.get_active_searches().await;
    let search_ids: Vec<String> = active_searches.into_iter().map(|h| h.id).collect();
    Ok(Json(search_ids))
}

/// Cancel a search
pub async fn cancel_search(
    Path(search_id): Path<String>,
    State(state): State<crate::AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.file_search_manager
        .cancel_search(&search_id)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to cancel search: {}", e)))?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Search cancelled"
    })))
}

/// Get current search configuration
pub async fn get_search_config(
    State(state): State<crate::AppState>,
) -> Result<Json<SearchConfigResponse>, AppError> {
    let cli_tools = check_cli_tools_availability().await;
    
    let response = SearchConfigResponse {
        default_mode: format!("{:?}", state.file_search_manager.config.default_search_mode),
        max_results: state.file_search_manager.config.file_search_config.max_results,
        enable_suggestions: state.file_search_manager.config.enable_search_suggestions,
        available_modes: vec![
            "RustEngine".to_string(),
            "CliOnly".to_string(),
            "Hybrid".to_string(),
            "Auto".to_string(),
        ],
        cli_tools_available: cli_tools,
    };

    Ok(Json(response))
}

/// Update search configuration
pub async fn update_search_config(
    State(_state): State<crate::AppState>,
    Json(_config): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Note: In a real implementation, you'd want to make the config mutable
    // For now, we'll just return success
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Configuration updated"
    })))
}

// Helper functions

async fn detect_project_type(dir: &std::path::Path) -> Option<String> {
    if dir.join("Cargo.toml").exists() {
        Some("rust".to_string())
    } else if dir.join("package.json").exists() {
        Some("javascript".to_string())
    } else if dir.join("pyproject.toml").exists() || dir.join("requirements.txt").exists() {
        Some("python".to_string())
    } else if dir.join("go.mod").exists() {
        Some("go".to_string())
    } else if dir.join("pom.xml").exists() || dir.join("build.gradle").exists() {
        Some("java".to_string())
    } else {
        None
    }
}

fn analyze_search_intent(prompt: &str) -> SearchIntent {
    let prompt_lower = prompt.to_lowercase();
    
    if prompt_lower.contains("find") || prompt_lower.contains("locate") || prompt_lower.contains("where") {
        if prompt_lower.contains("content") || prompt_lower.contains("text") || prompt_lower.contains("contains") {
            SearchIntent::FindContent
        } else {
            SearchIntent::FindFile
        }
    } else if prompt_lower.contains("explore") || prompt_lower.contains("browse") || prompt_lower.contains("list") {
        SearchIntent::Explore
    } else if prompt_lower.contains("debug") || prompt_lower.contains("error") || prompt_lower.contains("bug") {
        SearchIntent::Debug
    } else if prompt_lower.contains("refactor") || prompt_lower.contains("rename") || prompt_lower.contains("move") {
        SearchIntent::Refactor
    } else {
        SearchIntent::Unknown
    }
}

fn generate_query_suggestions(prompt: &str, intent: &SearchIntent) -> Vec<String> {
    let mut suggestions = Vec::new();
    
    // Extract potential file names or patterns from the prompt
    let words: Vec<&str> = prompt.split_whitespace().collect();
    
    for word in &words {
        // Look for file-like patterns
        if word.contains('.') && word.len() > 3 {
            suggestions.push(word.to_string());
        }
        
        // Look for camelCase or snake_case identifiers
        if word.len() > 3 && (word.contains('_') || word.chars().any(|c| c.is_uppercase())) {
            suggestions.push(word.to_string());
        }
    }
    
    // Add intent-specific suggestions
    match intent {
        SearchIntent::FindFile => {
            suggestions.push("*.rs".to_string());
            suggestions.push("*.js".to_string());
            suggestions.push("*.ts".to_string());
        }
        SearchIntent::FindContent => {
            if let Some(first_word) = words.first() {
                suggestions.push(format!("\"{}\"", first_word));
            }
        }
        SearchIntent::Debug => {
            suggestions.push("error".to_string());
            suggestions.push("panic".to_string());
            suggestions.push("unwrap".to_string());
        }
        _ => {}
    }
    
    suggestions.truncate(5); // Limit to 5 suggestions
    suggestions
}

async fn check_cli_tools_availability() -> HashMap<String, bool> {
    let mut tools = HashMap::new();
    
    // Check for ripgrep
    tools.insert("ripgrep".to_string(), 
        tokio::process::Command::new("rg")
            .arg("--version")
            .output()
            .await
            .map(|output| output.status.success())
            .unwrap_or(false)
    );
    
    // Check for fd
    tools.insert("fd".to_string(),
        tokio::process::Command::new("fd")
            .arg("--version")
            .output()
            .await
            .map(|output| output.status.success())
            .unwrap_or(false)
    );
    
    // Check for fzf
    tools.insert("fzf".to_string(),
        tokio::process::Command::new("fzf")
            .arg("--version")
            .output()
            .await
            .map(|output| output.status.success())
            .unwrap_or(false)
    );
    
    tools
}

/// Request body for opening a file location
#[derive(Debug, Deserialize)]
pub struct OpenFileRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct WriteFileRequest {
    pub path: String,
    pub content: String,
    pub append: Option<bool>,
}

/// Open file location in the system file explorer
pub async fn open_file_location(
    Json(request): Json<OpenFileRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = PathBuf::from(&request.path);
    
    // Ensure we have an absolute path
    let absolute_path = if path.is_absolute() {
        path
    } else {
        // If relative, try to resolve from home directory
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
            .join(&path)
    };
    
    tracing::info!("Opening file location: {:?}", absolute_path);
    
    // Platform-specific file explorer command
    #[cfg(target_os = "windows")]
    let result = tokio::process::Command::new("explorer")
        .arg(absolute_path.display().to_string())
        .spawn();
    
    #[cfg(target_os = "macos")]
    let result = tokio::process::Command::new("open")
        .arg(&absolute_path)
        .spawn();
    
    #[cfg(target_os = "linux")]
    let result = {
        // Try xdg-open first, then fall back to common file managers
        let xdg_result = tokio::process::Command::new("xdg-open")
            .arg(&absolute_path)
            .spawn();
        
        if xdg_result.is_err() {
            // Try nautilus (GNOME)
            let nautilus_result = tokio::process::Command::new("nautilus")
                .arg(&absolute_path)
                .spawn();
            
            if nautilus_result.is_err() {
                // Try dolphin (KDE)
                tokio::process::Command::new("dolphin")
                    .arg(&absolute_path)
                    .spawn()
            } else {
                nautilus_result
            }
        } else {
            xdg_result
        }
    };
    
    match result {
        Ok(_) => Ok(Json(serde_json::json!({
            "success": true,
            "message": format!("Opened file location: {}", absolute_path.display())
        }))),
        Err(e) => Err(AppError::Internal(format!("Failed to open file location: {}", e)))
    }
}

/// Reveal and select a file in the system file explorer
pub async fn reveal_file_in_explorer(
    Json(request): Json<OpenFileRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = PathBuf::from(&request.path);
    
    // Ensure we have an absolute path and normalize it
    let absolute_path = if path.is_absolute() {
        path
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
            .join(&path)
    };
    
    // Canonicalize to get the real path (resolves symlinks, normalizes separators)
    let absolute_path = absolute_path.canonicalize().unwrap_or(absolute_path);
    
    tracing::info!("Revealing file in explorer: {:?}", absolute_path);
    
    // Platform-specific command to reveal and select file
    #[cfg(target_os = "windows")]
    let result = {
        // On Windows, use explorer.exe /select,<path>
        // The path must use backslashes and be passed as a single argument with /select,
        let path_str = absolute_path.display().to_string().replace("/", "\\");
        tracing::info!("Windows explorer command: explorer /select,{}", path_str);
        tokio::process::Command::new("explorer")
            .arg(format!("/select,{}", path_str))
            .spawn()
    };
    
    #[cfg(target_os = "macos")]
    let result = tokio::process::Command::new("open")
        .arg("-R")  // Reveal in Finder
        .arg(&absolute_path)
        .spawn();
    
    #[cfg(target_os = "linux")]
    let result = {
        // On Linux, most file managers don't support selecting a file
        // We'll open the parent directory instead
        let parent = absolute_path.parent()
            .unwrap_or(&absolute_path)
            .to_path_buf();
        
        // Try dbus method first (works with Nautilus, Dolphin, etc.)
        let dbus_result = tokio::process::Command::new("dbus-send")
            .args([
                "--session",
                "--dest=org.freedesktop.FileManager1",
                "--type=method_call",
                "/org/freedesktop/FileManager1",
                "org.freedesktop.FileManager1.ShowItems",
                &format!("array:string:file://{}", absolute_path.display()),
                "string:",
            ])
            .spawn();
        
        if dbus_result.is_err() {
            // Fallback: just open parent directory
            tokio::process::Command::new("xdg-open")
                .arg(&parent)
                .spawn()
        } else {
            dbus_result
        }
    };
    
    match result {
        Ok(_) => Ok(Json(serde_json::json!({
            "success": true,
            "message": format!("Revealed file: {}", absolute_path.display())
        }))),
        Err(e) => Err(AppError::Internal(format!("Failed to reveal file: {}", e)))
    }
}

/// Show file properties dialog
pub async fn show_file_properties(
    Json(request): Json<OpenFileRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = PathBuf::from(&request.path);
    
    let absolute_path = if path.is_absolute() {
        path
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
            .join(&path)
    };
    
    tracing::info!("Showing properties for: {:?}", absolute_path);
    
    #[cfg(target_os = "windows")]
    let result = {
        // Windows: Use shell32.dll to show properties
        // Don't use canonicalize() as it adds \\?\ prefix which breaks PowerShell
        let path_str = absolute_path.display().to_string()
            .replace("/", "\\")
            .replace("\\\\?\\", ""); // Remove UNC prefix if present
        
        tracing::info!("Windows properties path: {}", path_str);
        
        // Use a simpler approach with explorer.exe properties
        tokio::process::Command::new("cmd")
            .args([
                "/c",
                "start",
                "",
                "explorer.exe",
                &format!("/select,\"{}\"", path_str)
            ])
            .spawn()
    };
    
    #[cfg(target_os = "macos")]
    let result = {
        // macOS: Use AppleScript to show info window
        let path_str = absolute_path.display().to_string();
        tokio::process::Command::new("osascript")
            .args([
                "-e",
                &format!(
                    "tell application \"Finder\" to open information window of (POSIX file \"{}\" as alias)",
                    path_str
                )
            ])
            .spawn()
    };
    
    #[cfg(target_os = "linux")]
    let result = {
        // Linux: Try different file managers' properties commands
        let path_str = absolute_path.display().to_string();
        let nautilus_result = tokio::process::Command::new("nautilus")
            .args(["--properties", &path_str])
            .spawn();
        
        if nautilus_result.is_err() {
            tokio::process::Command::new("dolphin")
                .args(["--properties", &absolute_path.display().to_string()])
                .spawn()
        } else {
            nautilus_result
        }
    };
    
    match result {
        Ok(_) => Ok(Json(serde_json::json!({
            "success": true,
            "message": format!("Showing properties for: {}", absolute_path.display())
        }))),
        Err(e) => Err(AppError::Internal(format!("Failed to show properties: {}", e)))
    }
}

/// Open "Open with" dialog
pub async fn open_with_dialog(
    Json(request): Json<OpenFileRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = PathBuf::from(&request.path);
    
    let absolute_path = if path.is_absolute() {
        path
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
            .join(&path)
    };
    
    tracing::info!("Opening 'Open with' dialog for: {:?}", absolute_path);
    
    #[cfg(target_os = "windows")]
    let result = {
        // Windows: Use rundll32 to show "Open with" dialog
        let path_str = absolute_path.display().to_string()
            .replace("/", "\\")
            .replace("\\\\?\\", ""); // Remove UNC prefix if present
        
        tracing::info!("Windows open-with path: {}", path_str);
        
        tokio::process::Command::new("rundll32")
            .args(["shell32.dll,OpenAs_RunDLL", &path_str])
            .spawn()
    };
    
    #[cfg(target_os = "macos")]
    let result = {
        // macOS: Reveal in Finder (user can then right-click and choose "Open With")
        let path_str = absolute_path.display().to_string();
        tokio::process::Command::new("open")
            .args(["-R", &path_str])
            .spawn()
    };
    
    #[cfg(target_os = "linux")]
    let result = {
        // Linux: Try to use xdg-open or show in file manager
        let path_str = absolute_path.display().to_string();
        tokio::process::Command::new("xdg-open")
            .arg(&path_str)
            .spawn()
    };
    
    match result {
        Ok(_) => Ok(Json(serde_json::json!({
            "success": true,
            "message": format!("Opened 'Open with' dialog for: {}", absolute_path.display())
        }))),
        Err(e) => Err(AppError::Internal(format!("Failed to open 'Open with' dialog: {}", e)))
    }
}

/// Write file content
pub async fn write_file(
    State(state): State<crate::AppState>,
    Json(request): Json<WriteFileRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = PathBuf::from(&request.path);
    
    let absolute_path = if path.is_absolute() {
        path
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
            .join(&path)
    };

    if let Some(parent) = absolute_path.parent() {
        tokio::fs::create_dir_all(parent).await
            .map_err(|e| AppError::Internal(format!("Failed to create directories: {}", e)))?;
    }

    if request.append.unwrap_or(false) {
        use tokio::io::AsyncWriteExt;
        let mut file = tokio::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&absolute_path)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to open file for appending: {}", e)))?;
        
        file.write_all(request.content.as_bytes()).await
            .map_err(|e| AppError::Internal(format!("Failed to append to file: {}", e)))?;
    } else {
        tokio::fs::write(&absolute_path, &request.content).await
            .map_err(|e| AppError::Internal(format!("Failed to write file: {}", e)))?;
    }

    // Log to history
    state.history_manager.add_entry(
        absolute_path.display().to_string(),
        ActivityType::FileWrite
    ).await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("File written: {}", absolute_path.display())
    })))
}

/// Get recent files from history
pub async fn get_recent_files(
    State(state): State<crate::AppState>,
) -> Result<Json<Vec<HistoryEntry>>, AppError> {
    let recent = state.history_manager.get_recent(50).await;
    Ok(Json(recent))
}

/// Read file content endpoint
pub async fn read_file_content(
    State(state): State<crate::AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, AppError> {
    let path_str = params.get("path")
        .ok_or_else(|| AppError::BadRequest("Missing 'path' parameter".to_string()))?;
    
    let path = PathBuf::from(path_str);
    
    let absolute_path = if path.is_absolute() {
        path
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
            .join(&path)
    };
    
    tracing::info!("Reading file content: {:?}", absolute_path);
    
    // Check if file exists
    if !absolute_path.exists() {
        return Err(AppError::NotFound(format!("File not found: {}", absolute_path.display())));
    }
    
    // Check if it's a file (not a directory)
    if !absolute_path.is_file() {
        return Err(AppError::BadRequest(format!("Path is not a file: {}", absolute_path.display())));
    }
    
    // Read file content
    match tokio::fs::read_to_string(&absolute_path).await {
        Ok(content) => {
            // Log to history
            state.history_manager.add_entry(
                absolute_path.display().to_string(),
                ActivityType::FileRead
            ).await;

            Ok(Json(serde_json::json!({
                "success": true,
                "path": absolute_path.display().to_string(),
                "content": content,
                "size": content.len()
            })))
        }
        Err(e) => {
            tracing::error!("Failed to read file {:?}: {}", absolute_path, e);
            Err(AppError::Internal(format!("Failed to read file: {}", e)))
        }
    }
}

/// Read image file as binary data
pub async fn read_image_file(
    Query(params): Query<HashMap<String, String>>,
) -> Result<axum::response::Response, AppError> {
    use axum::response::IntoResponse;
    use axum::http::header;
    
    let path_str = params.get("path")
        .ok_or_else(|| AppError::BadRequest("Missing 'path' parameter".to_string()))?;
    
    let path = PathBuf::from(path_str);
    
    let absolute_path = if path.is_absolute() {
        path
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
            .join(&path)
    };
    
    tracing::info!("Reading image file: {:?}", absolute_path);
    
    // Check if file exists
    if !absolute_path.exists() {
        return Err(AppError::NotFound(format!("File not found: {}", absolute_path.display())));
    }
    
    // Check if it's a file (not a directory)
    if !absolute_path.is_file() {
        return Err(AppError::BadRequest(format!("Path is not a file: {}", absolute_path.display())));
    }
    
    // Determine MIME type from extension
    let mime_type = match absolute_path.extension().and_then(|e| e.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("bmp") => "image/bmp",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    };
    
    // Read file as binary
    match tokio::fs::read(&absolute_path).await {
        Ok(bytes) => {
            Ok((
                [(header::CONTENT_TYPE, mime_type)],
                bytes
            ).into_response())
        }
        Err(e) => {
            tracing::error!("Failed to read image file {:?}: {}", absolute_path, e);
            Err(AppError::Internal(format!("Failed to read image file: {}", e)))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_search_intent() {
        assert!(matches!(analyze_search_intent("find the main.rs file"), SearchIntent::FindFile));
        assert!(matches!(analyze_search_intent("search for content containing error"), SearchIntent::FindContent));
        assert!(matches!(analyze_search_intent("debug this issue"), SearchIntent::Debug));
        assert!(matches!(analyze_search_intent("explore the codebase"), SearchIntent::Explore));
    }

    #[test]
    fn test_generate_query_suggestions() {
        let suggestions = generate_query_suggestions("find main.rs file", &SearchIntent::FindFile);
        assert!(suggestions.contains(&"main.rs".to_string()));
        
        let suggestions = generate_query_suggestions("search for getUserData function", &SearchIntent::FindContent);
        assert!(suggestions.contains(&"getUserData".to_string()));
    }
}