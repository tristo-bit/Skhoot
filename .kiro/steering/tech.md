# Tech Stack

## Architecture

Hybrid multi-language stack with TypeScript/React frontend, Rust backend, and Tauri desktop runtime.

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4 with custom glassmorphic design system
- **3D Graphics**: Three.js with @react-three/fiber and @react-three/drei
- **UI Components**: Custom component library with embossed glassmorphic design
- **State Management**: React Context API (SettingsContext, ThemeContext)
- **AI Integration**: @google/genai for Gemini, custom services for OpenAI/Anthropic

## Backend

- **Language**: Rust (edition 2021)
- **Web Framework**: Axum 0.7 with Tokio async runtime
- **Database**: SQLx with SQLite
- **Search Engine**: nucleo-matcher (fuzzy), ripgrep/fd (CLI tools)
- **Terminal**: portable-pty for PTY support
- **Encryption**: aes-gcm with keyring for platform keychain
- **HTTP Client**: reqwest with streaming support

## Desktop Runtime

- **Framework**: Tauri 2
- **Plugins**: shell, dialog, notification, fs
- **Platform-Specific**:
  - Linux: webkit2gtk for WebRTC/MediaStream
  - Windows: Windows API for caption removal
  - macOS: Keychain Services

## Development Tools

- **Package Manager**: npm
- **TypeScript**: 5.8.2
- **Testing**: Vitest with @testing-library/react
- **Linting**: TypeScript compiler
- **Process Management**: concurrently for multi-process dev

## Common Commands

### Development

```bash
# Frontend only (web mode)
npm run dev

# Desktop development (auto-starts backend)
npm run tauri:dev

# Full stack (backend + frontend web)
npm run dev:full

# Backend only
npm run backend:dev
```

### Building

```bash
# Web production build
npm run build

# Desktop build (current platform)
npm run tauri:build

# Backend release build
npm run backend:build

# Platform-specific desktop builds
npm run tauri:build:ubuntu
```

### Testing

```bash
# Frontend tests
npm test
npm run test:ui
npm run test:coverage

# Backend tests
npm run backend:test
```

### Release

```bash
# Multi-platform release
npm run release

# Platform-specific
npm run release:linux
npm run release:macos
npm run release:windows

# Clean build
npm run release:clean
```

## Build Configuration

- **Vite**: Dual-mode config with Tauri stub plugin for web builds
- **Rust**: Optimized release profile (opt-level=3, LTO, strip symbols)
- **Tauri**: Platform-specific targets (Chrome 105 for Windows, Safari 13 for others)

## Environment Variables

- `VITE_GEMINI_API_KEY`: Default Gemini API key (optional)
- `TAURI_PLATFORM`: Set by Tauri CLI during builds
- `TAURI_DEBUG`: Enables debug mode with sourcemaps

## Performance Optimizations

- React.memo, useMemo, useCallback for component optimization
- Code splitting and lazy loading
- Canvas rendering at 60fps for visualizations
- Tokio async runtime with connection pooling
- Parallel search engines with intelligent fallback
