# Codex-Main Integration Requirements

## Overview
Integrate the OpenAI Codex CLI project (codex-main) into Skhoot to provide a better UI for the CLI tool with full feature parity and enhanced user experience.

**Note**: Skhoot already has a comprehensive CLI bridge and terminal infrastructure. This integration will leverage existing components and add PTY support + Tauri command layer.

## Core Requirements

### 1. Hidden CLI with Ratatui Terminal
**Goal**: Provide a fully-featured terminal interface accessible from the main chat interface

**Requirements**:
- Add a Terminal icon button to the left of the prompt interface
- Implement a hidden CLI using ratatui that can be toggled on/off
- Support multiple terminal tabs within the CLI interface
- Mirror the codex-main CLI execution in the Skhoot frontend
- Provide a dedicated "Skhoot" tab for console logging and app interactivity
- Enable CLI-only functionality so Skhoot can work entirely from the terminal

**Technical Constraints**:
- Must use ratatui for terminal UI rendering (✅ already implemented in `backend/src/cli_engine/tui_interface.rs`)
- Terminal must be embeddable within the Tauri app
- Should support standard terminal features (scrollback, copy/paste, etc.)
- Must handle PTY (pseudo-terminal) for proper shell interaction (⚠️ needs to be added to existing CLI bridge)

**Existing Infrastructure**:
- ✅ CLI Bridge (`backend/src/cli_bridge/`) - Session management, command execution, security validation
- ✅ TUI Interface (`backend/src/cli_engine/tui_interface.rs`) - Full ratatui implementation
- ✅ Command Executor - Process spawning with stdin/stdout/stderr piping
- ⚠️ Missing: PTY support (currently uses `tokio::process::Command`, needs `portable-pty`)

### 2. Flexible API Key Configuration
**Goal**: Remove OpenAI API key restriction and support multiple AI providers

**Requirements**:
- Extend the existing UserPanel API Configuration section
- Allow users to configure API keys for multiple providers:
  - OpenAI
  - Anthropic (Claude)
  - Google (Gemini)
  - Custom endpoints
- Store API keys securely in Tauri v2 app data folder
- Encrypt API keys at rest
- Support provider selection in the UI
- Pass configured API key to codex-main CLI

**Storage Location** (Tauri v2):
- Linux: `~/.local/share/com.skhoot.app/`
- macOS: `~/Library/Application Support/com.skhoot.app/`
- Windows: `%APPDATA%\com.skhoot.app\`

**Security Requirements**:
- Use Tauri's secure storage APIs
- Encrypt keys using platform keychain when available
- Never log or expose keys in plaintext
- Validate API keys before saving

**Existing Infrastructure**:
- ✅ AI Manager (`backend/src/ai.rs`) - Provider detection and validation
- ✅ UserPanel UI - API Configuration section already exists
- ❌ Missing: Secure key storage with encryption
- ❌ Missing: Tauri commands for key management

### 3. Codex-Main CLI Integration
**Goal**: Run codex-main within Skhoot with full feature parity

**Requirements**:
- Bundle codex-main binary with Skhoot distribution
- Launch codex-main as a background process
- Pipe stdin/stdout between Skhoot UI and codex-main
- Support all codex-main commands and features
- Handle authentication using configured API keys
- Provide visual feedback for CLI operations in the UI

**Integration Points**:
- Chat interface can send commands to codex-main
- Terminal tab shows raw codex-main output
- File operations from codex-main reflected in Files panel
- Activity logging for codex-main operations

**Existing Infrastructure**:
- ✅ CLI Bridge - Process management, stdin/stdout piping, session tracking
- ✅ Command Executor - Process spawning with security validation
- ✅ Session Manager - Lifecycle management, command history
- ✅ Search Engine - File search integration
- ❌ Missing: Codex binary bundling and path resolution
- ❌ Missing: Codex-specific process wrapper with API key injection
- ❌ Missing: Tauri commands for codex operations

## User Stories

### US-1: Terminal Access
**As a** developer  
**I want to** access a terminal directly from Skhoot  
**So that** I can run codex commands without leaving the app

**Acceptance Criteria**:
- Terminal icon button visible next to prompt input
- Clicking button toggles terminal panel
- Terminal supports tabs for multiple sessions
- Can run any shell command in terminal
- Terminal persists across app sessions

### US-2: API Key Configuration
**As a** user  
**I want to** configure my own API keys for different AI providers  
**So that** I can use Skhoot with my preferred AI service

**Acceptance Criteria**:
- Can add/edit/delete API keys in UserPanel
- Can select active AI provider
- Keys are stored securely on local machine
- Can test API key connection before saving
- Clear error messages for invalid keys

### US-3: Codex CLI Integration
**As a** developer  
**I want to** use codex-main features through Skhoot's UI  
**So that** I get a better user experience than the standalone CLI

**Acceptance Criteria**:
- All codex-main commands work in Skhoot
- Can authenticate with configured API key
- File operations visible in Files panel
- Command history accessible
- Can switch between UI and CLI modes seamlessly

## Technical Requirements

### Frontend (React/TypeScript)
- New `TerminalPanel` component with ratatui integration
- Enhanced `UserPanel` with multi-provider API key management
- Terminal icon button in `PromptArea`
- State management for terminal sessions
- WebSocket or IPC for terminal communication

### Backend (Rust/Tauri)
- Tauri command for spawning PTY sessions
- Secure storage API for API keys
- Process management for codex-main binary
- IPC handlers for terminal I/O
- File system watchers for codex operations

### Codex-Main Integration
- Build codex-main as part of Skhoot build process
- Bundle appropriate binary for each platform
- Environment variable injection for API keys
- Stdout/stderr capture and forwarding
- Signal handling for graceful shutdown

## Non-Functional Requirements

### Performance
- Terminal rendering at 60fps minimum
- API key encryption/decryption < 100ms
- Codex-main startup < 2 seconds

### Security
- API keys encrypted at rest
- No keys in logs or error messages
- Secure IPC between frontend and backend
- Validate all user input to terminal

### Compatibility
- Support Linux, macOS, Windows
- Work with codex-main latest stable version
- Backward compatible with existing Skhoot features

### Usability
- Terminal keyboard shortcuts match standard terminals
- Clear visual feedback for all operations
- Helpful error messages
- Smooth animations for panel transitions

## Dependencies

### New Dependencies
- `portable-pty` or `pty-process` (Rust) - PTY management
- `tauri-plugin-store` - Secure storage
- `ring` or `aes-gcm` (Rust) - Encryption
- Terminal emulator component for React (if not using ratatui directly)

### Existing Dependencies
- Tauri v2
- React 19
- Rust backend
- ratatui (already in backend)

## Constraints

1. Must maintain existing Skhoot functionality
2. Cannot break current chat interface
3. Must work offline (except AI API calls)
4. Bundle size increase < 50MB
5. Memory usage increase < 200MB

## Success Criteria

1. Users can access full terminal from Skhoot UI
2. Users can configure any AI provider API key
3. All codex-main features work through Skhoot
4. Terminal performance matches native terminals
5. API keys stored securely with encryption
6. Zero security vulnerabilities in key storage
7. Seamless integration with existing Skhoot features

## Out of Scope

- Custom terminal themes (use system defaults)
- Terminal multiplexer features (tmux/screen)
- Remote terminal connections (SSH)
- Terminal recording/playback
- Custom shell scripting language
