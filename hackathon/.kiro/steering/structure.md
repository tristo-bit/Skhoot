# Project Structure

## Directory Layout
```
Skhoot/
├── components/              # React UI components (105 files)
│   ├── chat/               # Chat interface components
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   └── ChatInput.tsx
│   ├── conversations/      # Agent action rendering
│   │   ├── AgentAction.tsx
│   │   └── DirectoryItem.tsx
│   ├── settings/           # Configuration panels
│   │   ├── UserPanel.tsx
│   │   ├── NotificationsPanel.tsx
│   │   └── AppearancePanel.tsx
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── SynthesisVisualizer.tsx
│   │   └── MarkdownRenderer.tsx
│   ├── panels/             # Secondary panels
│   │   ├── FilesPanel.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── AISettingsModal.tsx
│   ├── layout/             # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ResizeHandles.tsx
│   └── library/            # Custom hooks
│       └── useAudioAnalyzer.ts
├── services/               # Business logic layer
│   ├── agentChatService.ts    # Agent tool execution (27KB)
│   ├── aiService.ts           # Multi-provider AI (36KB)
│   ├── apiKeyService.ts       # Secure key management
│   ├── audioService.ts        # Voice processing (17KB)
│   ├── backendApi.ts          # Backend communication
│   ├── fileOperations.ts      # File system operations
│   ├── diskService.ts         # System disk info
│   └── nativeNotifications.ts # Desktop notifications
├── backend/                # Rust backend server (65 files)
│   ├── src/
│   │   ├── main.rs            # Axum server entry point
│   │   ├── search_engine/     # Hybrid file search
│   │   │   ├── fuzzy.rs       # nucleo-matcher integration
│   │   │   ├── cli.rs         # ripgrep/fd integration
│   │   │   └── hybrid.rs      # Combined search
│   │   ├── cli_engine/        # CLI tool integration
│   │   ├── api/               # REST API endpoints
│   │   ├── terminal.rs        # PTY management
│   │   └── db.rs              # SQLite database
│   └── Cargo.toml
├── src-tauri/              # Tauri desktop runtime
│   ├── src/
│   │   ├── main.rs            # Tauri app entry point
│   │   ├── api_keys.rs        # Keychain integration
│   │   ├── terminal.rs        # Terminal commands
│   │   ├── agent.rs           # Agent state management
│   │   └── disk_info.rs       # System disk info
│   ├── tauri.conf.json        # Tauri configuration
│   └── Cargo.toml
├── tests/                  # Test files
│   ├── agentChatService.test.ts
│   └── apiKeyService.test.ts
├── hackathon/.kiro/        # Kiro CLI integration
│   ├── steering/           # Project guidelines
│   │   ├── product.md
│   │   ├── tech.md
│   │   └── structure.md
│   ├── prompts/            # Custom commands (12 prompts)
│   │   ├── plan-feature.md
│   │   ├── execute.md
│   │   ├── code-review.md
│   │   └── ...
│   └── documentation/      # Reference docs (65+ files)
├── .kiro/                  # Development specs
│   ├── specs/              # Feature specifications
│   └── hooks/              # Automation hooks
├── documentation/          # Project documentation
│   ├── EMBOSSED_STYLE_GUIDE.md
│   ├── TESTING_GUIDE.md
│   └── ...
├── public/                 # Static assets
├── App.tsx                 # Main React app
├── index.tsx               # React entry point
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite bundler config
├── vitest.config.ts        # Test configuration
├── tailwind.config.js      # Tailwind CSS config
├── README.md               # Project documentation
├── DEVLOG.md               # Development log (5,145 lines)
└── ARCHITECTURE.md         # Technical architecture
```

## File Naming Conventions
- **React Components**: PascalCase (e.g., `ChatInterface.tsx`, `AgentAction.tsx`)
- **Services**: camelCase (e.g., `agentChatService.ts`, `apiKeyService.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAudioAnalyzer.ts`, `useTauriWindow.ts`)
- **Types**: PascalCase (e.g., `Chat`, `Message`, `User`)
- **Rust Files**: snake_case (e.g., `search_engine.rs`, `api_keys.rs`)
- **Documentation**: UPPERCASE or kebab-case (e.g., `README.md`, `style-guide.md`)

## Module Organization
- **Services**: Singleton pattern for stateful services, exported as default object
- **Components**: One component per file, related components in same directory
- **Hooks**: Custom hooks in `components/library/`, reusable across components
- **Types**: Defined in service files or `types.ts`, exported for reuse
- **Rust Modules**: Organized by feature (search, api, terminal), public API in `lib.rs`

## Configuration Files
- **Frontend**: `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- **Backend**: `backend/Cargo.toml`, `backend/.env` (optional)
- **Desktop**: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
- **Testing**: `vitest.config.ts`
- **Environment**: `.env` (VITE_GEMINI_API_KEY)
- **CI/CD**: `.github/workflows/release.yml`

## Documentation Structure
- **Root**: `README.md` (overview), `DEVLOG.md` (timeline), `ARCHITECTURE.md` (technical)
- **documentation/**: Feature-specific docs, style guides, testing guides
- **hackathon/.kiro/**: Kiro CLI integration (steering, prompts, reference docs)
- **Inline**: JSDoc comments for complex functions, code comments for non-obvious logic

## Asset Organization
- **public/**: Static assets (icons, images, fonts)
- **public/providers/**: AI provider logos (openai.svg, anthropic.svg, google.svg)
- **src-tauri/icons/**: Desktop app icons (icon.png, icon.icns, icon.ico)

## Build Artifacts
- **dist/**: Vite production build (HTML, JS, CSS)
- **backend/target/**: Rust compiled binaries (debug/, release/)
- **src-tauri/target/**: Tauri bundled apps (.deb, .dmg, .msi, .AppImage, .exe)
- **node_modules/**: npm dependencies (gitignored)
- **Cargo.lock**: Rust dependency lock file

## Environment-Specific Files
- **Development**: `.env` (API keys), `backend/.env` (optional backend config)
- **Production**: Environment variables set in CI/CD (GitHub Actions secrets)
- **Desktop**: Tauri bundles include all dependencies, no external config needed
- **Web**: Vercel deployment uses environment variables from dashboard
