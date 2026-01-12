# Codex-Main Integration Spec

## Quick Overview

This specification outlines the integration of OpenAI's Codex CLI project into Skhoot, providing a superior UI experience while maintaining 100% feature parity with the standalone CLI.

## Goals

1. **Hidden CLI with Ratatui** - Full-featured terminal accessible via icon button, supporting multiple tabs and mirroring codex-main execution
2. **Flexible API Keys** - Support any AI provider (OpenAI, Anthropic, Google, Custom) with secure local storage
3. **Seamless Integration** - Run codex-main within Skhoot with visual feedback and enhanced UX

## Documents

- **[requirements.md](./requirements.md)** - Detailed requirements, user stories, constraints, and success criteria
- **[design.md](./design.md)** - Architecture, component design, data flows, security, and performance considerations
- **[tasks.md](./tasks.md)** - 8-week implementation plan with 30+ tasks across 6 phases

## Key Features

### 1. Terminal Panel
- Icon button next to prompt input
- Multi-tab support (Shell, Codex, Skhoot Log)
- Ratatui-based rendering
- Standard terminal features (scrollback, copy/paste, search)
- Keyboard shortcuts (Ctrl+`)

### 2. API Key Management
- Multi-provider support (OpenAI, Anthropic, Google AI, Custom)
- Secure storage with AES-256-GCM encryption
- Platform keychain integration
- Test connection before saving
- Enhanced UserPanel UI

### 3. Codex Integration
- Bundled codex-main binary (Linux, macOS, Windows)
- Background process management
- Stdin/stdout piping
- Environment variable injection for API keys
- Visual feedback in chat interface

## Architecture

```
Frontend (React/TypeScript)
├── TerminalPanel - Multi-tab terminal UI
├── UserPanel - API key configuration
└── ChatInterface - Codex command integration

Tauri IPC Bridge
├── Terminal commands (create, write, read, resize, close)
├── API key commands (save, load, test, delete)
└── Codex commands (start, send, stop, status)

Backend (Rust/Tauri)
├── PTY Manager - Terminal session management
├── Key Storage - Encrypted API key storage
├── Process Manager - Codex process lifecycle
└── Codex Integration - Command execution
```

## Implementation Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| 1. Terminal Foundation | Week 1-2 | PTY management, TerminalPanel component, icon button |
| 2. API Key Management | Week 3 | Secure storage, multi-provider UI, key testing |
| 3. Codex Integration | Week 4-5 | Binary bundling, process management, chat integration |
| 4. Skhoot Log Tab | Week 6 | Logging system, log viewer, app-wide integration |
| 5. Polish & Optimization | Week 7 | Performance tuning, error handling, UX refinements |
| 6. Release Preparation | Week 8 | Builds, documentation, testing, marketing |

**Total: 8 weeks**

## Technical Requirements

### New Dependencies

**Rust (Tauri Backend)**:
- `portable-pty` - PTY management
- `aes-gcm` or `ring` - Encryption
- `tauri-plugin-store` - Secure storage

**TypeScript (Frontend)**:
- Terminal emulator component (or direct ratatui integration)

### Platform Support
- Linux (x86_64)
- macOS (arm64, x86_64)
- Windows (x86_64)

## Success Criteria

### Functionality
- ✅ All codex-main features work in Skhoot
- ✅ Terminal supports standard features
- ✅ API keys work with all providers
- ✅ No data loss or corruption

### Performance
- ✅ Terminal renders at 60fps
- ✅ API key operations < 100ms
- ✅ Codex startup < 2 seconds
- ✅ Memory increase < 200MB

### Security
- ✅ API keys encrypted at rest
- ✅ No keys in logs or errors
- ✅ Security audit passes
- ✅ No critical vulnerabilities

### User Experience
- ✅ Smooth animations
- ✅ Clear error messages
- ✅ Intuitive UI
- ✅ Comprehensive documentation

## Security Highlights

### API Key Protection
- AES-256-GCM encryption at rest
- Platform keychain for encryption key storage
- Never logged or exposed in plaintext
- Cleared from memory after use

### Terminal Security
- Input sanitization to prevent injection
- Rate limiting for commands
- Limited output buffer size
- File path validation

### Process Isolation
- Minimal permissions for codex process
- Sandboxing where available
- Resource usage monitoring
- Timeout for long-running commands

## Getting Started

1. **Review the spec documents**:
   - Start with `requirements.md` for the big picture
   - Read `design.md` for technical details
   - Check `tasks.md` for implementation steps

2. **Set up project tracking**:
   - Create GitHub Project or Jira board
   - Import tasks from `tasks.md`
   - Assign team members

3. **Begin Phase 1**:
   - Task 1.1: Set up PTY management
   - Task 1.2: Create TerminalPanel component
   - Task 1.3: Add terminal icon button
   - Task 1.4: Implement terminal service

4. **Weekly reviews**:
   - Check progress against timeline
   - Adjust estimates based on actual velocity
   - Address blockers and risks

## Risk Management

### High-Risk Areas
1. **PTY Management** - Platform-specific, complex
   - Mitigation: Extensive testing, fallback options
2. **API Key Security** - Critical for user trust
   - Mitigation: Security audit, proven libraries
3. **Process Management** - Can be fragile
   - Mitigation: Robust error handling, monitoring

### Potential Blockers
- Codex-main build issues → Use npm package instead
- Platform keychain failures → Fall back to encrypted files
- PTY compatibility → Use simpler command execution

## Questions?

For questions or clarifications:
1. Review the detailed spec documents
2. Check the codex-main project: `documentation/codex-main/`
3. Consult the existing Skhoot codebase for patterns
4. Reach out to the team for discussion

## Status

**Current Phase**: Planning Complete ✅  
**Next Phase**: Phase 1 - Terminal Foundation  
**Start Date**: TBD  
**Target Completion**: 8 weeks from start

---

*Last Updated: January 12, 2026*
