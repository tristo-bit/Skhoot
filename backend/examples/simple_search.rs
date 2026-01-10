use anyhow::Result;
use std::path::PathBuf;

use skhoot_backend::search_engine::{
    FileSearchEngine, FileSearchConfig, SearchManagerFactory
};

/// Simple example showing basic file search functionality
#[tokio::main]
async fn main() -> Result<()> {
    println!("🔍 Simple File Search Example");
    println!("=============================");

    let working_dir = std::env::current_dir()?;
    println!("📁 Searching in: {}", working_dir.display());

    // Example 1: Basic file search engine
    println!("\n1️⃣ Basic File Search Engine");
    println!("---------------------------");
    
    let config = FileSearchConfig::default();
    let engine = FileSearchEngine::new(config);

    match engine.search("*.rs", &working_dir, false).await {
        Ok(results) => {
            println!("✅ Found {} Rust files in {}ms", 
                results.matches.len(), 
                results.search_time_ms);
            
            for (i, file_match) in results.matches.iter().take(5).enumerate() {
                println!("  {}. {} (score: {})", 
                    i + 1, 
                    file_match.relative_path, 
                    file_match.score);
            }
        }
        Err(e) => {
            println!("❌ Search failed: {}", e);
        }
    }

    // Example 2: AI-optimized search manager
    println!("\n2️⃣ AI-Optimized Search Manager");
    println!("------------------------------");
    
    let manager = SearchManagerFactory::create_ai_optimized(working_dir.clone());
    
    // Test AI intent detection
    let test_prompts = vec![
        "find the main.rs file",
        "where is the configuration?",
        "show me all TypeScript files",
        "what's the weather today?", // Should not trigger file search
    ];

    for prompt in test_prompts {
        let should_suggest = manager.should_suggest_file_search(prompt).await;
        println!("  \"{}\" → File search: {}", 
            prompt, 
            if should_suggest { "✅ YES" } else { "❌ NO" });
    }

    // Example 3: Actual search with manager
    println!("\n3️⃣ Performing Intelligent Search");
    println!("--------------------------------");
    
    match manager.search("main", &working_dir, None).await {
        Ok(results) => {
            println!("✅ Search completed in {}ms", results.total_execution_time_ms);
            println!("📊 Mode used: {:?}", results.mode);
            println!("📁 Results: {}", results.merged_results.len());
            
            for (i, result) in results.merged_results.iter().take(3).enumerate() {
                println!("  {}. {} (score: {:.2}, engine: {})", 
                    i + 1, 
                    result.path, 
                    result.relevance_score,
                    result.source_engine);
            }

            if !results.suggestions.is_empty() {
                println!("💡 AI Suggestions:");
                for suggestion in &results.suggestions {
                    println!("  - {}", suggestion.suggestion);
                }
            }
        }
        Err(e) => {
            println!("❌ Search failed: {}", e);
        }
    }

    println!("\n✨ Example completed successfully!");
    println!("The file search system is working and ready for AI integration.");

    Ok(())
}