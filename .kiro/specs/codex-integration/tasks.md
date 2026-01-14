# Codex-Main Integration Tasks

**Note**: Skhoot already has comprehensive CLI bridge infrastructure. Phase 1 & 2 are complete.

## Completed Phases

### ✅ Phase 1: PTY Support & Tauri Commands (COMPLETE)
- Terminal service with session management
- HTTP/Tauri dual backend support
- TerminalPanel component with tabs
- CLI bridge with PTY support

### ✅ Phase 2: API Key Secure Storage (COMPLETE)
- Secure key storage with AES-256-GCM encryption
- Platform keychain integration
- Multi-provider support (OpenAI, Anthropic, Google, Custom)
- UserPanel API configuration UI

---

## Phase 3: Agent Mode Integration (Current Focus)

**Goal**: Port codex-main's agent behavior into native Skhoot, displayed in conversation UI with "Agent Log" monitoring tab.

**Key Difference from Original Spec**: Instead of bundling codex-main binary and running as subprocess, we're porting the agent logic directly into `backend/src/cli_agent/` for native integration with Skhoot's conversation UI.

---

### Task 3.1: Create Agent Core Module ✅ COMPLETE
**Priority**: High  
**Estimated Time**: 4 days  
**Dependencies**: Phase 1 & 2 complete  
**Reference**: `documentation/codex-main/AGENTS.md`, `documentation/codex-main/codex-rs/core/`

**Subtasks**:
- [x] Create `backend/src/cli_agent/mod.rs` module entry point
- [x] Create `backend/src/cli_agent/agent.rs` - Core agent state machine (Agent, AgentConfig, AgentState, AgentEvent, AgentError)
- [x] Create `backend/src/cli_agent/instructions.rs` - System prompts (port from AGENTS.md)
- [x] Create `backend/src/cli_agent/tools.rs` - Tool definitions:
  - [x] `shell` tool - Execute terminal commands
  - [x] `read_file` tool - Read file contents
  - [x] `write_file` tool - Write/modify files
  - [x] `list_directory` tool - List directory contents
  - [x] `search_files` tool - Search for files by pattern
- [x] Create `backend/src/cli_agent/executor.rs` - Command execution via cli_bridge
- [x] Create `backend/src/cli_agent/session.rs` - Agent session state per conversation
- [x] Create `backend/src/cli_agent/response.rs` - Response parsing and formatting
- [x] Add agent module to `backend/src/lib.rs`
- [x] Write unit tests for agent core (21 tests passing)

**Acceptance Criteria**:
- ✅ Agent module compiles and exports public API
- ✅ Tools are defined with proper schemas (OpenAI, Anthropic, Gemini formats)
- ✅ System prompts match codex-main behavior
- ✅ Can create agent sessions tied to conversations
- ✅ Unit tests pass (21/21)

**Files to Reference**:
- `documentation/codex-main/AGENTS.md` - Agent instructions
- `documentation/codex-main/codex-rs/core/src/` - Core logic patterns
- `backend/src/cli_bridge/` - Existing command execution

---

### Task 3.2: Implement Agent Tauri Commands ✅ COMPLETE
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.1

**Subtasks**:
- [x] Create `src-tauri/src/agent.rs` module
- [x] Implement `create_agent_session` command
- [x] Implement `send_agent_message` command
- [x] Implement `get_agent_status` command
- [x] Implement `execute_agent_tool` command
- [x] Implement `cancel_agent_action` command
- [x] Implement `close_agent_session` command
- [x] Add AgentState to Tauri state management
- [x] Register commands in `src-tauri/src/main.rs`
- [x] Add event emitters for agent actions
- [x] Implement additional commands: `list_agent_sessions`, `get_agent_messages`, `add_assistant_message`, `get_agent_config`

**Acceptance Criteria**:
- ✅ All agent commands accessible from frontend (10 commands)
- ✅ Events emitted for tool executions (tool_start, tool_complete, message, cancelled)
- ✅ Proper error handling and serialization
- ✅ State managed correctly across sessions (lightweight HashMap-based storage)

**Implementation Notes**:
- Used direct tool execution via `tokio::process::Command` instead of CliBridge to avoid Send/Sync issues with PTY handles
- All 5 tools implemented: shell, read_file, write_file, list_directory, search_files
- DTOs created for frontend communication: AgentMessageDto, ToolCallDto, ToolResultDto, AgentStatusDto

---

### Task 3.3: Create Agent Service in Frontend ✅ COMPLETE
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.2

**Subtasks**:
- [x] Create `services/agentService.ts`
- [x] Implement session lifecycle management (createSession, closeSession, getStatus, listSessions)
- [x] Add message sending with tool call support (sendMessage, addAssistantMessage, getMessages)
- [x] Create event listeners for agent actions (on, off, emit with Tauri event integration)
- [x] Implement tool execution (executeTool, executeToolCalls, cancelAction)
- [x] Add TypeScript interfaces:
  - [x] `AgentSessionOptions`
  - [x] `AgentStatus`
  - [x] `AgentMessage`
  - [x] `AgentToolCall`
  - [x] `ToolExecutionRequest`
  - [x] `ToolResult`
  - [x] `AgentConfig`
  - [x] `AgentEventType`
  - [x] `AgentEventData`
- [x] Add error handling and recovery
- [x] Write service documentation (JSDoc comments)

**Acceptance Criteria**:
- ✅ Service manages agent sessions
- ✅ Messages sent and responses received
- ✅ Tool calls properly tracked
- ✅ Events emitted for UI updates (via both custom events and DOM events)
- ✅ TypeScript compiles without errors

---

### Task 3.4: Implement Agent Log Terminal Tab ✅ COMPLETE
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: Task 3.3

**Subtasks**:
- [x] Add `'agent-log'` type to TerminalTab interface
- [x] Create `components/terminal/AgentLogTab.tsx` component
- [x] Implement status display section:
  - [x] Agent launch status indicator
  - [x] API key validation status
  - [x] Terminal access readiness
  - [x] Agent ready indicator
- [x] Implement real-time log display:
  - [x] Tool call logging
  - [x] Command execution logging
  - [x] Response logging
  - [x] Error logging
- [x] Add agent configuration panel:
  - [x] Provider display
  - [x] Model display
  - [x] Message count
  - [x] State display
- [x] Implement auto-scroll with toggle
- [x] Add log filtering by type
- [x] Add log export functionality (JSON)
- [x] Style with glass morphism theme
- [x] Update TerminalView to support agent-log tabs
- [x] Add Bot icon button to create Agent Log tabs

**Acceptance Criteria**:
- ✅ Agent Log tab displays all status indicators
- ✅ Real-time logging of agent actions
- ✅ Configuration options displayed correctly
- ✅ Matches Skhoot design language
- ✅ Auto-scroll works with toggle
- ✅ Log filtering and export work

**Initial Display Requirements**:
```
✓ Agent properly launched
✓ API key loaded (Provider - Model)
✓ Terminal access ready
✓ Agent ready to receive commands
```

---

### Task 3.5: Auto-Create Agent Log on Conversation Open ✅ COMPLETE
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.4

**Subtasks**:
- [x] Update `TerminalView.tsx` to support agent-log tab type (done in 3.4)
- [x] Add `autoCreateAgentLog` prop to TerminalView
- [x] Create hook `useAgentLogTab` for managing agent log lifecycle
- [x] Implement auto-creation when:
  - [x] autoCreateAgentLog session ID is provided
  - [x] Terminal is open
- [x] Implement tab persistence across conversation switches (via session map in hook)
- [x] Add tab title "Agent Log" with Bot icon (done in 3.4)
- [x] Handle tab close (calls onAgentLogClosed callback)
- [x] Add callbacks: onAgentLogCreated, onAgentLogClosed

**Acceptance Criteria**:
- ✅ Agent Log tab auto-creates when autoCreateAgentLog prop is provided
- ✅ Tab persists when switching conversations (via useAgentLogTab hook)
- ✅ Proper cleanup on session close
- ✅ Callbacks fired appropriately

---

### Task 3.6: Implement Agent Mode Toggle
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.3, Task 3.5

**Subtasks**:
- [x] Add `agentMode` state to ChatInterface (via useAgentLogTab hook)
- [x] Create/update Agent QuickActionButton:
  - [x] Add Bot/Agent icon (Cpu icon)
  - [x] Toggle ON/OFF state
  - [x] Visual indicator when active (green color)
- [x] Implement toggle behavior:
  - [x] ON: Create agent session, show Agent Log tab
  - [x] OFF: Close agent session, keep log for reference
- [x] Update message routing:
  - [x] Agent mode: Route to agentService
  - [x] Normal mode: Route to existing AI service
- [x] Persist agent mode preference per conversation (via useAgentLogTab hook)
- [x] Add keyboard shortcut (Ctrl+Shift+A)
- [ ] Write component tests

**Acceptance Criteria**:
- ✅ Toggle switches between agent and normal mode
- ✅ Agent Log tab appears when toggled ON
- ✅ Messages routed correctly based on mode
- ✅ Preference persisted per conversation
- ✅ Keyboard shortcut works

---

### Task 3.7: Create Agent Action UI Components
**Priority**: High  
**Estimated Time**: 4 days  
**Dependencies**: Task 3.3

**Subtasks**:
- [x] Create `components/conversations/AgentAction.tsx`:
  - [x] Tool call header (icon, name, status)
  - [x] Expandable/collapsible content
  - [x] Loading state animation
  - [x] Success/error state styling
- [x] Create `components/conversations/CommandExecution.tsx`:
  - [x] Command display with syntax highlighting
  - [x] Working directory indicator
  - [x] Execution time display
  - [x] Cancel button for long-running commands
- [x] Create `components/conversations/CommandOutput.tsx`:
  - [x] Stdout/stderr display with ANSI colors
  - [x] Truncation with "Show more" for long output
  - [x] Copy button
  - [x] Line numbers (optional)
- [x] Create `components/conversations/FileOperation.tsx`:
  - [x] File path display
  - [x] Operation type (read/write/create/delete)
  - [x] File preview for reads
  - [x] Diff view for writes
- [x] Update `MessageBubble.tsx` to render agent actions
- [x] Add animations for action states
- [x] Style all components with glass morphism
- [ ] Write component tests

**Acceptance Criteria**:
- ✅ All agent actions render in conversation
- ✅ Tool calls show loading/success/error states
- ✅ Command output displays correctly with colors
- ✅ File operations show appropriate previews
- ✅ Matches Skhoot design language

---

### Task 3.8: Integrate Agent with AI Backend
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: Task 3.1, Task 3.6

**Subtasks**:
- [x] Update `backend/src/ai.rs` to support agent mode (already has provider configs)
- [x] Implement tool calling protocol:
  - [x] OpenAI function calling format
  - [x] Anthropic tool use format
  - [x] Google function calling format
- [x] Create agent prompt builder:
  - [x] System prompt with tool definitions
  - [x] Conversation history formatting
  - [x] Tool result injection
- [x] Implement streaming response handling (basic - non-streaming for now)
- [x] Add tool execution loop:
  - [x] Parse tool calls from response
  - [x] Execute tools via agentService
  - [x] Send results back to AI
  - [x] Continue until no more tool calls
- [ ] Write integration tests

**Acceptance Criteria**:
- ✅ Agent can call tools through AI providers
- ✅ Tool results fed back to AI correctly
- ✅ Multi-turn tool use works (up to 10 iterations)
- ⏳ Streaming works for all providers (basic implementation)
- ⏳ All tests pass

**Implementation Notes**:
- Created `services/agentChatService.ts` with full tool calling support
- Supports OpenAI, Google (Gemini), and Anthropic providers
- Tool execution loop with max 10 iterations
- History conversion for each provider format
- Integrated with ChatInterface for agent mode

---

### Task 3.9: Implement Test Functions
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: Task 3.7, Task 3.8

**Goal**: Validate agent can perform the four initial test scenarios.

**Subtasks**:
- [ ] Test 1: File Search
  - [ ] Prompt: "Find all TypeScript files in the components folder"
  - [ ] Verify: Agent uses search_files or shell with find/fd
  - [ ] Verify: Results displayed in FileOperation component
- [ ] Test 2: File Interaction
  - [ ] Prompt: "Read package.json and tell me the version"
  - [ ] Verify: Agent uses read_file tool
  - [ ] Verify: File content shown in FileOperation component
  - [ ] Verify: AI extracts and reports version
- [ ] Test 3: File Compression
  - [ ] Prompt: "Compress the documentation folder into docs.zip"
  - [ ] Verify: Agent uses shell with zip/tar command
  - [ ] Verify: Command execution shown in CommandExecution
  - [ ] Verify: Success/failure reported correctly
- [ ] Test 4: Disk Analysis
  - [ ] Prompt: "Analyze disk usage and suggest files to archive"
  - [ ] Verify: Agent uses shell with du/df commands
  - [ ] Verify: Analysis displayed in conversation
  - [ ] Verify: Suggestions provided by AI
- [ ] Document test results
- [ ] Fix any issues found

**Acceptance Criteria**:
- All four test scenarios work end-to-end
- Agent actions display correctly in UI
- Agent Log shows all activity
- No crashes or hangs
- Results are accurate

---

## Phase 4: Skhoot Log Tab (Week 5)

### Task 4.1: Create Skhoot Log System
**Priority**: Low  
**Estimated Time**: 2 days  
**Dependencies**: Phase 3 complete

**Subtasks**:
- [ ] Create `services/skhootLogger.ts`
- [ ] Implement log levels (debug, info, warn, error)
- [ ] Add log formatting with timestamps
- [ ] Create log buffer management (max 10,000 entries)
- [ ] Implement log filtering by level and source
- [ ] Add log search functionality
- [ ] Create log export (JSON, text)
- [ ] Implement log persistence (optional)
- [ ] Write logger tests

**Acceptance Criteria**:
- Logger captures all app events
- Logs properly formatted
- Buffer doesn't grow unbounded
- Search and filter work
- Export produces valid files

---

### Task 4.2: Add Skhoot Log Terminal Tab
**Priority**: Low  
**Estimated Time**: 2 days  
**Dependencies**: Task 4.1

**Subtasks**:
- [ ] Add "Skhoot Log" tab type to TerminalPanel
- [ ] Create log viewer component
- [ ] Implement log level filtering UI
- [ ] Add log search UI
- [ ] Create log export button
- [ ] Add auto-scroll toggle
- [ ] Implement log highlighting by level
- [ ] Add timestamp display toggle
- [ ] Create clear logs button
- [ ] Style with glass morphism
- [ ] Write component tests

**Acceptance Criteria**:
- Log tab shows all app logs
- Filter by level works
- Search finds entries
- Export works
- Color-coded by level

---

### Task 4.3: Integrate Logging Throughout App
**Priority**: Low  
**Estimated Time**: 2 days  
**Dependencies**: Task 4.1

**Subtasks**:
- [ ] Add logging to ChatInterface
- [ ] Add logging to TerminalPanel
- [ ] Add logging to Agent operations
- [ ] Add logging to API key operations
- [ ] Add logging to file operations
- [ ] Add logging to error handlers
- [ ] Add performance logging
- [ ] Test logging coverage

**Acceptance Criteria**:
- All major operations logged
- Errors logged with context
- No sensitive data in logs
- Logs don't impact performance

---

## Phase 5: Polish & Optimization (Week 6)

### Task 5.1: Performance Optimization
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Profile agent response times
- [ ] Optimize tool execution pipeline
- [ ] Implement response streaming optimization
- [ ] Optimize terminal output buffering
- [ ] Add caching for repeated operations
- [ ] Reduce memory usage
- [ ] Optimize bundle size
- [ ] Run performance benchmarks
- [ ] Document improvements

**Acceptance Criteria**:
- Agent responses feel responsive
- Tool execution < 100ms overhead
- Memory usage < 200MB increase
- Bundle size increase < 50MB

---

### Task 5.2: Error Handling & Recovery
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Review all error paths in agent
- [ ] Add user-friendly error messages
- [ ] Implement tool execution retry
- [ ] Add timeout handling for commands
- [ ] Implement graceful degradation
- [ ] Add error reporting UI
- [ ] Create error documentation
- [ ] Test error scenarios

**Acceptance Criteria**:
- All errors have clear messages
- Retries work for transient failures
- Timeouts prevent hangs
- Users can report errors
- Documentation complete

---

### Task 5.3: UI/UX Refinements
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Review all animations
- [ ] Improve agent action transitions
- [ ] Add loading states everywhere
- [ ] Improve keyboard navigation
- [ ] Add tooltips for agent actions
- [ ] Improve accessibility (ARIA)
- [ ] Add keyboard shortcuts documentation
- [ ] Conduct user testing
- [ ] Implement feedback

**Acceptance Criteria**:
- Animations are smooth
- Loading states are clear
- Keyboard navigation works
- Accessibility score > 90
- User feedback positive

---

### Task 5.4: Documentation
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Write agent mode user guide
- [ ] Document available tools
- [ ] Create troubleshooting guide
- [ ] Add inline code comments
- [ ] Create architecture diagrams
- [ ] Update README.md
- [ ] Create demo video/GIF

**Acceptance Criteria**:
- User guide is comprehensive
- Tools are documented
- Troubleshooting covers common issues
- Code is well-commented
- README is up-to-date

---

### Task 5.5: Testing & QA
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Run full test suite
- [ ] Test on Linux (Ubuntu, Fedora)
- [ ] Test on macOS (Intel, Apple Silicon)
- [ ] Test on Windows (10, 11)
- [ ] Test with different AI providers
- [ ] Test error scenarios
- [ ] Test performance under load
- [ ] Fix all critical bugs
- [ ] Document known issues

**Acceptance Criteria**:
- All tests pass on all platforms
- No critical bugs remain
- Performance meets targets
- Known issues documented

---

## Timeline Summary

- **Phase 1**: PTY Support & Tauri Commands ✅ COMPLETE
- **Phase 2**: API Key Secure Storage ✅ COMPLETE
- **Phase 3**: Agent Mode Integration (4 weeks)
  - Week 1: Agent Core Module (Tasks 3.1-3.3)
  - Week 2: Agent Log Tab & Toggle (Tasks 3.4-3.6)
  - Week 3: Agent UI Components (Tasks 3.7-3.8)
  - Week 4: Test Functions & Integration (Task 3.9)
- **Phase 4**: Skhoot Log Tab (1 week)
- **Phase 5**: Polish & Optimization (1 week)

**Total Remaining Time**: 6 weeks

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Skhoot Frontend (React)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ChatInterface                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │ MessageList │  │ AgentAction │  │ CommandOutput   │  │  │
│  │  │             │  │ (tool call) │  │ (results UI)    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │ QuickActionButtons: [Agent ON/OFF] [Search] [...]  ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              TerminalPanel (Agent Log Tab)                │  │
│  │  [Agent Log] [Shell] [+]                                  │  │
│  │  ✓ Agent launched | ✓ API key | ✓ Terminal ready         │  │
│  │  > Executing: find . -name "*.ts" -type f                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                       Tauri IPC Bridge                           │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                    Rust Backend                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    cli_agent (NEW)                           ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ││
│  │  │ agent.rs │  │ tools.rs │  │executor.rs│ │session.rs│   ││
│  │  │ (core)   │  │ (shell,  │  │ (via     │  │ (state)  │   ││
│  │  │          │  │ file ops)│  │cli_bridge)│  │          │   ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 Existing Infrastructure                      ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ││
│  │  │cli_bridge│  │ terminal │  │ ai.rs    │  │key_storage│  ││
│  │  │ (PTY)    │  │ (session)│  │ (API)    │  │ (secure) │   ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

### Functionality
- [ ] Agent mode toggle works
- [ ] All four test functions pass
- [ ] Agent actions display in conversation UI
- [ ] Agent Log shows all activity
- [ ] Multi-provider support works

### Performance
- [ ] Agent response feels responsive
- [ ] Tool execution < 100ms overhead
- [ ] Memory usage < 200MB increase

### User Experience
- [ ] Intuitive agent toggle
- [ ] Clear action visualization
- [ ] Helpful error messages
- [ ] Smooth animations

---

## Risk Management

### High-Risk Tasks
1. **Task 3.8** - AI provider tool calling varies significantly
   - Mitigation: Abstract provider differences, test all providers
2. **Task 3.1** - Porting codex behavior is complex
   - Mitigation: Start simple, iterate based on testing
3. **Task 3.9** - Test functions may reveal edge cases
   - Mitigation: Plan for iteration time

### Dependencies
- AI providers must support tool/function calling
- Existing cli_bridge must handle agent commands
- Terminal service must support agent-log type

### Blockers
- If tool calling doesn't work, fall back to prompt-based approach
- If performance is poor, add caching layer
- If UI is too complex, simplify to terminal-only initially
