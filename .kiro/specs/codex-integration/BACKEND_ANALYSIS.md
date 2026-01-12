# Backend Analysis for Codex Integration

## Current Backend Infrastructure

### ✅ Already Implemented

#### 1. CLI Bridge Module (`backend/src/cli_bridge/`)
**Status**: FULLY IMPLEMENTED ✅

The CLI bridge provides comprehensive terminal operations and session management:

**Components**:
- `session.rs` - Session lifecycle management with UUID-based tracking
- `executor.rs` - Command execution with security sandboxing
- `error.rs` - Comprehensive error handling
- `types.rs` - Type definitions for commands, handles, and security config

**Key Features**:
- ✅ Session creation and management
- ✅ Command validation (dangerous pattern detection, blocked commands)
- ✅ Process spawning with stdin/stdout/stderr piping
- ✅ Security sandboxing (configurable, platform-aware)
- ✅ Command history tracking
- ✅ Session state management (Created, Running, Completed, Failed, Terminated)
- ✅ Stale session cleanup
- ✅ Interactive command support (write to stdin, read from stdout/stderr)

**Security Features**:
- Dangerous command pattern detection (rm -rf /, dd if=, fork bombs, etc.)
- Blocked commands list (reboot, shutdown, halt, poweroff)
- Configurable sandboxing (can be enabled/disabled)
- Platform-specific sandboxing hooks (Linux, macOS, Windows)
- Process isolation and resource monitoring

**API**:
```rust
pub struct CliBridge {
    async fn execute_command(&self, cmd: String, args: Vec<String>) -> Result<CommandHandle>
    async fn write_input(&self, session_id: String, input: String) -> Result<()>
    async fn read_output(&self, session_id: String) -> Result<Vec<TerminalOutput>>
    async fn terminate_session(&self, session_id: String) -> Result<()>
    async fn list_active_sessions(&self) -> Vec<SessionInfo>
    async fn get_session_state(&self, session_id: &str) -> Result<SessionState>
    async fn get_session_history(&self, session_id: &str) -> Vec<CommandHistoryEntry>
    async fn cleanup_stale_sessions(&self, timeout_secs: i64)
    async fn get_security_config(&self) -> SecurityConfig
    async fn set_security_config(&self, config: SecurityConfig)
}
```

#### 2. TUI Interface (`backend/src/cli_engine/tui_interface.rs`)
**Status**: IMPLEMENTED (for standalone CLI tool) ✅

A complete ratatui-based TUI for file search:

**Features**:
- ✅ Full ratatui terminal rendering
- ✅ File search interface
- ✅ Keyboard navigation (vim-style)
- ✅ Command mode (`:cd`, `:ls`, `:pwd`, `:clear`)
- ✅ Search mode with live results
- ✅ Help overlay
- ✅ Status bar with mode indicators
- ✅ Result selection and file opening
- ✅ Search history with up/down navigation

**Note**: This is currently used for the standalone `file-search-tui` binary, but the rendering logic can be adapted for the Tauri integration.

#### 3. Search Engine (`backend/src/search_engine/`)
**Status**: FULLY IMPLEMENTED ✅

Comprehensive file search with multiple engines:

**Components**:
- `file_search.rs` - Core file search engine
- `cli_engine.rs` - CLI tool integration (ripgrep, fd)
- `search_manager.rs` - Search orchestration
- `ai_integration.rs` - AI-powered search suggestions

**Features**:
- ✅ Fuzzy matching with nucleo-matcher
- ✅ CLI tool integration (ripgrep, fd)
- ✅ Hybrid search mode
- ✅ AI-optimized search
- ✅ File type filtering
- ✅ Configurable search depth
- ✅ Result scoring and ranking

#### 4. Disk Analyzer (`backend/src/disk_analyzer/`)
**Status**: IMPLEMENTED ✅

Disk usage analysis and reporting:

**Components**:
- `analyzer.rs` - Disk analysis logic
- `types.rs` - Data structures for disk analysis
- `tests.rs` - Test suite

#### 5. REST API (`backend/src/api/`)
**Status**: PARTIALLY IMPLEMENTED ⚠️

Current endpoints:
- ✅ `/health` - Health check
- ✅ `/api/v1/ping` - Ping endpoint
- ✅ `/api/v1/ai/detect-provider` - AI provider detection
- ✅ `/api/v1/search` - File search
- ✅ `/api/v1/index/start` - Start indexing

**Missing for Codex Integration**:
- ❌ Terminal session endpoints (create, write, read, terminate)
- ❌ Codex process management endpoints
- ❌ API key storage endpoints

#### 6. Database (`backend/src/db.rs`)
**Status**: IMPLEMENTED ✅

SQLite database with:
- ✅ Connection pooling
- ✅ Health checks
- ✅ Migration support

#### 7. AI Manager (`backend/src/ai.rs`)
**Status**: IMPLEMENTED ✅

AI provider management:
- ✅ Provider detection (OpenAI, Anthropic, Google)
- ✅ API key validation

### ❌ Not Yet Implemented

#### 1. PTY (Pseudo-Terminal) Management
**Status**: NOT IMPLEMENTED ❌

Current implementation uses `tokio::process::Command` which provides:
- ✅ stdin/stdout/stderr piping
- ✅ Process spawning
- ❌ **NO PTY support** (no terminal emulation, no ANSI escape codes, no interactive shells)

**What's Missing**:
- PTY creation and management
- Terminal size (rows/cols) handling
- ANSI escape code processing
- Interactive shell support (bash, zsh, etc.)
- Terminal control sequences

**Required for**:
- Full terminal emulation in the UI
- Interactive shell sessions
- Proper terminal-based applications (vim, nano, htop, etc.)
- ANSI color support

**Recommendation**: Add `portable-pty` crate for proper PTY support.

#### 2. API Key Secure Storage
**Status**: NOT IMPLEMENTED ❌

**What's Missing**:
- Encryption at rest (AES-256-GCM)
- Platform keychain integration
- Secure key storage in Tauri app data directory
- Key CRUD operations
- Provider management

**Required for**:
- Multi-provider API key support
- Secure key storage
- Key testing and validation

**Recommendation**: Implement in Tauri backend using `aes-gcm` and `tauri-plugin-store`.

#### 3. Codex Binary Management
**Status**: NOT IMPLEMENTED ❌

**What's Missing**:
- Codex binary bundling
- Binary path resolution
- Version checking
- Binary verification (checksums)
- Platform-specific binary selection

**Required for**:
- Running codex-main within Skhoot
- Cross-platform support

#### 4. Codex Process Integration
**Status**: NOT IMPLEMENTED ❌

**What's Missing**:
- Codex process lifecycle management
- Environment variable injection (API keys)
- Command routing (chat vs codex)
- Response parsing
- Auto-restart on crash

**Required for**:
- Codex CLI integration
- API key injection
- Command execution

#### 5. Tauri Commands for Terminal
**Status**: NOT IMPLEMENTED ❌

Current Tauri commands are only for audio permissions. Missing:
- Terminal session commands
- API key commands
- Codex process commands

### 🔄 Needs Adaptation

#### 1. Ratatui Integration
**Status**: NEEDS ADAPTATION 🔄

Current TUI is standalone. Needs:
- Bridge between ratatui and Tauri frontend
- Output capture and forwarding
- Input forwarding from frontend
- Frame rendering to transferable format

#### 2. CLI Bridge API Exposure
**Status**: NEEDS TAURI COMMANDS 🔄

The CLI bridge is implemented but not exposed via Tauri commands. Needs:
- Tauri command wrappers
- Error serialization
- State management in Tauri

## Architecture Comparison

### Current Architecture
```
Frontend (React) → Tauri IPC → Tauri Commands (audio only)
                              ↓
                         Rust Backend (HTTP)
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              CLI Bridge          Search Engine
              (implemented)       (implemented)
                    │                   │
              Command Exec         File Search
              (no PTY)            (working)
```

### Target Architecture for Codex Integration
```
Frontend (React) → Tauri IPC → Tauri Commands (NEW)
                              ↓
                    ┌─────────┴──────────┐
                    │                    │
              Terminal Mgmt         API Key Storage
              (PTY needed)          (NEW)
                    │                    │
              CLI Bridge            Codex Process
              (adapt)               (NEW)
                    │                    │
              Codex Binary          Environment
              (bundle)              (inject keys)
```

## Gap Analysis

### High Priority (Blocking)

1. **PTY Support** ❌
   - Impact: Cannot provide full terminal emulation
   - Effort: Medium (add portable-pty, refactor executor)
   - Blocker: Yes (for proper terminal experience)

2. **Tauri Commands** ❌
   - Impact: Cannot expose CLI bridge to frontend
   - Effort: Low (wrapper functions)
   - Blocker: Yes (for any terminal functionality)

3. **API Key Storage** ❌
   - Impact: Cannot store/manage API keys securely
   - Effort: Medium (encryption, storage, Tauri integration)
   - Blocker: Yes (for multi-provider support)

### Medium Priority (Important)

4. **Codex Binary Bundling** ❌
   - Impact: Cannot run codex-main
   - Effort: Medium (build process, bundling)
   - Blocker: Yes (for codex integration)

5. **Codex Process Management** ❌
   - Impact: Cannot manage codex lifecycle
   - Effort: Medium (process wrapper, API key injection)
   - Blocker: Yes (for codex integration)

6. **Ratatui Bridge** 🔄
   - Impact: Cannot render terminal in UI
   - Effort: High (output capture, rendering bridge)
   - Blocker: No (can use simpler terminal initially)

### Low Priority (Nice to Have)

7. **Terminal Tabs** ❌
   - Impact: Single terminal session only
   - Effort: Low (session management already exists)
   - Blocker: No (can add later)

8. **Skhoot Log Tab** ❌
   - Impact: No dedicated logging UI
   - Effort: Low (logging infrastructure exists)
   - Blocker: No (can add later)

## Recommendations

### Phase 1: Leverage Existing Infrastructure
1. ✅ Use existing CLI bridge for command execution
2. ✅ Use existing session management
3. ✅ Use existing security validation
4. ⚠️ Add PTY support to CLI bridge
5. ⚠️ Create Tauri command wrappers

### Phase 2: Add Missing Components
1. ❌ Implement API key secure storage
2. ❌ Bundle codex-main binary
3. ❌ Implement codex process management
4. ❌ Create terminal panel UI

### Phase 3: Enhance and Optimize
1. 🔄 Adapt ratatui for UI rendering
2. ❌ Add terminal tabs
3. ❌ Add Skhoot log tab
4. ❌ Performance optimization

## Updated Implementation Strategy

### What We Can Reuse
- ✅ CLI bridge session management
- ✅ Command validation and security
- ✅ Process spawning infrastructure
- ✅ Error handling
- ✅ Command history
- ✅ Ratatui TUI components (adapt)

### What We Need to Build
- ❌ PTY support in CLI bridge
- ❌ Tauri command layer
- ❌ API key storage system
- ❌ Codex binary management
- ❌ Codex process wrapper
- ❌ Terminal panel UI component
- ❌ Ratatui-to-frontend bridge

### What We Need to Adapt
- 🔄 CLI bridge executor (add PTY)
- 🔄 TUI interface (bridge to frontend)
- 🔄 Tauri main.rs (add commands)

## Estimated Effort Reduction

**Original Estimate**: 8 weeks

**With Existing Infrastructure**:
- Phase 1 (Terminal Foundation): 1-2 weeks → **3-4 days** (CLI bridge exists)
- Phase 2 (API Key Management): 1 week → **4-5 days** (structure exists)
- Phase 3 (Codex Integration): 2 weeks → **1 week** (process management exists)
- Phase 4 (Skhoot Log): 1 week → **2-3 days** (logging exists)
- Phase 5 (Polish): 1 week → **3-4 days** (foundation solid)
- Phase 6 (Release): 1 week → **3-4 days** (build process exists)

**New Estimate**: **4-5 weeks** (37% reduction)

## Key Takeaways

1. **CLI Bridge is Gold** ✅ - The existing CLI bridge is production-ready and handles most of what we need
2. **PTY is Critical** ❌ - Need to add PTY support for proper terminal emulation
3. **Tauri Layer is Thin** ⚠️ - Just need command wrappers, not reimplementation
4. **Ratatui is Ready** ✅ - TUI components exist, just need bridging
5. **Security is Built-in** ✅ - Command validation and sandboxing already implemented
6. **API Key Storage is New** ❌ - This is the main new component needed

## Next Steps

1. ✅ Review this analysis with the team
2. ⚠️ Add PTY support to CLI bridge
3. ⚠️ Create Tauri command wrappers
4. ❌ Implement API key storage
5. ❌ Update spec with precise implementation details
