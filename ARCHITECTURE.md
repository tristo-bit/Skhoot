# Skhoot Architecture & Advanced Features

> **For Hackathon Evaluators**: This document provides deep technical insight into Skhoot's architecture, innovative features, and engineering decisions.

---

## Executive Summary

Skhoot is **the first open-source GUI for CLI agents** - a production-grade interface that gives AI agents unrestricted system access with voice control, visual file management, terminal integration, and workflow automation.

**The Problem We Solve:**
CLI agents are powerful but limited by terminal-only interfaces. Skhoot provides a **full-featured GUI that surpasses CLI capabilities** while maintaining complete agent freedom - no sandboxing, no restrictions, just pure agent power with visual controls.

**Core Innovation:**
- **Any Provider, Any Model**: OpenAI, Anthropic, Google AI, or custom endpoints - bring your own API key
- **Unrestricted Agent Access**: Full system access - file operations, terminal commands, no sandbox limitations
- **Voice-First Interface**: Control agents with natural speech, see real-time transcription and audio visualization
- **Visual Tool Execution**: Agent tools render with rich UI (file lists, search results, code highlighting) instead of raw text
- **Integrated Workflows**: File explorer, terminal, and agent tools work together seamlessly
- **Open Source**: Complete transparency, extensible architecture, community-driven

**Key Metrics:**
- **185 source files** (TypeScript/React + Rust backend)
- **5,145-line development log** documenting every decision
- **12 custom Kiro CLI prompts** for workflow automation
- **Full CI/CD pipeline** with automated releases for Linux/macOS/Windows
- **Live web deployment** + landing page with binary downloads
- **Zero critical vulnerabilities** (AES-256-GCM encryption, platform keychain)

---

## Architecture Overview

### Hybrid Multi-Language Stack

```
Frontend (TypeScript/React)
├── Chat UI (Agent Mode, Markdown)
├── Voice Input (STT, Visualizer)
├── File Explorer (Context, Operations)
└── Service Layer
    ├── aiService.ts (36KB) - Multi-provider AI
    ├── agentChatService.ts (27KB) - Tool execution
    ├── audioService.ts (17KB) - Voice processing
    └── apiKeyService.ts - Secure credentials
              ↕ Tauri IPC
Tauri Runtime (Rust)
├── Window management (custom controls)
├── Native notifications
├── Secure API key storage (keychain)
└── Shell operations
              ↕ HTTP/REST
Backend Server (Rust/Axum)
├── Search Engine (Fuzzy, Ripgrep, AI scoring)
├── CLI Agent (Tools, PTY, Executor)
└── File Operations (Reveal, Compress, Properties)
```

### Why Hybrid?

**Rust Backend:**
- File search: 10K+ files in ~200ms (vs Node.js ~800ms)
- Memory safety, zero GC pauses
- Tokio async: 1000+ concurrent operations

**TypeScript Frontend:**
- Rapid UI development with React
- Full type safety
- Native AI streaming integration

---

## Advanced Features

### 1. Agent Mode with Tool Execution

**The Core Problem**: CLI agents are stuck in terminals with text-only output. Users can't see file structures, can't click to open files, can't visualize search results.

**Skhoot's Solution**: Full GUI for agent tool execution with visual rendering and interactive controls.

```typescript
// services/agentChatService.ts
export async function executeWithTools(message: string) {
  // 1. Parse @filename references, load content
  const processed = await loadFileReferences(message);
  
  // 2. Send to AI with tool definitions
  const response = await aiProvider.chat(processed, { tools });
  
  // 3. Execute tools with UNRESTRICTED system access
  const results = await Promise.all(
    response.toolCalls.map(executeTool)
  );
  
  return { text: response.text, toolResults: results };
}
```

**Visual Tool Rendering** (`components/conversations/AgentAction.tsx`):
- `list_directory` → Interactive file list with icons, sizes, click-to-open
- `search_files` → Visual results with snippets, line numbers, folder navigation
- `read_file` → Syntax-highlighted code or rendered markdown with copy buttons
- `shell` → Terminal output with ANSI colors, command history

**Why This Matters**: Agents can execute any system command, and users see results in rich UI instead of scrolling through terminal text. Click files to open, navigate folders visually, copy code with one click.

### 2. Hybrid File Search Engine

**Problem**: Single method fails in different scenarios.

**Solution**: Multi-engine with intelligent fallback + AI scoring.

```rust
// backend/src/search_engine/
pub enum SearchMode {
    Auto,    // Intelligently selects best engine
    Fuzzy,   // nucleo-matcher (Sublime Text algorithm)
    Cli,     // ripgrep, fd, find, grep
    Hybrid,  // Combines fuzzy + CLI results
}
```

**Performance:**
- Small (<1K files): ~10ms
- Medium (1K-10K): ~50ms
- Large (10K+): ~200ms

**AI-Enhanced Scoring**: Relevance 0-100, fallback scoring (exact match 95, contains 85, path 70).

### 3. Secure API Key Management

**Challenge**: Store keys securely across platforms without exposure.

**Solution**: AES-256-GCM + platform keychain.

```rust
// src-tauri/src/api_keys.rs
#[tauri::command]
async fn save_api_key(provider: String, api_key: String) {
    let encryption_key = get_or_create_encryption_key(&provider)?;
    let encrypted = encrypt_aes_gcm(&api_key, &encryption_key)?;
    fs::write(get_secure_storage_path(&provider)?, encrypted)?;
    // Never log actual key
}
```

**Platform Integration:**
- Linux: libsecret (GNOME Keyring)
- macOS: Keychain Services
- Windows: Credential Manager

**Frontend**: 5-min cache, auto invalidation, test keys before saving.

### 4. Voice Interface with Advanced Visualization

**The CLI Limitation**: Type commands manually, no hands-free operation, no accessibility for voice users.

**Skhoot's Solution**: Full voice control for agent commands with real-time visualization.

**Audio Analysis** (`components/library/useAudioAnalyzer.ts`):
```typescript
const getVolume = () => {
  const dataArray = new Uint8Array(analyzer.frequencyBinCount);
  analyzer.getByteFrequencyData(dataArray);
  
  // RMS calculation
  const sum = dataArray.reduce((acc, val) => acc + val * val, 0);
  return Math.sqrt(sum / dataArray.length) / 128;
};
```

**Synthesis Visualizer**:
- 9 layered frequencies for depth
- Voice-optimized amplitude (0-48% height)
- Real-time harmonics (carrier + modulation + ripples)
- Dynamic glow (up to 40px blur on peaks)
- Canvas rendering with device pixel ratio

**Why This Matters**: Control CLI agents with your voice - "find all Python files", "search for TODO comments", "run tests". See audio feedback, edit transcriptions before sending, fully accessible interface.

### 5. File Reference System

**Problem**: Provide file context to AI without copy-paste.

**Solution**: `@filename` syntax auto-loads content.

```typescript
// Event-driven architecture
window.dispatchEvent(new CustomEvent('add-file-reference', {
  detail: { filename: 'config.json', path: '/path/to/config.json' }
}));

// Content loading
async function loadFileReferences(message: string) {
  const refs = message.match(/@(\S+)/g) || [];
  for (const ref of refs) {
    const content = await backendApi.readFile(path);
    message += `\n\n--- File: ${filename} ---\n${content}`;
  }
  return message;
}
```

**Works in both normal AI mode and agent mode.**

### 6. Native Desktop Integration

**Custom Window Controls** (`hooks/useTauriWindow.ts`):
- Drag from any non-interactive area
- 8-directional resize (N/S/E/W/NE/NW/SE/SW)
- Minimize to taskbar
- Adaptive corner radius based on fullscreen

**Native Notifications**:
- Frequency limiting (sliding window, max 20/min)
- Quiet hours (overnight: 22:00-08:00)
- Priority system (low/normal/high)
- Test mode bypasses filters

**File Operations**:
- Open with default app
- Reveal in system explorer
- Native properties dialog
- ZIP compression
- Delete with confirmation

---

## Development Workflow with Kiro CLI

### Custom Prompts (12 Total)

**1. `plan-feature.md` (13KB)** - Comprehensive planning:
- Feature understanding (user stories, complexity)
- Codebase intelligence (patterns, dependencies)
- External research (docs, best practices)
- Implementation plan (tasks, validation)
- Uses subagents for parallel analysis

**2. `execute.md`** - Systematic implementation:
- Read entire plan
- Execute tasks in order
- Verify after each change
- Philosophy: One-pass success

**3. `code-review-hackathon.md` (4KB)** - Hackathon review:
- Official judging criteria (100 points)
- Scoring framework with justification
- Required documentation checks

**4. `rca.md`** - Root cause analysis:
- GitHub CLI integration (`gh issue view`)
- Codebase search
- Git history analysis

**5. `quickstart.md`** - Onboarding wizard:
- Interactive questionnaire
- Fills steering documents
- Suggests architecture

**Others**: `create-prd.md`, `implement-fix.md`, `system-review.md`, `execution-report.md`, `code-review.md`, `code-review-fix.md`, `prime.md`

### Development Log (5,145 Lines)

**DEVLOG.md** documents every feature/fix:
- Issue description + root cause
- Solution with code snippets
- Build status + verification
- Recent: January 14-15, 2026

---

## Testing & CI/CD

### Test Coverage

**Backend (Rust)**: 21 files with `#[cfg(test)]`, property-based testing with `proptest`

**Frontend**: `services/__tests__/terminalService.test.ts`, manual testing interfaces

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/release.yml`):
- Multi-platform builds (Linux/macOS/Windows)
- Artifacts: .deb, .AppImage, .dmg, .msi, .exe
- Automated releases (tag-based + manual)
- Backend bundling in all platforms

**Web Deployment** (`.github/workflows/deploy-pages.yml`):
- Automated deployment to GitHub Pages
- Live web version at production URL
- Landing page with download links for all platforms
- Dual-mode architecture: Web browser OR native desktop

**Release Process:**
1. Version bump → Push tag
2. GitHub Actions builds all platforms in parallel
3. Artifacts attached to GitHub release
4. Web version deployed automatically
5. Landing page updated with latest binaries

---

## Performance Optimizations

### Frontend
- Code splitting, lazy loading
- React.memo, useMemo, useCallback
- Virtual scrolling for large lists
- Canvas rendering (60fps visualizer)

### Backend
- Tokio async runtime
- Connection pooling
- 5-min cache TTL
- Parallel search engines
- `opt-level = 3` in release

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| File search (small) | ~10ms | <1K files |
| File search (medium) | ~50ms | 1K-10K files |
| File search (large) | ~200ms | 10K+ files |
| API key encryption | ~5ms | AES-256-GCM |
| Agent tool execution | ~100-500ms | Tool-dependent |

---

## Innovation Highlights

### 1. Embossed Glassmorphic Design
Custom design language (`documentation/EMBOSSED_STYLE_GUIDE.md`):
- Tactile interactions (pressed buttons)
- Depth layers with shadows
- Theme-aware transitions
- WCAG compliant

### 2. Multilingual Search Detection
English/French: "find"/"chercher", "disk"/"disque", "cleanup"/"nettoyer"

### 3. Agent Tool Output Parsing
Parses Unix output (`ls -la`, `grep`) → Rich UI with icons/actions

### 4. Cross-Platform Keychain
Single API for Linux/macOS/Windows secure storage

### 5. Voice-Optimized Visualizer
9-layer frequencies, power scaling, dynamic glow, frequency harmonics

---

## Real-World Value

### The Problem: CLI Agents Need Better Interfaces

**Current State of CLI Agents:**
- ❌ Terminal-only interfaces with text output
- ❌ No visual file navigation or management
- ❌ Can't see search results in context
- ❌ No voice control or accessibility
- ❌ Sandboxed or restricted system access
- ❌ Locked to specific providers/models

**Skhoot's Solution:**
- ✅ Full GUI with visual file explorer, terminal, and workflows
- ✅ Rich rendering of agent tool outputs (not raw text)
- ✅ Voice-first interface with real-time transcription
- ✅ Unrestricted system access - agents can do anything
- ✅ Multi-provider support - bring any API key
- ✅ Open source - complete transparency and extensibility

### Target Users

1. **Developers Using CLI Agents**: Need visual interface for file operations, search results, and terminal output
2. **Power Users**: Want unrestricted agent access with GUI convenience
3. **Accessibility Users**: Require voice control and visual feedback
4. **Multi-Provider Users**: Need flexibility to switch between OpenAI, Anthropic, Google AI, or custom endpoints

### Use Cases

1. **Visual Agent Development**: See agent tool execution in real-time with rich UI
2. **Voice-Controlled Workflows**: "Find all config files", "search for bugs", "run tests"
3. **File Context Management**: Use `@filename` to give agents file context visually
4. **Unrestricted System Access**: Agents can execute any command, access any file
5. **Multi-Provider Flexibility**: Switch between AI providers without changing workflow

### Why Skhoot Beats CLI-Only Agents

| Feature | CLI Agents | Skhoot |
|---------|-----------|--------|
| **Interface** | Terminal text only | Full GUI with visual controls |
| **File Operations** | Text paths | Interactive file explorer with icons |
| **Search Results** | Raw grep output | Visual results with click-to-open |
| **Voice Control** | None | Full voice interface with visualization |
| **System Access** | Often sandboxed | Unrestricted (user choice) |
| **Provider Lock-in** | Single provider | Any provider, any API key |
| **Tool Output** | Plain text | Rich UI rendering |
| **Accessibility** | Keyboard only | Voice + visual + keyboard |
| **Open Source** | Often proprietary | Fully open source |

---

## Technical Excellence

✅ **First Open-Source GUI for CLI Agents**: Complete visual interface for unrestricted agent operations  
✅ **Multi-Provider Freedom**: OpenAI, Anthropic, Google AI, or custom - bring your own API key  
✅ **Unrestricted System Access**: No sandbox - agents have full system capabilities  
✅ **Voice-First Design**: Control agents with natural speech, see real-time feedback  
✅ **Visual Tool Rendering**: File lists, search results, code highlighting - not raw text  
✅ **Integrated Workflows**: File explorer, terminal, and agent tools work together  
✅ **Cross-Platform**: Linux/macOS/Windows with native desktop + web deployment  
✅ **Full CI/CD**: Automated builds, releases, and web deployment  
✅ **Production-Ready**: 185 files, comprehensive error handling, extensive documentation  

**This is the GUI that CLI agents deserve** - combining the power of unrestricted system access with the convenience of visual interfaces, voice control, and multi-provider flexibility. Open source, production-ready, and way better than terminal-only agents.

---

**Try It Now:**
- **Web Version**: Live at production URL (works in any browser, any API key)
- **Desktop Binaries**: Download from GitHub releases (Linux .deb/.AppImage, macOS .dmg, Windows .msi/.exe)
- **Source Code**: Full repository with documentation and development history

**Bring Your Own API Key**: Works with OpenAI, Anthropic, Google AI, or any custom endpoint. No vendor lock-in, complete freedom.

---

**For Deep Dives**: See `DEVLOG.md` (5,145 lines), `README.md` (50KB), `hackathon/.kiro/prompts/`
