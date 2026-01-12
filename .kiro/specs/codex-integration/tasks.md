# Codex-Main Integration Tasks

**Note**: Skhoot already has comprehensive CLI bridge infrastructure. These tasks focus on:
1. Adding PTY support to existing CLI bridge
2. Creating Tauri command wrappers
3. Implementing API key secure storage
4. Bundling and managing codex-main binary
5. Building frontend terminal UI

## Phase 1: PTY Support & Tauri Commands (Week 1)

### Task 1.1: Add PTY Support to Existing CLI Bridge
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: None  
**Leverages**: Existing CLI bridge in `backend/src/cli_bridge/`

**Subtasks**:
- [ ] Add `portable-pty` dependency to `backend/Cargo.toml`
- [ ] Create `backend/src/cli_bridge/pty.rs` module
- [ ] Implement `PtySession` struct wrapping `portable-pty::MasterPty`
- [ ] Add PTY creation to `CommandExecutor::spawn_command()`
- [ ] Implement PTY resize handling
- [ ] Add ANSI escape code support
- [ ] Update `TerminalOutput` to handle raw PTY output
- [ ] Preserve existing stdin/stdout/stderr piping for non-PTY commands
- [ ] Add PTY-specific tests
- [ ] Test on Linux, macOS, Windows

**Acceptance Criteria**:
- Can create PTY sessions with proper terminal emulation
- ANSI escape codes are preserved and forwarded
- Terminal resizing works correctly
- Existing non-PTY command execution still works
- All tests pass on all platforms

**Existing Code to Leverage**:
- ✅ `backend/src/cli_bridge/executor.rs` - Command spawning infrastructure
- ✅ `backend/src/cli_bridge/session.rs` - Session management
- ✅ `backend/src/cli_bridge/types.rs` - Type definitions

---

### Task 1.2: Create Tauri Command Wrappers for CLI Bridge
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: None  
**Leverages**: Existing CLI bridge API

**Subtasks**:
- [ ] Create `src-tauri/src/terminal.rs` module
- [ ] Implement `create_terminal_session` Tauri command
- [ ] Implement `write_to_terminal` Tauri command
- [ ] Implement `read_from_terminal` Tauri command
- [ ] Implement `resize_terminal` Tauri command
- [ ] Implement `close_terminal_session` Tauri command
- [ ] Implement `list_terminal_sessions` Tauri command
- [ ] Implement `get_session_history` Tauri command
- [ ] Add Tauri state management for `CliBridge`
- [ ] Register commands in `src-tauri/src/main.rs`
- [ ] Add error serialization for Tauri IPC
- [ ] Write integration tests

**Acceptance Criteria**:
- All CLI bridge functions exposed via Tauri commands
- Frontend can create and manage terminal sessions
- Errors are properly serialized and returned
- State is managed correctly across commands
- Integration tests pass

**Existing Code to Leverage**:
- ✅ `backend/src/cli_bridge/mod.rs` - Complete CLI bridge API
- ✅ `backend/src/cli_bridge/session.rs` - Session management
- ✅ `backend/src/cli_bridge/executor.rs` - Command execution

---

### Task 1.3: Create Terminal Service in Frontend
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 1.2

**Subtasks**:
- [ ] Create `services/terminalService.ts`
- [ ] Implement session management wrapper
- [ ] Add IPC communication layer using Tauri invoke
- [ ] Create event listeners for terminal output
- [ ] Implement session lifecycle management
- [ ] Add error handling and recovery
- [ ] Create TypeScript interfaces matching Rust types
- [ ] Add service documentation
- [ ] Write integration tests

**Acceptance Criteria**:
- Service manages multiple sessions
- IPC communication is reliable
- Events are properly handled
- Errors are caught and reported
- Sessions clean up on unmount
- All tests pass

---

## Phase 2: API Key Secure Storage (Week 2)

### Task 2.1: Implement Secure Key Storage in Tauri
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: None

**Subtasks**:
- [ ] Add encryption dependencies (`aes-gcm`, `ring`) to `src-tauri/Cargo.toml`
- [ ] Add `tauri-plugin-store` dependency
- [ ] Create `src-tauri/src/api_keys.rs` module
- [ ] Implement `KeyStorage` struct
- [ ] Implement AES-256-GCM encryption
- [ ] Set up platform keychain integration:
  - [ ] Linux: libsecret
  - [ ] macOS: Keychain Services
  - [ ] Windows: Credential Manager
- [ ] Implement `save_api_key` Tauri command
- [ ] Implement `load_api_key` Tauri command
- [ ] Implement `delete_api_key` Tauri command
- [ ] Implement `list_providers` Tauri command
- [ ] Implement `test_api_key` Tauri command (leverage existing AI manager)
- [ ] Add key validation
- [ ] Write security tests
- [ ] Test on all platforms

**Acceptance Criteria**:
- Keys are encrypted at rest
- Encryption key stored in platform keychain
- Can save, load, and delete keys
- Keys never appear in logs
- All security tests pass
- Works on Linux, macOS, Windows

**Existing Code to Leverage**:
- ✅ `backend/src/ai.rs` - AI provider detection and validation
- ✅ Tauri app data directory structure

---

### Task 2.2: Enhance UserPanel for Multi-Provider Support
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Update `components/settings/UserPanel.tsx`
- [ ] Add provider selection UI (OpenAI, Anthropic, Google, Custom)
- [ ] Create provider card components
- [ ] Update API key input to support multiple providers
- [ ] Add provider-specific validation
- [ ] Update test connection to use new Tauri commands
- [ ] Add provider icons/logos
- [ ] Update save/load logic to use Tauri commands
- [ ] Add delete key confirmation
- [ ] Style with existing design system
- [ ] Add loading states
- [ ] Write component tests

**Acceptance Criteria**:
- Can select from multiple providers
- Can input and save API keys per provider
- Keys are masked in UI
- Test connection validates keys
- Clear success/error feedback
- Matches Skhoot design language
- All interactions are smooth

**Existing Code to Leverage**:
- ✅ `components/settings/UserPanel.tsx` - API Configuration section exists
- ✅ Existing button components and styling

---

### Task 2.3: Create API Key Service
**Priority**: High  
**Estimated Time**: 1 day  
**Dependencies**: Task 2.1, Task 2.2

**Subtasks**:
- [ ] Create `services/apiKeyService.ts`
- [ ] Implement provider management
- [ ] Add key CRUD operations using Tauri commands
- [ ] Implement key testing logic
- [ ] Add active provider management
- [ ] Create TypeScript interfaces
- [ ] Add error handling
- [ ] Implement caching strategy
- [ ] Add service documentation
- [ ] Write integration tests

**Acceptance Criteria**:
- Service handles all key operations
- Provider switching works smoothly
- Key testing is reliable
- Errors are properly handled
- Cache improves performance
- All tests pass

---

## Phase 3: Codex Binary Management (Week 3)

### Task 3.1: Bundle Codex Binary
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: None

**Subtasks**:
- [ ] Build codex-main for Linux (x86_64)
- [ ] Build codex-main for macOS (arm64, x86_64)
- [ ] Build codex-main for Windows (x86_64)
- [ ] Add binaries to `src-tauri/resources/`
- [ ] Update `tauri.conf.json` to include binaries
- [ ] Create build script for codex compilation
- [ ] Add version checking mechanism
- [ ] Implement binary verification (checksums)
- [ ] Test binary execution on each platform
- [ ] Document build process

**Acceptance Criteria**:
- Codex binaries included in app bundle
- Binaries execute correctly on each platform
- Build process is automated
- Checksums verify binary integrity
- Documentation is complete

---

### Task 3.2: Implement Codex Process Wrapper
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: Task 2.1, Task 3.1  
**Leverages**: Existing CLI bridge

**Subtasks**:
- [ ] Create `src-tauri/src/codex_integration.rs`
- [ ] Implement `CodexProcess` struct wrapping `CliBridge`
- [ ] Add codex binary path resolution
- [ ] Implement environment variable injection for API keys
- [ ] Implement `start_codex` Tauri command
- [ ] Implement `send_codex_command` Tauri command
- [ ] Implement `stop_codex` Tauri command
- [ ] Implement `get_codex_status` Tauri command
- [ ] Add process monitoring using existing session management
- [ ] Implement auto-restart on crash
- [ ] Add resource usage tracking
- [ ] Implement graceful shutdown
- [ ] Write process management tests

**Acceptance Criteria**:
- Can start/stop codex process
- Commands are sent and responses received
- API keys are injected correctly
- Process crashes are handled
- Resource usage is monitored
- Graceful shutdown works
- All tests pass

**Existing Code to Leverage**:
- ✅ `backend/src/cli_bridge/` - Complete process management
- ✅ Session lifecycle management
- ✅ Command execution infrastructure

---

### Task 3.3: Create Codex Service
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.2

**Subtasks**:
- [ ] Create `services/codexService.ts`
- [ ] Implement process lifecycle management
- [ ] Add command queue
- [ ] Implement response parsing
- [ ] Add event listeners for codex output
- [ ] Create command history
- [ ] Add error handling
- [ ] Implement timeout handling
- [ ] Create TypeScript interfaces
- [ ] Add service documentation
- [ ] Write integration tests

**Acceptance Criteria**:
- Service manages codex lifecycle
- Commands are queued and executed
- Responses are parsed correctly
- Events are properly emitted
- Errors are handled gracefully
- All tests pass

---

## Phase 4: Terminal UI Components (Week 4)

### Task 4.1: Create TerminalPanel Component
**Priority**: High  
**Estimated Time**: 4 days  
**Dependencies**: Task 1.3  
**Leverages**: Existing TUI interface design

**Subtasks**:
- [ ] Create `components/terminal/TerminalPanel.tsx`
- [ ] Implement tab management UI
- [ ] Create terminal renderer component (xterm.js or custom)
- [ ] Add ANSI escape code parser
- [ ] Implement scrollback buffer (10,000 lines)
- [ ] Add keyboard input handling
- [ ] Implement copy/paste functionality
- [ ] Add terminal search feature
- [ ] Create terminal context menu
- [ ] Style terminal with glass morphism theme
- [ ] Add smooth open/close animations
- [ ] Implement terminal resize handling
- [ ] Add accessibility features (ARIA labels)
- [ ] Write component tests

**Acceptance Criteria**:
- Terminal panel opens/closes smoothly
- Can create and switch between tabs
- Terminal displays output correctly with ANSI colors
- Keyboard input works as expected
- Copy/paste functions properly
- Search finds text in terminal
- Responsive to window resizing
- Accessible via keyboard navigation

**Existing Code to Leverage**:
- ✅ `backend/src/cli_engine/tui_interface.rs` - TUI design patterns
- ✅ Existing panel components (SettingsPanel, FilesPanel)

---

### Task 4.2: Add Terminal Icon Button
**Priority**: Medium  
**Estimated Time**: 1 day  
**Dependencies**: Task 4.1

**Subtasks**:
- [ ] Add Terminal icon from lucide-react
- [ ] Create icon button in `PromptArea.tsx`
- [ ] Position button left of prompt input
- [ ] Add hover effects and tooltips
- [ ] Connect button to terminal panel state
- [ ] Add keyboard shortcut (Ctrl+`)
- [ ] Update UI to accommodate new button
- [ ] Test button interactions
- [ ] Add visual indicator when terminal is open

**Acceptance Criteria**:
- Button visible and properly positioned
- Clicking toggles terminal panel
- Keyboard shortcut works
- Visual feedback on hover/click
- Indicator shows terminal state

---

### Task 4.3: Add Codex Terminal Tab
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.3, Task 4.1

**Subtasks**:
- [ ] Add "Codex" tab type to TerminalPanel
- [ ] Create codex-specific terminal renderer
- [ ] Implement codex command syntax highlighting
- [ ] Add codex command autocomplete
- [ ] Create codex status indicator
- [ ] Add codex-specific context menu
- [ ] Implement codex command history
- [ ] Add codex output formatting
- [ ] Style codex tab distinctly
- [ ] Write component tests

**Acceptance Criteria**:
- Codex tab shows codex CLI output
- Syntax highlighting works
- Autocomplete suggests commands
- Status indicator shows connection state
- Command history is accessible
- Output is properly formatted

---

### Task 4.4: Integrate Codex with Chat Interface
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.3

**Subtasks**:
- [ ] Update `ChatInterface.tsx` to support codex commands
- [ ] Add codex command detection
- [ ] Implement command routing (chat vs codex)
- [ ] Add codex response rendering
- [ ] Create codex-specific message types
- [ ] Add file operation visualization
- [ ] Implement progress indicators
- [ ] Add error handling for codex commands
- [ ] Create codex command suggestions
- [ ] Update activity logging
- [ ] Write integration tests

**Acceptance Criteria**:
- Chat can send commands to codex
- Codex responses display in chat
- File operations are visualized
- Progress is shown for long operations
- Errors are clearly communicated
- Activity is logged correctly

---

## Phase 5: Skhoot Log Tab (Week 5)

### Task 5.1: Create Skhoot Log System
**Priority**: Low  
**Estimated Time**: 2 days  
**Dependencies**: Task 4.1

**Subtasks**:
- [ ] Create `services/skhootLogger.ts`
- [ ] Implement log levels (debug, info, warn, error)
- [ ] Add log formatting
- [ ] Create log buffer management
- [ ] Implement log filtering
- [ ] Add timestamp formatting
- [ ] Create log export functionality
- [ ] Add log search
- [ ] Implement log persistence
- [ ] Write logger tests

**Acceptance Criteria**:
- Logger captures all app events
- Logs are properly formatted
- Can filter by level
- Search finds log entries
- Logs can be exported
- Buffer doesn't grow unbounded

---

### Task 5.2: Add Skhoot Log Terminal Tab
**Priority**: Low  
**Estimated Time**: 2 days  
**Dependencies**: Task 5.1

**Subtasks**:
- [ ] Add "Skhoot Log" tab type
- [ ] Create log viewer component
- [ ] Implement log level filtering UI
- [ ] Add log search UI
- [ ] Create log export button
- [ ] Add auto-scroll toggle
- [ ] Implement log highlighting
- [ ] Add timestamp display
- [ ] Create clear logs button
- [ ] Style log viewer
- [ ] Write component tests

**Acceptance Criteria**:
- Log tab shows all app logs
- Can filter by log level
- Search works correctly
- Can export logs
- Auto-scroll can be toggled
- Logs are color-coded by level

---

## Phase 6: Polish & Testing (Week 6)

### Task 6.1: Performance Optimization
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Profile terminal rendering performance
- [ ] Optimize terminal output buffering
- [ ] Implement virtual scrolling
- [ ] Optimize API key encryption/decryption
- [ ] Add caching for frequently accessed data
- [ ] Optimize codex command queue
- [ ] Reduce memory usage
- [ ] Optimize bundle size
- [ ] Add lazy loading where appropriate
- [ ] Run performance benchmarks
- [ ] Document performance improvements

**Acceptance Criteria**:
- Terminal renders at 60fps
- API key operations < 100ms
- Memory usage < 200MB increase
- Bundle size increase < 50MB
- All benchmarks meet targets

---

### Task 6.2: Testing & QA
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Run full test suite
- [ ] Test on Linux (Ubuntu, Fedora)
- [ ] Test on macOS (Intel, Apple Silicon)
- [ ] Test on Windows (10, 11)
- [ ] Test with different API providers
- [ ] Test error scenarios
- [ ] Test performance under load
- [ ] Test security measures
- [ ] Conduct penetration testing
- [ ] Fix all critical bugs
- [ ] Document known issues

**Acceptance Criteria**:
- All tests pass on all platforms
- No critical bugs remain
- Performance meets targets
- Security audit passes
- Known issues are documented

---

### Task 6.3: Documentation
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Write user documentation
- [ ] Create developer documentation
- [ ] Document API key setup
- [ ] Document terminal usage
- [ ] Document codex integration
- [ ] Create troubleshooting guide
- [ ] Add inline code comments
- [ ] Create architecture diagrams
- [ ] Write migration guide
- [ ] Create video tutorials
- [ ] Update README.md

**Acceptance Criteria**:
- User docs are comprehensive
- Developer docs are clear
- Setup guides are complete
- Troubleshooting covers common issues
- Code is well-commented
- Diagrams are accurate
- README is up-to-date

---

## Timeline Summary

- **Week 1**: PTY Support & Tauri Commands
- **Week 2**: API Key Secure Storage
- **Week 3**: Codex Binary Management
- **Week 4**: Terminal UI Components
- **Week 5**: Skhoot Log Tab
- **Week 6**: Polish & Testing

**Total Estimated Time**: 6 weeks (reduced from 8 weeks due to existing infrastructure)

## Existing Infrastructure Leverage

### What We're Reusing (✅)
- CLI bridge session management
- Command validation and security
- Process spawning infrastructure
- Error handling
- Command history
- Ratatui TUI components
- AI provider detection
- Search engine integration
- Database and API infrastructure

### What We're Building (❌)
- PTY support in CLI bridge
- Tauri command layer
- API key storage system
- Codex binary management
- Codex process wrapper
- Terminal panel UI component
- Frontend services

### What We're Adapting (🔄)
- CLI bridge executor (add PTY)
- TUI interface (bridge to frontend)
- Tauri main.rs (add commands)

## Success Metrics

### Functionality
- [ ] All codex-main features work in Skhoot
- [ ] Terminal supports all standard features
- [ ] API keys work with all providers
- [ ] No data loss or corruption

### Performance
- [ ] Terminal renders at 60fps
- [ ] API key operations < 100ms
- [ ] Codex startup < 2 seconds
- [ ] Memory usage < 200MB increase

### Security
- [ ] API keys encrypted at rest
- [ ] No keys in logs or errors
- [ ] Security audit passes
- [ ] No critical vulnerabilities

### User Experience
- [ ] Smooth animations
- [ ] Clear error messages
- [ ] Intuitive UI
- [ ] Comprehensive documentation

### Task 1.1: Set up PTY Management in Tauri
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: None

**Subtasks**:
- [ ] Add `portable-pty` dependency to `src-tauri/Cargo.toml`
- [ ] Create `src-tauri/src/terminal.rs` module
- [ ] Implement `TerminalManager` struct
- [ ] Implement `create_terminal_session` command
- [ ] Implement `write_to_terminal` command
- [ ] Implement `read_from_terminal` command
- [ ] Implement `resize_terminal` command
- [ ] Implement `close_terminal_session` command
- [ ] Add terminal state management
- [ ] Set up event emitters for terminal output
- [ ] Write unit tests for PTY operations
- [ ] Test on Linux, macOS, Windows

**Acceptance Criteria**:
- Can create PTY sessions from frontend
- Can write to and read from PTY
- Terminal resizing works correctly
- Sessions clean up properly on close
- All tests pass on all platforms

---

### Task 1.2: Create TerminalPanel Component
**Priority**: High  
**Estimated Time**: 4 days  
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Create `components/terminal/TerminalPanel.tsx`
- [ ] Implement tab management UI
- [ ] Create terminal renderer component
- [ ] Add ANSI escape code parser
- [ ] Implement scrollback buffer (10,000 lines)
- [ ] Add keyboard input handling
- [ ] Implement copy/paste functionality
- [ ] Add terminal search feature
- [ ] Create terminal context menu
- [ ] Style terminal with glass morphism theme
- [ ] Add smooth open/close animations
- [ ] Implement terminal resize handling
- [ ] Add accessibility features (ARIA labels)
- [ ] Write component tests

**Acceptance Criteria**:
- Terminal panel opens/closes smoothly
- Can create and switch between tabs
- Terminal displays output correctly
- Keyboard input works as expected
- Copy/paste functions properly
- Search finds text in terminal
- Responsive to window resizing
- Accessible via keyboard navigation

---

### Task 1.3: Add Terminal Icon Button
**Priority**: Medium  
**Estimated Time**: 1 day  
**Dependencies**: Task 1.2

**Subtasks**:
- [ ] Add Terminal icon from lucide-react
- [ ] Create icon button in `PromptArea.tsx`
- [ ] Position button left of prompt input
- [ ] Add hover effects and tooltips
- [ ] Connect button to terminal panel state
- [ ] Add keyboard shortcut (Ctrl+`)
- [ ] Update UI to accommodate new button
- [ ] Test button interactions
- [ ] Add visual indicator when terminal is open

**Acceptance Criteria**:
- Button visible and properly positioned
- Clicking toggles terminal panel
- Keyboard shortcut works
- Visual feedback on hover/click
- Indicator shows terminal state

---

### Task 1.4: Implement Terminal Service
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 1.1, Task 1.2

**Subtasks**:
- [ ] Create `services/terminalService.ts`
- [ ] Implement session management
- [ ] Add IPC communication layer
- [ ] Create event listeners for terminal output
- [ ] Implement session lifecycle management
- [ ] Add error handling and recovery
- [ ] Create TypeScript interfaces
- [ ] Add service documentation
- [ ] Write integration tests

**Acceptance Criteria**:
- Service manages multiple sessions
- IPC communication is reliable
- Events are properly handled
- Errors are caught and reported
- Sessions clean up on unmount
- All tests pass

---

## Phase 2: API Key Management (Week 3)

### Task 2.1: Implement Secure Key Storage
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: None

**Subtasks**:
- [ ] Add encryption dependencies (`aes-gcm`, `ring`)
- [ ] Add `tauri-plugin-store` dependency
- [ ] Create `src-tauri/src/api_keys.rs` module
- [ ] Implement `KeyStorage` struct
- [ ] Implement AES-256-GCM encryption
- [ ] Set up platform keychain integration:
  - [ ] Linux: libsecret
  - [ ] macOS: Keychain Services
  - [ ] Windows: Credential Manager
- [ ] Implement `save_api_key` command
- [ ] Implement `load_api_key` command
- [ ] Implement `delete_api_key` command
- [ ] Implement `list_providers` command
- [ ] Add key validation
- [ ] Write security tests
- [ ] Test on all platforms

**Acceptance Criteria**:
- Keys are encrypted at rest
- Encryption key stored in platform keychain
- Can save, load, and delete keys
- Keys never appear in logs
- All security tests pass
- Works on Linux, macOS, Windows

---

### Task 2.2: Enhance UserPanel for Multi-Provider Support
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Update `components/settings/UserPanel.tsx`
- [ ] Add provider selection UI
- [ ] Create provider card components
- [ ] Add API key input with masking
- [ ] Implement custom endpoint input
- [ ] Add provider icons/logos
- [ ] Create test connection button
- [ ] Add connection status indicator
- [ ] Implement save/cancel actions
- [ ] Add validation for key formats
- [ ] Create provider management modal
- [ ] Add delete key confirmation
- [ ] Style with existing design system
- [ ] Add loading states
- [ ] Write component tests

**Acceptance Criteria**:
- Can select from multiple providers
- Can input and save API keys
- Keys are masked in UI
- Test connection validates keys
- Clear success/error feedback
- Matches Skhoot design language
- All interactions are smooth

---

### Task 2.3: Create API Key Service
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 2.1, Task 2.2

**Subtasks**:
- [ ] Create `services/apiKeyService.ts`
- [ ] Implement provider management
- [ ] Add key CRUD operations
- [ ] Implement key testing logic
- [ ] Add active provider management
- [ ] Create TypeScript interfaces
- [ ] Add error handling
- [ ] Implement caching strategy
- [ ] Add service documentation
- [ ] Write integration tests

**Acceptance Criteria**:
- Service handles all key operations
- Provider switching works smoothly
- Key testing is reliable
- Errors are properly handled
- Cache improves performance
- All tests pass

---

### Task 2.4: Implement API Key Testing
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Add `test_api_key` Tauri command
- [ ] Implement OpenAI key testing
- [ ] Implement Anthropic key testing
- [ ] Implement Google AI key testing
- [ ] Add custom endpoint testing
- [ ] Handle various error responses
- [ ] Add timeout handling
- [ ] Implement retry logic
- [ ] Add detailed error messages
- [ ] Write tests for each provider

**Acceptance Criteria**:
- Can test keys for all providers
- Provides clear success/failure feedback
- Handles network errors gracefully
- Timeout prevents hanging
- Error messages are helpful

---

## Phase 3: Codex Integration (Week 4-5)

### Task 3.1: Bundle Codex Binary
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: None

**Subtasks**:
- [ ] Build codex-main for Linux (x86_64)
- [ ] Build codex-main for macOS (arm64, x86_64)
- [ ] Build codex-main for Windows (x86_64)
- [ ] Add binaries to `src-tauri/resources/`
- [ ] Update `tauri.conf.json` to include binaries
- [ ] Create build script for codex compilation
- [ ] Add version checking mechanism
- [ ] Implement binary verification (checksums)
- [ ] Test binary execution on each platform
- [ ] Document build process

**Acceptance Criteria**:
- Codex binaries included in app bundle
- Binaries execute correctly on each platform
- Build process is automated
- Checksums verify binary integrity
- Documentation is complete

---

### Task 3.2: Implement Codex Process Management
**Priority**: High  
**Estimated Time**: 4 days  
**Dependencies**: Task 2.1, Task 3.1

**Subtasks**:
- [ ] Create `src-tauri/src/codex_integration.rs`
- [ ] Implement `CodexProcess` struct
- [ ] Add process spawning logic
- [ ] Implement stdin/stdout piping
- [ ] Add environment variable injection
- [ ] Implement `start_codex` command
- [ ] Implement `send_codex_command` command
- [ ] Implement `stop_codex` command
- [ ] Implement `get_codex_status` command
- [ ] Add process monitoring
- [ ] Implement auto-restart on crash
- [ ] Add resource usage tracking
- [ ] Implement graceful shutdown
- [ ] Write process management tests

**Acceptance Criteria**:
- Can start/stop codex process
- Commands are sent and responses received
- API keys are injected correctly
- Process crashes are handled
- Resource usage is monitored
- Graceful shutdown works
- All tests pass

---

### Task 3.3: Create Codex Service
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 3.2

**Subtasks**:
- [ ] Create `services/codexService.ts`
- [ ] Implement process lifecycle management
- [ ] Add command queue
- [ ] Implement response parsing
- [ ] Add event listeners for codex output
- [ ] Create command history
- [ ] Add error handling
- [ ] Implement timeout handling
- [ ] Create TypeScript interfaces
- [ ] Add service documentation
- [ ] Write integration tests

**Acceptance Criteria**:
- Service manages codex lifecycle
- Commands are queued and executed
- Responses are parsed correctly
- Events are properly emitted
- Errors are handled gracefully
- All tests pass

---

### Task 3.4: Add Codex Terminal Tab
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: Task 1.2, Task 3.3

**Subtasks**:
- [ ] Add "Codex" tab type to TerminalPanel
- [ ] Create codex-specific terminal renderer
- [ ] Implement codex command syntax highlighting
- [ ] Add codex command autocomplete
- [ ] Create codex status indicator
- [ ] Add codex-specific context menu
- [ ] Implement codex command history
- [ ] Add codex output formatting
- [ ] Style codex tab distinctly
- [ ] Write component tests

**Acceptance Criteria**:
- Codex tab shows codex CLI output
- Syntax highlighting works
- Autocomplete suggests commands
- Status indicator shows connection state
- Command history is accessible
- Output is properly formatted

---

### Task 3.5: Integrate Codex with Chat Interface
**Priority**: Medium  
**Estimated Time**: 3 days  
**Dependencies**: Task 3.3

**Subtasks**:
- [ ] Update `ChatInterface.tsx` to support codex commands
- [ ] Add codex command detection
- [ ] Implement command routing (chat vs codex)
- [ ] Add codex response rendering
- [ ] Create codex-specific message types
- [ ] Add file operation visualization
- [ ] Implement progress indicators
- [ ] Add error handling for codex commands
- [ ] Create codex command suggestions
- [ ] Update activity logging
- [ ] Write integration tests

**Acceptance Criteria**:
- Chat can send commands to codex
- Codex responses display in chat
- File operations are visualized
- Progress is shown for long operations
- Errors are clearly communicated
- Activity is logged correctly

---

## Phase 4: Skhoot Log Tab (Week 6)

### Task 4.1: Create Skhoot Log System
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: Task 1.2

**Subtasks**:
- [ ] Create `services/skhootLogger.ts`
- [ ] Implement log levels (debug, info, warn, error)
- [ ] Add log formatting
- [ ] Create log buffer management
- [ ] Implement log filtering
- [ ] Add timestamp formatting
- [ ] Create log export functionality
- [ ] Add log search
- [ ] Implement log persistence
- [ ] Write logger tests

**Acceptance Criteria**:
- Logger captures all app events
- Logs are properly formatted
- Can filter by level
- Search finds log entries
- Logs can be exported
- Buffer doesn't grow unbounded

---

### Task 4.2: Add Skhoot Log Terminal Tab
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: Task 4.1

**Subtasks**:
- [ ] Add "Skhoot Log" tab type
- [ ] Create log viewer component
- [ ] Implement log level filtering UI
- [ ] Add log search UI
- [ ] Create log export button
- [ ] Add auto-scroll toggle
- [ ] Implement log highlighting
- [ ] Add timestamp display
- [ ] Create clear logs button
- [ ] Style log viewer
- [ ] Write component tests

**Acceptance Criteria**:
- Log tab shows all app logs
- Can filter by log level
- Search works correctly
- Can export logs
- Auto-scroll can be toggled
- Logs are color-coded by level

---

### Task 4.3: Integrate Logging Throughout App
**Priority**: Low  
**Estimated Time**: 2 days  
**Dependencies**: Task 4.1

**Subtasks**:
- [ ] Add logging to ChatInterface
- [ ] Add logging to TerminalPanel
- [ ] Add logging to API key operations
- [ ] Add logging to codex operations
- [ ] Add logging to file operations
- [ ] Add logging to auth operations
- [ ] Add logging to settings changes
- [ ] Add logging to error handlers
- [ ] Add performance logging
- [ ] Test logging coverage

**Acceptance Criteria**:
- All major operations are logged
- Errors are logged with context
- Performance metrics are captured
- Logs don't impact performance
- No sensitive data in logs

---

## Phase 5: Polish & Optimization (Week 7)

### Task 5.1: Performance Optimization
**Priority**: High  
**Estimated Time**: 3 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Profile terminal rendering performance
- [ ] Optimize terminal output buffering
- [ ] Implement virtual scrolling
- [ ] Optimize API key encryption/decryption
- [ ] Add caching for frequently accessed data
- [ ] Optimize codex command queue
- [ ] Reduce memory usage
- [ ] Optimize bundle size
- [ ] Add lazy loading where appropriate
- [ ] Run performance benchmarks
- [ ] Document performance improvements

**Acceptance Criteria**:
- Terminal renders at 60fps
- API key operations < 100ms
- Memory usage < 200MB increase
- Bundle size increase < 50MB
- All benchmarks meet targets

---

### Task 5.2: Error Handling Improvements
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Review all error paths
- [ ] Add user-friendly error messages
- [ ] Implement error recovery strategies
- [ ] Add error reporting UI
- [ ] Create error documentation
- [ ] Add error logging
- [ ] Implement retry mechanisms
- [ ] Add fallback behaviors
- [ ] Test error scenarios
- [ ] Update error handling docs

**Acceptance Criteria**:
- All errors have clear messages
- Recovery strategies work
- Users can report errors
- Errors are properly logged
- Retry mechanisms function
- Documentation is complete

---

### Task 5.3: UI/UX Refinements
**Priority**: Medium  
**Estimated Time**: 3 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Review all animations
- [ ] Improve transition smoothness
- [ ] Add loading states everywhere
- [ ] Improve keyboard navigation
- [ ] Add tooltips for all actions
- [ ] Improve accessibility (ARIA)
- [ ] Add keyboard shortcuts
- [ ] Improve mobile responsiveness
- [ ] Add onboarding flow
- [ ] Conduct user testing
- [ ] Implement feedback

**Acceptance Criteria**:
- All animations are smooth
- Loading states are clear
- Keyboard navigation works
- Tooltips are helpful
- Accessibility score > 90
- Shortcuts are documented
- Onboarding is clear

---

### Task 5.4: Documentation
**Priority**: Medium  
**Estimated Time**: 2 days  
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Write user documentation
- [ ] Create developer documentation
- [ ] Document API key setup
- [ ] Document terminal usage
- [ ] Document codex integration
- [ ] Create troubleshooting guide
- [ ] Add inline code comments
- [ ] Create architecture diagrams
- [ ] Write migration guide
- [ ] Create video tutorials
- [ ] Update README.md

**Acceptance Criteria**:
- User docs are comprehensive
- Developer docs are clear
- Setup guides are complete
- Troubleshooting covers common issues
- Code is well-commented
- Diagrams are accurate
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
- [ ] Test with different API providers
- [ ] Test error scenarios
- [ ] Test performance under load
- [ ] Test security measures
- [ ] Conduct penetration testing
- [ ] Fix all critical bugs
- [ ] Document known issues

**Acceptance Criteria**:
- All tests pass on all platforms
- No critical bugs remain
- Performance meets targets
- Security audit passes
- Known issues are documented

---

## Phase 6: Release Preparation (Week 8)

### Task 6.1: Build & Package
**Priority**: High  
**Estimated Time**: 2 days  
**Dependencies**: Task 5.5

**Subtasks**:
- [ ] Create release builds for all platforms
- [ ] Test installers on each platform
- [ ] Create update mechanism
- [ ] Set up auto-update server
- [ ] Create release notes
- [ ] Tag release in git
- [ ] Create GitHub release
- [ ] Upload binaries
- [ ] Update download links
- [ ] Test installation process

**Acceptance Criteria**:
- Builds complete successfully
- Installers work on all platforms
- Auto-update functions correctly
- Release notes are complete
- Binaries are available
- Installation is smooth

---

### Task 6.2: Marketing & Communication
**Priority**: Low  
**Estimated Time**: 2 days  
**Dependencies**: Task 6.1

**Subtasks**:
- [ ] Update website with new features
- [ ] Create announcement blog post
- [ ] Prepare social media posts
- [ ] Create demo video
- [ ] Update screenshots
- [ ] Notify existing users
- [ ] Post on relevant forums
- [ ] Reach out to tech press
- [ ] Update app store listings
- [ ] Monitor feedback

**Acceptance Criteria**:
- Website is updated
- Blog post is published
- Social media posts are live
- Demo video is available
- Users are notified
- Feedback is monitored

---

## Risk Management

### High-Risk Tasks
1. **Task 1.1** - PTY management is complex and platform-specific
   - Mitigation: Extensive testing on all platforms, fallback to simpler terminal
2. **Task 2.1** - Security is critical for API key storage
   - Mitigation: Security audit, use proven libraries, extensive testing
3. **Task 3.2** - Process management can be fragile
   - Mitigation: Robust error handling, monitoring, auto-restart

### Dependencies
- Codex-main project must be stable and buildable
- Platform keychain APIs must be accessible
- PTY libraries must support all target platforms

### Blockers
- If codex-main can't be built, consider using npm package instead
- If platform keychain fails, fall back to encrypted file storage
- If PTY doesn't work, use simpler command execution

## Success Metrics

### Functionality
- [ ] All codex-main features work in Skhoot
- [ ] Terminal supports all standard features
- [ ] API keys work with all providers
- [ ] No data loss or corruption

### Performance
- [ ] Terminal renders at 60fps
- [ ] API key operations < 100ms
- [ ] Codex startup < 2 seconds
- [ ] Memory usage < 200MB increase

### Security
- [ ] API keys encrypted at rest
- [ ] No keys in logs or errors
- [ ] Security audit passes
- [ ] No critical vulnerabilities

### User Experience
- [ ] Smooth animations
- [ ] Clear error messages
- [ ] Intuitive UI
- [ ] Comprehensive documentation

## Timeline Summary

- **Week 1-2**: Terminal Foundation
- **Week 3**: API Key Management
- **Week 4-5**: Codex Integration
- **Week 6**: Skhoot Log Tab
- **Week 7**: Polish & Optimization
- **Week 8**: Release Preparation

**Total Estimated Time**: 8 weeks

## Next Steps

1. Review and approve this task breakdown
2. Set up project tracking (GitHub Projects, Jira, etc.)
3. Assign tasks to team members
4. Begin Phase 1: Terminal Foundation
5. Schedule weekly progress reviews
6. Adjust timeline based on actual progress
