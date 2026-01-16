# Implementation Plan: Skhoot v0.1.5

## Overview

This implementation plan converts the Skhoot v0.1.5 design into discrete coding tasks that build incrementally. The approach focuses on establishing backend services first, then frontend components, followed by AI integration, and finally async operations. Tasks are organized by the 8 major feature areas from the v0.1.5 plan.

## Tasks

- [x] 1. Set up AI Terminal Tools integration
  - [x] 1.1 Create Terminal Tools definitions in services/agentTools/
    - Define tool schemas for create_terminal, execute_command, read_output, list_terminals, inspect_terminal
    - Implement tool handlers using existing TerminalService
    - Add terminal state inspection methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Write property test for terminal creation
    - **Property 1: Terminal creation returns session ID**
    - **Validates: Requirements 1.1**

  - [x] 1.3 Write property test for command routing
    - **Property 2: Command routing to correct session**
    - **Validates: Requirements 1.2**

  - [x] 1.4 Write property test for output streaming
    - **Property 3: Real-time output streaming**
    - **Validates: Requirements 1.3**

  - [x] 1.5 Integrate Terminal Tools with Agent Service
    - Register terminal tools in agent session on startup
    - Add terminal output streaming to AI context
    - Implement structured error messages for AI retry
    - _Requirements: 1.8_

  - [x] 1.6 Write property test for structured error messages
    - **Property 8: Structured error messages**
    - **Validates: Requirements 1.8**

  - [x] 1.7 Add AI Control badge to Terminal Interface
    - Add "AI Control" badge for AI-created terminals
    - Show AI attribution in terminal history
    - Display workspace root in terminal header
    - _Requirements: 1.6, 1.7_

  - [x] 1.8 Write property test for AI badge display
    - **Property 6: AI control badge display**
    - **Validates: Requirements 1.6**

  - [x] 1.9 Display AI-created terminals in Terminal Panel
    - Emit 'ai-terminal-created' event when AI creates terminal
    - Listen for event in TerminalPanel and auto-create tabs
    - Auto-open Terminal Panel when AI creates terminal
    - Display terminals with AI badge and workspace root
    - _Requirements: 1.6, 1.7_

- [ ] 2. Implement AI Workspace Management
  - [ ] 2.1 Create Workspace Manager backend service (Rust)
    - Implement workspace directory structure creation
    - Add workspace initialization endpoint
    - Create workspace info query endpoint
    - Add workspace migration endpoint
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 2.2 Write property test for directory structure
    - **Property 9: Workspace directory structure initialization**
    - **Validates: Requirements 2.2**

  - [ ] 2.3 Write property test for path validation
    - **Property 10: Workspace path validation**
    - **Validates: Requirements 2.3**

  - [ ] 2.4 Write property test for data migration
    - **Property 11: Workspace data migration**
    - **Validates: Requirements 2.4**

  - [ ] 2.5 Create AI Workspace Service (TypeScript)
    - Implement workspace initialization
    - Add workspace info retrieval
    - Create workspace root configuration
    - Add workspace cleanup method
    - _Requirements: 2.1, 2.7, 2.8_

  - [ ] 2.6 Write property test for selective cleanup
    - **Property 14: Selective workspace cleanup**
    - **Validates: Requirements 2.7**

  - [ ] 2.7 Implement AGENTS.md support
    - Add AGENTS.md check on agent session start
    - Integrate AGENTS.md content into system prompt
    - Create AGENTS.md template for users
    - Add AGENTS.md reload on update
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ] 2.8 Write property test for AGENTS.md integration
    - **Property 23: AGENTS.md content integration**
    - **Validates: Requirements 4.2**

  - [ ] 2.9 Create Workspace Settings UI
    - Add workspace location selector
    - Show workspace size and file count
    - Display AGENTS.md presence indicator
    - Add workspace cleanup button
    - _Requirements: 3.1, 3.6, 4.6_

  - [ ] 2.10 Write property test for workspace info display
    - **Property 20: Workspace info display completeness**
    - **Validates: Requirements 3.6**

- [ ] 3. Checkpoint - Ensure workspace and terminal integration tests pass
  - Ensure all workspace and terminal tests pass, ask the user if questions arise.


- [ ] 4. Implement Disk Management UI
  - [ ] 4.1 Create Disk Service with real-time monitoring
    - Implement disk usage polling (5 second interval)
    - Add subscription mechanism for updates
    - Create visualization data generation
    - Add caching for performance
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 4.2 Write property test for disk usage updates
    - **Property 28: Disk usage update latency**
    - **Validates: Requirements 5.2**

  - [ ] 4.3 Write property test for multi-drive display
    - **Property 30: Multi-drive separate display**
    - **Validates: Requirements 5.4**

  - [ ] 4.4 Create Disk Panel component
    - Implement SecondaryPanel-based disk panel
    - Add real-time disk usage display
    - Create warning indicators (90%, 95% thresholds)
    - Add detailed breakdown tooltips
    - _Requirements: 5.1, 5.5, 5.6, 5.7_

  - [ ] 4.5 Write property test for tooltip display
    - **Property 31: Detailed breakdown tooltip on hover**
    - **Validates: Requirements 5.7**

  - [ ] 4.6 Implement interactive disk visualizations
    - Create interactive bar chart component
    - Add pie chart for file types
    - Implement drill-down navigation
    - Add breadcrumb navigation
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ] 4.7 Write property test for drill-down
    - **Property 33: Chart drill-down functionality**
    - **Validates: Requirements 6.2**

  - [ ] 4.8 Write property test for breadcrumb navigation
    - **Property 37: Breadcrumb navigation after zoom**
    - **Validates: Requirements 6.6**

  - [ ] 4.9 Add chart enhancements
    - Implement hover tooltips with size/percentage
    - Add small segment aggregation into "Other"
    - Create top 10 largest directories display
    - _Requirements: 6.4, 6.5, 6.7_

  - [ ] 4.10 Write property test for small segment aggregation
    - **Property 36: Small segment aggregation**
    - **Validates: Requirements 6.5**

- [ ] 5. Implement Analysis UI and Backend
  - [ ] 5.1 Enhance Disk Analyzer backend (Rust)
    - Add file type categorization
    - Implement large file detection
    - Create duplicate file finder with hashing
    - Add analysis result caching
    - _Requirements: 7.1, 7.3, 8.1, 9.1_

  - [ ] 5.2 Write property test for file categorization
    - **Property 39: File categorization by extension**
    - **Validates: Requirements 7.1**

  - [ ] 5.3 Write property test for duplicate detection
    - **Property 55: Duplicate file hash computation**
    - **Validates: Requirements 9.1**

  - [ ] 5.4 Create Analysis Service (TypeScript)
    - Integrate with backend disk analyzer
    - Implement analysis result caching
    - Add AI suggestion generation
    - Create suggestion dismissal tracking
    - _Requirements: 7.8, 10.1, 10.7, 10.8_

  - [ ] 5.5 Write property test for result caching
    - **Property 46: Analysis result caching**
    - **Validates: Requirements 7.8**

  - [ ] 5.6 Write property test for AI suggestions
    - **Property 63: AI optimization suggestion generation**
    - **Validates: Requirements 10.1**

  - [ ] 5.7 Create Analysis Panel component
    - Implement file type breakdown visualization
    - Add large file detection UI
    - Create duplicate file finder UI
    - Display AI optimization suggestions
    - _Requirements: 7.1, 7.2, 8.1, 9.1, 10.1_

  - [ ] 5.8 Write property test for breakdown display
    - **Property 40: Breakdown display completeness**
    - **Validates: Requirements 7.2**

  - [ ] 5.9 Write property test for duplicate grouping
    - **Property 56: Duplicate file grouping**
    - **Validates: Requirements 9.2**

  - [ ] 5.10 Add analysis panel interactions
    - Implement category drill-down
    - Add file list pagination (50 per page)
    - Create large file filtering
    - Add duplicate bulk actions
    - _Requirements: 7.5, 7.6, 8.8, 9.5_

  - [ ] 5.11 Write property test for pagination
    - **Property 44: Large file list pagination**
    - **Validates: Requirements 7.6**

  - [ ] 5.12 Write property test for bulk actions
    - **Property 59: Duplicate bulk action availability**
    - **Validates: Requirements 9.5**

- [ ] 6. Checkpoint - Ensure disk and analysis tests pass
  - Ensure all disk and analysis tests pass, ask the user if questions arise.


- [ ] 7. Implement Cleanup System
  - [ ] 7.1 Create Cleanup Manager backend (Rust)
    - Implement batch delete with trash support
    - Add archive creation with compression (zstd/gzip)
    - Create archive integrity verification
    - Add cleanup history tracking
    - _Requirements: 11.4, 12.2, 12.3, 13.1_

  - [ ] 7.2 Write property test for batch delete
    - **Property 79: Batch delete to trash**
    - **Validates: Requirements 12.2**

  - [ ] 7.3 Write property test for archive creation
    - **Property 80: Batch archive creation**
    - **Validates: Requirements 12.3**

  - [ ] 7.4 Write property test for integrity verification
    - **Property 103: Archive integrity verification**
    - **Validates: Requirements 15.4**

  - [ ] 7.5 Create Archive Manager backend (Rust)
    - Implement archive space management
    - Add archive browsing without extraction
    - Create file extraction from archives
    - Add compression ratio calculation
    - _Requirements: 15.1, 15.3, 15.6, 15.7_

  - [ ] 7.6 Write property test for archive browsing
    - **Property 105: Archive browsing without extraction**
    - **Validates: Requirements 15.6**

  - [ ] 7.7 Write property test for file extraction
    - **Property 106: Archive file extraction**
    - **Validates: Requirements 15.7**

  - [ ] 7.8 Create Cleanup Service (TypeScript)
    - Implement batch cleanup operations
    - Add progress tracking with subscriptions
    - Create history management
    - Add undo/restore functionality
    - _Requirements: 11.5, 12.1, 13.1, 14.1_

  - [ ] 7.9 Write property test for progress tracking
    - **Property 74: Real-time cleanup progress**
    - **Validates: Requirements 11.5**

  - [ ] 7.10 Write property test for history recording
    - **Property 86: Cleanup operation recording**
    - **Validates: Requirements 13.1**

  - [ ] 7.11 Create Cleanup Panel component
    - Implement cleanup recommendations display
    - Add category grouping UI
    - Create batch action buttons
    - Display real-time progress
    - _Requirements: 11.1, 11.2, 12.1, 11.5_

  - [ ] 7.12 Write property test for recommendation display
    - **Property 70: Cleanup recommendations display**
    - **Validates: Requirements 11.1**

  - [ ] 7.13 Write property test for batch action enablement
    - **Property 78: Batch action button enablement**
    - **Validates: Requirements 12.1**

  - [ ] 7.14 Add cleanup panel features
    - Implement cleanup history view
    - Add undo/restore buttons
    - Create history filtering
    - Add CSV export functionality
    - _Requirements: 13.2, 13.4, 13.7, 13.8_

  - [ ] 7.15 Write property test for undo availability
    - **Property 89: Trash cleanup undo availability**
    - **Validates: Requirements 13.4**

  - [ ] 7.16 Write property test for history filtering
    - **Property 92: History filtering support**
    - **Validates: Requirements 13.7**

  - [ ] 7.17 Implement archive space UI
    - Add archive space configuration
    - Display archive list with compression ratios
    - Create archive browsing interface
    - Add restore from archive functionality
    - _Requirements: 15.2, 15.5, 15.6, 15.7_

  - [ ] 7.18 Write property test for archive display
    - **Property 104: Archive display completeness**
    - **Validates: Requirements 15.5**

- [ ] 8. Checkpoint - Ensure cleanup system tests pass
  - Ensure all cleanup system tests pass, ask the user if questions arise.

- [ ] 9. Implement Workflow System
  - [ ] 9.1 Create Workflow Engine (TypeScript)
    - Implement sequential step execution
    - Add context passing between steps
    - Create step result storage
    - Add workflow state management
    - _Requirements: 17.1, 17.2, 17.3, 17.8_

  - [ ] 9.2 Write property test for sequential execution
    - **Property 108: Sequential step execution**
    - **Validates: Requirements 17.1**

  - [ ] 9.3 Write property test for context passing
    - **Property 109: Context passing between steps**
    - **Validates: Requirements 17.2**

  - [ ] 9.4 Write property test for state events
    - **Property 115: Workflow state change events**
    - **Validates: Requirements 17.8**

  - [ ] 9.5 Add workflow control features
    - Implement conditional step branching
    - Add workflow pause/resume
    - Create workflow cancellation
    - Add final result aggregation
    - _Requirements: 17.4, 17.5, 17.6, 17.7_

  - [ ] 9.6 Write property test for conditional branching
    - **Property 112: Conditional step branching**
    - **Validates: Requirements 17.5**

  - [ ] 9.7 Write property test for graceful cancellation
    - **Property 114: Graceful workflow cancellation**
    - **Validates: Requirements 17.7**

  - [ ] 9.8 Integrate Workflow with AI
    - Add AI step execution via Agent Service
    - Implement context provision to AI
    - Create AI result validation
    - Add retry logic for invalid results
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ] 9.9 Write property test for AI step execution
    - **Property 116: AI step execution via Agent Service**
    - **Validates: Requirements 18.1**

  - [ ] 9.10 Write property test for AI result validation
    - **Property 118: AI result validation**
    - **Validates: Requirements 18.3**

  - [ ] 9.11 Add AI workflow features
    - Allow tool execution in workflow context
    - Maintain conversation context across steps
    - Add progress indicators for long AI steps
    - Provide error handling with retry/skip options
    - _Requirements: 18.5, 18.6, 18.7, 18.8_

  - [ ] 9.12 Write property test for conversation context
    - **Property 123: Conversation context across AI steps**
    - **Validates: Requirements 18.8**

  - [ ] 9.13 Create Workflow Panel component
    - Implement real-time step progress display
    - Add step result visualization
    - Create workflow completion summary
    - Add result export functionality
    - _Requirements: 19.1, 19.2, 19.4, 19.8_

  - [ ] 9.14 Write property test for progress display
    - **Property 124: Real-time step progress display**
    - **Validates: Requirements 19.1**

  - [ ] 9.15 Write property test for completion summary
    - **Property 127: Workflow completion summary**
    - **Validates: Requirements 19.4**

  - [ ] 9.16 Add workflow result rendering
    - Implement result formatting by type (text, JSON, files)
    - Add file result links
    - Create data result rendering (table, chart)
    - Add failed step highlighting
    - _Requirements: 19.3, 19.5, 19.6, 19.7_

  - [ ] 9.17 Write property test for result formatting
    - **Property 126: Result formatting by type**
    - **Validates: Requirements 19.3**

  - [ ] 9.18 Implement Workflow Templates
    - Create template system with parameters
    - Add built-in and user template loading
    - Implement template instantiation
    - Add save workflow as template
    - _Requirements: 20.1, 20.2, 20.3, 20.7_

  - [ ] 9.19 Write property test for template instantiation
    - **Property 134: Template instantiation**
    - **Validates: Requirements 20.3**

  - [ ] 9.20 Write property test for template customization
    - **Property 136: Template customization before execution**
    - **Validates: Requirements 20.5**

  - [ ] 9.21 Create Demo Workflow Templates
    - Implement disk cleanup demo workflow
    - Add code analysis demo workflow
    - Create file organization demo workflow
    - Add educational tooltips and summaries
    - _Requirements: 21.1, 21.3, 21.4, 21.5_

  - [ ] 9.22 Write property test for demo template inclusion
    - **Property 140: Demo template inclusion**
    - **Validates: Requirements 21.1**

  - [ ] 9.23 Write property test for demo safe operations
    - **Property 145: Demo safe operations**
    - **Validates: Requirements 21.6**

- [ ] 10. Checkpoint - Ensure workflow system tests pass
  - Ensure all workflow system tests pass, ask the user if questions arise.


- [ ] 11. Implement Async AI Operations
  - [ ] 11.1 Create Async Task Processor backend (Rust)
    - Implement task queue with priority system
    - Add Tokio async runtime integration
    - Create task persistence for restart
    - Add WebSocket progress streaming
    - _Requirements: 22.1, 22.2, 27.2, 27.3_

  - [ ] 11.2 Write property test for priority assignment
    - **Property 149: Priority assignment by task type**
    - **Validates: Requirements 22.2**

  - [ ] 11.3 Write property test for task persistence
    - **Property 154: Pending task persistence**
    - **Validates: Requirements 22.8**

  - [ ] 11.4 Write property test for progress streaming
    - **Property 189: Progress event streaming**
    - **Validates: Requirements 27.3**

  - [ ] 11.5 Add backend task management
    - Implement task cancellation handling
    - Add result caching with TTL
    - Create thread pool for CPU-bound operations
    - Add error logging with context
    - _Requirements: 27.4, 27.5, 27.6, 27.7_

  - [ ] 11.6 Write property test for cancellation handling
    - **Property 191: Cancellation signal handling**
    - **Validates: Requirements 27.5**

  - [ ] 11.7 Write property test for result caching
    - **Property 190: Result caching with TTL**
    - **Validates: Requirements 27.4**

  - [ ] 11.8 Create Task Queue service (TypeScript)
    - Implement task enqueue with immediate return
    - Add priority-based execution
    - Create task cancellation method
    - Add progress event subscriptions
    - _Requirements: 22.1, 22.3, 23.1, 22.4_

  - [ ] 11.9 Write property test for immediate return
    - **Property 148: Immediate task enqueue return**
    - **Validates: Requirements 22.1**

  - [ ] 11.10 Write property test for priority execution
    - **Property 150: High-priority task execution first**
    - **Validates: Requirements 22.3**

  - [ ] 11.11 Add task queue features
    - Implement retry with exponential backoff
    - Add result caching and retrieval
    - Create task history tracking
    - Add queue capacity management
    - _Requirements: 22.5, 22.6, 26.1, 22.7_

  - [ ] 11.12 Write property test for retry backoff
    - **Property 153: Task retry with exponential backoff**
    - **Validates: Requirements 22.6**

  - [ ] 11.13 Write property test for result caching
    - **Property 152: Task result caching**
    - **Validates: Requirements 22.5**

  - [ ] 11.14 Create Worker Pool service (TypeScript)
    - Implement concurrent request handling
    - Add worker health monitoring
    - Create rate limit tracking per provider
    - Add dynamic pool size adjustment
    - _Requirements: 24.1, 24.6, 24.4, 24.8_

  - [ ] 11.15 Write property test for concurrent processing
    - **Property 163: Concurrent request processing up to pool size**
    - **Validates: Requirements 24.1**

  - [ ] 11.16 Write property test for rate limiting
    - **Property 166: Provider rate limit respect**
    - **Validates: Requirements 24.4**

  - [ ] 11.17 Add worker pool features
    - Implement request queuing at capacity
    - Add unhealthy worker retry logic
    - Create rate limit delay mechanism
    - Add exponential backoff for all unhealthy
    - _Requirements: 24.2, 24.6, 24.5, 24.7_

  - [ ] 11.18 Write property test for request queuing
    - **Property 164: Request queuing at capacity**
    - **Validates: Requirements 24.2**

  - [ ] 11.19 Write property test for unhealthy worker retry
    - **Property 168: Unhealthy worker retry**
    - **Validates: Requirements 24.6**

  - [ ] 11.20 Create Task Progress UI component
    - Implement progress indicator display
    - Add percentage and status updates
    - Create estimated time remaining display
    - Add multi-phase progress visualization
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

  - [ ] 11.21 Write property test for progress display
    - **Property 171: Progress indicator display on operation start**
    - **Validates: Requirements 25.1**

  - [ ] 11.22 Write property test for time estimation
    - **Property 173: Estimated time remaining display**
    - **Validates: Requirements 25.3**

  - [ ] 11.23 Add progress UI features
    - Implement smooth transition animations
    - Add completion animation
    - Create error state with retry option
    - Add multiple operation progress list
    - _Requirements: 25.5, 25.6, 25.7, 25.8_

  - [ ] 11.24 Write property test for multiple operations
    - **Property 178: Multiple operation progress list**
    - **Validates: Requirements 25.8**

  - [ ] 11.25 Create Task History UI
    - Implement task history display
    - Add history entry detail view
    - Create history filtering
    - Add history pagination (20 per page)
    - _Requirements: 26.1, 26.3, 26.7, 26.6_

  - [ ] 11.26 Write property test for history recording
    - **Property 179: Task history recording**
    - **Validates: Requirements 26.1**

  - [ ] 11.27 Write property test for history filtering
    - **Property 185: History filtering support**
    - **Validates: Requirements 26.7**

  - [ ] 11.28 Add task history features
    - Display file result links
    - Show error messages and stack traces
    - Add history clear with confirmation
    - Preserve results cache on clear
    - _Requirements: 26.4, 26.5, 26.8_

  - [ ] 11.29 Write property test for file result links
    - **Property 182: File result links in history**
    - **Validates: Requirements 26.4**

- [ ] 12. Checkpoint - Ensure async operations tests pass
  - Ensure all async operations tests pass, ask the user if questions arise.

- [ ] 13. Implement UI Responsiveness
  - [ ] 13.1 Add non-blocking UI during AI operations
    - Ensure UI doesn't block on AI operation start
    - Allow navigation during operations
    - Add non-intrusive completion notifications
    - _Requirements: 28.1, 28.2, 28.3_

  - [ ] 13.2 Write property test for non-blocking UI
    - **Property 195: Non-blocking UI during AI operations**
    - **Validates: Requirements 28.1**

  - [ ] 13.3 Write property test for navigation
    - **Property 196: Navigation during AI operations**
    - **Validates: Requirements 28.2**

  - [ ] 13.4 Add operation indicators in header
    - Display operation count in header
    - Show active operations list on click
    - Add automatic view updates on results
    - _Requirements: 28.4, 28.5, 28.6_

  - [ ] 13.5 Write property test for operation count display
    - **Property 198: Operation count display in header**
    - **Validates: Requirements 28.4**

  - [ ] 13.6 Write property test for automatic updates
    - **Property 200: Automatic view updates on result**
    - **Validates: Requirements 28.6**

  - [ ] 13.7 Add error notifications and close warnings
    - Display error notifications with details
    - Warn about pending operations on close
    - Offer to continue in background
    - _Requirements: 28.7, 28.8_

  - [ ] 13.8 Write property test for error notifications
    - **Property 201: Error notification with details**
    - **Validates: Requirements 28.7**

  - [ ] 13.9 Write property test for close warning
    - **Property 202: Pending operations warning on close**
    - **Validates: Requirements 28.8**

- [ ] 14. Integration and System Wiring
  - [ ] 14.1 Wire all backend services
    - Connect Terminal Manager to backend HTTP server
    - Integrate Disk Analyzer with backend
    - Wire Cleanup Manager and Archive Manager
    - Connect Async Task Processor
    - Connect Workspace Manager
    - _Requirements: All backend requirements_

  - [ ] 14.2 Wire all frontend services
    - Connect Terminal Service to backend APIs
    - Integrate Disk Service with backend
    - Wire Analysis Service with backend
    - Connect Cleanup Service to backend
    - Integrate Workflow Engine with backend
    - Connect Task Queue and Worker Pool
    - _Requirements: All frontend requirements_

  - [ ] 14.3 Integrate AI components
    - Wire Terminal Tools with Agent Service
    - Connect Workflow AI Executor
    - Integrate Analysis AI Suggester
    - Ensure tool execution in workflows
    - _Requirements: 1.1-1.8, 18.1-18.8, 10.1_

  - [ ] 14.4 Write integration tests for complete workflows
    - Test end-to-end AI terminal command execution
    - Test complete disk analysis and cleanup workflow
    - Test workflow execution with AI steps
    - Test async task queue with backend processing
    - Test workspace management with AGENTS.md
    - _Requirements: All requirements_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and catch issues early
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation builds incrementally: backend → frontend → AI integration → async operations
- Backend services use Rust in /backend directory (not src-tauri)
- Frontend services use TypeScript with React components
- All async operations use Tokio runtime for efficiency
- WebSocket/SSE used for real-time progress streaming
- Result caching with TTL for performance optimization
