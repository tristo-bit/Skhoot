# Skhoot Data Flow Architecture

> Complete visual guide to understanding how data flows through Skhoot's hybrid architecture

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Service Layer Details](#service-layer-details)
5. [Backend API Routes](#backend-api-routes)
6. [State Management](#state-management)
7. [Event System](#event-system)

---

## System Overview

Skhoot uses a **hybrid multi-layer architecture** with three main tiers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/TypeScript)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Chat UI     │  │ File Explorer│  │  Terminal    │          │
│  │  Components  │  │  Components  │  │  Components  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│  ┌──────┴─────────────────┴──────────────────┴───────┐          │
│  │           Service Layer (TypeScript)              │          │
│  │  • aiService.ts (36KB) - Multi-provider AI        │          │
│  │  • agentChatService.ts (27KB) - Tool execution    │          │
│  │  • agentService.ts - Agent management             │          │
│  │  • terminalService.ts - Terminal management       │          │
│  │  • audioService.ts (17KB) - Voice processing      │          │
│  │  • apiKeyService.ts - Secure credentials          │          │
│  └────────────────────────┬──────────────────────────┘          │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │  Tauri IPC     │ (Rust)
                    │  • Window mgmt │
                    │  • Keychain    │
                    │  • Notifications│
                    └───────┬────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                    HTTP/REST (Port 3001)                          │
└───────────────────────────┼──────────────────────────────────────┘
                            │
┌───────────────────────────┴──────────────────────────────────────┐
│                    BACKEND (Rust/Axum)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/v1)                                     │   │
│  │  • /agents - Agent CRUD                                   │   │
│  │  • /terminal - PTY management                             │   │
│  │  • /search - File search                                  │   │
│  │  • /disk - Disk operations                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Core Services                                            │   │
│  │  • SearchEngine (Fuzzy + Ripgrep + AI scoring)           │   │
│  │  • TerminalManager (PTY sessions)                         │   │
│  │  • AgentStorage (File-based persistence)                  │   │
│  │  • FileIndexer (SQLite database)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

```
App.tsx (Root)
├── ChatInterface.tsx
│   ├── ConversationList.tsx
│   ├── MessageList.tsx
│   │   ├── Message.tsx
│   │   ├── AgentAction.tsx (Tool rendering)
│   │   └── MarkdownRenderer.tsx
│   ├── ChatInput.tsx
│   │   ├── VoiceInput.tsx
│   │   └── FileReferenceButton.tsx
│   └── AgentLogTab.tsx
│
├── FileExplorer.tsx
│   ├── FileTree.tsx
│   ├── FileItem.tsx
│   └── FileContextMenu.tsx
│
├── TerminalView.tsx
│   ├── TerminalTabs.tsx
│   ├── XtermTerminal.tsx
│   └── MiniTerminalView.tsx
│
└── WorkflowsPanel.tsx
    ├── AgentList.tsx
    ├── AgentCard.tsx
    └── AgentBuilder.tsx
```

---

## Data Flow Diagrams

### 1. Chat Message Flow (Normal Mode)

```
User Input
    │
    ├─> ChatInput.tsx
    │       │
    │       ├─> Process @file references
    │       │   └─> Load file content from backend
    │       │
    │       └─> Send to AI
    │
    ├─> aiService.ts
    │       │
    │       ├─> Select provider (OpenAI/Anthropic/Google)
    │       ├─> Get API key from apiKeyService
    │       └─> Stream response
    │
    └─> Display in MessageList.tsx
            └─> Render markdown with syntax highlighting
```

### 2. Agent Mode Message Flow

```
User Input (Agent Mode)
    │
    ├─> ChatInput.tsx
    │       │
    │       └─> agentChatService.executeWithTools()
    │
    ├─> agentChatService.ts
    │       │
    │       ├─> Load @file references
    │       ├─> Build tool definitions
    │       │   • list_directory
    │       │   • read_file
    │       │   • write_file
    │       │   • search_files
    │       │   • shell_execute
    │       │   • create_terminal
    │       │
    │       ├─> Send to AI with tools
    │       │   └─> aiService.chat()
    │       │
    │       └─> Execute tool calls
    │           │
    │           ├─> list_directory
    │           │   └─> HTTP GET /api/v1/search/list?path=...
    │           │
    │           ├─> read_file
    │           │   └─> HTTP GET /api/v1/search/read?path=...
    │           │
    │           ├─> write_file
    │           │   └─> HTTP POST /api/v1/search/write
    │           │
    │           ├─> search_files
    │           │   └─> HTTP GET /api/v1/search?q=...
    │           │
    │           └─> shell_execute
    │               └─> terminalService.executeCommand()
    │                   └─> HTTP POST /api/v1/terminal/sessions/{id}/write
    │
    └─> Display in MessageList.tsx
            ├─> Message.tsx (AI response)
            └─> AgentAction.tsx (Tool results with rich UI)
```

### 3. Terminal Flow

```
Terminal Creation
    │
    ├─> terminalService.createSession()
    │       │
    │       ├─> Check backend availability
    │       │   └─> HTTP GET /health
    │       │
    │       ├─> Create session
    │       │   └─> HTTP POST /api/v1/terminal/sessions
    │       │       └─> Backend creates PTY process
    │       │
    │       └─> Start polling for output
    │           └─> HTTP GET /api/v1/terminal/sessions/{id}/read
    │
    ├─> User types command
    │       │
    │       └─> terminalService.writeToSession()
    │           └─> HTTP POST /api/v1/terminal/sessions/{id}/write
    │
    └─> Display output in XtermTerminal.tsx
            └─> ANSI color rendering
```

### 4. Agent Management Flow

```
Create Agent
    │
    ├─> WorkflowsPanel.tsx
    │       │
    │       └─> AgentBuilder.tsx (Form)
    │
    ├─> agentService.create()
    │       │
    │       └─> HTTP POST /api/v1/agents
    │           {
    │             name: "Agent Name",
    │             description: "...",
    │             master_prompt: "...",
    │             workflows: [...],
    │             allowed_tools: [...],
    │             trigger: { type: "keyword", ... }
    │           }
    │
    └─> Backend (agents.rs)
            │
            ├─> Validate request
            ├─> Generate agent ID
            ├─> Save to file (~/.skhoot/agents/{id}.json)
            └─> Return agent object

Execute Agent
    │
    ├─> agentService.execute(agentId, { message: "..." })
    │       │
    │       └─> HTTP POST /api/v1/agents/{id}/execute
    │
    └─> Backend creates AgentExecution
            └─> (Phase 2: Will execute workflows)
```

### 5. Voice Input Flow

```
User clicks microphone
    │
    ├─> VoiceInput.tsx
    │       │
    │       ├─> Request microphone permission
    │       ├─> Start recording
    │       │   └─> MediaRecorder API
    │       │
    │       └─> Visualize audio
    │           └─> useAudioAnalyzer.ts
    │               └─> Canvas rendering (9 frequency layers)
    │
    ├─> User stops recording
    │       │
    │       └─> audioService.transcribe()
    │           │
    │           ├─> Convert to WAV format
    │           ├─> Send to OpenAI Whisper API
    │           └─> Return transcription
    │
    └─> Insert text into ChatInput
            └─> User can edit before sending
```

### 6. File Reference Flow

```
User clicks @ or file icon
    │
    ├─> FileAttachmentModal.tsx
    │       │
    │       ├─> Display file tree
    │       │   └─> Load from backend
    │       │
    │       └─> User selects file
    │
    ├─> Dispatch event
    │       │
    │       └─> window.dispatchEvent('add-file-reference', {
    │             filename: 'config.json',
    │             path: '/path/to/config.json'
    │           })
    │
    ├─> ChatInput.tsx receives event
    │       │
    │       └─> Add @config.json to input
    │
    └─> On send, agentChatService loads file content
            └─> HTTP GET /api/v1/search/read?path=...
```

---

## Service Layer Details

### aiService.ts (36KB)

**Purpose**: Multi-provider AI integration with streaming support

**Key Methods**:
- `chat(messages, options)` - Send chat with optional tools
- `streamChat(messages, options)` - Stream responses
- `detectProvider(apiKey)` - Auto-detect provider from key format
- `testApiKey(provider, apiKey)` - Validate API key

**Providers**:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Google AI (Gemini 1.5 Pro, Gemini 1.5 Flash)

**Data Flow**:
```
aiService.chat()
    ├─> Get API key from apiKeyService
    ├─> Build provider-specific request
    ├─> Send HTTP request to provider API
    ├─> Parse response (handle streaming)
    └─> Return { text, toolCalls, usage }
```

### agentChatService.ts (27KB)

**Purpose**: Agent tool execution and orchestration

**Key Methods**:
- `executeWithTools(message, options)` - Execute with tool support
- `executeTool(toolName, args)` - Execute specific tool
- `getToolDefinitions()` - Get all available tools

**Tools**:
- `list_directory` - List files in directory
- `read_file` - Read file content
- `write_file` - Write file content
- `search_files` - Search files by content/name
- `shell_execute` - Execute shell command
- `create_terminal` - Create new terminal session

**Data Flow**:
```
agentChatService.executeWithTools()
    ├─> Load @file references
    ├─> Build tool definitions
    ├─> aiService.chat(messages, { tools })
    ├─> Parse tool calls from response
    ├─> Execute each tool
    │   ├─> list_directory → backend API
    │   ├─> read_file → backend API
    │   ├─> write_file → backend API
    │   ├─> search_files → backend API
    │   └─> shell_execute → terminalService
    ├─> Collect tool results
    └─> Return { text, toolResults }
```

### agentService.ts

**Purpose**: Agent lifecycle and session management

**Key Methods**:
- `create(request)` - Create new agent
- `update(id, updates)` - Update agent
- `delete(id)` - Delete agent
- `execute(agentId, request)` - Execute agent
- `createSession(sessionId, options)` - Create agent session
- `closeSession(sessionId)` - Close agent session
- `hasSession(sessionId)` - Check if session exists

**Data Flow**:
```
agentService.create()
    ├─> Validate request
    ├─> HTTP POST /api/v1/agents
    ├─> Backend saves to ~/.skhoot/agents/{id}.json
    ├─> Cache in memory
    └─> Emit 'agent_created' event

agentService.createSession()
    ├─> Generate session ID
    ├─> Store in sessions Map
    ├─> Emit 'session_created' event
    └─> Return session ID
```

### terminalService.ts

**Purpose**: Terminal session management and PTY communication

**Key Methods**:
- `createSession(type, cols, rows)` - Create terminal session
- `writeToSession(sessionId, data)` - Write to terminal
- `readFromSession(sessionId)` - Read terminal output
- `closeSession(sessionId)` - Close terminal session
- `executeCommand(sessionId, command)` - Execute command and wait

**Data Flow**:
```
terminalService.createSession()
    ├─> Check backend health
    ├─> HTTP POST /api/v1/terminal/sessions
    │   └─> Backend creates PTY process
    ├─> Store session locally
    ├─> Start polling for output
    │   └─> setInterval → HTTP GET /api/v1/terminal/sessions/{id}/read
    └─> Return session ID

terminalService.writeToSession()
    ├─> HTTP POST /api/v1/terminal/sessions/{id}/write
    │   └─> Backend writes to PTY stdin
    └─> Emit 'terminal-data' event with output
```

### audioService.ts (17KB)

**Purpose**: Voice recording and transcription

**Key Methods**:
- `startRecording()` - Start microphone recording
- `stopRecording()` - Stop and get audio blob
- `transcribe(audioBlob)` - Transcribe audio to text

**Data Flow**:
```
audioService.transcribe()
    ├─> Convert blob to WAV format
    ├─> Get OpenAI API key
    ├─> HTTP POST https://api.openai.com/v1/audio/transcriptions
    │   └─> Send audio file
    └─> Return transcription text
```

### apiKeyService.ts

**Purpose**: Secure API key storage and retrieval

**Key Methods**:
- `saveApiKey(provider, key)` - Save API key
- `getApiKey(provider)` - Get API key (with 5-min cache)
- `deleteApiKey(provider)` - Delete API key
- `testApiKey(provider, key)` - Test API key validity

**Data Flow**:
```
apiKeyService.saveApiKey()
    ├─> Tauri IPC: invoke('save_api_key')
    │   └─> Rust: Encrypt with AES-256-GCM
    │   └─> Store in platform keychain
    │       ├─> Linux: libsecret
    │       ├─> macOS: Keychain Services
    │       └─> Windows: Credential Manager
    └─> Clear cache

apiKeyService.getApiKey()
    ├─> Check cache (5-min TTL)
    ├─> If not cached:
    │   └─> Tauri IPC: invoke('get_api_key')
    │       └─> Rust: Decrypt from keychain
    └─> Return key
```

---

## Backend API Routes

### Agent Routes (`/api/v1/agents`)

```rust
POST   /api/v1/agents              → create_agent()
GET    /api/v1/agents              → list_agents()
GET    /api/v1/agents/:id          → get_agent()
PUT    /api/v1/agents/:id          → update_agent()
DELETE /api/v1/agents/:id          → delete_agent()
POST   /api/v1/agents/:id/execute  → execute_agent()
GET    /api/v1/agents/:id/status   → get_agent_status()
```

**Storage**: File-based in `~/.skhoot/agents/{id}.json`

### Terminal Routes (`/api/v1/terminal`)

```rust
POST   /api/v1/terminal/sessions           → create_session()
GET    /api/v1/terminal/sessions/:id/read  → read_output()
POST   /api/v1/terminal/sessions/:id/write → write_input()
DELETE /api/v1/terminal/sessions/:id       → close_session()
POST   /api/v1/terminal/sessions/:id/resize → resize_terminal()
```

**Backend**: PTY process management with Tokio async

### Search Routes (`/api/v1/search`)

```rust
GET  /api/v1/search              → search_files()
GET  /api/v1/search/list         → list_directory()
GET  /api/v1/search/read         → read_file()
POST /api/v1/search/write        → write_file()
POST /api/v1/index/start         → start_indexing()
```

**Backend**: Hybrid search engine (Fuzzy + Ripgrep + AI scoring)

### Disk Routes (`/api/v1/disk`)

```rust
GET  /api/v1/disk/usage          → get_disk_usage()
POST /api/v1/disk/analyze        → analyze_directory()
POST /api/v1/disk/cleanup        → cleanup_files()
```

---

## State Management

### React State

```typescript
// App-level state (App.tsx)
- conversations: Conversation[]
- currentConversationId: string | null
- isAgentMode: boolean
- theme: 'light' | 'dark'

// Chat state (ChatInterface.tsx)
- messages: Message[]
- isLoading: boolean
- streamingMessage: string | null

// Agent state (useAgentLogTab.ts)
- agentSessionId: string | null
- shouldShowAgentLog: boolean
- isCreatingSession: boolean

// Terminal state (TerminalView.tsx)
- sessions: TerminalSession[]
- activeSessionId: string | null
```

### Service State

```typescript
// agentService.ts
- agents: Map<string, Agent>
- executions: Map<string, AgentExecution>
- sessions: Map<string, AgentSession>

// terminalService.ts
- sessions: Map<string, TerminalSession>
- pollingIntervals: Map<string, NodeJS.Timeout>

// aiService.ts
- No persistent state (stateless)

// apiKeyService.ts
- keyCache: Map<string, { key: string, timestamp: number }>
```

### Persistent State

```
localStorage:
- skhoot_conversations: Conversation[]
- skhoot_agent_mode_default: boolean
- skhoot_theme: 'light' | 'dark'

Platform Keychain (via Tauri):
- skhoot_api_key_openai: encrypted string
- skhoot_api_key_anthropic: encrypted string
- skhoot_api_key_google: encrypted string

File System:
- ~/.skhoot/agents/{id}.json: Agent definitions
- ~/.skhoot/database.db: SQLite (file index)
```

---

## Event System

### Custom Events

```typescript
// Agent events
'agent-execution-started' → { execution, agentId }
'agent-message' → { message, agentId }

// Terminal events
'terminal-data' → { sessionId, data }
'ai-terminal-created' → { sessionId, type, agentSessionId }

// File events
'add-file-reference' → { filename, path }
'file-selected' → { path }

// UI events
'theme-changed' → { theme }
'conversation-switched' → { conversationId }
```

### Service Events (Internal)

```typescript
// agentService events
'agent_created' → { agent }
'agent_updated' → { agent }
'agent_deleted' → { agentId }
'agent_state_changed' → { agent, previousState, newState }
'execution_started' → { execution }
'execution_cancelled' → { execution }
'session_created' → { session }
'session_closed' → { sessionId }

// terminalService events
'session_created' → { sessionId }
'session_closed' → { sessionId }
'output_received' → { sessionId, data }
```

---

## Error Handling

### Frontend Error Flow

```
Error occurs
    │
    ├─> Catch in service layer
    │       │
    │       ├─> Log to console
    │       └─> Return error object
    │
    ├─> Component receives error
    │       │
    │       └─> Display error message
    │           ├─> Toast notification
    │           └─> Error boundary
    │
    └─> User can retry or dismiss
```

### Backend Error Flow

```
Error occurs
    │
    ├─> Catch in route handler
    │       │
    │       ├─> Log with tracing
    │       └─> Map to AppError
    │
    ├─> AppError → HTTP status
    │       ├─> BadRequest → 400
    │       ├─> NotFound → 404
    │       ├─> Internal → 500
    │       └─> Unauthorized → 401
    │
    └─> Return JSON error response
            {
              "error": "Error message",
              "details": "..."
            }
```

---

## Performance Optimizations

### Frontend

- **Code Splitting**: Lazy load components
- **Memoization**: React.memo, useMemo, useCallback
- **Virtual Scrolling**: Large message lists
- **Debouncing**: Search input, file tree
- **Caching**: API key cache (5-min TTL)

### Backend

- **Async Runtime**: Tokio for concurrent operations
- **Connection Pooling**: SQLite connection pool
- **Parallel Search**: Fuzzy + Ripgrep in parallel
- **File Caching**: In-memory cache for frequently accessed files
- **Lazy Loading**: Load agents on-demand

---

## Security

### API Key Security

```
User enters API key
    │
    ├─> Frontend: apiKeyService.saveApiKey()
    │       │
    │       └─> Tauri IPC (secure channel)
    │
    ├─> Rust Backend: api_keys.rs
    │       │
    │       ├─> Generate encryption key
    │       ├─> Encrypt with AES-256-GCM
    │       └─> Store in platform keychain
    │           ├─> Linux: libsecret (GNOME Keyring)
    │           ├─> macOS: Keychain Services
    │           └─> Windows: Credential Manager
    │
    └─> Never logged or exposed in UI
```

### CORS Configuration

```rust
CorsLayer::new()
    .allow_origin(Any) // Allow all origins (local dev)
    .allow_methods([GET, POST, PUT, DELETE, OPTIONS])
    .allow_headers([CONTENT_TYPE])
```

---

## Deployment Architecture

### Development Mode

```
Terminal 1: npm run tauri dev
    ├─> Starts Vite dev server (port 1420)
    └─> Starts Tauri app (loads from Vite)

Terminal 2: cd backend && cargo run
    └─> Starts Rust backend (port 3001)

Frontend → Tauri → Backend
```

### Production Mode

```
npm run tauri build
    ├─> Builds frontend (Vite)
    ├─> Bundles backend binary
    └─> Creates platform-specific installer
        ├─> Linux: .deb, .AppImage
        ├─> macOS: .dmg
        └─> Windows: .msi, .exe

Single executable includes:
    ├─> Frontend (embedded in binary)
    ├─> Backend (bundled binary)
    └─> Tauri runtime
```

### Web Deployment

```
GitHub Actions → Build → Deploy to GitHub Pages
    ├─> Frontend only (no Tauri)
    ├─> Backend runs separately (user-hosted)
    └─> Limited features (no keychain, no native notifications)
```

---

## Common Issues & Solutions

### Issue 1: CORS Error on PUT Requests

**Error**: `Method PUT is not allowed by Access-Control-Allow-Methods`

**Cause**: Backend CORS configuration missing PUT method

**Solution**: Add PUT to allowed methods in `backend/src/main.rs`:
```rust
.allow_methods([
    axum::http::Method::GET,
    axum::http::Method::POST,
    axum::http::Method::PUT,  // ← Add this
    axum::http::Method::DELETE,
    axum::http::Method::OPTIONS
])
```

### Issue 2: agentService.createSession is not a function

**Error**: `agentService.createSession is not a function`

**Cause**: Missing session management methods in agentService

**Solution**: Add session methods to `services/agentService.ts`:
```typescript
async createSession(sessionId: string, options?: AgentSessionOptions): Promise<void>
hasSession(sessionId: string): boolean
async closeSession(sessionId: string): Promise<void>
```

### Issue 3: Backend Not Starting

**Error**: `Failed to connect to backend`

**Cause**: Backend not running or port conflict

**Solution**:
1. Check if backend is running: `curl http://localhost:3001/health`
2. Start backend: `cd backend && cargo run`
3. Check port availability: `lsof -i :3001`

---

## Summary

Skhoot's architecture is designed for:

✅ **Modularity**: Clear separation between frontend, Tauri, and backend  
✅ **Scalability**: Async Rust backend handles 1000+ concurrent operations  
✅ **Security**: AES-256-GCM encryption + platform keychain integration  
✅ **Performance**: Hybrid search (10K+ files in ~200ms), code splitting, caching  
✅ **Flexibility**: Multi-provider AI, unrestricted system access, extensible tools  
✅ **Developer Experience**: TypeScript + Rust, comprehensive error handling, extensive logging  

**Key Takeaway**: Data flows from React components → TypeScript services → Tauri IPC/HTTP → Rust backend → System resources, with events flowing back up the chain for real-time updates.

---

**For more details, see**:
- `ARCHITECTURE.md` - High-level architecture overview
- `DEVLOG.md` - Development history and decisions
- `README.md` - User-facing documentation
