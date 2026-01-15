# Technical Architecture

## Technology Stack
- **Frontend**: TypeScript 5.8, React 19, Tailwind CSS 4.1, Vite 6.2
- **Backend**: Rust (Axum, Tokio), nucleo-matcher, serde, sqlx
- **Desktop**: Tauri 2.0, webkit2gtk (Linux), WebView2 (Windows), WKWebView (macOS)
- **AI SDKs**: @google/genai, OpenAI SDK, Anthropic SDK
- **Search Tools**: ripgrep, fd, find, grep
- **Audio**: Web Audio API, MediaStream, custom audio analyzer
- **Security**: AES-256-GCM, platform keychain (libsecret/Keychain/Credential Manager)

## Architecture Overview
Hybrid multi-language stack optimizing for performance and developer experience:

```
┌─────────────────────────────────────────────────┐
│  Frontend (TypeScript/React)                    │
│  - Chat UI, Voice Input, File Explorer          │
│  - Service Layer (AI, Agent, Audio, API Keys)   │
└──────────────────┬──────────────────────────────┘
                   │ Tauri IPC
┌──────────────────▼──────────────────────────────┐
│  Tauri Runtime (Rust)                           │
│  - Window Management, Notifications             │
│  - Secure API Key Storage (Keychain)            │
│  - Shell Operations, File System Access         │
└──────────────────┬──────────────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────────────┐
│  Backend Server (Rust/Axum)                     │
│  - Hybrid Search Engine (Fuzzy + CLI + AI)      │
│  - CLI Agent (Tool Execution, PTY Management)   │
│  - File Operations (Reveal, Compress, Props)    │
└─────────────────────────────────────────────────┘
```

**Why Hybrid?**
- **Rust Backend**: 10K+ file search in ~200ms (vs Node.js ~800ms), memory safety, zero GC pauses
- **TypeScript Frontend**: Rapid UI development, full type safety, native AI SDK integration
- **Tauri Bridge**: Native desktop features with web technology flexibility

## Development Environment
- **Node.js**: v16+ for frontend development
- **Rust**: Latest stable (via rustup) for backend and Tauri
- **Package Manager**: npm for JavaScript, cargo for Rust
- **IDE**: VS Code with rust-analyzer, ESLint, Prettier extensions
- **Build Tools**: Vite (frontend), cargo (backend), Tauri CLI (desktop bundling)

## Code Standards
- **TypeScript**: Strict mode enabled, explicit return types for functions
- **Naming**: PascalCase (components), camelCase (functions/variables), snake_case (Rust)
- **Components**: Functional components with hooks, props interfaces defined
- **Services**: Singleton pattern for stateful services, async/await for all I/O
- **Error Handling**: Try-catch with specific error messages, graceful fallbacks
- **Rust**: Clippy lints enforced, Result<T, E> for error handling, #[derive] for common traits
- **Formatting**: Prettier (TypeScript), rustfmt (Rust)

## Testing Strategy
- **Unit Tests**: Vitest for TypeScript services, cargo test for Rust modules
- **Integration Tests**: Agent tool execution end-to-end, API key storage/retrieval
- **Manual Testing**: Voice control accuracy, cross-platform desktop builds
- **Coverage Target**: 70%+ for critical services (agent, API keys, search)
- **CI/CD**: GitHub Actions for automated testing and releases

## Deployment Process
- **Development**: `npm run tauri:dev` (auto-starts backend)
- **Production Build**: `npm run tauri:build` (creates platform-specific installers)
- **CI/CD**: GitHub Actions workflow for Linux (.deb, .AppImage), macOS (.dmg), Windows (.msi, .exe)
- **Web Deployment**: Vercel for static web version (backend runs separately)
- **Release**: Automated GitHub releases with binaries attached

## Performance Requirements
- **File Search**: <200ms for 10K+ files (hybrid search engine)
- **UI Rendering**: 60fps smooth animations and transitions
- **Voice Transcription**: <500ms latency from speech to text
- **Agent Tool Execution**: Parallel execution, non-blocking UI
- **Memory**: <200MB idle, <500MB active with agent running

## Security Considerations
- **API Key Storage**: AES-256-GCM encryption, keys stored in platform keychain
- **No Key Exposure**: Keys never logged, never in error messages, never in frontend state
- **Unrestricted Access**: Intentional design - agents have full system access (user responsibility)
- **HTTPS**: All external API calls over HTTPS
- **Input Validation**: Sanitize file paths, validate API responses
- **Dependency Audits**: Regular npm audit and cargo audit checks
