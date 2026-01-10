# Skhoot File Search System Integration Guide

## Overview

The Skhoot File Search System is a comprehensive, AI-optimized file search solution built in Rust. It provides multiple search engines, CLI integration, and intelligent AI assistance for finding files and content in your projects.

## Architecture

```
backend/src/
├── search_engine/           # Core search functionality
│   ├── file_search.rs      # Rust-based fuzzy search engine
│   ├── cli_engine.rs       # CLI tool integration (ripgrep, fd, etc.)
│   ├── search_manager.rs   # Unified search orchestration
│   ├── ai_integration.rs   # AI-driven search optimization
│   └── README.md          # Detailed documentation
├── cli_engine/             # CLI and TUI interfaces
│   ├── tui_interface.rs    # Interactive terminal UI
│   ├── command_executor.rs # System command execution
│   └── file_operations.rs  # Advanced file operations
├── api/                    # REST API endpoints
│   └── search.rs          # Search API routes
└── bin/
    └── file_search_tui.rs  # Standalone TUI application
```

## Key Features

### 🚀 Multiple Search Engines
- **Rust Engine**: Ultra-fast fuzzy matching using nucleo-matcher
- **CLI Engine**: Leverages ripgrep, fd, find, and grep
- **Hybrid Mode**: Combines multiple engines for optimal results
- **Auto Mode**: Intelligently selects the best engine

### 🤖 AI Integration
- **Intent Detection**: Automatically detects when file search is needed
- **Smart Suggestions**: Provides intelligent query refinements
- **Context Awareness**: Uses current file/project context
- **Conversation Analysis**: Extracts search queries from AI conversations

### 🖥️ User Interfaces
- **REST API**: Full HTTP API for web integration
- **TUI**: Interactive terminal interface inspired by Codex CLI
- **CLI Tools**: Command-line utilities for scripting

## Quick Start

### 1. Basic File Search

```rust
use skhoot_backend::search_engine::{FileSearchEngine, FileSearchConfig};

let config = FileSearchConfig::default();
let engine = FileSearchEngine::new(config);

let results = engine.search("main.rs", &current_dir, true).await?;
for file_match in results.matches {
    println!("{}: {}", file_match.score, file_match.path);
}
```

### 2. AI-Optimized Search Manager

```rust
use skhoot_backend::search_engine::{SearchManagerFactory, SearchContext, SearchIntent};

// Create AI-optimized search manager
let manager = SearchManagerFactory::create_ai_optimized(working_dir);

// Set up context for better results
let context = SearchContext {
    current_file: Some("src/main.rs".to_string()),
    recent_files: vec!["Cargo.toml".to_string()],
    project_type: Some("rust".to_string()),
    search_intent: SearchIntent::FindFile,
};

// Perform intelligent search
let results = manager.search("config", &search_dir, Some(context)).await?;
```

### 3. CLI Integration

```rust
use skhoot_backend::cli_engine::{CliEngine, CliConfig};

let engine = CliEngine::new(working_directory);
let config = CliConfig::default();

// Search for files using system tools
let results = engine.search_files("*.rs", &config).await?;

// Search file contents
let content_results = engine.search_content("TODO", &config).await?;
```

### 4. Interactive TUI

```bash
# Run the standalone TUI application
cargo run --bin file-search-tui -- --directory /path/to/search

# TUI Controls:
# /          - Start search
# j/k or ↓/↑ - Navigate results
# Enter      - Open selected file
# :          - Enter command mode
# ?          - Show help
# q          - Quit
```

## API Endpoints

### File Search
```http
GET /api/v1/search/files?q=main.rs&mode=hybrid&max_results=50

Response:
{
  "search_id": "uuid",
  "query": "main.rs",
  "mode": "Hybrid",
  "merged_results": [
    {
      "path": "src/main.rs",
      "relevance_score": 0.95,
      "source_engine": "rust-fuzzy",
      "file_type": "rs"
    }
  ],
  "total_execution_time_ms": 45,
  "suggestions": []
}
```

### Content Search
```http
GET /api/v1/search/content?q=TODO&case_sensitive=false

Response:
{
  "merged_results": [
    {
      "path": "src/lib.rs",
      "snippet": "// TODO: Implement error handling",
      "line_number": 42
    }
  ]
}
```

### AI Search Suggestions
```http
POST /api/v1/search/suggest
{
  "prompt": "find the configuration file",
  "current_file": "src/main.rs",
  "project_type": "rust"
}

Response:
{
  "should_suggest_file_search": true,
  "suggested_queries": ["config", "*.toml", "settings"],
  "search_intent": "FindFile",
  "confidence": 0.85
}
```

## AI Integration Examples

### 1. Detecting File Search Intent

```rust
use skhoot_backend::search_engine::AIFileSearchIntegration;

let ai_integration = AIFileSearchIntegration::new(search_manager);

// Analyze user prompt
let analysis = ai_integration.analyze_prompt(
    "I need to find the main configuration file",
    None
).await;

if analysis.needs_file_search {
    println!("AI detected file search need with {:.2} confidence", analysis.confidence);
    println!("Suggested queries: {:?}", analysis.suggested_queries);
}
```

### 2. Context-Aware Search

```rust
// AI uses conversation context to improve search
let conversation = ConversationContext {
    recent_messages: vec![
        "I'm working on authentication".to_string(),
        "There's an issue with the login function".to_string(),
    ],
    mentioned_files: vec!["auth.rs".to_string()],
    current_task: Some("debugging".to_string()),
};

let smart_queries = ai_integration.generate_smart_queries(&conversation).await;
for query in smart_queries {
    println!("Smart query: {} (confidence: {:.2})", query.query, query.confidence);
}
```

### 3. UI Button Highlighting

```rust
// Determine when to highlight file search button in UI
let should_highlight = ai_integration.should_highlight_file_search(&conversation).await;

if should_highlight {
    // Show prominent file search button in UI
    println!("💡 File search recommended based on conversation context");
}
```

## Configuration

### Search Engine Configuration

```rust
use skhoot_backend::search_engine::{FileSearchConfig, SearchManagerConfig, SearchMode};

let file_config = FileSearchConfig {
    max_results: 100,
    threads: 4,
    respect_gitignore: true,
    follow_symlinks: true,
    include_hidden: false,
    exclude_patterns: vec![
        "node_modules/**".to_string(),
        "target/**".to_string(),
        ".git/**".to_string(),
    ],
};

let manager_config = SearchManagerConfig {
    default_search_mode: SearchMode::Auto,
    enable_search_suggestions: true,
    max_concurrent_searches: 5,
    search_timeout_seconds: 30,
    cache_results: true,
    file_search_config: file_config,
    cli_config: CliConfig::default(),
};
```

### CLI Tool Configuration

```rust
use skhoot_backend::cli_engine::CliConfig;

let cli_config = CliConfig {
    use_ripgrep: true,      // Prefer ripgrep for content search
    use_fd: true,           // Prefer fd for file finding
    use_fzf: false,         // Disable fzf integration
    timeout_seconds: 30,    // Command timeout
    max_results: 1000,      // Maximum results per search
};
```

## Performance Optimization

### Search Performance
- **Small projects** (< 1K files): ~10ms average
- **Medium projects** (1K-10K files): ~50ms average  
- **Large projects** (10K+ files): ~200ms average

### Optimization Features
- Parallel file traversal using worker threads
- Smart caching of directory structures
- Incremental search for real-time results
- Memory-efficient result streaming
- Cancellable searches to prevent resource waste

## CLI Tools Integration

### Supported Tools
- **ripgrep** (`rg`) - Fast content search
- **fd** (`fd`) - Fast file finding  
- **find** - Standard Unix file finding
- **grep** - Standard text search
- **git** - Git-aware operations

### Automatic Fallbacks
1. Try `fd` for file search → fall back to `find`
2. Try `rg` for content search → fall back to `grep`
3. Use native Rust engine if CLI tools unavailable

## Error Handling

```rust
use skhoot_backend::search_engine::SearchError;

match search_manager.search("query", &dir, None).await {
    Ok(results) => {
        // Handle successful search
    }
    Err(e) => {
        match e {
            SearchError::Timeout => {
                println!("Search timed out");
            }
            SearchError::PermissionDenied(path) => {
                println!("Permission denied: {}", path);
            }
            SearchError::InvalidPattern(pattern) => {
                println!("Invalid search pattern: {}", pattern);
            }
            _ => {
                println!("Search error: {}", e);
            }
        }
    }
}
```

## Testing

```bash
# Run all tests
cargo test

# Run specific module tests
cargo test search_engine
cargo test cli_engine

# Run with output
cargo test -- --nocapture

# Run integration example
cargo run --example complete_integration
```

## Deployment

### Backend Integration

1. **Add to main.rs**:
```rust
use search_engine::SearchManagerFactory;

// In main function
let file_search_manager = SearchManagerFactory::create_ai_optimized(working_dir);
let state = AppState {
    // ... other fields
    file_search_manager,
};
```

2. **Add API routes**:
```rust
let app = Router::new()
    // ... other routes
    .nest("/api/v1", api::search::search_routes())
    .with_state(state);
```

### Frontend Integration

```typescript
// Search for files
const searchFiles = async (query: string, mode: string = 'auto') => {
  const response = await fetch(`/api/v1/search/files?q=${query}&mode=${mode}`);
  return response.json();
};

// Get search suggestions
const getSearchSuggestions = async (prompt: string) => {
  const response = await fetch('/api/v1/search/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();
};

// Check if file search should be suggested
const shouldSuggestFileSearch = async (prompt: string) => {
  const suggestions = await getSearchSuggestions(prompt);
  return suggestions.should_suggest_file_search;
};
```

## Best Practices

### For AI Integration
1. **Always check intent** before suggesting file search
2. **Use context** from current file and recent activity
3. **Provide multiple query suggestions** for better UX
4. **Cache results** for repeated queries
5. **Handle errors gracefully** with fallback options

### For Performance
1. **Use appropriate search mode** based on query type
2. **Limit result count** for large projects
3. **Enable caching** for frequently accessed directories
4. **Use exclude patterns** to skip irrelevant files
5. **Monitor search times** and adjust thread count

### For User Experience
1. **Show real-time results** as they arrive
2. **Highlight matching characters** in file names
3. **Provide keyboard shortcuts** for power users
4. **Display search statistics** (time, result count)
5. **Remember search history** for quick access

## Troubleshooting

### Common Issues

1. **Slow searches on large projects**
   - Increase thread count in configuration
   - Add more exclude patterns
   - Use CLI mode for better performance

2. **No results found**
   - Check if files exist in search directory
   - Verify exclude patterns aren't too restrictive
   - Try different search modes (rust/cli/hybrid)

3. **CLI tools not working**
   - Install ripgrep: `cargo install ripgrep`
   - Install fd: `cargo install fd-find`
   - Check tool availability with `--version` flags

4. **Permission errors**
   - Ensure read permissions on search directories
   - Check if files are accessible to current user
   - Use appropriate exclude patterns for system directories

### Debug Mode

```bash
# Enable debug logging
RUST_LOG=debug cargo run

# Run with verbose output
cargo run --bin file-search-tui -- --debug --directory .
```

## Contributing

1. Follow Rust coding standards and conventions
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure cross-platform compatibility
5. Benchmark performance for optimization changes

## License

This file search system is part of the Skhoot project and follows the same license terms.