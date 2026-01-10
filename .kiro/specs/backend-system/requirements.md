# Requirements Document

## Introduction

The Backend System is a comprehensive file indexing and search service that provides intelligent file discovery, content extraction, and AI-enhanced search capabilities. The system automatically indexes files from specified directories, extracts text content from various file formats, and provides fast search functionality through both traditional content matching and AI-powered semantic search.

## Glossary

- **Backend_System**: The complete Rust-based server application providing file indexing and search services
- **File_Indexer**: Component responsible for discovering, processing, and storing file metadata and content
- **Search_Engine**: Component that provides file search capabilities across indexed content
- **AI_Manager**: Component that handles AI provider integration, model detection, and embedding generation
- **Database**: SQLite database storing file records, content chunks, and search history
- **Content_Chunk**: A segmented portion of file content optimized for search and AI processing
- **API_Endpoint**: REST API routes that expose backend functionality to client applications
- **Health_Monitor**: System component that tracks service status and component health

## Requirements

### Requirement 1: File Discovery and Indexing

**User Story:** As a system administrator, I want the backend to automatically discover and index files from configured directories, so that users can search through their file content efficiently.

#### Acceptance Criteria

1. WHEN the system starts, THE File_Indexer SHALL scan all configured index paths for files
2. WHEN a file is discovered, THE File_Indexer SHALL extract metadata including path, name, size, modification time, and MIME type
3. WHEN processing text-based files, THE File_Indexer SHALL extract readable content from supported formats (txt, md, rs, js, ts, py, html, css, json, xml, yml, yaml)
4. WHEN processing PDF files, THE File_Indexer SHALL extract text content using PDF parsing libraries
5. WHEN encountering excluded patterns, THE File_Indexer SHALL skip files matching configured exclusion rules
6. WHEN file content is extracted, THE File_Indexer SHALL create content chunks of approximately 1000 characters with 200-character overlap
7. WHEN storing file information, THE File_Indexer SHALL calculate and store a SHA256 hash of the content for change detection
8. WHEN a file has been modified since last indexing, THE File_Indexer SHALL re-index the file with updated content and metadata

### Requirement 2: Content Search Capabilities

**User Story:** As a user, I want to search through indexed file content using text queries, so that I can quickly find relevant files and information.

#### Acceptance Criteria

1. WHEN a search query is submitted, THE Search_Engine SHALL perform content-based search across all indexed file chunks
2. WHEN searching by filename, THE Search_Engine SHALL match queries against file names and paths
3. WHEN multiple search approaches return results, THE Search_Engine SHALL deduplicate results by file path
4. WHEN ranking search results, THE Search_Engine SHALL prioritize by relevance score and modification time
5. WHEN creating result snippets, THE Search_Engine SHALL extract relevant content portions around query matches
6. WHEN no direct content match exists, THE Search_Engine SHALL provide a preview from the first content chunk
7. WHEN search results are returned, THE Search_Engine SHALL include file metadata, match type, and relevance score
8. WHEN search performance is measured, THE Search_Engine SHALL track and return search execution time

### Requirement 3: AI Provider Integration

**User Story:** As a developer, I want the backend to integrate with multiple AI providers for enhanced search capabilities, so that users can benefit from semantic search and intelligent content analysis.

#### Acceptance Criteria

1. WHEN an API key is provided, THE AI_Manager SHALL detect the provider type based on key format patterns
2. WHEN OpenAI keys are detected (starting with "sk-"), THE AI_Manager SHALL configure OpenAI provider settings
3. WHEN Anthropic keys are detected (starting with "sk-ant-"), THE AI_Manager SHALL configure Anthropic provider settings  
4. WHEN Google AI keys are detected (starting with "AIza"), THE AI_Manager SHALL configure Google provider settings
5. WHEN provider detection succeeds, THE AI_Manager SHALL fetch available models from the provider's API
6. WHEN model fetching fails, THE AI_Manager SHALL return predefined model lists as fallback
7. WHEN embedding generation is requested, THE AI_Manager SHALL use provider-specific embedding models
8. WHEN generating embeddings for OpenAI, THE AI_Manager SHALL use the text-embedding-3-small model
9. WHEN generating embeddings for Google, THE AI_Manager SHALL use the text-embedding-004 model

### Requirement 4: Database Operations

**User Story:** As a system component, I want reliable data persistence for file records and content chunks, so that indexed information is preserved and efficiently queryable.

#### Acceptance Criteria

1. WHEN the system initializes, THE Database SHALL create required tables using migration scripts
2. WHEN storing file records, THE Database SHALL use INSERT OR REPLACE to handle updates efficiently
3. WHEN storing content chunks, THE Database SHALL maintain foreign key relationships to parent files
4. WHEN embedding data is available, THE Database SHALL store embeddings as binary blobs with proper serialization
5. WHEN querying by content, THE Database SHALL use LIKE operations for text matching across chunks
6. WHEN retrieving file information, THE Database SHALL parse stored datetime strings back to proper DateTime objects
7. WHEN checking database health, THE Database SHALL execute test queries to verify connectivity
8. WHEN file records are deleted, THE Database SHALL cascade delete associated content chunks

### Requirement 5: REST API Interface

**User Story:** As a client application, I want to interact with backend services through well-defined REST endpoints, so that I can integrate file search and AI capabilities into user interfaces.

#### Acceptance Criteria

1. WHEN the server starts, THE Backend_System SHALL listen on port 3001 with proper CORS configuration
2. WHEN health checks are requested via GET /health, THE Backend_System SHALL return service status and component health
3. WHEN AI provider detection is requested via POST /api/v1/ai/detect-provider, THE Backend_System SHALL validate API keys and return provider information
4. WHEN file search is requested via GET /api/v1/search, THE Backend_System SHALL process query parameters and return search results
5. WHEN indexing is triggered via POST /api/v1/index/start, THE Backend_System SHALL initiate full file indexing and return acceptance status
6. WHEN ping requests are made to /api/v1/ping, THE Backend_System SHALL respond with "pong" for connectivity testing
7. WHEN CORS preflight requests are received, THE Backend_System SHALL allow requests from localhost:5173 and tauri://localhost origins
8. WHEN request processing fails, THE Backend_System SHALL return appropriate HTTP status codes and error messages

### Requirement 6: Configuration Management

**User Story:** As a system administrator, I want configurable settings for indexing behavior and system operation, so that the backend can be adapted to different environments and requirements.

#### Acceptance Criteria

1. WHEN the system starts, THE Backend_System SHALL load configuration from environment variables and defaults
2. WHEN determining index paths, THE Backend_System SHALL include user home directory, Documents, Desktop, and Downloads folders
3. WHEN processing files, THE Backend_System SHALL exclude common development and cache directories (node_modules, .git, .cache, target)
4. WHEN excluding files by pattern, THE Backend_System SHALL support both exact matches and simple glob patterns
5. WHEN creating data directories, THE Backend_System SHALL establish ~/.skhoot directory for database and configuration storage
6. WHEN configuring database connection, THE Backend_System SHALL use SQLite with file path in the data directory
7. WHEN setting up network configuration, THE Backend_System SHALL bind to localhost interface for security
8. WHEN managing file type exclusions, THE Backend_System SHALL skip temporary files, logs, and binary formats by default

### Requirement 7: Error Handling and Resilience

**User Story:** As a system operator, I want robust error handling and graceful degradation, so that the backend continues operating even when individual operations fail.

#### Acceptance Criteria

1. WHEN file access fails during indexing, THE File_Indexer SHALL log warnings and continue processing other files
2. WHEN PDF text extraction fails, THE File_Indexer SHALL skip the problematic file and continue indexing
3. WHEN database operations fail, THE Backend_System SHALL return appropriate error responses with descriptive messages
4. WHEN AI provider API calls fail, THE AI_Manager SHALL fall back to predefined model lists
5. WHEN network requests timeout, THE Backend_System SHALL handle timeouts gracefully without crashing
6. WHEN invalid API keys are provided, THE AI_Manager SHALL return clear error messages about key format issues
7. WHEN search queries contain invalid parameters, THE Search_Engine SHALL validate inputs and return meaningful error responses
8. WHEN system resources are exhausted, THE Backend_System SHALL log errors and attempt graceful recovery

### Requirement 8: Performance and Monitoring

**User Story:** As a system administrator, I want performance monitoring and efficient resource usage, so that the backend scales well and provides responsive service.

#### Acceptance Criteria

1. WHEN processing large directories, THE File_Indexer SHALL process files incrementally to avoid memory exhaustion
2. WHEN checking for file changes, THE File_Indexer SHALL compare modification timestamps to avoid unnecessary re-indexing
3. WHEN executing searches, THE Search_Engine SHALL limit result sets to prevent excessive memory usage
4. WHEN creating content chunks, THE File_Indexer SHALL use consistent chunk sizes with overlap for optimal search performance
5. WHEN tracking search performance, THE Backend_System SHALL measure and report query execution times
6. WHEN handling concurrent requests, THE Backend_System SHALL use async processing to maintain responsiveness
7. WHEN monitoring system health, THE Health_Monitor SHALL check database connectivity and indexer status
8. WHEN logging system activity, THE Backend_System SHALL use structured logging with appropriate log levels for debugging and monitoring