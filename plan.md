# Skhoot v0.1.5 Implementation Plan

**Milestone**: v0.1.5  
**Assignee**: @Zacxxx  
**Total Issues**: 8  
**Status**: Planning Phase  
**Created**: 2026-01-16

---

## 📋 Overview

This plan addresses 8 critical features for the v0.1.5 milestone, focusing on AI-terminal integration, disk management UI, workflow automation, and async AI operations. The implementation will enhance Skhoot's core capabilities as a GUI for CLI agents with unrestricted system access.

---

## 🎯 Issues Summary

### Terminal & AI Integration (Issues #4, #5)
- **#4**: AI can open terminals in the terminal interface
- **#5**: AI can view and interact with terminals in the terminal interface

### System Management (Issue #6)
- **#6**: Setup location for the AI in the user's disk

### UI Panels - Full Functionalities (Issues #9, #10, #11, #13)
- **#9**: Disk UI full functionalities
- **#10**: Analysis UI full functionalities
- **#11**: Cleanup UI full functionalities
- **#13**: Workflow UI functionalities

### Performance (Issue #15)
- **#15**: Async AI actions

---

## 🔍 Current State Analysis

### ✅ What Already Exists

#### Terminal Infrastructure
- **TerminalPanel** (`components/terminal/TerminalPanel.tsx`): Tab-based terminal UI with shell/codex/skhoot-log support
- **TerminalService** (`services/terminalService.ts`): Session management, command execution, output streaming
- **Backend Terminal Manager** (`backend/src/terminal/`): Rust-based PTY sessions, HTTP API endpoints
- **AgentService** (`services/agentService.ts`): CLI agent session lifecycle, tool execution, event system
- **AgentLogTab** (`components/terminal/AgentLogTab.tsx`): Real-time agent activity visualization

#### Disk Management
- **DiskAnalyzer** (`backend/src/disk_analyzer/`): Rust-based disk analysis with space consumption tracking
- **DiskUsage Component** (`components/conversations/DiskUsage.tsx`): Basic disk visualization in chat
- **DiskInfo Service** (`src-tauri/src/disk_info.rs`): System disk information via Tauri

#### Cleanup System
- **CleanupList Component** (`components/conversations/CleanupList.tsx`): Interactive cleanup cards with remove/archive actions
- **FileOrganizer Service** (`services/fileOrganizer.ts`): File organization utilities

#### Workflow System
- **WorkflowsPanel** (`components/panels/WorkflowsPanel.tsx`): Workflow management UI with editable prompt chains
- Mock workflows with step execution visualization

#### AI Services
- **AgentChatService** (`services/agentChatService.ts`): Universal AI chat with tool calling for any provider
- **AIService** (`services/aiService.ts`): Multi-provider AI integration
- **ProviderRegistry** (`services/providerRegistry.ts`): API format detection and model capabilities

---

## 🚧 What Needs Implementation

### 1. Terminal-AI Integration Gap
**Current**: Terminal and agent services exist separately  
**Missing**:
- AI cannot programmatically create terminal sessions
- No API for AI to send commands to terminals
- No terminal output streaming to AI context
- No terminal state inspection by AI

### 2. Disk Features Incomplete
**Current**: Basic disk visualization in chat messages  
**Missing**:
- Disk dont display their real stats
- Real-time disk usage monitoring -> also ui change
- Interactive disk space visualization (charts, graphs) -> also UI
Use the /backend folder not the src tauri

### 3. Analysis Backend Non-Existent
**Current**: Mockup UI in the files/disk view
**Missing**:
- Analysis results panel
- File type breakdown visualization
- Large file detection UI and backend
- Duplicate file finder UI and backend
- Storage optimization suggestions using AI
Use the /backend folder not the src tauri  - There was a backend we did for file exploring, maybe this could be reused ?

### 4. Cleanup UI Limited
**Current**: Cleanup behavior in the chat only via the CLI Agent + small cleanup card for the loading  
**Missing**:
- Dedicated cleanup panel in files/cleaup improving upon the pre-existing UI in files/cleanup and making it excellent 
- Batch cleanup operations 
- Cleanup history tracking
- Undo/restore functionality
- Cleanup scheduling
- backend in /backend for cleanups
- Possibility to archive rather than cleanup using AI in the CLi or in the cleanup panel as an option altertative to deleting where we would design a /backend feature for creating a archive space on the user computer where the files can be compressed

### 5. Workflow UI Incomplete
**Current**: Basic workflow list and mock data  
**Missing**:
- Workflow execution engine
- Real AI integration for workflow steps
- Workflow result visualization
- Workflow templates
- Template Workflow created by us that would allow to demonstrate the capabilities of the AI

### 6. AI Actions Synchronous
**Current**: AI operations block UI  
**Missing**:
- Async task queue
- Background AI processing
- Progress indicators for long operations
- Task cancellation
- Concurrent AI requests
- backend in the /backend for the async utilising rust efficiently 

### 7. AI Disk Location Undefined
**Current**: No persistent AI workspace  
**Missing**:
- AI workspace directory structure
- Persistent AI memory storage
- AI-generated file organization
- Workspace cleanup policies
- We need to make it possible to define where is the root of where the user executes the agent. By default it would be executed in the root of the user but could be executed in particular folder.
- AGENTS.md file that the user can create in the workspace to guide the behavior of Skhoot
- Backend in /backend for the AI workspace
- Possibility to define the AI workspace in the UI in the file/workspace new tab and UI (real data no mockup)

---

## 📐 Architecture Decisions

### Terminal-AI Bridge Architecture
```
AI Agent → AgentService → TerminalBridge → TerminalService → Backend PTY
                              ↓
                    Terminal Tool Definitions
                    - create_terminal
                    - execute_command
                    - read_output
                    - list_terminals
```

### Panel Architecture Pattern
```
SecondaryPanel (Floating)
  ├── Tab Navigation
  ├── Content Area
  │   ├── Data Visualization
  │   ├── Interactive Controls
  │   └── Action Buttons
  └── Status Bar
```

### Async AI Architecture
```
User Request → Task Queue → Worker Pool → AI Provider
                    ↓
              Progress Events → UI Updates
                    ↓
              Result Cache → Response
```

---

## 🛠️ Implementation Tasks

### Phase 1: Terminal-AI Integration (#4, #5)

#### Task 1.1: Terminal Tool Definitions
**File**: `services/agentTools/terminalTools.ts` (new)
- Define tool schemas for terminal operations
- Implement tool handlers using TerminalService
- Add terminal state inspection tools

#### Task 1.2: AgentService Terminal Integration
**File**: `services/agentService.ts`
- Register terminal tools in agent session
- Add terminal output streaming to agent context
- Implement terminal event forwarding

#### Task 1.3: Backend Terminal API Enhancement
**File**: `backend/src/terminal/routes.rs`
- Add endpoint for listing active terminals
- Add endpoint for reading terminal history
- Add endpoint for terminal state inspection

#### Task 1.4: UI Integration
**File**: `components/terminal/TerminalPanel.tsx`
- Add agent-created terminal indicator
- Show AI commands in terminal history
- Add "AI Control" badge for agent-managed terminals

**Acceptance Criteria**:
- AI can create new terminal sessions via tool call
- AI can execute commands in any terminal
- AI receives terminal output in context
- AI can list and inspect terminal states
- UI clearly indicates AI-controlled terminals

---

### Phase 2: AI Workspace Setup (#6)

#### Task 2.1: Workspace Directory Structure
**File**: `services/aiWorkspace.ts` (new)
- Define workspace directory structure
- Implement workspace initialization
- Add workspace path configuration

#### Task 2.2: Tauri Workspace Commands
**File**: `src-tauri/src/workspace.rs` (new)
- Implement workspace creation command
- Add workspace path resolution
- Implement workspace cleanup

#### Task 2.3: Workspace UI
**File**: `components/settings/AISettingsPanel.tsx`
- Add workspace location selector
- Show workspace size and file count
- Add workspace cleanup button

**Workspace Structure**:
```
~/.skhoot/
  ├── workspace/
  │   ├── memory/          # AI persistent memory
  │   ├── generated/       # AI-generated files
  │   ├── temp/            # Temporary files
  │   └── logs/            # AI operation logs
  ├── config/
  └── cache/
```

**Acceptance Criteria**:
- AI workspace directory created on first run
- User can configure workspace location
- Workspace persists across sessions
- Workspace cleanup removes temp files only

---

### Phase 3: Disk UI Full Functionalities (#9)

#### Task 3.1: Disk Panel Component
**File**: `components/panels/DiskPanel.tsx` (new)
- Create SecondaryPanel-based disk panel
- Implement real-time disk usage charts
- Add disk health indicators
- Show storage recommendations

#### Task 3.2: Disk Service Enhancement
**File**: `services/diskService.ts`
- Add real-time disk monitoring
- Implement disk usage history tracking
- Add disk health calculation

#### Task 3.3: Backend Disk API
**File**: `backend/src/api/disk.rs` (new)
- Add endpoint for disk monitoring
- Implement disk usage history API
- Add disk health check endpoint

#### Task 3.4: Disk Visualization
**File**: `components/ui/DiskChart.tsx` (new)
- Implement interactive disk usage chart
- Add storage breakdown by file type
- Show largest directories

**Acceptance Criteria**:
- Dedicated disk panel accessible from sidebar
- Real-time disk usage updates
- Interactive charts with drill-down
- Storage recommendations displayed
- Disk health indicators visible

---

### Phase 4: Analysis UI Full Functionalities (#10)

#### Task 4.1: Analysis Panel Component
**File**: `components/panels/AnalysisPanel.tsx` (new)
- Create analysis results panel
- Implement file type breakdown visualization
- Add large file detection UI
- Show duplicate file finder results

#### Task 4.2: Analysis Service
**File**: `services/analysisService.ts` (new)
- Integrate with backend disk analyzer
- Implement analysis result caching
- Add analysis history tracking

#### Task 4.3: Backend Analysis API Enhancement
**File**: `backend/src/disk_analyzer/analyzer.rs`
- Add duplicate file detection
- Implement file type categorization
- Add large file threshold configuration

#### Task 4.4: Analysis Visualization
**File**: `components/ui/AnalysisChart.tsx` (new)
- File type pie chart
- Large files list with actions
- Duplicate files grouped view

**Acceptance Criteria**:
- Analysis panel shows comprehensive disk analysis
- File type breakdown with percentages
- Large files list with size and path
- Duplicate files detection and grouping
- One-click actions for analysis results

---

### Phase 5: Cleanup UI Full Functionalities (#11)

#### Task 5.1: Cleanup Panel Component
**File**: `components/panels/CleanupPanel.tsx` (new)
- Create dedicated cleanup panel
- Implement batch cleanup operations
- Add cleanup history tracking
- Show cleanup recommendations

#### Task 5.2: Cleanup Service Enhancement
**File**: `services/cleanupService.ts` (new)
- Implement batch file operations
- Add cleanup history persistence
- Implement undo/restore functionality
- Add cleanup scheduling

#### Task 5.3: Backend Cleanup API
**File**: `backend/src/api/cleanup.rs` (new)
- Add batch delete endpoint
- Implement archive endpoint
- Add restore from archive endpoint
- Implement cleanup history API

#### Task 5.4: Cleanup Visualization
**File**: `components/ui/CleanupProgress.tsx` (new)
- Batch operation progress bar
- Cleanup history timeline
- Space freed visualization

**Acceptance Criteria**:
- Dedicated cleanup panel with batch operations
- Cleanup history with undo capability
- Progress indicators for batch operations
- Space freed tracking and visualization
- Cleanup recommendations from AI

---

### Phase 6: Workflow UI Functionalities (#13)

#### Task 6.1: Workflow Execution Engine
**File**: `services/workflowEngine.ts` (new)
- Implement workflow step execution
- Add workflow state management
- Implement workflow result aggregation
- Add workflow error handling

#### Task 6.2: Workflow-AI Integration
**File**: `services/workflowEngine.ts`
- Integrate with AgentChatService
- Implement step-by-step AI execution
- Add workflow context passing between steps
- Implement workflow result visualization

#### Task 6.3: Workflow Panel Enhancement
**File**: `components/panels/WorkflowsPanel.tsx`
- Replace mock data with real workflows
- Add workflow execution controls
- Show real-time execution progress
- Display workflow results

#### Task 6.4: Workflow Templates
**File**: `services/workflowTemplates.ts` (new)
- Define common workflow templates
- Implement template instantiation
- Add template customization UI

**Acceptance Criteria**:
- Workflows execute with real AI integration
- Step-by-step progress visualization
- Workflow results displayed in panel
- Workflow templates available
- Workflow sharing/export functionality

---

### Phase 7: Async AI Actions (#15)

#### Task 7.1: Task Queue System
**File**: `services/taskQueue.ts` (new)
- Implement async task queue
- Add task priority system
- Implement task cancellation
- Add task result caching

#### Task 7.2: AI Worker Pool
**File**: `services/aiWorkerPool.ts` (new)
- Implement concurrent AI request handling
- Add worker pool configuration
- Implement request rate limiting
- Add worker health monitoring

#### Task 7.3: Progress Tracking
**File**: `services/progressTracker.ts` (new)
- Implement progress event system
- Add progress persistence
- Implement progress UI updates

#### Task 7.4: UI Integration
**File**: `components/ui/TaskProgress.tsx` (new)
- Show active tasks in header
- Display task progress indicators
- Add task cancellation controls
- Show task history

**Acceptance Criteria**:
- AI operations run in background
- UI remains responsive during AI operations
- Progress indicators for long operations
- Task cancellation works reliably
- Multiple AI requests handled concurrently

---

## 🔄 Dependencies & Order

### Critical Path
```
Phase 2 (AI Workspace) → Phase 1 (Terminal-AI)
                       ↓
Phase 3 (Disk UI) → Phase 4 (Analysis UI) → Phase 5 (Cleanup UI)
                                           ↓
                                    Phase 6 (Workflows)
                                           ↓
                                    Phase 7 (Async AI)
```

### Parallel Tracks
- **Track A**: Phases 1-2 (Terminal & Workspace)
- **Track B**: Phases 3-5 (Disk Management)
- **Track C**: Phase 6 (Workflows)
- **Track D**: Phase 7 (Async AI) - Can start after Phase 1

---

## 🧪 Testing Strategy

### Unit Tests
- Terminal tool handlers
- Workspace initialization
- Disk service methods
- Analysis service methods
- Cleanup service methods
- Workflow engine
- Task queue operations

### Integration Tests
- AI-terminal interaction flow
- Disk panel data flow
- Analysis panel data flow
- Cleanup operations end-to-end
- Workflow execution end-to-end
- Async AI operations

### Manual Testing
- Terminal creation by AI
- Command execution by AI
- Disk panel real-time updates
- Analysis result visualization
- Batch cleanup operations
- Workflow execution
- Background AI tasks

---

## 📊 Success Metrics

### Functionality
- ✅ AI can create and control terminals
- ✅ AI workspace persists across sessions
- ✅ Disk panel shows real-time data
- ✅ Analysis panel provides actionable insights
- ✅ Cleanup operations work reliably
- ✅ Workflows execute successfully
- ✅ AI operations run asynchronously

### Performance
- Terminal command execution < 100ms
- Disk panel updates < 500ms
- Analysis completion < 5s for typical projects
- Cleanup operations < 2s per 100 files
- Workflow step execution < 3s average
- UI remains responsive during AI operations

### User Experience
- Clear visual feedback for all operations
- Intuitive panel navigation
- Helpful error messages
- Undo capability for destructive actions
- Progress indicators for long operations

---

## 🚀 Rollout Plan

### Phase 1-2: Week 1
- Implement terminal-AI integration
- Setup AI workspace

### Phase 3-5: Week 2
- Implement disk management UI
- Implement analysis UI
- Implement cleanup UI

### Phase 6: Week 3
- Implement workflow execution
- Add workflow templates

### Phase 7: Week 4
- Implement async AI system
- Performance optimization
- Bug fixes and polish

---

## 📝 Notes for Planner Agent

### Key Considerations
1. **Backward Compatibility**: Ensure existing terminal functionality remains intact
2. **Security**: AI workspace should be sandboxed appropriately
3. **Performance**: Disk monitoring should not impact app performance
4. **Error Handling**: All operations need robust error handling
5. **User Control**: User should be able to override AI actions

### Technical Debt to Address
- Refactor terminal service for better testability
- Consolidate disk-related services
- Improve error handling in agent service
- Add comprehensive logging

### Future Enhancements (Post v0.1.5)
- AI memory persistence across sessions
- Workflow marketplace
- Advanced disk analytics
- Scheduled cleanup automation
- Multi-agent workflows

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [README.md](./README.md) - Project overview and features
- [EMBOSSED_STYLE_GUIDE.md](./documentation/EMBOSSED_STYLE_GUIDE.md) - UI design guidelines
- [Backend README](./backend/README.md) - Backend API documentation

---

**Last Updated**: 2026-01-16  
**Next Review**: After Phase 1 completion
