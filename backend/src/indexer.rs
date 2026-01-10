use walkdir::WalkDir;
use notify::{Watcher, RecursiveMode, Event, EventKind};
use tokio::sync::mpsc;
use std::path::Path;
use std::fs;
use std::time::SystemTime;
use chrono::{DateTime, Utc};
use sha2::{Sha256, Digest};
use uuid::Uuid;
use mime_guess::from_path;
use encoding_rs::UTF_8;
use crate::db::{Database, FileRecord, ContentChunk};
use crate::error::AppError;
use crate::config::AppConfig;

#[derive(Clone)]
pub struct FileIndexer {
    db: Database,
    config: AppConfig,
    is_running: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

impl FileIndexer {
    pub async fn new(db: Database) -> Result<Self, AppError> {
        let config = AppConfig::new()?;
        
        Ok(Self {
            db,
            config,
            is_running: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
        })
    }

    pub async fn is_running(&self) -> bool {
        self.is_running.load(std::sync::atomic::Ordering::Relaxed)
    }

    pub async fn start_full_index(&self) -> Result<(), AppError> {
        self.is_running.store(true, std::sync::atomic::Ordering::Relaxed);
        
        for path in &self.config.index_paths {
            if Path::new(path).exists() {
                self.index_directory(path).await?;
            }
        }
        
        self.is_running.store(false, std::sync::atomic::Ordering::Relaxed);
        Ok(())
    }

    async fn index_directory(&self, root_path: &str) -> Result<(), AppError> {
        for entry in WalkDir::new(root_path)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let path = entry.path();
                
                if self.should_exclude_file(path) {
                    continue;
                }

                if let Err(e) = self.index_file(path).await {
                    tracing::warn!("Failed to index file {:?}: {}", path, e);
                }
            }
        }
        Ok(())
    }

    fn should_exclude_file(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        
        for pattern in &self.config.excluded_patterns {
            if pattern.contains('*') {
                // Simple glob matching
                if pattern.starts_with("*.") {
                    let ext = &pattern[2..];
                    if path_str.ends_with(ext) {
                        return true;
                    }
                }
            } else if path_str.contains(pattern) {
                return true;
            }
        }
        
        false
    }

    async fn index_file(&self, path: &Path) -> Result<(), AppError> {
        let metadata = fs::metadata(path)?;
        let modified = metadata.modified()?;
        let size = metadata.len() as i64;
        
        let path_str = path.to_string_lossy().to_string();
        let name = path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Check if file is already indexed and up to date
        if let Some(existing) = self.db.get_file_by_path(&path_str).await? {
            let existing_modified: SystemTime = existing.modified_at.into();
            if existing_modified >= modified {
                return Ok(());
            }
        }

        // Read and hash file content
        let content = self.extract_text_content(path).await?;
        let content_hash = self.calculate_hash(&content);
        let mime_type = from_path(path).first_or_octet_stream().to_string();

        let file_id = Uuid::new_v4().to_string();
        let file_record = FileRecord {
            id: file_id.clone(),
            path: path_str,
            name,
            size,
            modified_at: DateTime::<Utc>::from(modified),
            content_hash,
            mime_type,
            indexed_at: Utc::now(),
        };

        // Insert file record
        self.db.insert_file(&file_record).await?;

        // Create content chunks
        let chunks = self.create_chunks(&content, &file_id);
        for chunk in chunks {
            self.db.insert_chunk(&chunk).await?;
        }

        tracing::debug!("Indexed file: {}", file_record.path);
        Ok(())
    }

    async fn extract_text_content(&self, path: &Path) -> Result<String, AppError> {
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "txt" | "md" | "rs" | "js" | "ts" | "py" | "html" | "css" | "json" | "xml" | "yml" | "yaml" => {
                self.read_text_file(path).await
            }
            "pdf" => self.extract_pdf_text(path).await,
            "docx" => self.extract_docx_text(path).await,
            _ => Ok(String::new()), // Skip binary files
        }
    }

    async fn read_text_file(&self, path: &Path) -> Result<String, AppError> {
        let bytes = fs::read(path)?;
        let (content, _, _) = UTF_8.decode(&bytes);
        Ok(content.to_string())
    }

    async fn extract_pdf_text(&self, path: &Path) -> Result<String, AppError> {
        match pdf_extract::extract_text(path) {
            Ok(text) => Ok(text),
            Err(_) => Ok(String::new()), // Skip problematic PDFs
        }
    }

    async fn extract_docx_text(&self, _path: &Path) -> Result<String, AppError> {
        // Simplified DOCX extraction - in production, use proper library
        Ok(String::new())
    }

    fn calculate_hash(&self, content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn create_chunks(&self, content: &str, file_id: &str) -> Vec<ContentChunk> {
        const CHUNK_SIZE: usize = 1000;
        const OVERLAP: usize = 200;

        let mut chunks = Vec::new();
        let mut start = 0;
        let mut chunk_index = 0;

        while start < content.len() {
            let end = std::cmp::min(start + CHUNK_SIZE, content.len());
            let chunk_content = content[start..end].to_string();

            if !chunk_content.trim().is_empty() {
                chunks.push(ContentChunk {
                    id: Uuid::new_v4().to_string(),
                    file_id: file_id.to_string(),
                    chunk_index,
                    content: chunk_content,
                    embedding: None, // Will be generated later
                });
                chunk_index += 1;
            }

            if end == content.len() {
                break;
            }

            start = end - OVERLAP;
        }

        chunks
    }

    pub async fn start_file_watcher(&self) -> Result<(), AppError> {
        let (tx, mut rx) = mpsc::channel(100);
        
        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.try_send(event);
            }
        })?;

        for path in &self.config.index_paths {
            if Path::new(path).exists() {
                watcher.watch(Path::new(path), RecursiveMode::Recursive)?;
            }
        }

        let _db = self.db.clone();
        let indexer = self.clone();
        
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for path in event.paths {
                            if path.is_file() && !indexer.should_exclude_file(&path) {
                                if let Err(e) = indexer.index_file(&path).await {
                                    tracing::warn!("Failed to index modified file {:?}: {}", path, e);
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }
}
