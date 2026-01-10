# Implementation Plan: Backend System

## Overview

This implementation plan converts the backend system design into discrete coding tasks that build incrementally. The approach focuses on establishing core infrastructure first, then adding file indexing capabilities, search functionality, AI integration, and finally comprehensive testing and monitoring.

## Tasks

- [-] 1. Set up core application structure and configuration
  - Create AppState structure with shared components
  - Implement AppConfig with environment variable loading and defaults
  - Set up structured logging with appropriate log levels
  - Create error handling types and utilities
  - _Requirements: 6.1, 6.5, 6.6, 6.7, 8.8_

- [ ] 1.1 Write property test for configuration loading
  - **Property 1: Configuration initialization consistency**
  - **Validates: Requirements 6.1**

- [ ] 2. Implement database layer and migrations
  - [ ] 2.1 Create Database struct with SQLite connection management
    - Implement connection pooling and health checking
    - Create migration runner for schema setup
    - _Requirements: 4.1, 4.7_

  - [ ] 2.2 Implement file record storage and retrieval
    - Create FileRecord CRUD operations with INSERT OR REPLACE logic
    - Implement datetime serialization and parsing
    - Add file lookup by path functionality
    - _Requirements: 4.2, 4.6_

  - [ ] 2.3 Write property test for file record operations
    - **Property 17: Database file storage with upsert behavior**
    - **Validates: Requirements 4.2**

  - [ ] 2.4 Write property test for datetime round-trip
    - **Property 21: Database datetime parsing round-trip**
    - **Validates: Requirements 4.6**

  - [ ] 2.5 Implement content chunk storage with foreign key relationships
    - Create ContentChunk CRUD operations
    - Implement embedding serialization as binary blobs
    - Add cascade deletion for file-chunk relationships
    - _Requirements: 4.3, 4.4, 4.8_

  - [ ] 2.6 Write property test for foreign key integrity
    - **Property 18: Database foreign key integrity**
    - **Validates: Requirements 4.3**

  - [ ] 2.7 Write property test for embedding serialization
    - **Property 19: Database embedding serialization round-trip**
    - **Validates: Requirements 4.4**

  - [ ] 2.8 Write property test for cascade deletion
    - **Property 22: Database cascade deletion**
    - **Validates: Requirements 4.8**

- [ ] 3. Checkpoint - Ensure database tests pass
  - Ensure all database tests pass, ask the user if questions arise.

- [ ] 4. Implement file indexing system
  - [ ] 4.1 Create FileIndexer with directory scanning capabilities
    - Implement recursive directory traversal
    - Add file exclusion pattern matching (exact and glob patterns)
    - Create file metadata extraction (path, name, size, modification time, MIME type)
    - _Requirements: 1.1, 1.2, 1.5, 6.3, 6.4, 6.8_

  - [ ] 4.2 Write property test for metadata extraction
    - **Property 1: File metadata extraction completeness**
    - **Validates: Requirements 1.2**

  - [ ] 4.3 Write property test for file exclusion
    - **Property 3: File exclusion pattern matching**
    - **Validates: Requirements 1.5**

  - [ ] 4.4 Write property test for pattern matching support
    - **Property 29: File pattern matching support**
    - **Validates: Requirements 6.4**

  - [ ] 4.5 Implement content extraction for supported file formats
    - Add text extraction for supported formats (txt, md, rs, js, ts, py, html, css, json, xml, yml, yaml)
    - Implement PDF text extraction with error handling
    - Create content hashing with SHA256 for change detection
    - _Requirements: 1.3, 1.4, 1.7_

  - [ ] 4.6 Write property test for content extraction
    - **Property 2: Content extraction by format**
    - **Validates: Requirements 1.3, 1.4**

  - [ ] 4.7 Write property test for content hashing
    - **Property 5: Content hash calculation**
    - **Validates: Requirements 1.7**

  - [ ] 4.8 Implement content chunking with overlap strategy
    - Create chunking algorithm with 1000-character chunks and 200-character overlap
    - Add chunk indexing and UUID generation
    - Implement change detection and re-indexing logic
    - _Requirements: 1.6, 1.8, 8.2, 8.4_

  - [ ] 4.9 Write property test for chunking consistency
    - **Property 4: Content chunking consistency**
    - **Validates: Requirements 1.6, 8.4**

  - [ ] 4.10 Write property test for change detection
    - **Property 6: File change detection**
    - **Validates: Requirements 1.8, 8.2**

  - [ ] 4.11 Add error handling and resilience for file processing
    - Implement graceful handling of file access failures
    - Add logging for processing errors while continuing with other files
    - Create fallback behavior for PDF extraction failures
    - _Requirements: 7.1, 7.2_

  - [ ] 4.12 Write property test for indexing error resilience
    - **Property 30: Indexing error resilience**
    - **Validates: Requirements 7.1**

- [ ] 5. Checkpoint - Ensure file indexing tests pass
  - Ensure all file indexing tests pass, ask the user if questions arise.

- [ ] 6. Implement search engine functionality
  - [ ] 6.1 Create SearchEngine with multi-modal search capabilities
    - Implement content-based search using database LIKE operations
    - Add filename and path search functionality
    - Create result deduplication by file path
    - _Requirements: 2.1, 2.2, 2.3, 4.5_

  - [ ] 6.2 Write property test for search execution
    - **Property 7: Search execution across content**
    - **Validates: Requirements 2.1**

  - [ ] 6.3 Write property test for filename search
    - **Property 8: Filename search matching**
    - **Validates: Requirements 2.2**

  - [ ] 6.4 Write property test for result deduplication
    - **Property 9: Search result deduplication**
    - **Validates: Requirements 2.3**

  - [ ] 6.5 Write property test for database search operations
    - **Property 20: Database content search operations**
    - **Validates: Requirements 4.5**

  - [ ] 6.6 Implement search result processing and ranking
    - Create relevance scoring based on match type and content similarity
    - Implement result ranking by score and modification time
    - Add snippet generation with context around query matches
    - Create fallback snippet from first content chunk
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 6.7 Write property test for result ranking
    - **Property 10: Search result ranking**
    - **Validates: Requirements 2.4**

  - [ ] 6.8 Write property test for snippet generation
    - **Property 11: Search snippet generation**
    - **Validates: Requirements 2.5**

  - [ ] 6.9 Add search performance tracking and result limiting
    - Implement query execution time measurement
    - Add result set limiting to prevent memory exhaustion
    - Create comprehensive search result structure with metadata
    - _Requirements: 2.7, 2.8, 8.3, 8.5_

  - [ ] 6.10 Write property test for result structure
    - **Property 12: Search result structure completeness**
    - **Validates: Requirements 2.7**

  - [ ] 6.11 Write property test for performance tracking
    - **Property 13: Search performance tracking**
    - **Validates: Requirements 2.8, 8.5**

  - [ ] 6.12 Write property test for result limiting
    - **Property 35: Search result limiting**
    - **Validates: Requirements 8.3**

  - [ ] 6.13 Implement search input validation and error handling
    - Add query parameter validation with meaningful error responses
    - Create error handling for invalid search parameters
    - _Requirements: 7.7_

  - [ ] 6.14 Write property test for input validation
    - **Property 34: Search input validation**
    - **Validates: Requirements 7.7**

- [ ] 7. Checkpoint - Ensure search engine tests pass
  - Ensure all search engine tests pass, ask the user if questions arise.

- [ ] 8. Implement AI manager and provider integration
  - [ ] 8.1 Create AIManager with provider detection capabilities
    - Implement API key format detection (OpenAI: "sk-", Anthropic: "sk-ant-", Google: "AIza")
    - Add provider configuration management
    - Create model fetching with fallback to predefined lists
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 8.2 Write property test for provider detection
    - **Property 14: AI provider detection by key format**
    - **Validates: Requirements 3.1**

  - [ ] 8.3 Write property test for model fetching
    - **Property 15: AI model fetching on successful detection**
    - **Validates: Requirements 3.5**

  - [ ] 8.4 Implement embedding generation for multiple providers
    - Add OpenAI embedding generation using text-embedding-3-small
    - Implement Google embedding generation using text-embedding-004
    - Create provider-specific embedding model selection
    - _Requirements: 3.7, 3.8, 3.9_

  - [ ] 8.5 Write property test for embedding generation
    - **Property 16: AI embedding generation with provider models**
    - **Validates: Requirements 3.7**

  - [ ] 8.6 Add AI error handling and validation
    - Implement graceful handling of API call failures
    - Add timeout handling for network requests
    - Create clear error messages for invalid API keys
    - _Requirements: 7.4, 7.5, 7.6_

  - [ ] 8.7 Write property test for network timeout handling
    - **Property 32: Network timeout handling**
    - **Validates: Requirements 7.5**

  - [ ] 8.8 Write property test for key validation errors
    - **Property 33: AI key validation error messaging**
    - **Validates: Requirements 7.6**

- [ ] 9. Checkpoint - Ensure AI integration tests pass
  - Ensure all AI integration tests pass, ask the user if questions arise.

- [ ] 10. Implement REST API layer with Axum
  - [ ] 10.1 Create Axum server with routing and middleware
    - Set up server binding on localhost:3001
    - Configure CORS middleware for allowed origins
    - Create route handlers for all endpoints
    - _Requirements: 5.1, 5.6, 5.7_

  - [ ] 10.2 Write property test for CORS handling
    - **Property 26: API CORS header handling**
    - **Validates: Requirements 5.7**

  - [ ] 10.3 Implement health check endpoint
    - Create GET /health endpoint with service status
    - Add component health checking (database, indexer)
    - Return structured health response with version info
    - _Requirements: 5.2, 8.7_

  - [ ] 10.4 Write property test for health endpoint
    - **Property 23: API health endpoint response structure**
    - **Validates: Requirements 5.2**

  - [ ] 10.5 Write property test for health monitoring
    - **Property 36: System health monitoring**
    - **Validates: Requirements 8.7**

  - [ ] 10.6 Implement AI provider detection endpoint
    - Create POST /api/v1/ai/detect-provider endpoint
    - Add API key validation and provider information response
    - _Requirements: 5.3_

  - [ ] 10.7 Write property test for provider detection endpoint
    - **Property 24: API provider detection endpoint behavior**
    - **Validates: Requirements 5.3**

  - [ ] 10.8 Implement search endpoint
    - Create GET /api/v1/search endpoint with query parameter processing
    - Add search result formatting and response structure
    - _Requirements: 5.4_

  - [ ] 10.9 Write property test for search endpoint
    - **Property 25: API search endpoint processing**
    - **Validates: Requirements 5.4**

  - [ ] 10.10 Implement indexing trigger endpoint
    - Create POST /api/v1/index/start endpoint
    - Add indexing initiation with acceptance status response
    - _Requirements: 5.5_

  - [ ] 10.11 Add comprehensive API error handling
    - Implement error response formatting with appropriate HTTP status codes
    - Add database error response handling
    - Create descriptive error messages for all failure scenarios
    - _Requirements: 5.8, 7.3_

  - [ ] 10.12 Write property test for API error responses
    - **Property 27: API error response formatting**
    - **Validates: Requirements 5.8**

  - [ ] 10.13 Write property test for database error responses
    - **Property 31: Database error response formatting**
    - **Validates: Requirements 7.3**

- [ ] 11. Integration and system wiring
  - [ ] 11.1 Wire all components together in main application
    - Initialize all components with proper dependency injection
    - Set up shared state management across components
    - Create application startup sequence with proper error handling
    - _Requirements: 1.1, 6.1, 6.2_

  - [ ] 11.2 Write integration tests for complete workflows
    - Test end-to-end file indexing and search workflows
    - Verify component interactions and data flow
    - _Requirements: All requirements_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive development from the start
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and catch issues early
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation builds incrementally from core infrastructure to complete functionality