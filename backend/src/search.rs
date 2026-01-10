use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::db::{Database, FileRecord};
use crate::ai::AIManager;
use crate::error::AppError;

#[derive(Clone)]
pub struct SearchEngine {
    db: Database,
    ai_manager: AIManager,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub file: FileRecord,
    pub score: f32,
    pub snippet: String,
    pub match_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total_count: usize,
    pub query: String,
    pub search_time_ms: u64,
}

impl SearchEngine {
    pub async fn new(db: Database, ai_manager: AIManager) -> Result<Self, AppError> {
        Ok(Self { db, ai_manager })
    }

    pub async fn search(&self, query: &str, limit: usize) -> Result<serde_json::Value, AppError> {
        let start_time = std::time::Instant::now();
        
        // Multi-approach search
        let mut all_results = Vec::new();
        
        // 1. Direct content search
        let content_results = self.search_by_content(query, limit * 2).await?;
        all_results.extend(content_results);
        
        // 2. Filename search
        let filename_results = self.search_by_filename(query, limit).await?;
        all_results.extend(filename_results);
        
        // 3. Semantic search (if AI is configured)
        // This would require embeddings to be generated first
        
        // Deduplicate and rank results
        let total_count = all_results.len();
        let final_results = self.deduplicate_and_rank(all_results, limit);
        
        let search_time = start_time.elapsed().as_millis() as u64;
        
        let response = SearchResponse {
            results: final_results,
            total_count,
            query: query.to_string(),
            search_time_ms: search_time,
        };
        
        Ok(json!(response))
    }

    async fn search_by_content(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>, AppError> {
        let files = self.db.search_by_content(query, limit).await?;
        
        let mut results = Vec::new();
        for file in files {
            // Get content chunks to create snippet
            let chunks = self.db.get_chunks_by_file_id(&file.id).await?;
            let snippet = self.create_snippet(&chunks, query);
            
            results.push(SearchResult {
                file,
                score: 0.8, // Base score for content matches
                snippet,
                match_type: "content".to_string(),
            });
        }
        
        Ok(results)
    }

    async fn search_by_filename(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>, AppError> {
        // This is a simplified filename search - in production, use proper SQL LIKE queries
        let content_files = self.db.search_by_content("", 1000).await?; // Get many files
        
        let mut results = Vec::new();
        let query_lower = query.to_lowercase();
        
        for file in content_files {
            if file.name.to_lowercase().contains(&query_lower) {
                results.push(SearchResult {
                    file: file.clone(),
                    score: 0.9, // Higher score for filename matches
                    snippet: format!("Filename match: {}", file.name),
                    match_type: "filename".to_string(),
                });
                
                if results.len() >= limit {
                    break;
                }
            }
        }
        
        Ok(results)
    }

    fn create_snippet(&self, chunks: &[crate::db::ContentChunk], query: &str) -> String {
        let query_lower = query.to_lowercase();
        
        for chunk in chunks {
            let content_lower = chunk.content.to_lowercase();
            if let Some(pos) = content_lower.find(&query_lower) {
                let start = pos.saturating_sub(50);
                let end = std::cmp::min(pos + query.len() + 50, chunk.content.len());
                let snippet = &chunk.content[start..end];
                return format!("...{}...", snippet);
            }
        }
        
        // If no direct match, return first chunk snippet
        if let Some(first_chunk) = chunks.first() {
            let content = &first_chunk.content;
            if content.len() > 100 {
                format!("{}...", &content[..100])
            } else {
                content.clone()
            }
        } else {
            "No content available".to_string()
        }
    }

    fn deduplicate_and_rank(&self, mut results: Vec<SearchResult>, limit: usize) -> Vec<SearchResult> {
        // Remove duplicates by file path
        let mut seen_paths = std::collections::HashSet::new();
        results.retain(|result| seen_paths.insert(result.file.path.clone()));
        
        // Sort by score (descending) then by modification time (descending)
        results.sort_by(|a, b| {
            b.score.partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| b.file.modified_at.cmp(&a.file.modified_at))
        });
        
        // Take only the requested limit
        results.truncate(limit);
        results
    }

    pub async fn search_with_ai(&self, query: &str, api_key: &str, provider: &str, limit: usize) -> Result<serde_json::Value, AppError> {
        let start_time = std::time::Instant::now();
        
        // First, do a regular search to get candidate files
        let regular_results = self.search(query, limit * 3).await?;
        let search_response: SearchResponse = serde_json::from_value(regular_results)?;
        
        // Then use AI to re-rank and analyze the results
        let ai_enhanced_results = self.enhance_results_with_ai(
            &search_response.results,
            query,
            api_key,
            provider
        ).await?;
        
        let search_time = start_time.elapsed().as_millis() as u64;
        
        let response = SearchResponse {
            results: ai_enhanced_results,
            total_count: search_response.total_count,
            query: query.to_string(),
            search_time_ms: search_time,
        };
        
        Ok(json!(response))
    }

    async fn enhance_results_with_ai(
        &self,
        results: &[SearchResult],
        query: &str,
        _api_key: &str,
        _provider: &str,
    ) -> Result<Vec<SearchResult>, AppError> {
        // This is a simplified AI enhancement
        // In production, you would:
        // 1. Generate embeddings for the query
        // 2. Compare with stored file embeddings
        // 3. Use AI to analyze content relevance
        // 4. Re-rank results based on semantic similarity
        
        let mut enhanced_results = results.to_vec();
        
        // For now, just boost scores based on content relevance
        for result in &mut enhanced_results {
            if result.snippet.to_lowercase().contains(&query.to_lowercase()) {
                result.score *= 1.2; // Boost relevant results
            }
        }
        
        // Re-sort by enhanced scores
        enhanced_results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(enhanced_results)
    }
}
