# Skhoot v0.1.8 Release Notes

**Release Date**: January 30, 2026  
**Commits Since v0.1.7**: 15  
**Previous Tag**: v0.1.7

---

## 🎯 New Features

### Comprehensive Animation System for Tool Calls
- **6 new animation components** for different tool categories:
  - File Operations (Blue) - File reads, writes, creates, deletes
  - Web Access (Green) - Web searches, content fetching, image searches
  - Command Execution (Orange) - Shell commands, terminal operations
  - Agent Operations (Pink) - Agent management, workflow execution
  - Code Analysis (Cyan) - Code inspection, diagnostics, analysis
  - Search & Discovery (Purple) - File search, memory search, discovery tools
- **AnimationToolcall UI component** for consistent animation rendering across all tool types
- **3-tier priority system** in SearchingIndicator for intelligent animation detection
- **Smooth visual transitions** from connection phase through tool execution
- **LoadingAnimations shared utility** for centralized animation state management
- **Comprehensive documentation** covering animation consistency, flow diagrams, integration patterns, and sticky system behavior

### Workflow Execution API & Engine Integration
- **Complete workflow execution API** with REST endpoints for CRUD operations
- **Workflow execution endpoints**: execute, get status, list active workflows, cancel execution
- **Execution context management** with persistence to disk
- **WorkflowEngine and WorkflowStorage** integrated into AppState
- **ChatInterface workflow execution support** for running workflows directly from chat
- **WorkflowsPanel execution status tracking** with real-time controls
- **WorkflowExecutor service** for managing workflow execution lifecycle
- **Agent workflow integration** - agents can discover, execute, and monitor workflows through chat
- **Workflow tools for agents** integrated into ToolExecutor for AI-driven automation

### Workflow Cancellation Support
- **AbortController integration** for proper cancellation signal propagation
- **Immediate cancellation checks** throughout execution loop to stop processing instantly
- **Actual context status display** instead of hardcoded 'completed' status
- **Cancelled workflow notifications** with appropriate messaging for background workflows
- **Cancellation message display** in chat when non-background workflow is cancelled
- **Cancel button in waiting state** for better UX during workflow pauses
- **Graceful workflow stopping** when cancelled during any execution phase

### Enhanced Web Search Capabilities
- **SearXNG image search fallback** with multiple public instances for improved reliability
- **VQD token retrieval** for DuckDuckGo image search API authentication
- **Graceful error handling** with fallback chain when primary image search fails
- **Enhanced HTTP headers and timeouts** for better compatibility with search APIs
- **Comprehensive logging** at each stage of image search process
- **Improved search result formatting** in ChatInterface
- **WorkflowExecutor image search integration** for workflow context
- **Increased timeout from 10s to 15s** for more reliable image search completion

### Memory Search UI Component
- **MemorySearchUI component** for displaying memory_search tool results
- **Category icons and metadata display** for better memory visualization
- **Memory-operations module** with index exports for tool-call registry integration
- **Dynamic welcome messages** feature in AI Chat Interface
- **Memory search in Search & Discovery category** (Purple) alongside other search tools
- **Long-term memory context retrieval** capabilities for agents

### Improved File Detection in Chat
- **Automatic file path detection** in chat responses using regex pattern matching
- **Explicit tracking** of agent-generated files vs heuristically detected files
- **Distinction between "Modified files" and "Referenced files"** in UI
- **File extension validation** to filter out folder paths in heuristic detection
- **Actual shell command success status** instead of always marking as successful
- **Generated files collection** across tool execution pipeline in agentChatService
- **Prevention of AI-mentioned paths** from being treated as created files

---

## 🚀 Improvements

### UI/UX Enhancements

#### Fuku Button Variant
- **New 'fuku' button variant** with custom styling (#c0b7c9 background)
- **Dynamic quick action grid layout** that calculates columns based on available actions
- **Filtered null/undefined quick actions** before rendering
- **Improved responsive layout** for quick action buttons with dynamic grid template columns

#### Animation Container Fix
- **Removed overflow-hidden** from AnimationToolcall container
- **Proper content display** outside container bounds when needed
- **Fixed potential clipping issues** with animation elements
- **Maintained styling** including relative positioning and flexbox layout

#### Panel Management
- **Complete panel closing logic** to prevent UI overlap
- **Close ActivityPanel and AgentsPanel** when opening Terminal, File Explorer, or Workflows
- **Only one action button panel visible** at a time
- **Updated handleQuickActionMode** to close all other panels for each mode switch
- **Panel closing on event listeners** for handleAITerminalCreated and handleOpenTerminalPanel

### Agent & Chat Improvements

#### File Detection Accuracy
- **Only apply file path heuristics** when agent doesn't provide explicit file list
- **Prevent false positives** from AI-mentioned paths
- **Detect shell-created files** only when command execution is successful
- **Deduplicate detected files** using Set to prevent duplicates
- **Consistent file list message structure** across different detection methods

#### Agent Communication
- **Natural language summaries** after tool execution
- **Explicit instructions** for post-tool responses in PromptBuilder
- **Detection and forced generation** of summaries for empty responses
- **Contextual explanations** instead of empty responses after tool execution

---

## 📚 Documentation

### Animation System Documentation
- **ANIMATION_CONSISTENCY_FIX.md** - Animation consistency implementation details
- **ANIMATION_FLOW_DIAGRAM.md** - Visual flow diagrams for animation states
- **ANIMATION_INTEGRATION.md** - Integration patterns and best practices
- **ANIMATION_INTEGRATION_COMPLETE.md** - Complete integration guide
- **ANIMATION_STICKY_SYSTEM.md** - Sticky system behavior documentation
- **ANIMATION_SYSTEM_FINAL.md** - Final animation system architecture

### Session & Task Documentation
- **SESSION_SUMMARY.md** - Animation system implementation and task complete fix
- **TASK_COMPLETE_FIX.md** - Detailed explanation of empty response handling
- **PANEL_OVERLAP_FIX.md** - Panel overlap fix and solution documentation

### Feature Documentation
- **Enhanced README.md** with communication feature highlighting
- **File Attachment Management** feature details
- **Memory search tool documentation** and animation category classification
- **Workflow execution capabilities** and agent integration

---

## 🔧 Refactors

### Tool Call Registry Updates
- **Animation integration** for all tool types in ToolCallRegistry
- **Memory search registration** in Search & Discovery category
- **Updated tool-call registry exports** to include new components
- **Improved tool documentation** with memory search capabilities

### Service Layer Improvements
- **WorkflowExecutor refactoring** to handle image search results in workflow context
- **WorkflowService integration** with enhanced search result handling
- **ToolRegistry updates** with new image search capabilities
- **BackendApi workflow endpoints** for comprehensive workflow management

---

## 🐛 Bug Fixes

### UI Fixes
- **Fixed overflow-hidden clipping** in AnimationToolcall container
- **Fixed panel overlap** by implementing proper panel closing logic
- **Fixed quick action grid layout** to handle dynamic action counts
- **Fixed "Add to Chat" button** to use correct event name in Images tab

### Agent Fixes
- **Fixed file detection false positives** from AI-mentioned paths
- **Fixed shell command success status** to use actual execution results
- **Fixed empty agent responses** by forcing natural language summaries
- **Fixed file path heuristics** to only apply when agent doesn't provide explicit list

### Workflow Fixes
- **Fixed workflow cancellation** to stop processing immediately
- **Fixed context status display** to show actual status instead of hardcoded values
- **Fixed cancel button visibility** to show during waiting state
- **Fixed spinner animation** removal when workflow is in waiting state

---

## 🔍 Discoveries

### Animation Priority System
The 3-tier priority system in SearchingIndicator solved the challenge of intelligent animation detection. By checking tool name first, then search type, then status messages, we achieved smooth transitions without jarring animation switches. This pattern can be extended to other dynamic UI components.

### Workflow Cancellation Architecture
Implementing AbortController throughout the workflow execution pipeline revealed the importance of cancellation checks at every async boundary. The pattern of checking cancellation before and after each major operation ensures immediate responsiveness to user cancellation requests.

### File Detection Heuristics
The distinction between agent-generated files and heuristically detected files solved a fundamental problem: AI models often mention file paths in explanations without actually creating them. By only applying heuristics when the agent doesn't provide an explicit file list, we dramatically reduced false positives.

### Panel State Management
The panel overlap issue revealed that React state updates for multiple panels need explicit coordination. The solution of closing all other panels before opening a new one ensures consistent UI state and prevents z-index conflicts.

---

## 🎯 What Comes Next

### High Priority
- **Enhanced workflow templates** with more pre-built automation patterns
- **Workflow marketplace** for sharing and discovering community workflows
- **Advanced animation customization** allowing users to configure animation preferences
- **Memory system enhancements** with semantic clustering and better search
- **Multi-workspace support** for managing multiple projects simultaneously

### Medium Priority
- **Workflow debugging tools** for inspecting execution state and variables
- **Animation performance optimizations** for smoother rendering on lower-end hardware
- **File operation batching** for improved performance with large file sets
- **Enhanced terminal integration** with split panes and session management
- **Collaborative workflows** for team-based automation

### Low Priority
- **Custom animation themes** beyond the default color scheme
- **Workflow scheduling** for time-based automation
- **Advanced file detection patterns** with configurable regex rules
- **Panel layout customization** allowing users to arrange panels
- **Export/import workflow collections** for easy sharing

---

## 📦 Installation

### Desktop Apps
Download platform-specific installers from the [GitHub Releases page](https://github.com/tristo-bit/Skhoot/releases/tag/v0.1.8):

- **Linux**: `.deb` (Debian/Ubuntu) or `.AppImage` (universal)
- **macOS**: `.dmg` installer
- **Windows**: `.msi` or `.exe` installer

### Web Version
Access the web version at: [https://tristo-bit.github.io/Skhoot/](https://tristo-bit.github.io/Skhoot/)

**Note**: Web version requires a running backend server for full functionality.

---

## 🙏 Acknowledgments

Thank you to all contributors and users who provided feedback and bug reports for this release!

---

**Full Changelog**: https://github.com/tristo-bit/Skhoot/compare/v0.1.7...v0.1.8
