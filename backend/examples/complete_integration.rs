use anyhow::Result;
use std::path::PathBuf;

use skhoot_backend::search_engine::{
    SearchManagerFactory, SearchContext, SearchIntent,
    AIFileSearchIntegration, ConversationContext,
};

/// Complete example showing how AI can use the file search system
#[tokio::main]
async fn main() -> Result<()> {
    println!("🔍 Skhoot File Search Engine - Complete Integration Example");
    println!("=========================================================");

    // Setup
    let working_dir = std::env::current_dir()?;
    println!("📁 Working directory: {}", working_dir.display());

    // Create the search manager optimized for AI
    let search_manager = SearchManagerFactory::create_ai_optimized(working_dir.clone());
    let ai_integration = AIFileSearchIntegration::new(search_manager);

    // Example 1: AI detects file search need from user prompt
    println!("\n🤖 Example 1: AI Prompt Analysis");
    println!("--------------------------------");
    
    let user_prompt = "I need to find the main configuration file for this Rust project";
    let analysis = ai_integration.analyze_prompt(user_prompt, None).await;
    
    println!("User prompt: \"{}\"", user_prompt);
    println!("Needs file search: {}", analysis.needs_file_search);
    println!("Confidence: {:.2}", analysis.confidence);
    println!("Search intent: {:?}", analysis.search_intent);
    println!("Suggested queries: {:?}", analysis.suggested_queries);

    // Example 2: Context-aware search
    println!("\n🎯 Example 2: Context-Aware Search");
    println!("----------------------------------");
    
    let context = SearchContext {
        current_file: Some("src/main.rs".to_string()),
        recent_files: vec!["Cargo.toml".to_string(), "src/lib.rs".to_string()],
        project_type: Some("rust".to_string()),
        search_intent: SearchIntent::FindFile,
    };

    let search_result = ai_integration.ai_guided_search(
        "find the configuration files",
        &working_dir,
        Some(context.clone())
    ).await?;

    if search_result.executed {
        println!("✅ Search executed: {}", search_result.reason);
        if let Some(results) = &search_result.results {
            println!("📊 Found {} results in {}ms", 
                results.merged_results.len(), 
                results.total_execution_time_ms);
            
            for (i, result) in results.merged_results.iter().take(5).enumerate() {
                println!("  {}. {} (score: {:.2})", 
                    i + 1, result.path, result.relevance_score);
            }
        }
        println!("💡 Next actions: {:?}", search_result.next_actions);
    }

    // Example 3: Smart query generation from conversation
    println!("\n💬 Example 3: Conversation-Based Query Generation");
    println!("------------------------------------------------");
    
    let conversation = ConversationContext {
        recent_messages: vec![
            "I'm working on the authentication module".to_string(),
            "There seems to be an issue with the login() function".to_string(),
            "Can you help me find where it's defined?".to_string(),
        ],
        unresolved_questions: vec![
            "Where is the login function implemented?".to_string(),
        ],
        mentioned_files: vec!["auth.rs".to_string()],
        current_task: Some("debugging authentication".to_string()),
    };

    let smart_queries = ai_integration.generate_smart_queries(&conversation).await;
    println!("🧠 Generated smart queries:");
    for query in &smart_queries {
        println!("  - \"{}\" (confidence: {:.2}) - {}", 
            query.query, query.confidence, query.reason);
    }

    // Example 4: File search button highlighting
    println!("\n🔘 Example 4: UI Button Highlighting");
    println!("-----------------------------------");
    
    let should_highlight = ai_integration.should_highlight_file_search(&conversation).await;
    println!("Should highlight file search button: {}", should_highlight);

    // Example 5: Contextual suggestions
    println!("\n📋 Example 5: Contextual Suggestions");
    println!("------------------------------------");
    
    let suggestions = ai_integration.generate_contextual_suggestions(
        Some("src/main.rs"),
        &["Cargo.toml".to_string(), "src/lib.rs".to_string()],
        Some("rust")
    ).await;

    println!("🎯 Contextual suggestions:");
    for suggestion in &suggestions {
        println!("  - \"{}\" (confidence: {:.2}) - {}", 
            suggestion.query, suggestion.confidence, suggestion.reason);
    }

    // Example 6: Search recommendations
    println!("\n🎯 Example 6: Search Recommendations");
    println!("-----------------------------------");
    
    let recommendation = ai_integration.get_search_recommendation(
        "I need to debug the error handling in the authentication system",
        &conversation.recent_messages,
        Some(context)
    ).await;

    println!("🔍 Search recommendation:");
    println!("  Should search: {}", recommendation.should_search);
    println!("  Reason: {}", recommendation.reason);
    println!("  Suggested query: \"{}\"", recommendation.suggested_query);
    println!("  Search mode: {}", recommendation.search_mode);
    println!("  Expected results: {}", recommendation.expected_results);

    // Example 7: Real search execution
    println!("\n⚡ Example 7: Executing Real Search");
    println!("----------------------------------");
    
    if recommendation.should_search {
        let search_manager = SearchManagerFactory::create_ai_optimized(working_dir.clone());
        
        let final_results = search_manager.search(
            &recommendation.suggested_query,
            &working_dir,
            None
        ).await?;

        println!("🎉 Final search results:");
        println!("  Query: \"{}\"", final_results.query);
        println!("  Mode: {:?}", final_results.mode);
        println!("  Results: {}", final_results.merged_results.len());
        println!("  Execution time: {}ms", final_results.total_execution_time_ms);
        
        if !final_results.suggestions.is_empty() {
            println!("  💡 AI Suggestions:");
            for suggestion in &final_results.suggestions {
                println!("    - {} ({})", suggestion.suggestion, suggestion.reason);
            }
        }

        println!("\n📁 Top results:");
        for (i, result) in final_results.merged_results.iter().take(3).enumerate() {
            println!("  {}. {} ({})", 
                i + 1, 
                result.path, 
                result.source_engine);
            if let Some(snippet) = &result.snippet {
                println!("     Preview: {}", 
                    snippet.chars().take(60).collect::<String>());
            }
        }
    }

    println!("\n✨ Integration example completed successfully!");
    println!("The AI can now intelligently detect when file search is needed,");
    println!("suggest relevant queries, and provide contextual recommendations.");

    Ok(())
}

/// Helper function to demonstrate CLI integration
async fn demonstrate_cli_integration() -> Result<()> {
    use skhoot_backend::search_engine::{CliEngine, CliConfig};

    println!("\n🖥️  CLI Integration Demo");
    println!("----------------------");

    let working_dir = std::env::current_dir()?;
    let cli_engine = CliEngine::new(working_dir);
    let config = CliConfig::default();

    // Check available tools
    println!("🔧 Checking available CLI tools...");
    
    let tools = vec![
        ("ripgrep", "rg"),
        ("fd", "fd"),
        ("git", "git"),
    ];

    for (name, command) in tools {
        let available = tokio::process::Command::new(command)
            .arg("--version")
            .output()
            .await
            .map(|output| output.status.success())
            .unwrap_or(false);
        
        println!("  {} ({}): {}", name, command, if available { "✅" } else { "❌" });
    }

    // Demonstrate file search
    println!("\n🔍 CLI file search demo:");
    match cli_engine.search_files("*.rs", &config).await {
        Ok(results) => {
            println!("  Found {} Rust files using {}", 
                results.files.len(), results.command_used);
            for file in results.files.iter().take(3) {
                println!("    - {}", file.path);
            }
        }
        Err(e) => {
            println!("  Error: {}", e);
        }
    }

    Ok(())
}

/// Helper function to demonstrate TUI integration
fn demonstrate_tui_integration() {
    println!("\n🖼️  TUI Integration Info");
    println!("----------------------");
    println!("To run the interactive TUI:");
    println!("  cargo run --bin file-search-tui");
    println!("");
    println!("TUI Features:");
    println!("  - Real-time fuzzy file search");
    println!("  - Interactive file browsing");
    println!("  - Command execution");
    println!("  - Git integration");
    println!("  - Cross-platform support");
    println!("");
    println!("Controls:");
    println!("  /          - Start search");
    println!("  j/k or ↓/↑ - Navigate");
    println!("  Enter      - Open file");
    println!("  :          - Command mode");
    println!("  ?          - Help");
    println!("  q          - Quit");
}