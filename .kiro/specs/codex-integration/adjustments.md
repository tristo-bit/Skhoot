# Phase 3 Adjustments - Agent Mode Integration

## Current State Analysis

### What's Completed (Phase 1 & 2)
Based on recent commits and codebase review:

**Phase 1 - Terminal Foundation ✅**
- `services/terminalService.ts` - Full terminal service with session management, HTTP/Tauri dual backend
- `services/terminalHttpService.ts` - HTTP backend service
- `components/terminal/TerminalPanel.tsx` - Basic terminal UI with tabs, search, copy/clear
- `src-tauri/src/terminal.rs` - Tauri terminal commands
- `backend/src/terminal/` - Backend terminal session management
- `backend/src/cli_bridge/` - CLI bridge with PTY support

**Phase 2 - API Key Management ✅**
- `backend/src/api_key_storage.rs` - Secure key storage with encryption
- `src-tauri/src/api_keys.rs` - Tauri commands for key management
- `services/apiKeyService.ts` - Frontend API key service
- `components/settings/UserPanel.tsx` - Multi-provider API configuration UI
- `backend/src/ai.rs` - AI provider detection and validation

---

## Your Vision vs Original Spec

### Original Spec Phase 3 Focus
The original spec focused on:
1. Bundling codex-main binary
2. Running codex as a subprocess
3. Piping stdin/stdout to terminal
4. Adding a "Codex" tab in terminal panel

### Your New Vision for Phase 3
A fundamentally different approach - **Agent Mode Integration**:

1. **Agent Toggle Mode** - QuickActionButton switches to "agent mode" where AI can execute commands
2. **Native Conversation UI** - Agent responses displayed in existing chat interface, not terminal
3. **Auto-launching "Agent Log" Tab** - Automatic terminal tab for monitoring agent activity
4. **Codex Behavior Refactoring** - Port codex-main's agent behavior (from AGENTS.md) into `backend/src/cli_agent/`
5. **No Sandbox Initially** - Skip codex's sandbox system for now
6. **Replace Conversational Engine** - Eventually this becomes the primary conversation mode

---

## Key Differences

| Aspect | Original Spec | Your Vision |
|--------|---------------|-------------|
| **Codex Integration** | Bundle binary, run as subprocess | Refactor/port agent logic into Rust backend |
| **UI Location** | Terminal panel with "Codex" tab | Native conversation UI + "Agent Log" monitoring tab |
| **Agent Activation** | Manual terminal commands | QuickActionButton toggle |
| **Output Display** | Raw terminal output | Rich UI components (like FileList search results) |
| **Terminal Role** | Primary interface | Monitoring/logging only |
| **Sandbox** | Planned for later | Explicitly skipped initially |

---

## Proposed Phase 3 Restructure

### 3.1 Agent Core Module (`backend/src/cli_agent/`)
**Goal**: Port codex-main's agent behavior into native Rust module

**New Files**:
- `backend/src/cli_agent/mod.rs` - Module entry
- `backend/src/cli_agent/agent.rs` - Core agent logic
- `backend/src/cli_agent/instructions.rs` - AGENTS.md-style system prompts
- `backend/src/cli_agent/tools.rs` - Tool definitions (shell, file ops, etc.)
- `backend/src/cli_agent/executor.rs` - Command execution via existing cli_bridge
- `backend/src/cli_agent/session.rs` - Agent session state per conversation

**Key Behaviors to Port from codex-main**:
- System prompt structure from AGENTS.md
- Tool calling pattern (shell execution, file operations)
- Command validation and safety checks
- Output parsing and formatting

### 3.2 Agent Log Terminal Tab
**Goal**: Auto-create monitoring tab when agent mode activates

**Changes**:
- Add `'agent-log'` type to `TerminalTab`
- Auto-create tab titled "Agent Log" when conversation opens in agent mode
- Display: Agent status, API key validation, terminal readiness
- Show real-time command execution logs
- Allow configuration of agent behavior

**Initial Display Requirements**:
```
✓ Agent properly launched
✓ API key loaded (Gemini - gemini-2.0-flash)
✓ Terminal access ready
✓ Agent ready to receive commands
```

### 3.3 Agent Mode Toggle
**Goal**: QuickActionButton activates agent mode for conversation

**Changes to `ChatInterface.tsx`**:
- Add `agentMode` state
- When toggled ON:
  - Create/show "Agent Log" terminal tab
  - Switch AI backend to agent mode
  - Enable tool execution capabilities
- When toggled OFF:
  - Return to standard chat mode
  - Keep agent log for reference

### 3.4 Conversation UI Integration
**Goal**: Display agent actions in native UI, not raw terminal

**New Components**:
- `components/conversations/AgentAction.tsx` - Displays agent tool calls
- `components/conversations/CommandExecution.tsx` - Shows command being run
- `components/conversations/CommandOutput.tsx` - Displays command results

**Behavior**:
- Agent responses appear as chat messages
- Tool calls (shell commands) shown with expandable UI
- File operations visualized like current FileList component
- Progress indicators for long-running commands

### 3.5 Initial Test Functions
**Goal**: Validate agent can perform basic operations

**Test Scenarios**:
1. **File Search** - "Find all TypeScript files in the components folder"
2. **File Interaction** - "Read the contents of package.json and tell me the version"
3. **File Compression** - "Compress the documentation folder into docs.zip"
4. **Disk Analysis** - "Analyze disk usage and suggest files to archive or delete"

---

## Adjusted Task Breakdown

### Phase 3.1: Agent Core (Week 1)
- [ ] Create `backend/src/cli_agent/` module structure
- [ ] Port AGENTS.md system prompts to `instructions.rs`
- [ ] Implement tool definitions in `tools.rs`
- [ ] Connect to existing `cli_bridge` for command execution
- [ ] Create agent session management
- [ ] Add Tauri commands for agent operations

### Phase 3.2: Agent Log Tab (Week 1-2)
- [ ] Add `'agent-log'` terminal tab type
- [ ] Implement auto-creation on conversation open
- [ ] Display agent status indicators
- [ ] Show API key validation status
- [ ] Display terminal readiness check
- [ ] Add agent configuration options

### Phase 3.3: Agent Mode Toggle (Week 2)
- [ ] Add agent QuickActionButton to chat interface
- [ ] Implement `agentMode` state management
- [ ] Connect toggle to agent log tab creation
- [ ] Update AI service to route to agent backend
- [ ] Persist agent mode preference per conversation

### Phase 3.4: Conversation UI Components (Week 2-3)
- [ ] Create `AgentAction.tsx` component
- [ ] Create `CommandExecution.tsx` component
- [ ] Create `CommandOutput.tsx` component
- [ ] Integrate with `MessageBubble.tsx`
- [ ] Add loading/progress states
- [ ] Style with existing glass morphism theme

### Phase 3.5: Test Functions (Week 3)
- [ ] Implement file search via agent
- [ ] Implement file read/interaction
- [ ] Implement file compression
- [ ] Implement disk analysis integration
- [ ] Validate all four test scenarios work

### Phase 3.6: Polish & Integration (Week 4)
- [ ] Error handling and recovery
- [ ] Performance optimization
- [ ] Documentation
- [ ] Testing on all platforms

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Skhoot Frontend (React)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ChatInterface                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │ MessageList │  │ AgentAction │  │ CommandOutput   │  │  │
│  │  │             │  │ (tool call) │  │ (results UI)    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              TerminalPanel (Agent Log Tab)                │  │
│  │  [Agent Log] [Shell] [+]                                  │  │
│  │  ✓ Agent launched | ✓ API key | ✓ Terminal ready         │  │
│  │  > Executing: find . -name "*.ts" -type f                 │  │
│  │  > Found 47 files...                                      │  │
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
│  │  │ Agent    │  │ Tools    │  │ Executor │  │ Session  │   ││
│  │  │ (core)   │  │ (shell,  │  │ (via     │  │ (state)  │   ││
│  │  │          │  │ file ops)│  │ cli_bridge│ │          │   ││
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

## Key Decisions Needed

1. **Agent Instructions Source**: Port AGENTS.md directly or create Skhoot-specific instructions?
2. **Tool Set**: Start with shell + file ops, or include more tools from codex?
3. **Conversation Persistence**: Store agent actions in chat history?
4. **Safety Checks**: What command validation before execution?
5. **Streaming**: Stream command output to UI in real-time?

---

## Files to Reference from codex-main

For porting agent behavior:
- `documentation/codex-main/AGENTS.md` - Agent instructions
- `documentation/codex-main/codex-rs/core/` - Core agent logic
- `documentation/codex-main/codex-rs/exec/` - Command execution
- `documentation/codex-main/codex-rs/cli/` - CLI interface patterns
- `documentation/codex-main/docs/exec.md` - Execution documentation
- `documentation/codex-main/docs/sandbox.md` - Sandbox docs (for later)

---

## Summary

The original Phase 3 was about **bundling and running codex-main as a subprocess**. Your vision is more ambitious: **natively integrating agent capabilities into Skhoot's conversation UI** by porting the agent behavior from codex-main into a new `cli_agent` Rust module.

This approach:
- Provides better UX (native UI vs terminal)
- Gives more control over agent behavior
- Enables richer visualizations of agent actions
- Sets foundation for Skhoot to become a full AI coding assistant

The trade-off is more development work upfront, but a much more integrated and polished result.
