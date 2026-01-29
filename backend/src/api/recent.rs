use axum::extract::Query;
use axum::{Json, response::Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentFile {
    pub name: String,
    pub path: String,
    pub modified: u64,
    pub size: u64,
    pub is_dir: bool,
    pub source: String, // "downloads", "documents", etc.
}

#[derive(Debug, Deserialize)]
pub struct RecentFilesQuery {
    pub hours: Option<u64>,
    pub limit: Option<usize>,
}

/// Fetch files modified recently in specific system folders
pub async fn get_system_recent_files(
    Query(params): Query<RecentFilesQuery>,
) -> Result<Json<Vec<RecentFile>>, AppError> {
    let hours = params.hours.unwrap_or(24);
    let limit = params.limit.unwrap_or(20);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let mut recent_files = Vec::new();
    let seconds_limit = hours * 3600;

    // Folders to scan
    let mut scan_dirs = Vec::new();
    if let Some(download_dir) = dirs::download_dir() {
        scan_dirs.push((download_dir, "Downloaded"));
    }
    if let Some(doc_dir) = dirs::document_dir() {
        scan_dirs.push((doc_dir, "Documents"));
    }

    for (dir, source_label) in scan_dirs {
        let entries = scan_directory(&dir, seconds_limit, now, source_label);
        recent_files.extend(entries);
    }

    // Sort by modification time (newest first)
    recent_files.sort_by(|a, b| b.modified.cmp(&a.modified));
    recent_files.truncate(limit);

    Ok(Json(recent_files))
}

fn scan_directory(dir: &Path, seconds_limit: u64, now: u64, source: &str) -> Vec<RecentFile> {
    let mut results = Vec::new();

    // Use WalkDir with depth 1 or 2 to avoid massive scans
    for entry in WalkDir::new(dir)
        .max_depth(2)
        .into_iter()
        .filter_map(|e| e.ok()) 
    {
        let path = entry.path();
        
        // Skip hidden files and common noise
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || 
           name.ends_with(".tmp") || 
           name.ends_with(".crdownload") || 
           name.ends_with(".part") ||
           name == "node_modules" ||
           name == "target" ||
           name == "DS_Store" {
            continue;
        }

        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                    let mod_secs = duration.as_secs();
                    if now - mod_secs < seconds_limit {
                        results.push(RecentFile {
                            name,
                            path: path.display().to_string(),
                            modified: mod_secs,
                            size: metadata.len(),
                            is_dir: metadata.is_dir(),
                            source: source.to_string(),
                        });
                    }
                }
            }
        }
        
        // Safety break if a directory is too huge
        if results.len() > 100 { break; }
    }

    results
}
