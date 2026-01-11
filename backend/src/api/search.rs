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
    SearchMode,
};
use crate::error::AppError;

/// API endpoints for file search functionality
pub fn search_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/search/files", get(search_files))
        .route("/search/content", get(search_content))
        .route("/search/suggest", post(get_search_suggestions))
        .route("/search/history", get(get_search_history))
        .route("/search/active", get(get_active_searches))
        .route("/search/:search_id/cancel", post(cancel_search))
        .route("/search/config", get(get_search_config))
        .route("/search/config", post(update_search_config))
        .route("/files/open", post(open_file_location))
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

/// File search endpoint
pub async fn search_files(
    Query(params): Query<FileSearchQuery>,
    State(state): State<crate::AppState>,
) -> Result<Json<UnifiedSearchResults>, AppError> {
    // Use custom search path if provided, otherwise default to user's home directory
    let search_dir = if let Some(ref custom_path) = params.search_path {
        PathBuf::from(custom_path)
    } else {
        // Default to user's home directory for broader search
        dirs::home_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
    };
    
    // Ensure search directory is absolute (canonicalize if possible)
    let search_dir = search_dir.canonicalize().unwrap_or(search_dir);

    // Parse search mode
    let _mode = match params.mode.as_deref() {
        Some("rust") => Some(SearchMode::RustEngine),
        Some("cli") => Some(SearchMode::CliOnly),
        Some("hybrid") => Some(SearchMode::Hybrid),
        Some("auto") => Some(SearchMode::Auto),
        _ => None,
    };

    // Create search context
    let context = SearchContext {
        current_file: None,
        recent_files: vec![],
        project_type: detect_project_type(&search_dir).await,
        search_intent: SearchIntent::FindFile,
    };

    // Note: For now we use the existing manager configuration
    // In a production system, you'd want to create a new manager with the specified mode

    let results = state.file_search_manager
        .search(&params.q, &search_dir, Some(context))
        .await
        .map_err(|e| AppError::Internal(format!("Search failed: {}", e)))?;

    Ok(Json(results))
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