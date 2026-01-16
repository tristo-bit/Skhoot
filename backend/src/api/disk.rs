//! Disk analysis and cleanup API routes
//! Provides endpoints for disk usage analysis, cleanup suggestions, and storage management

use axum::{
    extract::{Query, State},
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::collections::HashMap;

use crate::error::AppError;

/// API routes for disk management
pub fn disk_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/disk/info", get(get_disk_info))
        .route("/disk/analyze", get(analyze_disk))
        .route("/disk/cleanup-suggestions", get(get_cleanup_suggestions))
        .route("/disk/categories", get(get_storage_categories))
}

// ============================================================================
// Types
// ============================================================================

/// Disk information response
#[derive(Debug, Serialize)]
pub struct DiskInfoResponse {
    pub disks: Vec<DiskInfo>,
}

#[derive(Debug, Serialize)]
pub struct DiskInfo {
    pub id: String,
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub usage_percentage: f64,
    pub disk_type: String, // "internal", "external", "network"
}

/// Query parameters for disk analysis
#[derive(Debug, Deserialize)]
pub struct AnalyzeQuery {
    pub path: Option<String>,      // Path to analyze (defaults to home)
    pub max_depth: Option<usize>,  // Maximum directory depth
    pub top_n: Option<usize>,      // Number of top consumers to return
}

/// Disk analysis response
#[derive(Debug, Serialize)]
pub struct DiskAnalysisResponse {
    pub total_size: u64,
    pub total_size_formatted: String,
    pub file_count: usize,
    pub dir_count: usize,
    pub top_consumers: Vec<SpaceConsumer>,
    pub analysis_time_ms: u64,
}

#[derive(Debug, Serialize)]
pub struct SpaceConsumer {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub size_formatted: String,
    pub percentage: f64,
    pub is_directory: bool,
}

/// Cleanup suggestion response
#[derive(Debug, Serialize)]
pub struct CleanupSuggestionsResponse {
    pub suggestions: Vec<CleanupSuggestion>,
    pub total_reclaimable: u64,
    pub total_reclaimable_formatted: String,
}

#[derive(Debug, Serialize)]
pub struct CleanupSuggestion {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub size_formatted: String,
    pub category: String,       // "cache", "temp", "downloads", "old_projects", "duplicates"
    pub safety_level: String,   // "safe", "review", "risky"
    pub description: String,
    pub consequence: String,
    pub last_accessed: Option<String>,
}

/// Storage categories response
#[derive(Debug, Serialize)]
pub struct StorageCategoriesResponse {
    pub categories: Vec<StorageCategory>,
    pub total_size: u64,
    pub total_size_formatted: String,
}

#[derive(Debug, Serialize)]
pub struct StorageCategory {
    pub name: String,
    pub size: u64,
    pub size_formatted: String,
    pub file_count: usize,
    pub percentage: f64,
    pub color: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.1} TB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

fn get_file_category(path: &std::path::Path) -> &'static str {
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    match extension.as_str() {
        // Documents
        "pdf" | "doc" | "docx" | "txt" | "rtf" | "odt" | "xls" | "xlsx" | "ppt" | "pptx" => "Documents",
        // Images
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "svg" | "webp" | "ico" | "tiff" | "raw" => "Images",
        // Videos
        "mp4" | "avi" | "mkv" | "mov" | "wmv" | "flv" | "webm" | "m4v" => "Videos",
        // Audio
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "wma" | "m4a" => "Audio",
        // Code
        "rs" | "js" | "ts" | "py" | "java" | "cpp" | "c" | "h" | "go" | "rb" | "php" | "swift" | "kt" => "Code",
        // Archives
        "zip" | "tar" | "gz" | "rar" | "7z" | "bz2" | "xz" => "Archives",
        // Other
        _ => "Other",
    }
}

// ============================================================================
// Endpoints
// ============================================================================

/// Get system disk information
pub async fn get_disk_info(
    State(_state): State<crate::AppState>,
) -> Result<Json<DiskInfoResponse>, AppError> {
    let mut disks = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        // Use wmic to get disk info on Windows
        let output = tokio::process::Command::new("wmic")
            .args(["logicaldisk", "get", "caption,size,freespace,drivetype", "/format:csv"])
            .output()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to get disk info: {}", e)))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 5 {
                let name = parts[1].trim();
                let drive_type: u32 = parts[2].trim().parse().unwrap_or(0);
                let free: u64 = parts[3].trim().parse().unwrap_or(0);
                let total: u64 = parts[4].trim().parse().unwrap_or(0);
                
                if total > 0 {
                    let used = total - free;
                    let disk_type = match drive_type {
                        2 => "removable",
                        3 => "internal",
                        4 => "network",
                        5 => "optical",
                        _ => "unknown",
                    };
                    
                    disks.push(DiskInfo {
                        id: format!("disk-{}", name.replace(":", "")),
                        name: name.to_string(),
                        mount_point: name.to_string(),
                        total_bytes: total,
                        used_bytes: used,
                        free_bytes: free,
                        usage_percentage: (used as f64 / total as f64) * 100.0,
                        disk_type: disk_type.to_string(),
                    });
                }
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        let output = tokio::process::Command::new("df")
            .args(["-b"])  // Use 512-byte blocks for accuracy
            .output()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to get disk info: {}", e)))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 9 {
                let filesystem = parts[0];
                let total_blocks: u64 = parts[1].parse().unwrap_or(0);
                let used_blocks: u64 = parts[2].parse().unwrap_or(0);
                let free_blocks: u64 = parts[3].parse().unwrap_or(0);
                let mount_point = parts[8];
                
                // Only include real disks (skip system volumes)
                if mount_point == "/" || mount_point.starts_with("/Volumes/") {
                    let total = total_blocks * 512;
                    let used = used_blocks * 512;
                    let free = free_blocks * 512;
                    
                    let name = if mount_point == "/" {
                        "Macintosh HD".to_string()
                    } else {
                        mount_point.split('/').last().unwrap_or("Unknown").to_string()
                    };
                    
                    let disk_type = if filesystem.starts_with("/dev/disk") {
                        if mount_point == "/" { "internal" } else { "external" }
                    } else {
                        "network"
                    };
                    
                    disks.push(DiskInfo {
                        id: format!("disk-{}", mount_point.replace("/", "-")),
                        name,
                        mount_point: mount_point.to_string(),
                        total_bytes: total,
                        used_bytes: used,
                        free_bytes: free,
                        usage_percentage: if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 },
                        disk_type: disk_type.to_string(),
                    });
                }
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let output = tokio::process::Command::new("df")
            .args(["-B1", "--output=source,size,used,avail,target"])
            .output()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to get disk info: {}", e)))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 {
                let filesystem = parts[0];
                let total: u64 = parts[1].parse().unwrap_or(0);
                let used: u64 = parts[2].parse().unwrap_or(0);
                let free: u64 = parts[3].parse().unwrap_or(0);
                let mount_point = parts[4];
                
                // Only include real filesystems
                if filesystem.starts_with("/dev/") && !mount_point.starts_with("/boot") {
                    let name = if mount_point == "/" {
                        "Root".to_string()
                    } else {
                        mount_point.split('/').last().unwrap_or("Unknown").to_string()
                    };
                    
                    disks.push(DiskInfo {
                        id: format!("disk-{}", mount_point.replace("/", "-")),
                        name,
                        mount_point: mount_point.to_string(),
                        total_bytes: total,
                        used_bytes: used,
                        free_bytes: free,
                        usage_percentage: if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 },
                        disk_type: "internal".to_string(),
                    });
                }
            }
        }
    }
    
    Ok(Json(DiskInfoResponse { disks }))
}

/// Analyze disk usage for a path
pub async fn analyze_disk(
    Query(params): Query<AnalyzeQuery>,
    State(_state): State<crate::AppState>,
) -> Result<Json<DiskAnalysisResponse>, AppError> {
    let start_time = std::time::Instant::now();
    
    let search_path = params.path
        .map(PathBuf::from)
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")));
    
    let max_depth = params.max_depth.unwrap_or(3);
    let top_n = params.top_n.unwrap_or(20);
    
    // Use spawn_blocking for filesystem operations
    let analysis = tokio::task::spawn_blocking(move || {
        use walkdir::WalkDir;
        
        let mut total_size: u64 = 0;
        let mut file_count: usize = 0;
        let mut dir_count: usize = 0;
        let mut entries: Vec<(PathBuf, u64, bool)> = Vec::new();
        
        for entry in WalkDir::new(&search_path)
            .max_depth(max_depth)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    let size = metadata.len();
                    total_size += size;
                    file_count += 1;
                    
                    // Only track files larger than 1MB for top consumers
                    if size > 1024 * 1024 {
                        entries.push((entry.path().to_path_buf(), size, false));
                    }
                } else if metadata.is_dir() && entry.depth() == 1 {
                    // Calculate directory sizes for top-level directories
                    dir_count += 1;
                    let dir_size = calculate_dir_size(entry.path());
                    if dir_size > 1024 * 1024 {
                        entries.push((entry.path().to_path_buf(), dir_size, true));
                    }
                }
            }
        }
        
        // Sort by size descending
        entries.sort_by(|a, b| b.1.cmp(&a.1));
        
        let top_consumers: Vec<SpaceConsumer> = entries
            .into_iter()
            .take(top_n)
            .map(|(path, size, is_dir)| {
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Unknown")
                    .to_string();
                
                SpaceConsumer {
                    path: path.display().to_string(),
                    name,
                    size,
                    size_formatted: format_size(size),
                    percentage: if total_size > 0 { (size as f64 / total_size as f64) * 100.0 } else { 0.0 },
                    is_directory: is_dir,
                }
            })
            .collect();
        
        (total_size, file_count, dir_count, top_consumers)
    })
    .await
    .map_err(|e| AppError::Internal(format!("Analysis task failed: {}", e)))?;
    
    let (total_size, file_count, dir_count, top_consumers) = analysis;
    
    Ok(Json(DiskAnalysisResponse {
        total_size,
        total_size_formatted: format_size(total_size),
        file_count,
        dir_count,
        top_consumers,
        analysis_time_ms: start_time.elapsed().as_millis() as u64,
    }))
}

fn calculate_dir_size(path: &std::path::Path) -> u64 {
    use walkdir::WalkDir;
    
    WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

/// Get cleanup suggestions
pub async fn get_cleanup_suggestions(
    State(_state): State<crate::AppState>,
) -> Result<Json<CleanupSuggestionsResponse>, AppError> {
    let home_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    
    let suggestions = tokio::task::spawn_blocking(move || {
        let mut suggestions = Vec::new();
        let mut total_reclaimable: u64 = 0;
        
        // Check common cleanup locations
        let cleanup_paths = get_cleanup_paths(&home_dir);
        
        for (path, name, category, safety, description, consequence) in cleanup_paths {
            if path.exists() {
                let size = calculate_dir_size(&path);
                if size > 1024 * 1024 { // Only suggest if > 1MB
                    total_reclaimable += size;
                    
                    let last_accessed = std::fs::metadata(&path)
                        .ok()
                        .and_then(|m| m.accessed().ok())
                        .map(|t| {
                            let duration = std::time::SystemTime::now()
                                .duration_since(t)
                                .unwrap_or_default();
                            format_duration(duration)
                        });
                    
                    suggestions.push(CleanupSuggestion {
                        id: format!("cleanup-{}", suggestions.len()),
                        name: name.to_string(),
                        path: path.display().to_string(),
                        size,
                        size_formatted: format_size(size),
                        category: category.to_string(),
                        safety_level: safety.to_string(),
                        description: description.to_string(),
                        consequence: consequence.to_string(),
                        last_accessed,
                    });
                }
            }
        }
        
        // Sort by size descending
        suggestions.sort_by(|a, b| b.size.cmp(&a.size));
        
        (suggestions, total_reclaimable)
    })
    .await
    .map_err(|e| AppError::Internal(format!("Cleanup analysis failed: {}", e)))?;
    
    let (suggestions, total_reclaimable) = suggestions;
    
    Ok(Json(CleanupSuggestionsResponse {
        suggestions,
        total_reclaimable,
        total_reclaimable_formatted: format_size(total_reclaimable),
    }))
}

fn get_cleanup_paths(home: &PathBuf) -> Vec<(PathBuf, &'static str, &'static str, &'static str, &'static str, &'static str)> {
    let mut paths = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        paths.push((home.join("AppData/Local/Temp"), "Temp Files", "temp", "safe", 
            "Windows temporary files", "Safe to remove. Apps will recreate as needed."));
        paths.push((home.join("AppData/Local/Microsoft/Windows/INetCache"), "Browser Cache", "cache", "safe",
            "Internet Explorer/Edge cache", "Safe to remove. Will be rebuilt on browsing."));
        paths.push((home.join("Downloads"), "Downloads", "downloads", "review",
            "Downloaded files", "Review before removing - may contain important files."));
    }
    
    #[cfg(target_os = "macos")]
    {
        paths.push((home.join("Library/Caches"), "App Caches", "cache", "safe",
            "Application cache files", "Safe to remove. Apps will recreate as needed."));
        paths.push((home.join(".Trash"), "Trash", "temp", "safe",
            "Files in Trash", "Permanent deletion. Cannot be recovered."));
        paths.push((home.join("Downloads"), "Downloads", "downloads", "review",
            "Downloaded files", "Review before removing - may contain important files."));
        paths.push((home.join("Library/Logs"), "System Logs", "temp", "safe",
            "Application and system logs", "Safe to remove. New logs will be created."));
    }
    
    #[cfg(target_os = "linux")]
    {
        paths.push((home.join(".cache"), "Cache", "cache", "safe",
            "Application cache files", "Safe to remove. Apps will recreate as needed."));
        paths.push((home.join(".local/share/Trash"), "Trash", "temp", "safe",
            "Files in Trash", "Permanent deletion. Cannot be recovered."));
        paths.push((home.join("Downloads"), "Downloads", "downloads", "review",
            "Downloaded files", "Review before removing - may contain important files."));
    }
    
    // Common development directories (cross-platform)
    paths.push((home.join("node_modules"), "Node Modules (Home)", "old_projects", "safe",
        "NPM packages in home directory", "Safe to remove. Run npm install to restore."));
    
    paths
}

fn format_duration(duration: std::time::Duration) -> String {
    let secs = duration.as_secs();
    if secs < 60 {
        "Just now".to_string()
    } else if secs < 3600 {
        format!("{} mins ago", secs / 60)
    } else if secs < 86400 {
        format!("{} hours ago", secs / 3600)
    } else if secs < 604800 {
        format!("{} days ago", secs / 86400)
    } else if secs < 2592000 {
        format!("{} weeks ago", secs / 604800)
    } else {
        format!("{} months ago", secs / 2592000)
    }
}

/// Get storage breakdown by category
pub async fn get_storage_categories(
    Query(params): Query<AnalyzeQuery>,
    State(_state): State<crate::AppState>,
) -> Result<Json<StorageCategoriesResponse>, AppError> {
    let search_path = params.path
        .map(PathBuf::from)
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")));
    
    let max_depth = params.max_depth.unwrap_or(4);
    
    let categories = tokio::task::spawn_blocking(move || {
        use walkdir::WalkDir;
        
        let mut category_sizes: HashMap<&str, (u64, usize)> = HashMap::new();
        let mut total_size: u64 = 0;
        
        for entry in WalkDir::new(&search_path)
            .max_depth(max_depth)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    let size = metadata.len();
                    total_size += size;
                    
                    let category = get_file_category(entry.path());
                    let entry = category_sizes.entry(category).or_insert((0, 0));
                    entry.0 += size;
                    entry.1 += 1;
                }
            }
        }
        
        let colors = [
            ("Documents", "#8b5cf6"),
            ("Images", "#06b6d4"),
            ("Videos", "#f59e0b"),
            ("Audio", "#ec4899"),
            ("Code", "#10b981"),
            ("Archives", "#6366f1"),
            ("Other", "#6b7280"),
        ];
        let color_map: HashMap<&str, &str> = colors.into_iter().collect();
        
        let mut categories: Vec<StorageCategory> = category_sizes
            .into_iter()
            .map(|(name, (size, count))| StorageCategory {
                name: name.to_string(),
                size,
                size_formatted: format_size(size),
                file_count: count,
                percentage: if total_size > 0 { (size as f64 / total_size as f64) * 100.0 } else { 0.0 },
                color: color_map.get(name).unwrap_or(&"#6b7280").to_string(),
            })
            .collect();
        
        // Sort by size descending
        categories.sort_by(|a, b| b.size.cmp(&a.size));
        
        (categories, total_size)
    })
    .await
    .map_err(|e| AppError::Internal(format!("Category analysis failed: {}", e)))?;
    
    let (categories, total_size) = categories;
    
    Ok(Json(StorageCategoriesResponse {
        categories,
        total_size,
        total_size_formatted: format_size(total_size),
    }))
}
