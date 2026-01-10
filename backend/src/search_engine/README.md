# Skhoot File Search Engine

A high-performance, AI-optimized file search system built in Rust, inspired by Codex CLI and designed for seamless AI assistant integration.

## Overview

The Skhoot File Search Engine provides multiple search strategies:

1. **Rust-based Fuzzy Search** - Ultra-fast fuzzy matching using `nucleo-matcher`
2. **CLI Tool Integration** - Leverages system tools like `ripgrep`, `fd`, and `find`
3. **Hybrid Search** - Combines multiple engines for optimal results
4. **AI-Optimized** - Detects search intent and suggests improvements

## Architecture

```
search-engine/
├── file_search.rs      # Core Rust-based fuzzy search engine
├── cli_engine.rs       # CLI tool integration and execution
├── search_manager.rs   # Unified search orchestration
└── README.md          # This file

cli-engine/
├── tui_interface.rs    # Interactive TUI for file browsing
├── command_executor.rs # System command execution
└── file_operations.rs  # Advanced file operations
```

## Features

### Core Search Capabilities

- **Fuzzy File Matching**: Fast fuzzy search using nucleo-matcher
- **Content Search**: Search inside files using ripgrep/grep
- **Git Integration**: Respects .gitignore and provides git-aware search
- **Multi-threaded**: Parallel file traversal for performance
- **Smart Filtering**: Exclude patterns, file type filtering
- **Real-time Results**: Streaming search results as they're found

### AI Integration Features

- **Intent Detection**: Automatically detects when file search is needed
- **Query Suggestions**: Provides intelligent search refinements
- **Context Awareness**: Uses current file/project context for better results
- **Search History**: Learns from previous searches to improve suggestions
- **Performance Analytics**: Tracks search performance for optimization

### CLI Engine Features

- **Interactive TUI**: Full-featured terminal interface inspired by Codex CLI
- **System Integration**: Native file operations and system commands
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Command Execution**: Execute system commands with output streaming
- **File Operations**: Copy, move, delete files with progress tracking

## Usage

### Basic File Search

```rust
use skhoot_backend::search_engine::{FileSearchEngine, FileSearchConfig};

let config = FileSearchConfig::default();
let engine = FileSearchEngine::new(config);

let results = engine.search("main.rs", &current_dir, true).await?;
for file_match in results.matches {
    println!("{}: {}", file_match.score, file_match.path);
}
```

### Unified Search Manager

```rust
use skhoot_backend::search_engine::{SearchManagerFactory, SearchContext, SearchIntent};

let manager = SearchManagerFactory::create_ai_optimized(working_dir);

let context = SearchContext {
    current_file: Some("src/main.rs".to_string()),
    recent_files: vec!["src/lib.rs".to_string()],
    project_type: Some("rust".to_string()),
    search_intent: SearchIntent::FindFile,
};

let results = manager.search("config", &search_dir, Some(context)).await?;
```

### CLI Engine Usage

```rust
use skhoot_backend::cli_engine::{CliEngine, CliConfig};

let engine = CliEngine::new(working_directory);
let config = CliConfig::default();

// Search for files
let results = engine.search_files("*.rs", &config).await?;

// Search file contents
let content_results = engine.search_content("TODO", &config).await?;
```

### TUI Interface

Run the interactive terminal interface:

```bash
cargo run --bin file-search-tui -- --directory /path/to/search
```

**TUI Controls:**
- `/` - Start search
- `j/k` or `↓/↑` - Navigate results
- `Enter` - Open selected file
- `:` - Enter command mode
- `?` - Show help
- `q` - Quit

## API Endpoints

The search engine exposes REST API endpoints:

### File Search
```http
GET /api/v1/search/files?q=main.rs&mode=hybrid&max_results=50
```

### Content Search
```http
GET /api/v1/search/content?q=TODO&case_sensitive=false
```

### Search Suggestions
```http
POST /api/v1/search/suggest
{
  "prompt": "find the configuration file",
  "current_file": "src/main.rs",
  "project_type": "rust"
}
```

### Search History
```http
GET /api/v1/search/history?limit=20
```

## Configuration

### FileSearchConfig

```rust
FileSearchConfig {
    max_results: 100,           // Maximum number of results
    threads: 4,                 // Number of search threads
    respect_gitignore: true,    // Honor .gitignore files
    follow_symlinks: true,      // Follow symbolic links
    include_hidden: false,      // Include hidden files
    exclude_patterns: vec![     // Patterns to exclude
        "node_modules/**",
        "target/**",
        ".git/**"
    ],
    include_patterns: vec![],   // Patterns to include
}
```

### SearchManagerConfig

```rust
SearchManagerConfig {
    default_search_mode: SearchMode::Auto,  // Auto-select best engine
    enable_search_suggestions: true,        // Enable AI suggestions
    max_concurrent_searches: 5,             // Concurrent search limit
    search_timeout_seconds: 30,             // Search timeout
    cache_results: true,                    // Cache search results
}
```

## Performance

### Benchmarks

- **Small projects** (< 1K files): ~10ms average search time
- **Medium projects** (1K-10K files): ~50ms average search time  
- **Large projects** (10K+ files): ~200ms average search time

### Optimization Features

- **Parallel file traversal** using multiple worker threads
- **Smart caching** of directory structures and file metadata
- **Incremental search** for real-time results
- **Memory-efficient** streaming of large result sets
- **Cancellable searches** to prevent resource waste

## AI Integration

### Intent Detection

The system automatically detects when file search should be suggested based on prompts:

```rust
let should_suggest = manager.should_suggest_file_search(
    "find the main configuration file"
).await;
// Returns: true
```

**Detection patterns:**
- File-related keywords: "find", "locate", "search", "show"
- File extensions: ".rs", ".js", ".py", etc.
- Path patterns: "src/", "config/", etc.
- Project terms: "implementation", "definition", "usage"

### Search Suggestions

Provides intelligent query refinements:

```rust
let suggestions = manager.generate_suggestions(
    "config",
    &search_results,
    Some(&context)
).await;

// Example suggestions:
// - "config *.json" (if too many results)
// - "config src/" (based on current context)
// - "configuration" (fuzzy alternative)
```

## CLI Tools Integration

### Supported Tools

- **ripgrep** (`rg`) - Fast content search
- **fd** (`fd`) - Fast file finding
- **find** - Standard Unix file finding
- **grep** - Standard text search
- **git** - Git-aware operations

### Automatic Fallbacks

The system automatically falls back to available tools:

1. Try `fd` for file search
2. Fall back to `find` if `fd` not available
3. Use `rg` for content search
4. Fall back to `grep` if `rg` not available

## Error Handling

The search engine provides comprehensive error handling:

```rust
match engine.search("query", &dir, true).await {
    Ok(results) => {
        // Handle successful search
    }
    Err(SearchError::Timeout) => {
        // Handle search timeout
    }
    Err(SearchError::PermissionDenied(path)) => {
        // Handle permission errors
    }
    Err(SearchError::InvalidPattern(pattern)) => {
        // Handle invalid search patterns
    }
}
```

## Testing

Run the test suite:

```bash
# Run all tests
cargo test

# Run search engine tests only
cargo test search_engine

# Run CLI engine tests only  
cargo test cli_engine

# Run with output
cargo test -- --nocapture
```

## Examples

See the `examples/` directory for complete usage examples:

- `basic_search.rs` - Simple file search
- `advanced_search.rs` - Using search manager with context
- `cli_integration.rs` - CLI tool integration
- `tui_example.rs` - TUI interface usage

## Contributing

1. Follow Rust coding standards
2. Add tests for new features
3. Update documentation
4. Ensure cross-platform compatibility
5. Benchmark performance changes

## License

This project is part of the Skhoot application and follows the same license terms.