//! AI integration layer for intelligent file search - advanced features for future use
#![allow(dead_code)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;

use super::{SearchManager, SearchContext, SearchIntent, UnifiedSearchResults};

/// AI integration layer for intelligent file search
pub struct AIFileSearchIntegration {
    search_manager: SearchManager,
}

/// AI prompt analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptAnalysis {
    pub needs_file_search: bool,
    pub confidence: f64,
    pub suggested_queries: Vec<String>,
    pub search_intent: SearchIntent,
    pub context_hints: Vec<String>,
}

/// File search recommendation for AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSearchRecommendation {
    pub should_search: bool,
    pub reason: String,
    pub suggested_query: String,
    pub search_mode: String,
    pub expected_results: usize,
}

impl AIFileSearchIntegration {
    pub fn new(search_manager: SearchManager) -> Self {
        Self { search_manager }
    }

    /// Analyze an AI prompt to determine if file search is needed
    pub async fn analyze_prompt(&self, prompt: &str, _context: Option<SearchContext>) -> PromptAnalysis {
        let needs_file_search = self.search_manager.should_suggest_file_search(prompt).await;
        let search_intent = self.detect_search_intent(prompt);
        let suggested_queries = self.extract_search_queries(prompt, &search_intent);
        let context_hints = self.extract_context_hints(prompt);

        PromptAnalysis {
            needs_file_search,
            confidence: if needs_file_search { 0.85 } else { 0.15 },
            suggested_queries,
            search_intent,
            context_hints,
        }
    }

    /// Get file search recommendation based on AI conversation context
    pub async fn get_search_recommendation(
        &self,
        prompt: &str,
        _conversation_history: &[String],
        current_context: Option<SearchContext>,
    ) -> FileSearchRecommendation {
        let analysis = self.analyze_prompt(prompt, current_context.clone()).await;
        
        if !analysis.needs_file_search {
            return FileSearchRecommendation {
                should_search: false,
                reason: "Prompt doesn't indicate file search need".to_string(),
                suggested_query: String::new(),
                search_mode: "none".to_string(),
                expected_results: 0,
            };
        }

        let suggested_query = analysis.suggested_queries.first()
            .cloned()
            .unwrap_or_else(|| self.extract_primary_query(prompt));

        let search_mode = self.recommend_search_mode(&analysis, current_context.as_ref());
        let expected_results = self.estimate_result_count(&suggested_query, &search_mode).await;

        FileSearchRecommendation {
            should_search: true,
            reason: format!("Detected {} intent with confidence {:.2}", 
                format!("{:?}", analysis.search_intent), analysis.confidence),
            suggested_query,
            search_mode,
            expected_results,
        }
    }

    /// Execute a search based on AI analysis
    pub async fn ai_guided_search(
        &self,
        prompt: &str,
        search_dir: &Path,
        context: Option<SearchContext>,
    ) -> Result<AISearchResult> {
        let analysis = self.analyze_prompt(prompt, context.clone()).await;
        
        if !analysis.needs_file_search {
            return Ok(AISearchResult {
                executed: false,
                reason: "No file search needed".to_string(),
                results: None,
                suggestions: analysis.suggested_queries,
                next_actions: vec!["Continue with general AI assistance".to_string()],
            });
        }

        let query = analysis.suggested_queries.first()
            .cloned()
            .unwrap_or_else(|| self.extract_primary_query(prompt));

        let search_results = self.search_manager.search(&query, search_dir, context).await?;
        
        let next_actions = self.generate_next_actions(&search_results, &analysis);

        Ok(AISearchResult {
            executed: true,
            reason: format!("Executed search for: {}", query),
            results: Some(search_results),
            suggestions: analysis.suggested_queries,
            next_actions,
        })
    }

    /// Generate contextual file search suggestions for AI
    pub async fn generate_contextual_suggestions(
        &self,
        current_file: Option<&str>,
        recent_files: &[String],
        project_type: Option<&str>,
    ) -> Vec<ContextualSuggestion> {
        let mut suggestions = Vec::new();

        // Suggest related files based on current file
        if let Some(current) = current_file {
            suggestions.extend(self.suggest_related_files(current, project_type).await);
        }

        // Suggest based on recent files
        suggestions.extend(self.suggest_from_recent_files(recent_files).await);

        // Suggest based on project type
        if let Some(proj_type) = project_type {
            suggestions.extend(self.suggest_by_project_type(proj_type).await);
        }

        suggestions
    }

    /// Check if file search button should be prominently displayed
    pub async fn should_highlight_file_search(&self, conversation_context: &ConversationContext) -> bool {
        // Check recent messages for file-related content
        let recent_messages = &conversation_context.recent_messages;
        let file_mentions = recent_messages.iter()
            .filter(|msg| self.contains_file_references(msg))
            .count();

        // Check if user is asking about code structure
        let structure_queries = recent_messages.iter()
            .filter(|msg| self.is_structure_query(msg))
            .count();

        // Check if there are unresolved file-related questions
        let unresolved_file_questions = conversation_context.unresolved_questions.iter()
            .filter(|q| self.is_file_related_question(q))
            .count();

        file_mentions > 0 || structure_queries > 0 || unresolved_file_questions > 0
    }

    /// Generate smart search queries based on conversation context
    pub async fn generate_smart_queries(&self, context: &ConversationContext) -> Vec<SmartQuery> {
        let mut queries = Vec::new();

        // Extract entities from conversation
        let entities = self.extract_entities_from_conversation(context);
        
        for entity in entities {
            match entity.entity_type {
                EntityType::FileName => {
                    queries.push(SmartQuery {
                        query: entity.value.clone(),
                        confidence: 0.9,
                        reason: "Exact file name mentioned".to_string(),
                        search_type: "file_name".to_string(),
                    });
                }
                EntityType::FunctionName => {
                    queries.push(SmartQuery {
                        query: entity.value.clone(),
                        confidence: 0.7,
                        reason: "Function name - search in code files".to_string(),
                        search_type: "content".to_string(),
                    });
                }
                EntityType::ClassName => {
                    queries.push(SmartQuery {
                        query: format!("class {}", entity.value),
                        confidence: 0.8,
                        reason: "Class name mentioned".to_string(),
                        search_type: "content".to_string(),
                    });
                }
                EntityType::ModuleName => {
                    queries.push(SmartQuery {
                        query: format!("{}.py", entity.value),
                        confidence: 0.75,
                        reason: "Module name - likely a Python file".to_string(),
                        search_type: "file_name".to_string(),
                    });
                }
            }
        }

        queries
    }

    // Private helper methods

    fn detect_search_intent(&self, prompt: &str) -> SearchIntent {
        let prompt_lower = prompt.to_lowercase();
        
        if prompt_lower.contains("find") || prompt_lower.contains("locate") || prompt_lower.contains("where") {
            if prompt_lower.contains("content") || prompt_lower.contains("text") || prompt_lower.contains("contains") {
                SearchIntent::FindContent
            } else {
                SearchIntent::FindFile
            }
        } else if prompt_lower.contains("explore") || prompt_lower.contains("browse") || prompt_lower.contains("structure") {
            SearchIntent::Explore
        } else if prompt_lower.contains("debug") || prompt_lower.contains("error") || prompt_lower.contains("bug") {
            SearchIntent::Debug
        } else if prompt_lower.contains("refactor") || prompt_lower.contains("rename") || prompt_lower.contains("move") {
            SearchIntent::Refactor
        } else {
            SearchIntent::Unknown
        }
    }

    fn extract_search_queries(&self, prompt: &str, intent: &SearchIntent) -> Vec<String> {
        let mut queries = Vec::new();
        
        // Extract quoted strings
        let quote_regex = regex::Regex::new(r#""([^"]+)""#).unwrap();
        for cap in quote_regex.captures_iter(prompt) {
            if let Some(quoted) = cap.get(1) {
                queries.push(quoted.as_str().to_string());
            }
        }

        // Extract file-like patterns
        let file_regex = regex::Regex::new(r"\b\w+\.\w+\b").unwrap();
        for cap in file_regex.captures_iter(prompt) {
            queries.push(cap.get(0).unwrap().as_str().to_string());
        }

        // Extract camelCase/snake_case identifiers
        let identifier_regex = regex::Regex::new(r"\b[a-zA-Z][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*\b|\b[a-z]+_[a-z_]+\b").unwrap();
        for cap in identifier_regex.captures_iter(prompt) {
            queries.push(cap.get(0).unwrap().as_str().to_string());
        }

        // Add intent-specific queries
        match intent {
            SearchIntent::FindFile => {
                queries.extend(vec!["*.rs".to_string(), "*.js".to_string(), "*.py".to_string()]);
            }
            SearchIntent::Debug => {
                queries.extend(vec!["error".to_string(), "panic".to_string(), "exception".to_string()]);
            }
            _ => {}
        }

        queries.truncate(5); // Limit to top 5 queries
        queries
    }

    fn extract_context_hints(&self, prompt: &str) -> Vec<String> {
        let mut hints = Vec::new();
        
        // Look for directory hints
        let dir_patterns = ["src/", "lib/", "components/", "utils/", "config/", "tests/"];
        for pattern in &dir_patterns {
            if prompt.contains(pattern) {
                hints.push(format!("Search in {} directory", pattern));
            }
        }

        // Look for language hints
        let lang_patterns = [("rust", "*.rs"), ("javascript", "*.js"), ("python", "*.py"), ("typescript", "*.ts")];
        for (lang, ext) in &lang_patterns {
            if prompt.to_lowercase().contains(lang) {
                hints.push(format!("Focus on {} files", ext));
            }
        }

        hints
    }

    fn extract_primary_query(&self, prompt: &str) -> String {
        // Simple extraction - take the first meaningful word
        let words: Vec<&str> = prompt.split_whitespace()
            .filter(|w| w.len() > 2 && !["the", "and", "for", "with", "find", "show", "get"].contains(&w.to_lowercase().as_str()))
            .collect();
        
        words.first().unwrap_or(&"").to_string()
    }

    fn recommend_search_mode(&self, analysis: &PromptAnalysis, _context: Option<&SearchContext>) -> String {
        match analysis.search_intent {
            SearchIntent::FindContent => "cli".to_string(),
            SearchIntent::FindFile => "rust".to_string(),
            SearchIntent::Explore => "hybrid".to_string(),
            _ => "auto".to_string(),
        }
    }

    async fn estimate_result_count(&self, query: &str, _mode: &str) -> usize {
        // Simple heuristic based on query characteristics
        if query.len() < 3 {
            100 // Short queries typically return many results
        } else if query.contains('.') {
            10 // File extensions are more specific
        } else if query.chars().any(|c| c.is_uppercase()) {
            25 // CamelCase identifiers are moderately specific
        } else {
            50 // Default estimate
        }
    }

    fn generate_next_actions(&self, results: &UnifiedSearchResults, _analysis: &PromptAnalysis) -> Vec<String> {
        let mut actions = Vec::new();

        if results.merged_results.is_empty() {
            actions.push("Try a broader search query".to_string());
            actions.push("Check if the file exists in the project".to_string());
            actions.push("Search in file contents instead".to_string());
        } else if results.merged_results.len() > 20 {
            actions.push("Refine the search query to be more specific".to_string());
            actions.push("Add file extension filter".to_string());
            actions.push("Search in specific directory".to_string());
        } else {
            actions.push("Open the most relevant file".to_string());
            actions.push("Examine file contents".to_string());
            actions.push("Search for related files".to_string());
        }

        actions
    }

    async fn suggest_related_files(&self, current_file: &str, _project_type: Option<&str>) -> Vec<ContextualSuggestion> {
        let mut suggestions = Vec::new();
        let path = Path::new(current_file);
        
        if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
            // Suggest test files
            suggestions.push(ContextualSuggestion {
                query: format!("{}_test", stem),
                reason: "Look for test files".to_string(),
                confidence: 0.8,
            });

            // Suggest related modules
            suggestions.push(ContextualSuggestion {
                query: format!("{}*", stem),
                reason: "Find related files with similar names".to_string(),
                confidence: 0.7,
            });
        }

        suggestions
    }

    async fn suggest_from_recent_files(&self, recent_files: &[String]) -> Vec<ContextualSuggestion> {
        let mut suggestions = Vec::new();
        
        for file in recent_files.iter().take(3) {
            let path = Path::new(file);
            if let Some(dir) = path.parent().and_then(|p| p.to_str()) {
                suggestions.push(ContextualSuggestion {
                    query: format!("{}/*", dir),
                    reason: format!("Explore {} directory", dir),
                    confidence: 0.6,
                });
            }
        }

        suggestions
    }

    async fn suggest_by_project_type(&self, project_type: &str) -> Vec<ContextualSuggestion> {
        let mut suggestions = Vec::new();
        
        match project_type {
            "rust" => {
                suggestions.push(ContextualSuggestion {
                    query: "Cargo.toml".to_string(),
                    reason: "Check project configuration".to_string(),
                    confidence: 0.9,
                });
                suggestions.push(ContextualSuggestion {
                    query: "src/main.rs".to_string(),
                    reason: "Find main entry point".to_string(),
                    confidence: 0.8,
                });
            }
            "javascript" | "typescript" => {
                suggestions.push(ContextualSuggestion {
                    query: "package.json".to_string(),
                    reason: "Check project dependencies".to_string(),
                    confidence: 0.9,
                });
            }
            "python" => {
                suggestions.push(ContextualSuggestion {
                    query: "requirements.txt".to_string(),
                    reason: "Check Python dependencies".to_string(),
                    confidence: 0.8,
                });
            }
            _ => {}
        }

        suggestions
    }

    fn contains_file_references(&self, message: &str) -> bool {
        let file_indicators = [".rs", ".js", ".py", ".ts", ".json", ".md", ".txt", "src/", "lib/"];
        file_indicators.iter().any(|indicator| message.contains(indicator))
    }

    fn is_structure_query(&self, message: &str) -> bool {
        let structure_keywords = ["structure", "organization", "layout", "architecture", "files", "directories"];
        structure_keywords.iter().any(|keyword| message.to_lowercase().contains(keyword))
    }

    fn is_file_related_question(&self, question: &str) -> bool {
        let file_keywords = ["file", "directory", "folder", "path", "location", "find", "where"];
        file_keywords.iter().any(|keyword| question.to_lowercase().contains(keyword))
    }

    fn extract_entities_from_conversation(&self, context: &ConversationContext) -> Vec<Entity> {
        let mut entities = Vec::new();
        
        for message in &context.recent_messages {
            // Simple entity extraction (in a real implementation, you'd use NLP)
            
            // File names (contains extension)
            let file_regex = regex::Regex::new(r"\b\w+\.\w+\b").unwrap();
            for cap in file_regex.captures_iter(message) {
                entities.push(Entity {
                    value: cap.get(0).unwrap().as_str().to_string(),
                    entity_type: EntityType::FileName,
                    confidence: 0.9,
                });
            }

            // Function names (camelCase or snake_case followed by parentheses)
            let func_regex = regex::Regex::new(r"\b[a-zA-Z_][a-zA-Z0-9_]*\(\)").unwrap();
            for cap in func_regex.captures_iter(message) {
                let func_name = cap.get(0).unwrap().as_str().trim_end_matches("()");
                entities.push(Entity {
                    value: func_name.to_string(),
                    entity_type: EntityType::FunctionName,
                    confidence: 0.8,
                });
            }
        }

        entities
    }
}

/// Result of AI-guided search
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AISearchResult {
    pub executed: bool,
    pub reason: String,
    pub results: Option<UnifiedSearchResults>,
    pub suggestions: Vec<String>,
    pub next_actions: Vec<String>,
}

/// Contextual search suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextualSuggestion {
    pub query: String,
    pub reason: String,
    pub confidence: f64,
}

/// Smart query generated from conversation analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartQuery {
    pub query: String,
    pub confidence: f64,
    pub reason: String,
    pub search_type: String,
}

/// Conversation context for AI analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationContext {
    pub recent_messages: Vec<String>,
    pub unresolved_questions: Vec<String>,
    pub mentioned_files: Vec<String>,
    pub current_task: Option<String>,
}

/// Extracted entity from conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub value: String,
    pub entity_type: EntityType,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntityType {
    FileName,
    FunctionName,
    ClassName,
    ModuleName,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::search_engine::SearchManagerFactory;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_prompt_analysis() {
        let temp_dir = TempDir::new().unwrap();
        let manager = SearchManagerFactory::create_ai_optimized(temp_dir.path().to_path_buf());
        let ai_integration = AIFileSearchIntegration::new(manager);

        let analysis = ai_integration.analyze_prompt("find the main.rs file", None).await;
        assert!(analysis.needs_file_search);
        assert!(matches!(analysis.search_intent, SearchIntent::FindFile));
        assert!(!analysis.suggested_queries.is_empty());
    }

    #[tokio::test]
    async fn test_search_recommendation() {
        let temp_dir = TempDir::new().unwrap();
        let manager = SearchManagerFactory::create_ai_optimized(temp_dir.path().to_path_buf());
        let ai_integration = AIFileSearchIntegration::new(manager);

        let recommendation = ai_integration.get_search_recommendation(
            "where is the configuration file?",
            &[],
            None
        ).await;

        assert!(recommendation.should_search);
        assert!(!recommendation.suggested_query.is_empty());
    }
}