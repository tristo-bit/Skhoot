use sqlx::{SqlitePool, Row};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use crate::error::AppError;

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileRecord {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: i64,
    pub modified_at: DateTime<Utc>,
    pub content_hash: String,
    pub mime_type: String,
    pub indexed_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContentChunk {
    pub id: String,
    pub file_id: String,
    pub chunk_index: i32,
    pub content: String,
    pub embedding: Option<Vec<f32>>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, AppError> {
        let pool = SqlitePool::connect(database_url).await?;
        
        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;
        
        Ok(Self { pool })
    }

    pub async fn is_healthy(&self) -> bool {
        sqlx::query("SELECT 1").fetch_one(&self.pool).await.is_ok()
    }

    pub async fn insert_file(&self, file: &FileRecord) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO files 
            (id, path, name, size, modified_at, content_hash, mime_type, indexed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&file.id)
        .bind(&file.path)
        .bind(&file.name)
        .bind(file.size)
        .bind(file.modified_at.to_rfc3339())
        .bind(&file.content_hash)
        .bind(&file.mime_type)
        .bind(file.indexed_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    pub async fn insert_chunk(&self, chunk: &ContentChunk) -> Result<(), AppError> {
        let embedding_blob = chunk.embedding.as_ref().map(|e| {
            e.iter().flat_map(|f| f.to_le_bytes()).collect::<Vec<u8>>()
        });

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO content_chunks 
            (id, file_id, chunk_index, content, embedding)
            VALUES (?, ?, ?, ?, ?)
            "#
        )
        .bind(&chunk.id)
        .bind(&chunk.file_id)
        .bind(chunk.chunk_index)
        .bind(&chunk.content)
        .bind(embedding_blob)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    pub async fn search_by_content(&self, query: &str, limit: usize) -> Result<Vec<FileRecord>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT DISTINCT f.id, f.path, f.name, f.size, f.modified_at, f.content_hash, f.mime_type, f.indexed_at
            FROM files f
            JOIN content_chunks c ON f.id = c.file_id
            WHERE c.content LIKE ?
            ORDER BY f.modified_at DESC
            LIMIT ?
            "#
        )
        .bind(format!("%{}%", query))
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        let files = rows.into_iter().map(|row| FileRecord {
            id: row.get("id"),
            path: row.get("path"),
            name: row.get("name"),
            size: row.get("size"),
            modified_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("modified_at")).unwrap().with_timezone(&Utc),
            content_hash: row.get("content_hash"),
            mime_type: row.get("mime_type"),
            indexed_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("indexed_at")).unwrap().with_timezone(&Utc),
        }).collect();

        Ok(files)
    }

    pub async fn get_file_by_path(&self, path: &str) -> Result<Option<FileRecord>, AppError> {
        let row = sqlx::query(
            "SELECT id, path, name, size, modified_at, content_hash, mime_type, indexed_at FROM files WHERE path = ?"
        )
        .bind(path)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(FileRecord {
                id: row.get("id"),
                path: row.get("path"),
                name: row.get("name"),
                size: row.get("size"),
                modified_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("modified_at")).unwrap().with_timezone(&Utc),
                content_hash: row.get("content_hash"),
                mime_type: row.get("mime_type"),
                indexed_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("indexed_at")).unwrap().with_timezone(&Utc),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_chunks_by_file_id(&self, file_id: &str) -> Result<Vec<ContentChunk>, AppError> {
        let rows = sqlx::query(
            "SELECT id, file_id, chunk_index, content, embedding FROM content_chunks WHERE file_id = ? ORDER BY chunk_index"
        )
        .bind(file_id)
        .fetch_all(&self.pool)
        .await?;

        let chunks = rows.into_iter().map(|row| {
            let embedding = row.get::<Option<Vec<u8>>, _>("embedding").map(|blob| {
                blob.chunks_exact(4)
                    .map(|bytes| f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
                    .collect()
            });

            ContentChunk {
                id: row.get("id"),
                file_id: row.get("file_id"),
                chunk_index: row.get("chunk_index"),
                content: row.get("content"),
                embedding,
            }
        }).collect();

        Ok(chunks)
    }
}
