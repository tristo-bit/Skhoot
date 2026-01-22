# Project Structure

## Root Organization

```
skhoot/
├── backend/              # Rust backend server
├── src-tauri/            # Tauri desktop runtime
├── components/           # React UI components
├── services/             # Frontend service layer
├── hooks/                # Custom React hooks
├── src/                  # Core frontend code
├── public/               # Static assets
├── documentation/        # Technical documentation
├── scripts/              # Build and release scripts
├── tests/                # Test files
└── [config files]        # package.json, vite.config.ts, etc.
```

## Backend (`backend/`)

Rust server providing search engine, CLI agent, and file operations.

```
backend/
├── src/
│   ├── main.rs                    # Server entry point
│   ├── api/                       # REST API endpoints
│   │   ├── agents.rs              # Agent session management
│   │   ├── search.rs              # File search endpoints
│   │   ├── disk.rs                # Disk usage analysis
│   │   └── web_search.rs          # Web search integration
│   ├── cli_agent/                 # Agent core module
│   │   ├── agent.rs               # Agent state machine
│   │   ├── tools.rs               # Tool definitions (shell, file ops)
│   │   ├── executor.rs            # Command execution
│   │   ├── session.rs             # Session state management
│   │   ├── response.rs            # Response parsing
│   │   └── instructions.rs        # System prompts
│   ├── search_engine/             # File search implementation
│   ├── cli_engine/                # CLI tool integration (ripgrep, fd)
│   ├── disk_analyzer/             # Disk usage analysis
│   ├── terminal/                  # Terminal/PTY management
│   └── workflows/                 # Workflow execution
├── migrations/                    # Database migrations
└── Cargo.toml                     # Rust dependencies
```

## Desktop Runtime (`src-tauri/`)

Tauri configuration and native integrations.

```
src-tauri/
├── src/
│   ├── main.rs                    # Tauri app entry point
│   ├── agent.rs                   # Agent Tauri commands
│   ├── api_keys.rs                # Secure API key storage
│   ├── terminal.rs                # Terminal management
│   ├── disk_info.rs               # System disk information
│   ├── http_bridge.rs             # HTTP proxy for backend
│   └── webview_renderer.rs        # WebView configuration
├── capabilities/                  # Tauri permissions
├── icons/                         # App icons
└── tauri.conf.json                # Tauri configuration
```

## Components (`components/`)

React UI components organized by feature area.

```
components/
├── chat/                          # Chat interface
│   ├── ChatInterface.tsx          # Main chat component
│   ├── PromptArea.tsx             # Input area
│   ├── SendButton.tsx             # Send button
│   ├── RecordButton.tsx           # Voice recording
│   ├── TokenDisplay.tsx           # Token usage display
│   ├── ToolCallDisplay.tsx        # Tool call visualization
│   └── WorkflowProgress.tsx       # Workflow execution status
├── conversations/                 # Message display
│   ├── MessageBubble.tsx          # Message rendering
│   ├── MessageList.tsx            # Message list
│   ├── AgentAction.tsx            # Agent tool visualization
│   ├── CommandExecution.tsx       # Shell command display
│   ├── CommandOutput.tsx          # Command output with ANSI
│   ├── FileOperation.tsx          # File operation display
│   ├── FileList.tsx               # File list rendering
│   └── ImageGallery.tsx           # Image attachments
├── panels/                        # Floating panels
│   ├── FileExplorerPanel.tsx      # File explorer
│   ├── WorkflowsPanel.tsx         # Workflow management
│   ├── AgentsPanel.tsx            # Agent management
│   ├── SettingsPanel.tsx          # Settings
│   ├── AISettingsModal.tsx        # AI configuration
│   └── bookmarks/                 # Bookmark management
├── terminal/                      # Terminal UI
│   ├── TerminalPanel.tsx          # Terminal panel
│   ├── TerminalView.tsx           # Terminal view
│   └── AgentLogTab.tsx            # Agent log monitoring
├── buttonFormat/                  # Button components
│   ├── buttons.tsx                # Base button components
│   ├── icon-button.tsx            # Icon buttons
│   ├── toggle-button.tsx          # Toggle buttons
│   └── [specialized buttons]      # Save, submit, upload, etc.
├── ui/                            # Reusable UI components
│   ├── Modal.tsx                  # Modal dialog
│   ├── FileCard.tsx               # File card display
│   ├── MarkdownRenderer.tsx       # Markdown rendering
│   ├── Scrollbar.tsx              # Custom scrollbar
│   └── SynthesisVisualizer.tsx    # Audio visualizer
├── settings/                      # Settings panels
│   ├── AISettingsPanel.tsx        # AI settings
│   ├── AppearancePanel.tsx        # Theme settings
│   ├── SoundPanel.tsx             # Audio settings
│   └── NotificationsPanel.tsx     # Notification settings
├── main-area/                     # Main content area
│   ├── MainArea.tsx               # Main area container
│   ├── WelcomeMessage.tsx         # Welcome screen
│   └── LogoBackground.tsx         # Logo display
└── customization/                 # Customization features
    └── Background3D.tsx           # 3D background
```

## Services (`services/`)

Frontend service layer for API communication and business logic.

```
services/
├── aiService.ts                   # Multi-provider AI integration
├── agentChatService.ts            # Agent tool execution
├── agentService.ts                # Agent session management
├── apiKeyService.ts               # API key management
├── apiKeyStore.ts                 # API key storage
├── audioService.ts                # Voice/audio processing
├── backendApi.ts                  # Backend HTTP client
├── terminalService.ts             # Terminal operations
├── terminalHttpService.ts         # Terminal HTTP bridge
├── fileOperations.ts              # File operations
├── workflowService.ts             # Workflow execution
├── bookmarkService.ts             # Bookmark management
├── memoryService.ts               # Memory extraction
├── tokenTrackingService.ts        # Token usage tracking
├── nativeNotifications.ts         # Desktop notifications
└── agentTools/                    # Agent tool definitions
    ├── agentTools.ts              # Tool registry
    ├── terminalTools.ts           # Terminal tools
    └── workflowTools.ts           # Workflow tools
```

## Conventions

### Component Patterns

- Use `memo` for performance optimization on all components
- Export components as named exports (not default)
- Props interfaces named `[ComponentName]Props`
- Use `forwardRef` when refs are needed
- Display names set for debugging: `Component.displayName = 'Component'`

### File Naming

- Components: PascalCase (e.g., `MessageBubble.tsx`)
- Services: camelCase (e.g., `agentService.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useAgentLogTab.ts`)
- Types: PascalCase in `types.ts`
- Constants: UPPER_SNAKE_CASE in `src/constants.ts`

### Import Organization

1. React imports
2. Third-party libraries
3. Local components
4. Services
5. Hooks
6. Types
7. Constants

### Styling

- Tailwind CSS utility classes
- Custom glassmorphic design system
- Theme-aware CSS variables (`--glass-bg`, `--text-primary`, etc.)
- Dark mode via `class` strategy
- Embossed style guide in `documentation/EMBOSSED_STYLE_GUIDE.md`

### State Management

- React Context for global state (Settings, Theme)
- Local state with `useState` for component-specific state
- `useCallback` and `useMemo` for optimization
- Event-driven architecture for cross-component communication

### API Communication

- Services layer abstracts backend communication
- Tauri commands for desktop-specific features
- HTTP REST API for backend operations
- WebSocket/events for real-time updates

### Error Handling

- Try-catch blocks in async operations
- User-friendly error messages
- Console logging for debugging
- Graceful degradation for missing features

### Testing

- Vitest for unit tests
- @testing-library/react for component tests
- Property-based testing with proptest (Rust)
- Manual testing interfaces for complex features
