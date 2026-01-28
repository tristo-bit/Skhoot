<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://i.imgur.com/ZvKMfME.jpeg" />

<br />
<br />

[![Star on GitHub](https://img.shields.io/github/stars/tristo-bit/skhoot?style=social)](https://github.com/tristo-bit/skhoot/stargazers)
[![Fork on GitHub](https://img.shields.io/github/forks/tristo-bit/skhoot?style=social)](https://github.com/tristo-bit/skhoot/network/members)
[![Watch on GitHub](https://img.shields.io/github/watchers/tristo-bit/skhoot?style=social)](https://github.com/tristo-bit/skhoot/watchers)

<br />

**The first open-source GUI for CLI agents with unrestricted system access, voice control, and multi-provider support.**

Built with React • TypeScript • Tauri • Rust • Tailwind CSS

🌐 **[Try Live Demo](https://tristo-bit.github.io/Skhoot/)** • 📦 **[Download Binaries](https://github.com/tristo-bit/skhoot/releases)** • 📖 **[Read Architecture](./ARCHITECTURE.md)**

</div>

---

## 🎯 The Problem We Solve

**CLI agents are powerful but trapped in terminal interfaces.** They output raw text, can't show visual file structures, lack voice control, and often run in sandboxes with restricted access.

**Skhoot changes everything:**
- ✅ **Full GUI** for agent tool execution with rich visual rendering
- ✅ **Unrestricted Access** - agents can execute any system command, access any file
- ✅ **Voice Control** - speak commands naturally, see real-time transcription
- ✅ **Multi-Provider** - OpenAI, Anthropic, Google AI, or custom endpoints (bring your own API key)
- ✅ **Visual Workflows** - file explorer, terminal, and agent tools integrated seamlessly
- ✅ **Open Source** - complete transparency, extensible architecture

**This is the GUI that CLI agents deserve.**

---

## ✨ Features

<details>
<summary><strong>⚡ Workflow Automation Panel</strong></summary>

**Streamline Repetitive Tasks**: Create and manage multi-step AI prompt workflows for automated task execution.

- **Workflow Management**: Create, edit, and organize reusable prompt chains
  - **Three-Tab Interface**: 
    - **Workflows Tab**: Browse and manage all saved workflows
    - **Running Tab**: Monitor currently executing workflows in real-time
    - **History Tab**: Review past workflow executions and results
  - **Editable Prompt Chains**: Build workflows with multiple sequential steps
  - **Workflow Metadata**: Track run count, last execution time, and status
- **Quick Actions Integration**: Access workflows via the Workflows quick action button (Workflow icon) in chat interface
- **Floating Panel Design**: Terminal-style glassmorphic panel that floats above the chat prompt area
- **Workflow Operations**:
  - **Create**: Add new workflows with custom names and descriptions
  - **Run**: Execute workflows with one-click play button
  - **Edit**: Modify workflow steps and prompts inline
  - **Delete**: Remove workflows with confirmation
  - **Status Tracking**: Visual indicators for idle, running, completed, and failed states
- **Pre-Built Templates**: Includes example workflows:
  - **Code Review**: Automated code analysis, security checks, and performance suggestions
  - **Documentation Generator**: Extract signatures, generate JSDoc, create README sections
  - **Test Generator**: Identify testable functions and generate comprehensive test cases
- **Performance Optimized**: React memo and useCallback for efficient rendering
- **Keyboard Shortcuts**: Quick access and navigation within the panel

**Why This Matters**: Automate repetitive AI interactions. Save time by reusing proven prompt sequences. Build consistent workflows for code review, documentation, testing, and more.

</details>

<details>
<summary><strong>🤖 CLI Agent Mode with Visual Tool Execution</strong></summary>

**The Core Innovation**: Unlike terminal-only CLI agents, Skhoot renders agent tool outputs with rich, interactive UI components.

- **Agent Mode Toggle**: Quick action button (Cpu icon) to enable/disable agent mode per conversation with visual indicator
- **Visual Tool Execution**: Agent actions render as interactive UI components in the conversation:
  - **Shell Commands**: `shell` tool displays commands with syntax highlighting, working directory, execution time, and ANSI color output
  - **File Operations**: `read_file`, `write_file` tools show file paths, operation types, content previews, and diff views
  - **Directory Listing**: `list_directory` tool renders interactive file lists with icons, sizes, and click-to-open functionality
  - **File Search**: `search_files` tool displays results with syntax highlighting, line numbers, and folder navigation
- **Agent Log Terminal Tab**: Dedicated monitoring tab showing:
  - Agent launch status and readiness indicators
  - Real-time tool call logging with timestamps
  - Command execution tracking with results
  - Configuration display (provider, model, message count, state)
  - Auto-scroll with toggle, log filtering by type, and JSON export
- **Multi-Provider Support**: Works with OpenAI, Anthropic (Claude), and Google AI (Gemini) with function/tool calling
- **Unrestricted System Access**: Agents can execute ANY system command - no sandbox, no limitations
- **File Context Loading**: Use `@filename` syntax to automatically load file contents for agent context
- **Tool Execution Loop**: Automatic multi-turn tool use (up to 10 iterations) with result feedback to AI
- **Interactive Results**: Click files to open, navigate folders visually, copy code with one click
- **Session Management**: Agent sessions tied to conversations with proper lifecycle management
- **Event-Driven Architecture**: Real-time updates via Tauri events (tool_start, tool_complete, message, cancelled)

**Why This Matters**: See what your agent is doing in real-time with visual feedback. No more scrolling through terminal text - interact with results directly. Full transparency into agent decision-making and tool execution.

</details>

<details>
<summary><strong>🔑 Multi-Provider API Key Management</strong></summary>

**Bring Your Own API Key**: No vendor lock-in, complete freedom to choose your AI provider.

- **Supported Providers**: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Google AI (Gemini), Custom Endpoints
- **Model Capabilities**: Automatic detection of model features including:
  - **Tool Calling**: Function/tool execution support for agent mode
  - **Vision**: Image input and analysis capabilities
  - **OCR**: Optical Character Recognition for text extraction from images
  - **Streaming**: Real-time response streaming
  - **JSON Mode**: Structured output formatting
  - **Context Window**: Token limits (4K to 2M tokens depending on model)
- **Secure Storage**: AES-256-GCM encryption with platform-specific keychain integration
  - **Linux**: libsecret (GNOME Keyring, KWallet)
  - **macOS**: Keychain Services
  - **Windows**: Credential Manager
- **Key Testing**: Validate API keys and fetch available models before saving
- **Model Persistence**: Selected model per provider is saved and automatically restored
- **Active Provider Switching**: Seamlessly switch between configured providers
- **Smart Caching**: 5-minute cache TTL for improved performance
- **Zero Exposure**: API keys never appear in logs or error messages

**Why This Matters**: Use the best model for each task. Switch providers without changing your workflow. Your keys, your choice.

</details>

<details>
<summary><strong>🎤 Voice-First Interface</strong></summary>

**Control CLI agents with your voice** - no typing required, fully accessible.

- **Natural Speech Input**: Speak commands like "find all Python files" or "search for TODO comments"
- **Real-time Transcription**: See your speech converted to text as you speak
- **Transcript Editing**: Edit voice transcriptions before sending with one-click edit button
- **Advanced Audio Visualization**: 9-layer frequency visualizer with voice-optimized rendering
  - Multi-line wave rendering with dynamic amplitude response
  - Real-time frequency harmonics (carrier waves + modulation + ripples)
  - Dynamic glow effects responding to voice peaks (up to 40px blur)
  - Canvas-based rendering at 60fps with device pixel ratio support
- **Audio Analysis**: Real-time RMS volume calculation and frequency domain processing
- **Device Management**: Select microphone/speaker, adjust volume, configure sensitivity
- **Microphone Testing**: Real-time audio level monitoring with visualization
- **Device Hot-Swapping**: Automatic detection and handling of audio device changes
- **Cross-Platform Audio**: Works on Chrome, Edge, Safari (fallback for Opera/Firefox)

**Why This Matters**: Accessibility for all users. Hands-free operation. Natural interaction with CLI agents.

</details>

<details>
<summary><strong>📁 File Explorer Panel</strong></summary>

**Visual File Management**: Comprehensive file explorer with recent files, disk monitoring, storage analysis, and cleanup suggestions.

- **Five-Tab Interface**: Organized file management with specialized views
  - **Recent Tab**: Recently accessed files with activity type indicators
    - Real-time file activity tracking (FileWrite, FileRead, FileCreated, FileModified, Downloaded)
    - Visual activity icons with color-coded badges
    - List and grid view modes for flexible browsing
    - Click file names to open, click paths to reveal in system explorer
    - Add files to chat with one-click "Add to chat" button
    - Delete files directly from the panel with confirmation
    - Automatic filtering of temp files (.crdownload, .part, .tmp, .opdownload)
    - Timestamp display showing when files were accessed
  - **Images Tab**: Image gallery with grid/list views (see ImagesTab component)
  - **Disk Tab**: Real-time disk usage monitoring
    - Visual progress bars with color-coded status (green/yellow/red)
    - Shows total, used, and free space for all system drives
    - Percentage usage with automatic status indicators
    - Supports multiple drives with individual monitoring
  - **Analysis Tab**: Storage breakdown by category
    - Categories: Documents, Images, Videos, Code, Other
    - File count and size for each category
    - Color-coded visualization for easy identification
    - Helps identify what's consuming disk space
  - **Cleanup Tab**: Smart cleanup suggestions
    - Identifies cache files, old downloads, duplicates, and large files
    - Safety indicators (safe/review) for each suggestion
    - One-click cleanup with confirmation dialogs
    - Shows total reclaimable space across all suggestions
    - Automatic removal from UI after successful cleanup
- **Expandable Search Bar**: Integrated search with smooth expansion animation
  - Pre-allocated space prevents layout shift
  - Search across all files with AI-powered hybrid search
  - Press Enter to search, Escape to collapse
  - Auto-collapse when empty and loses focus
- **View Mode Toggle**: Switch between list and grid views (Recent and Images tabs)
- **Refresh Button**: Manual refresh with loading animation
- **File Operations**: Comprehensive file management
  - **Open**: Launch files with default system application
  - **Reveal**: Open system file explorer and select the file
  - **Delete**: Remove files with confirmation and automatic UI updates
  - **Add to Chat**: Insert file references into chat input with @filename syntax
  - **Context Menu**: Right-click for additional options (currently: Delete)
- **Activity Type Indicators**: Visual badges showing file activity
  - 🖊️ FileWrite (orange) - File was written/modified by agent
  - 👁️ FileRead (blue) - File was read by agent
  - ➕ FileCreated (green) - File was newly created
  - ⚡ FileModified (yellow) - File was modified
  - 📥 Downloaded (purple) - File was downloaded
- **Backend Integration**: Connects to backend API for file history and disk info
  - `/api/v1/files/recent` - Recent file activity
  - `/api/v1/system/disks` - Disk usage information
  - `/api/v1/storage/categories` - Storage analysis by category
  - `/api/v1/cleanup/suggestions` - Cleanup recommendations
- **Performance Optimized**: React memo, useCallback, and useMemo throughout
- **Floating Panel Design**: Terminal-style glassmorphic panel with resizable height
- **Persistent State**: Panel height saved to localStorage (default: 400px, min: 250px)
- **Event-Driven**: Listens for preload and close events for seamless integration

**Why This Matters**: Visual file management integrated directly into the AI workflow. See what files you've been working with, monitor disk space, and clean up clutter - all without leaving the chat interface. The "Add to chat" feature makes it effortless to reference files in conversations.

</details>

<details>
<summary><strong>🔍 Hybrid File Search Engine</strong></summary>

**Multi-engine search** combining Rust performance with CLI tool power and AI intelligence.

- **Rust Fuzzy Search**: Ultra-fast fuzzy matching using nucleo-matcher (Sublime Text algorithm)
- **CLI Integration**: Leverages ripgrep, fd, find, and grep for comprehensive results
- **Hybrid Mode**: Combines multiple engines for optimal accuracy
- **Auto Mode**: Intelligently selects the best engine for each query
- **AI-Enhanced Scoring**: Relevance scoring (0-100) with intelligent fallbacks
- **Performance**: Small projects ~10ms, medium ~50ms, large ~200ms
- **Content Search**: Search inside files with snippet extraction and line numbers
- **Multilingual Detection**: English and French keyword support
- **Interactive Results**: Click to open files, navigate folders, copy paths

**Why This Matters**: Agents get fast, accurate search results with visual rendering - no more parsing grep output.

</details>

<details>
<summary><strong>💬 AI Chat Interface</strong></summary>

- **Conversational AI**: Powered by Google Gemini for natural interactions
- **Chat History**: Save and manage multiple conversation threads
- **Message Editing & Regeneration**: Edit sent messages and regenerate AI responses from any point in the conversation
  - Hover over user messages to reveal edit button
  - Click edit to modify message content in-place
  - Save with Ctrl+Enter or Cancel with Escape
  - **Regenerate from Message**: Edit a message to regenerate the conversation from that point forward
  - All messages after the edited one are removed and AI generates a fresh response
  - File attachments preserved and automatically reloaded during regeneration
  - Works in both Normal Mode and Agent Mode
  - Visual feedback with save/cancel buttons
- **Message Highlighting**: Visual highlighting for bookmarked or referenced messages
  - Purple ring effect with smooth transitions for highlighted messages
  - Automatic scroll-to-message support via message ID anchors
  - Seamless integration with bookmark navigation
  - **Activity Panel Navigation**: Click on activity logs to jump directly to related messages
  - **Smart Chat Lookup**: Automatically finds conversations when navigating from activity logs
  - **Pending Chat Support**: Handles navigation to messages in newly created chats
- **Vision & Image Analysis**: Multi-modal AI support for image understanding in both Normal and Agent modes
  - Attach images to messages for visual analysis and OCR
  - Automatic base64 encoding for all AI providers
  - Support for common formats: JPG, PNG, GIF, BMP, WebP
  - Works with OpenAI GPT-4 Vision, Google Gemini Vision, and Claude 3 Vision
  - High-detail image processing for better OCR and analysis
  - Multiple images per message supported
  - **Agent Mode Support**: Full vision capabilities in agent mode with tool calling
  - **Optimized Loading**: Desktop app uses native Tauri file API for faster image loading, web version uses backend endpoint
  - **Image Display**: Attached images shown as thumbnails in message bubbles with full-size preview on click
- **Message Queue System**: Queue new messages while AI is processing
  - Visual queued message indicator appears when typing during AI response
  - Options to send immediately (interrupts current response) or wait for completion
  - Edit or discard queued messages before sending
  - Smooth workflow for rapid-fire questions
- **Rich Responses**: Support for file lists, disk usage charts, and cleanup suggestions
- **Interactive File Paths**: Click on file paths in search results to open the containing folder
- **Markdown Support**: Full markdown rendering in responses
- **File Search Integration**: AI automatically detects when file search is needed
- **Multilingual Intent Detection**: Understands search commands in English and French
- **Smart Error Handling**: Specific error messages with actionable guidance
- **Native Notifications**: Active integration for chat events and AI responses with automatic conversation tracking (desktop only)
- **Workflow Integration**: Execute multi-step workflows directly from chat with AI-powered prompt handling
- **Token Tracking**: Real-time token usage monitoring with conversation-level tracking
  - Displays input/output tokens for each request
  - Tracks cumulative conversation tokens
  - Automatic reset on new conversations
  - Cost estimation based on model pricing

</details>

<details>
<summary><strong>🖥️ Desktop Window Management</strong></summary>

- **Custom Window Controls**: Native close, minimize, maximize, and resize functionality with dedicated header buttons
- **Minimize to Taskbar**: One-click minimize button in header for quick window management
- **Maximize/Restore Toggle**: Double-click or button to maximize window, click again to restore to previous size
- **Drag & Drop**: Click and drag window from any non-interactive area
- **Adaptive Corner Radius**: Automatically adjusts window corners based on fullscreen state
- **Resize Handles**: Eight-directional window resizing (North, South, East, West, and corners)
- **Cross-Platform**: Consistent behavior across Windows, macOS, and Linux
- **Graceful Fallback**: Seamless operation in web environments without Tauri APIs

</details>

<details>
<summary><strong>🔌 Backend Status Monitoring</strong></summary>

- **Real-Time Backend Health Checks**: Automatic monitoring of backend service availability
  - **Health Endpoint**: Polls `http://localhost:3001/api/v1/health` every 30 seconds
  - **Smart Display**: Only shows indicator when backend is offline or checking (no clutter when online)
  - **Visual Feedback**: Color-coded status indicators with icons
    - **Checking**: Yellow pulsing alert icon with "Checking backend status..." message
    - **Offline**: Red warning with "Backend Offline" message and helpful instructions
    - **Online**: No indicator shown (silent success for clean UI)
- **User-Friendly Error Handling**:
  - Clear error message explaining impact: "Vision/OCR won't work"
  - Actionable instructions with inline code snippet: `cd backend && cargo run`
  - Manual retry button to recheck status without waiting for auto-refresh
- **Timeout Protection**: 2-second timeout prevents hanging on unresponsive backend
- **Automatic Recovery**: Continuously monitors and updates status as backend comes online/offline
- **Component Integration**: Can be placed anywhere in the UI with optional `className` prop for custom styling

**Why This Matters**: Users immediately know when backend-dependent features (vision/OCR, file search, agent tools) won't work, with clear guidance on how to fix it.

</details>

<details>
<summary><strong>🎨 Modern Design System</strong></summary>

- **Embossed Glassmorphism**: Tactile, interactive design with depth
- **Theme Support**: Light and dark mode with smooth transitions
- **Illumination Settings**: Customizable ambient lighting effects with per-theme controls
- **Branding Toggle**: Show or hide Skhoot branding elements
- **Responsive Layout**: Optimized for desktop use
- **Accessibility**: WCAG compliant with proper contrast and focus states

</details>

<details>
<summary><strong>🔔 Native Notifications</strong></summary>

- **Desktop Notifications**: Native system notifications using Tauri plugin with automatic environment detection
- **Comprehensive Settings Panel**: Full-featured notification configuration interface with modern glassmorphic design:
  - **General Controls**: Master enable/disable toggle for all notifications
  - **Notification Types**: Individual controls for success (✅), error (❌), warning (⚠️), and info (ℹ️) notifications
  - **Sound Management**: Enable/disable notification sounds with volume control slider (0-100%) and custom sound support
  - **Display Customization**: Duration control (0-30s, 0=persistent), position selection (4 corners), action buttons, and notification grouping
  - **Frequency Control**: Rate limiting with max notifications per minute (1-20) and quiet hours scheduling with overnight support
  - **Priority Settings**: Individual priority levels (low/normal/high) for each notification type affecting display behavior
  - **Test Notifications**: Interactive 2x2 grid of test buttons for all notification types (success, error, warning, info) with real-time preview and debug logging (bypasses all filters for reliable testing)
  - **Advanced Tools**: Glassmorphic cards for reset to defaults, debug information, and service reinitialization with clear descriptions and one-click actions
- **Smart Features**:
  - **Permission Management**: Automatic permission request and graceful handling of denied permissions
  - **Duplicate Prevention**: Tag-based notification deduplication and replacement
  - **Frequency Limiting**: Intelligent rate limiting with sliding window algorithm
  - **Quiet Hours**: Configurable quiet periods with overnight scheduling support
  - **Action Handling**: Context-aware default actions (retry, view details, fix now, etc.)
- **Cross-Platform Compatibility**:
  - **Desktop (Tauri)**: Native system notifications with full feature support
  - **Web Fallback**: Browser notifications with graceful degradation to console logging
  - **Dynamic Loading**: Robust dynamic import system with error handling
- **Developer Experience**:
  - **Debug Mode**: Comprehensive console logging for troubleshooting
  - **Service State**: Debug info including Tauri availability, settings, and queue status
  - **Persistent Settings**: Automatic localStorage persistence with migration support

</details>

<details>
<summary><strong>🧠 AI Memory Management</strong></summary>

**Persistent Long-Term Memory**: Give your AI agents the ability to remember important context across conversations.

- **Memory Storage**: Create and manage persistent memories that the AI can reference
  - **Manual Memory Creation**: Add memories manually with custom content, categories, and tags
  - **Session-Specific or Global**: Memories can be tied to specific conversations or available globally
  - **Importance Levels**: Mark memories as low, medium, or high importance for prioritization
  - **Rich Metadata**: Organize with categories, tags, notes, and timestamps
- **Memory Management Interface**: Intuitive card-based UI with expandable details
  - **Collapsed View**: Compact horizontal cards showing category icon, badge, and content preview
  - **Expanded View**: Full content display with metadata, tags, notes, and importance controls
  - **Inline Editing**: Click to edit notes, update importance, or modify metadata
  - **Visual Organization**: Color-coded category icons (Project, Preferences, Code, Database, Web, Idea, Other) and badges
- **Search & Filtering**: Find relevant memories quickly
  - **Full-Text Search**: Search across content, categories, tags, and notes with relevance scoring
  - **Category Filtering**: Filter memories by category with dropdown selector
  - **Tag Filtering**: Filter by tags to find related memories
  - **Smart Scoring**: Importance-weighted search results with exact match bonuses
- **Memory Operations**:
  - **Create**: Add new memories with content, category, and tags
  - **Read**: View memory details with expandable cards
  - **Update**: Edit notes, change importance, modify metadata
  - **Delete**: Remove memories with confirmation
  - **Search**: Find memories by content, category, or tags
- **Inspired by AgentSmith's Trace Model**: Implements persistent, searchable memory architecture for AI agents
- **LocalStorage Backend**: Memories stored locally with automatic persistence (up to 1000 memories)
- **Performance Optimized**: React memo and efficient rendering for smooth scrolling

**Why This Matters**: Enable AI agents to maintain context across sessions. Build up a knowledge base of project-specific information, preferences, and important facts that persist beyond individual conversations.

</details>

<details>
<summary><strong>⚙️ Settings & Privacy</strong></summary>

- **User Profile**: Manage personal information including name and profile picture
- **Audio Settings**: Configure microphone and speaker devices with real-time testing
- **Volume Controls**: Independent input/output volume adjustment
- **Sensitivity Settings**: Auto or manual microphone sensitivity configuration
- **AI Configuration**: Comprehensive AI settings panel with API key management, model selection, and parameter tuning (accessed via AI Settings button)
- **Privacy Controls**: Manage account settings and data export
- **Activity Logging**: Track and review your interactions with export and clear options
  - Click on activity logs to navigate directly to the related conversation and message
  - Automatic message highlighting when navigating from activity logs
  - Smart chat lookup: Automatically finds the correct conversation when navigating from logs with incomplete metadata
  - Deleted chat handling: Activity logs are preserved when conversations are deleted, with visual indicators showing the chat is no longer available
- **Help Center**: Comprehensive support hub with documentation access

</details>

<details>
<summary><strong>🔐 Secure API Key Management</strong></summary>

- **Centralized Configuration**: All API key management consolidated in the AI Settings panel (accessed via AI Settings button in chat interface)
- **Multi-Provider Support**: Manage API keys for OpenAI, Anthropic, Google AI, and custom endpoints
- **Encrypted Storage**: AES-256-GCM encryption with platform keychain integration
  - **Linux**: libsecret integration
  - **macOS**: Keychain Services
  - **Windows**: Credential Manager
- **Key Testing**: Validate API keys and fetch available models before saving
- **Model Persistence**: Selected model per provider is saved and automatically restored
- **Active Provider Management**: Switch between configured providers seamlessly
- **Smart Caching**: 5-minute cache TTL for improved performance
- **Secure Service Layer**: Frontend service communicates with Tauri backend for all key operations
- **No Key Exposure**: API keys never appear in logs or error messages

</details>

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Rust** (for desktop builds and backend - [Install Rust](https://rustup.rs/))
- **API Key** from your preferred provider:
  - [Google Gemini](https://aistudio.google.com/apikey) (recommended for getting started)
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Anthropic](https://console.anthropic.com/settings/keys)

### Installation

```bash
# Clone and install
git clone https://github.com/tristo-bit/skhoot.git
cd skhoot
npm install

# Configure API key (optional for web version)
cp .env.example .env
# Edit .env: VITE_GEMINI_API_KEY=your_api_key_here

# Build backend (one-time setup)
cd backend
cargo build --release
cd ..

# Start application
npm run tauri:dev    # Desktop version (auto-starts backend)
# OR
npm run dev:full     # Web version (starts backend + frontend)
```

**Note**: The desktop version automatically starts the backend. For the web version, the backend must be running separately (`npm run backend:dev`).

---

## 🛠️ Development
  - **macOS**: Keychain Services
  - **Windows**: Credential Manager
- **Key Testing**: Validate API keys and fetch available models before saving
- **Model Persistence**: Selected model per provider is saved and automatically restored
- **Active Provider Management**: Switch between configured providers seamlessly
- **Smart Caching**: 5-minute cache TTL for improved performance
- **Secure Service Layer**: Frontend service communicates with Tauri backend for all key operations
- **No Key Exposure**: API keys never appear in logs or error messages

</details>

---


<details>
<summary><strong>Available Scripts</strong></summary>

**Backend Development:**
- `npm run backend:dev` - Start Rust backend search engine
- `npm run backend:build` - Build optimized backend
- `npm run backend:test` - Run backend tests

**Web Development:**
- `npm run dev` - Start web development server
- `npm run dev:no-open` - Start without opening browser
- `npm run dev:full` - Start both backend and frontend
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Desktop Development:**
- `npm run tauri:dev` - Start desktop development with hot reload
- `npm run tauri:full` - Start backend and Tauri dev server
- `npm run tauri:build` - Build desktop app for current platform
- `npm run tauri:build:ubuntu` - Build for Ubuntu/Linux

</details>

<details>
<summary><strong>Project Structure</strong></summary>

```
skhoot/
├── backend/             # Rust backend search engine
│   ├── src/
│   │   ├── search_engine/  # File search implementation
│   │   ├── cli_engine/     # CLI tool integration
│   │   ├── cli_agent/      # Agent core module (NEW)
│   │   │   ├── agent.rs    # Agent state machine
│   │   │   ├── tools.rs    # Tool definitions (shell, file ops, etc.)
│   │   │   ├── executor.rs # Command execution
│   │   │   ├── session.rs  # Session state management
│   │   │   ├── response.rs # Response parsing
│   │   │   └── instructions.rs # System prompts
│   │   └── api/            # REST API endpoints
│   └── Cargo.toml
├── components/          # React components
│   ├── conversations/   # Message and conversation UI
│   │   ├── MessageBubble.tsx    # Message rendering with agent actions
│   │   ├── AgentAction.tsx      # Agent tool call visualization (NEW)
│   │   ├── CommandExecution.tsx # Shell command display (NEW)
│   │   ├── CommandOutput.tsx    # Command output with ANSI colors (NEW)
│   │   ├── FileOperation.tsx    # File operation display (NEW)
│   │   └── ...
│   ├── panels/          # Floating panel components
│   │   ├── FileExplorerPanel.tsx # File explorer with search and disk analysis
│   │   ├── WorkflowsPanel.tsx    # Workflow automation management (NEW)
│   │   ├── BackupPanel.tsx       # Files, memories, and bookmarks management (NEW)
│   │   ├── SettingsPanel.tsx     # Application settings
│   │   ├── AISettingsModal.tsx   # AI configuration modal
│   │   ├── bookmarks/            # Bookmark management components
│   │   │   └── BookmarksTab.tsx  # Bookmarks tab UI
│   │   └── memories/             # Memory management components (NEW)
│   │       └── MemoriesTab.tsx   # AI memory management UI
│   ├── terminal/        # Terminal and agent log UI
│   │   ├── TerminalPanel.tsx
│   │   ├── AgentLogTab.tsx      # Agent monitoring interface (NEW)
│   │   └── ...
│   ├── chat/            # Chat interface components
│   │   ├── ChatInterface.tsx    # Main chat with agent mode toggle
│   │   ├── TokenDisplay.tsx     # Real-time token usage display (NEW)
│   │   └── ...
│   ├── shared/          # Reusable UI components
│   ├── library/         # Reusable hooks and utilities
│   │   └── useAudioAnalyzer.ts  # Audio stream analysis
│   └── ...
├── services/            # API and data services
│   ├── agentService.ts         # Agent session management (NEW)
│   ├── agentChatService.ts     # AI integration with tool calling (NEW)
│   ├── apiKeyService.ts        # Secure API key management
│   ├── tokenTrackingService.ts # Token usage tracking (NEW)
│   ├── memoryService.ts        # AI long-term memory management (NEW)
│   ├── userProfileService.ts   # User profile data management (NEW)
│   ├── diskService.ts          # System disk information
│   ├── notificationService.ts  # Native desktop notifications
│   ├── audioService.ts         # Audio management
│   ├── backendApi.ts          # Backend communication
│   └── gemini.ts              # AI integration
├── hooks/               # Custom React hooks
│   ├── useAgentLogTab.ts       # Agent log lifecycle management (NEW)
│   └── ...
├── src/
│   ├── contexts/        # React contexts
│   └── constants.ts     # App constants
├── src-tauri/           # Tauri desktop configuration
│   └── src/
│       ├── agent.rs     # Agent Tauri commands (NEW)
│       ├── api_keys.rs  # API key Tauri commands
│       ├── terminal.rs  # Terminal management
│       └── main.rs      # Tauri app entry point
├── browser-test/        # Demo and testing utilities
└── public/              # Static assets
```

</details>

<details>
<summary><strong>Design System</strong></summary>

Skhoot uses an **Embossed Glassmorphic Design System**. See [EMBOSSED_STYLE_GUIDE.md](./documentation/EMBOSSED_STYLE_GUIDE.md) for:
- Component styling patterns
- Color system and theming
- Interactive states and animations
- Accessibility considerations

</details>

---

## 🔍 File Search System

<details>
<summary><strong>Search Engines</strong></summary>

- **Rust Fuzzy Search**: Ultra-fast fuzzy matching using nucleo-matcher
- **CLI Integration**: Leverages ripgrep, fd, find, and grep
- **Hybrid Mode**: Combines multiple engines for optimal results
- **Auto Mode**: Intelligently selects the best engine for each query

</details>

<details>
<summary><strong>AI-Powered Features</strong></summary>

- **Intent Detection**: Automatically detects when file search is needed
- **Smart Suggestions**: Provides intelligent query refinements
- **Context Awareness**: Uses current file and recent activity to improve results
- **Search History**: Learns from previous searches

</details>

<details>
<summary><strong>API Integration</strong></summary>

```typescript
// Search for files
const results = await backendApi.searchFiles("config.json", 50);

// AI-powered search with options
const aiResults = await backendApi.aiFileSearch("main.rs", {
  mode: 'hybrid',
  max_results: 50,
  search_path: '/path/to/project',
  file_types: 'rs,ts,js'
});

// Search inside file contents
const contentResults = await backendApi.searchContent("TODO", {
  case_sensitive: false,
  search_path: '/path/to/project',
  file_types: 'ts,js,rs'
});

// Get AI-powered suggestions
const suggestions = await backendApi.getSearchSuggestions({
  prompt: "find the main configuration file",
  current_file: "src/main.ts",
  project_type: "typescript"
});

// Open file location in system explorer
await backendApi.openFileLocation("/path/to/file.txt");
```

**File Operations API:**
```typescript
import { fileOperations } from './services/fileOperations';

// Open file with default application
const opened = await fileOperations.open('/path/to/document.pdf');

// Reveal file in system file explorer (select the file)
const revealed = await fileOperations.reveal('/path/to/file.txt');

// Show file properties dialog
const shown = await fileOperations.showProperties('/path/to/file.txt');

// Open "Open with" application picker
const openedWith = await fileOperations.openWith('/path/to/file.txt');

// Delete a file
const deleted = await fileOperations.delete('/path/to/old-file.txt');

// Compress file or folder to ZIP
const result = await fileOperations.compress('/path/to/folder');
if (result.success) {
  console.log('ZIP created at:', result.zipPath);
}

// Get file information
const info = await fileOperations.getInfo('/path/to/file.txt');
console.log('File info:', info); // { name, type, size, modified, ... }
```

**Agent Service API:**
```typescript
import { agentService } from './services/agentService';
import type { AgentSessionOptions, AgentMessage, AgentToolCall } from './services/agentService';

// Create an agent session
const sessionId = await agentService.createSession({
  conversationId: 'conv-123',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'sk-...'
});

// Send a message to the agent
await agentService.sendMessage(sessionId, 'Find all TypeScript files in src/');

// Add assistant message with tool calls
await agentService.addAssistantMessage(sessionId, {
  content: 'I found 42 TypeScript files.',
  toolCalls: [
    {
      id: 'call_123',
      name: 'search_files',
      arguments: { pattern: '*.ts', path: 'src/' }
    }
  ]
});

// Get conversation messages
const messages: AgentMessage[] = await agentService.getMessages(sessionId);

// Execute a tool
const result = await agentService.executeTool(sessionId, {
  name: 'shell',
  arguments: { command: 'ls -la', workingDir: '/home/user' }
});

// Listen for agent events
agentService.on('tool_start', (data) => {
  console.log('Tool started:', data.toolCall);
});

agentService.on('tool_complete', (data) => {
  console.log('Tool completed:', data.result);
});

agentService.on('message', (data) => {
  console.log('New message:', data.message);
});

// Get agent status
const status = await agentService.getStatus(sessionId);
console.log('Agent state:', status.state); // 'idle' | 'processing' | 'executing_tool'

// List all sessions
const sessions = await agentService.listSessions();

// Close session
await agentService.closeSession(sessionId);

// Cancel ongoing action
await agentService.cancelAction(sessionId);
```

**Agent Chat Service API:**
```typescript
import { agentChatService } from './services/agentChatService';
import type { AgentChatMessage, AgentToolCallData, AgentToolResultData } from './services/agentChatService';

// Execute agent with tool calling support
const result = await agentChatService.executeWithTools(
  'Find all TODO comments in the codebase',
  conversationHistory,
  {
    sessionId: 'session-123',
    provider: 'openai',
    model: 'gpt-4',
    onToolStart: (toolCall: AgentToolCallData) => {
      console.log(`Executing ${toolCall.name}...`);
    },
    onToolComplete: (result: AgentToolResultData) => {
      console.log(`Tool ${result.success ? 'succeeded' : 'failed'}`);
    },
    onStatusUpdate: (status: string) => {
      console.log(`Status: ${status}`);
    }
  }
);

// Execute agent with vision/image analysis support
const visionResult = await agentChatService.executeWithTools(
  'What do you see in this screenshot? Extract any text.',
  conversationHistory,
  {
    sessionId: 'session-123',
    provider: 'openai',
    model: 'gpt-4o', // Vision-capable model
    images: [
      { 
        fileName: 'screenshot.png', 
        base64: 'iVBORw0KGgoAAAANSUhEUgAA...', 
        mimeType: 'image/png' 
      }
    ],
    onStatusUpdate: (status: string) => {
      console.log(`Status: ${status}`);
    }
  }
);

console.log('Agent response:', result.content);
console.log('Tool calls made:', result.toolCalls);
console.log('Tool results:', result.toolResults);

// Supported providers: 'openai', 'google', 'anthropic', or any custom provider
// Each provider has its own tool calling format automatically handled
// Tool execution loop runs up to 10 iterations
// History is automatically converted to provider-specific format
// Vision support automatically enabled for compatible models (GPT-4o, Gemini 2.0 Flash, Claude 3.5 Sonnet)
```

**Token Tracking Service API:**
```typescript
import { tokenTrackingService, TokenTrackingService } from './services/tokenTrackingService';
import type { TokenUsage, TokenRecord, TimePeriod, ConversationTokenEvent } from './services/tokenTrackingService';

// Set the current model and provider
tokenTrackingService.setCurrentModel('openai', 'gpt-4o');

// Start a new conversation (resets conversation token counter)
tokenTrackingService.startNewConversation('conv-123');

// Subscribe to conversation token updates (for PromptArea display)
const unsubscribe = tokenTrackingService.subscribeToConversation((event: ConversationTokenEvent) => {
  console.log('Model:', event.model);
  console.log('Provider:', event.provider);
  console.log('Conversation tokens:', event.conversationTokens);
  console.log('Last request tokens:', event.lastRequestTokens);
});

// Subscribe to history updates (for AI Settings panel)
const unsubscribeHistory = tokenTrackingService.subscribeToHistory(() => {
  console.log('Token history updated');
});

// Record token usage from API response
tokenTrackingService.recordUsage(150, 75, 'gpt-4o', 'openai');

// Record with text fallback estimation (when API doesn't return token counts)
tokenTrackingService.recordUsage(0, 0, 'gpt-4o', 'openai', userMessage, aiResponse);

// Estimate tokens from text (~0.25 tokens per character)
const estimatedTokens = tokenTrackingService.estimateTokens('Hello, how are you?');

// Get conversation tokens (current conversation only)
const convTokens = tokenTrackingService.getConversationTokens();
const lastRequest = tokenTrackingService.getLastRequestTokens();

// Get usage filtered by time period
type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'all';
const usage = tokenTrackingService.getUsageByPeriod('day');
console.log('Input tokens:', usage.inputTokens);
console.log('Output tokens:', usage.outputTokens);
console.log('Total tokens:', usage.totalTokens);
console.log('Cost:', usage.cost);
console.log('Record count:', usage.recordCount);

// Get full history records
const history: TokenRecord[] = tokenTrackingService.getHistory();

// Clear all history
tokenTrackingService.clearHistory();

// Format token counts with K/M suffix (static method)
const formatted = TokenTrackingService.formatTokens(1500000); // "1.5M"
const formatted2 = TokenTrackingService.formatTokens(2500); // "2.5K"

// Format cost for display (static method)
const costStr = TokenTrackingService.formatCost(0.0025); // "0.0025"

// Unsubscribe when done
unsubscribe();
unsubscribeHistory();
```

**Memory Service API:**
```typescript
import { memoryService } from './services/memoryService';
import type { Memory, CreateMemoryRequest, MemoryMetadata } from './services/memoryService';

// Create a new memory
const memory = await memoryService.create({
  content: 'User prefers TypeScript over JavaScript for new projects',
  role: 'assistant',
  session_id: 'conv-123', // Optional: tie to specific conversation
  metadata: {
    category: 'preferences',
    tags: ['typescript', 'coding-style'],
    importance: 'high',
    source: 'agent'
  },
  notes: 'Mentioned during project setup discussion'
});

// List all memories (optionally filtered by session)
const allMemories = await memoryService.list();
const sessionMemories = await memoryService.list('conv-123');
const limitedMemories = await memoryService.list(undefined, 10);

// Get a specific memory by ID
const memory = await memoryService.get('memory_123');

// Search memories with relevance scoring
const results = await memoryService.search('typescript preferences', 5);
// Searches across content, category, tags, and notes
// Returns results sorted by relevance score and recency

// Get recent memories
const recent = await memoryService.recent(10);
const recentForSession = await memoryService.recent(10, 'conv-123');

// Update a memory
const updated = await memoryService.update('memory_123', {
  content: 'Updated content',
  metadata: { importance: 'medium' },
  notes: 'Updated notes'
});

// Update just the notes
const withNotes = await memoryService.updateNotes('memory_123', 'New notes');

// Update just the metadata
const withMetadata = await memoryService.updateMetadata('memory_123', {
  importance: 'high',
  tags: ['typescript', 'preferences', 'best-practices']
});

// Delete a memory
await memoryService.delete('memory_123');

// Get memories by category
const categoryMemories = await memoryService.getByCategory('preferences', 10);

// Get memories by tag
const taggedMemories = await memoryService.getByTag('typescript', 10);

// Get all unique categories
const categories = await memoryService.getAllCategories();

// Get all unique tags
const tags = await memoryService.getAllTags();

// Memory metadata options
interface MemoryMetadata {
  importance?: 'low' | 'medium' | 'high';
  category?: string;
  tags?: string[];
  source?: 'user' | 'agent' | 'system';
  tokens_used?: number;
  embedding?: string;
}

// Memory roles: 'user' | 'assistant' | 'system'
// Storage: localStorage with 1000 memory limit
// Inspired by AgentSmith's Trace model for persistent AI memory
```

**Token Tracking Features:**
- **Conversation Tracking**: Track tokens within the current conversation separately from historical data
- **Historical Data**: Full usage history with timestamps for period-based filtering (hour/day/week/month/all)
- **Multi-Provider Support**: Track usage across OpenAI, Google Gemini, and Anthropic
- **Token Estimation**: Automatic fallback estimation from text when APIs don't return usage (~0.25 tokens per char)
- **Dual Subscriptions**: Separate listeners for conversation updates and history changes
- **Persistent Storage**: Automatically saves last 1000 records to localStorage
- **Cost Calculation**: Estimated costs based on current model pricing (per 1M tokens)
- **Formatting Utilities**: Human-readable token counts (K/M suffix) and cost formatting
- **Model Pricing**: Built-in pricing for popular models (GPT-4o, Gemini, Claude, etc.)

**TokenDisplay Component:**

A compact UI component that displays real-time token usage in the format: `[Tokens: model-name] input/output`

```typescript
import { TokenDisplay } from './components/chat/TokenDisplay';

// Basic usage - renders token stats for last request
<TokenDisplay />

// With custom styling
<TokenDisplay className="my-custom-class" />
```

Features:
- **Last Request Focus**: Shows tokens from the most recent API request (not cumulative session total)
- **Compact Format**: Shows `[Tokens: model] input/output` (e.g., `[Tokens: 4o-mini] 1.2K/3.5K`)
- **Smart Model Names**: Shortens common model names (gpt-4o-mini → 4o-mini, gemini-2.0-flash → gem-2.0, claude-3-5-sonnet → sonnet)
- **Auto-Formatting**: Displays tokens as K (thousands) or M (millions) for readability
- **Animation**: Subtle scale animation on token updates
- **Tooltip**: Hover for detailed breakdown including last request counts, session totals, and estimated cost
- **Auto-Hide**: Only renders when there's actual token usage to display
- **Real-time Updates**: Subscribes to tokenTrackingService for live updates

**Vision-Capable Models for Agent Mode:**
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4-vision-preview`
- **Google**: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`
- **Anthropic**: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`
- **Anthropic**: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`

**Available Agent Tools:**
- `shell`: Execute terminal commands with working directory support
- `read_file`: Read file contents from filesystem
- `write_file`: Write or modify file contents
- `list_directory`: List directory contents with file metadata
- `search_files`: Search for files by pattern or content

</details>

<details>
<summary><strong>API Key Service API</strong></summary>

```typescript
import { apiKeyService, PROVIDERS } from './services/apiKeyService';

// Available providers
console.log(PROVIDERS); // [{ id: 'openai', name: 'OpenAI', icon: '...' }, ...]

// Save an API key (encrypted at rest)
await apiKeyService.saveKey('openai', 'sk-...', true);

// Load an API key (with 5-minute cache)
const apiKey = await apiKeyService.loadKey('openai');

// Delete an API key
await apiKeyService.deleteKey('openai');

// List all configured providers
const providers = await apiKeyService.listProviders();
// Returns: ['openai', 'anthropic', 'google']

// Get the active provider
const activeProvider = await apiKeyService.getActiveProvider();
// Returns: 'openai' or null

// Set a provider as active
await apiKeyService.setActiveProvider('anthropic');

// Test an API key and fetch available models
const providerInfo = await apiKeyService.testKey('openai', 'sk-...');
// Returns: { provider: 'openai', models: ['gpt-4', 'gpt-3.5-turbo', ...] }

// Fetch models for a stored provider
const models = await apiKeyService.fetchProviderModels('openai');
// Returns: ['gpt-4', 'gpt-3.5-turbo', ...]

// Save selected model for a provider (persisted to localStorage)
await apiKeyService.saveModel('openai', 'gpt-4');

// Load saved model for a provider
const savedModel = await apiKeyService.loadModel('openai');
// Returns: 'gpt-4' or null if not set

// Check if a provider has a configured key
const hasKey = await apiKeyService.hasKey('openai');
// Returns: true or false

// Clear the cache (useful after key updates)
apiKeyService.clearCache();

// Get provider information
const providerInfo = apiKeyService.getProviderInfo('openai');
// Returns: { id: 'openai', name: 'OpenAI', icon: '/providers/openai.svg' }
```

**Security Features:**
- All keys encrypted with AES-256-GCM before storage
- Encryption keys stored in platform-specific secure keychains
- Keys never logged or exposed in error messages
- Automatic cache invalidation on key updates
- Secure communication via Tauri IPC layer

**Supported Providers:**
- **OpenAI**: GPT-4, GPT-3.5-turbo, and other OpenAI models
- **Anthropic**: Claude models with API key validation
- **Google AI**: Gemini and other Google AI models
- **Custom**: Support for custom API endpoints

</details>

<details>
<summary><strong>Disk Service API</strong></summary>

```typescript
import { diskService, getSystemDisks, formatBytes, getDiskColor, getDiskStatus } from './services/diskService';
import type { DiskInfo } from './services/diskService';

// Get all system disks with usage information
const disks: DiskInfo[] = await getSystemDisks();
// Returns array of disk info objects:
// {
//   name: 'System Drive',
//   mountPoint: 'C:',
//   totalBytes: 500000000000,
//   usedBytes: 320000000000,
//   freeBytes: 180000000000,
//   percentUsed: 64,
//   fileSystem: 'NTFS',
//   isRemovable: false
// }

// Format bytes to human-readable string
formatBytes(1024);           // '1 KB'
formatBytes(1073741824);     // '1 GB'
formatBytes(1099511627776);  // '1 TB'

// Get color based on disk usage (for UI indicators)
getDiskColor(50);   // '#22c55e' (green - healthy)
getDiskColor(70);   // '#f59e0b' (orange - warning)
getDiskColor(90);   // '#ef4444' (red - critical)

// Get status text based on usage
getDiskStatus(50);  // 'Healthy'
getDiskStatus(70);  // 'Getting Full'
getDiskStatus(87);  // 'Almost Full'
getDiskStatus(92);  // 'Critical'

// Using the service object
const disks = await diskService.getSystemDisks();
const formatted = diskService.formatBytes(disk.freeBytes);
const color = diskService.getDiskColor(disk.percentUsed);
const status = diskService.getDiskStatus(disk.percentUsed);
```

**Data Sources (in priority order):**
1. **Tauri API**: Native `get_system_disks` command for accurate system disk info
2. **Backend API**: REST endpoint at `http://localhost:3001/api/v1/system/disks`
3. **Browser Storage API**: `navigator.storage.estimate()` for web-only environments
4. **Fallback**: Placeholder data when no other source is available

**DiskInfo Interface:**
- `name`: Disk label or identifier
- `mountPoint`: Mount path (e.g., 'C:', '/', '/home')
- `totalBytes`: Total disk capacity in bytes
- `usedBytes`: Used space in bytes
- `freeBytes`: Available space in bytes
- `percentUsed`: Usage percentage (0-100)
- `fileSystem`: File system type (NTFS, ext4, APFS, etc.)
- `isRemovable`: Whether the disk is removable media

</details>

<details>
<summary><strong>Activity Logger Service API</strong></summary>

```typescript
import { activityLogger, formatRelativeTime } from './services/activityLogger';
import type { ActivityLog, ActivityAction, ActivityStatus, ActivityFilter, SearchMetadata } from './services/activityLogger';

// Log a new activity
const log = activityLogger.log(
  'File Search',           // action: ActivityAction
  'config.json',           // query: string
  'Found 5 matches',       // result: string
  'success',               // status: ActivityStatus (optional, defaults to 'success')
  { duration: 150 },       // metadata: Record<string, unknown> (optional)
  {                        // searchMetadata: SearchMetadata (optional)
    query: 'config.json',
    fileTypes: 'json',
    searchMode: 'hybrid',
    executionTime: 150,
    originalResults: 5,
    filteredResults: 5
  },
  'conv-123',              // chatId: string (optional) - links to conversation
  'msg-456'                // messageId: string (optional) - links to specific message
);

// Get all logs
const allLogs: ActivityLog[] = activityLogger.getLogs();

// Get filtered logs by category
const searchLogs = activityLogger.getFilteredLogs('search');  // File/Content/Message Search
const cleanupLogs = activityLogger.getFilteredLogs('cleanup'); // Cleanup operations
const archiveLogs = activityLogger.getFilteredLogs('archive'); // Archive operations
const chatLogs = activityLogger.getFilteredLogs('chat');       // AI Chat & Voice Input
const allLogs = activityLogger.getFilteredLogs('all');         // All activities

// Clear all logs
activityLogger.clearLogs();

// Mark all logs associated with a chat as deleted
// (useful when a conversation is deleted to maintain log integrity)
activityLogger.markChatAsDeleted('conv-123');

// Subscribe to log updates (real-time)
const unsubscribe = activityLogger.subscribe((logs: ActivityLog[]) => {
  console.log('Logs updated:', logs.length);
});

// Unsubscribe when done
unsubscribe();

// Export logs as JSON
const jsonExport = activityLogger.exportLogs();
console.log(jsonExport); // Pretty-printed JSON string

// Export logs as CSV
const csvExport = activityLogger.exportLogsCSV();
console.log(csvExport); // CSV with headers: ID, Timestamp, Action, Query, Result, Status

// Format relative time for display
const timeStr = formatRelativeTime(new Date()); // "Just now"
const timeStr2 = formatRelativeTime(new Date(Date.now() - 300000)); // "5m ago"
```

**Activity Types:**
- `'File Search'`: File search operations
- `'Content Search'`: Content/text search within files
- `'Message Search'`: Bookmark/message search operations
- `'Archive'`: Archive operations
- `'Cleanup'`: Cleanup and disk management
- `'Disk Analysis'`: Disk usage analysis
- `'AI Chat'`: AI chat interactions
- `'Agent'`: Agent mode operations
- `'Voice Input'`: Voice command input
- `'Settings Change'`: Settings modifications

**ActivityLog Interface:**
- `id`: Unique log identifier (auto-generated)
- `timestamp`: Date when activity occurred
- `action`: Type of activity (ActivityAction)
- `query`: User query or action description
- `result`: Result or outcome description
- `status`: 'success' | 'error' | 'pending'
- `metadata`: Optional additional data (Record<string, unknown>)
- `searchMetadata`: Optional search-specific metadata (SearchMetadata)
- `chatId`: Optional conversation ID for linking to chat sessions
- `messageId`: Optional message ID for linking to specific messages
- `isDeleted`: Optional boolean indicating if the associated chat/message was deleted

**SearchMetadata Interface:**
- `query`: Search query string
- `fileTypes`: File type filters (optional)
- `searchPath`: Search directory path (optional)
- `searchMode`: Search engine mode (optional)
- `executionTime`: Search duration in ms (optional)
- `originalResults`: Total results before filtering (optional)
- `filteredResults`: Results after filtering (optional)
- `filterReason`: Reason for filtering (optional)
- `results`: Detailed result array with paths, scores, and inclusion status (optional)

**Features:**
- **Persistent Storage**: Automatically saves to localStorage (max 100 logs)
- **Real-time Updates**: Subscribe to log changes with listener pattern
- **Filtering**: Built-in category filters for different activity types
- **Export Options**: JSON and CSV export for external analysis
- **Conversation Linking**: Link activities to specific chat conversations and messages
- **Deletion Tracking**: Mark logs as deleted when associated chats/messages are removed (maintains log integrity while indicating unavailable references)
- **Search Metadata**: Rich metadata for search operations with detailed results
- **Time Formatting**: Human-readable relative time formatting
- **Auto-Cleanup**: Automatically trims to most recent 100 logs

**UI Component:**
The Activity Panel (`components/activity/ActivityPanel.tsx`) provides a visual interface for viewing and managing activity logs with:
- **Filtering**: Filter by activity type (all, search, cleanup, archive, chat)
- **Search Detail Modals**: View detailed search metadata and results
- **Export Functionality**: Export logs as JSON or CSV
- **Clear Logs**: Clear all logs with confirmation dialog
- **Message Navigation**: Click on logs with conversation links to jump directly to the related message in chat
- **Visual Feedback**: Automatic message highlighting when navigating from activity logs
- **Smart Navigation**: Automatically finds the correct conversation when chatId is missing, using messageId lookup

</details>

<details>
<summary><strong>Notification Service API</strong></summary>

```typescript
import { nativeNotifications } from './services/nativeNotifications';

// Service automatically initializes with environment detection
// Handles Tauri vs web environments seamlessly with dynamic imports

// Send different types of notifications with convenience methods
await nativeNotifications.success('Task Complete', 'File search finished successfully');
await nativeNotifications.error('Connection Failed', 'Unable to reach backend server');
await nativeNotifications.warning('Low Disk Space', 'Consider cleaning up old files');
await nativeNotifications.info('Update Available', 'New version ready for download');

// Advanced notification with full options
await nativeNotifications.notify({
  title: 'Custom Notification',
  body: 'This is a detailed message with custom settings',
  type: 'success',
  icon: '✅',
  sound: true,
  silent: false,
  tag: 'unique-id', // Prevents duplicates, replaces existing
  data: { actionable: true }, // Custom data for action handling
  actions: [
    { id: 'view', title: 'View Details' },
    { id: 'dismiss', title: 'Dismiss' }
  ]
});

// Settings management with comprehensive controls
const settings = nativeNotifications.getSettings();
console.log('Current settings:', settings);

// Update specific settings (automatically saves to localStorage)
nativeNotifications.updateSettings({
  enabled: true,
  types: {
    success: true,
    error: true,
    warning: false, // Disable warning notifications
    info: true
  },
  sound: {
    enabled: true,
    volume: 85 // 0-100 scale
  },
  frequency: {
    enabled: true,
    maxPerMinute: 10,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00' // Supports overnight periods
    }
  }
});

// Test notifications for each type (useful for settings panels)
// Note: Test notifications bypass all filters (frequency limits, quiet hours, etc.)
// to ensure they always work for testing notification functionality
await nativeNotifications.testNotification('success');
await nativeNotifications.testNotification('error');
await nativeNotifications.testNotification('warning');
await nativeNotifications.testNotification('info');

// Reset to factory defaults
nativeNotifications.resetSettings();

// Debug information for troubleshooting
const debugInfo = nativeNotifications.getDebugInfo();
console.log('Service state:', debugInfo);
// Returns: { tauriAvailable, settings, queueLength, isInQuietHours }

// Environment-specific behavior:
// Desktop (Tauri): Native system notifications with full OS integration
// Web Browser: Falls back to browser Notification API or console logging
// All features work seamlessly across environments with appropriate fallbacks
```

**Automatic Chat Integration:**
- New conversations trigger info notifications with conversation titles
- Chat events automatically logged with metadata
- Configurable through notification settings panel
- Respects user preferences and quiet hours

**Smart Features:**
- **Frequency Limiting**: Sliding window algorithm prevents notification spam
- **Quiet Hours**: Configurable periods with overnight support (e.g., 22:00-08:00)
- **Action Handling**: Context-aware default actions based on notification type
- **Permission Flow**: Automatic permission requests with graceful degradation
- **Persistence**: Settings automatically saved to localStorage with migration support

</details>

<details>
<summary><strong>User Profile Service API</strong></summary>

```typescript
import { userProfileService } from './services/userProfileService';
import type { UserProfile } from './services/userProfileService';

// Load user profile from localStorage
const profile: UserProfile = userProfileService.loadProfile();
console.log(profile);
// {
//   firstName: 'John',
//   lastName: 'Doe',
//   email: 'john.doe@example.com',
//   profileImage: 'data:image/png;base64,...' or null,
//   updatedAt: '2026-01-26T12:00:00.000Z'
// }

// Save complete profile (partial updates supported)
userProfileService.saveProfile({
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@example.com'
});

// Save profile image only
userProfileService.saveProfileImage('data:image/png;base64,...');
// or remove image
userProfileService.saveProfileImage(null);

// Save user name (first and last)
userProfileService.saveName('Jane', 'Smith');

// Update email (typically from auth service)
userProfileService.updateEmail('newemail@example.com');

// Get profile image only
const image: string | null = userProfileService.getProfileImage();

// Get user full name
const fullName: string = userProfileService.getFullName(); // "Jane Smith"

// Clear all profile data
userProfileService.clearProfile();
```

**UserProfile Interface:**
- `firstName`: User's first name (string)
- `lastName`: User's last name (string)
- `email`: User's email address (string)
- `profileImage`: Base64-encoded image data or null (string | null)
- `updatedAt`: ISO timestamp of last update (string)

**Features:**
- **Persistent Storage**: Automatically saves to localStorage with key `skhoot_user_profile`
- **Partial Updates**: `saveProfile()` accepts partial profile objects and merges with existing data
- **Automatic Timestamps**: Updates `updatedAt` field on every save operation
- **Default Values**: Returns default profile (John Doe) if no profile exists
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Type Safety**: Full TypeScript interfaces for all operations

**UI Integration:**
The User Panel (`components/settings/UserPanel.tsx`) provides a visual interface for managing profile data with:
- **Profile Picture Upload**: Drag-and-drop or click to upload with preview
- **Name Management**: Edit first and last name with save button
- **Change Detection**: Visual indicators for unsaved changes
- **Persistent State**: Profile data automatically loaded on mount and saved on user action

</details>

<details>
<summary><strong>Performance</strong></summary>

| Project Size | Average Search Time |
|--------------|---------------------|
| Small (< 1K files) | ~10ms |
| Medium (1K-10K files) | ~50ms |
| Large (10K+ files) | ~200ms |

</details>

---

## 🖥️ Desktop vs Web

| Feature | Web | Desktop (Tauri) |
|---------|-----|-----------------|
| Installation | None required | Native app |
| Performance | Good | Better |
| System Integration | Limited | Full |
| Window Management | Basic | Advanced* |
| Notifications | Browser only | Native system |
| Offline Support | No | Yes |
| File System Access | Limited | Enhanced |
| Auto-Updates | N/A | Supported |

*Desktop includes custom window controls with minimize/close buttons, dragging, resizing, and adaptive corner radius

---

## 🧪 Testing

<details>
<summary><strong>File Search Test Interface</strong></summary>

Access via the search icon (🔍) in the header:
1. Ensure backend is running: `npm run backend:dev`
2. Click the search icon in the header
3. Test various queries: "main", "*.rs", "config"
4. Use "Test AI Suggestion Detection" for AI integration
5. Check browser console for detailed logs

</details>

<details>
<summary><strong>Demo Commands</strong></summary>

Open browser console and try:
```javascript
skhootDemo.help()           // Show all commands
skhootDemo.searchFiles()    // Demo file search
skhootDemo.searchSuggestions() // Demo AI suggestions
skhootDemo.askAgent()       // Demo agent assistance
skhootDemo.analyzeDisk()    // Demo disk analysis
skhootDemo.cleanup()        // Demo cleanup suggestions
skhootDemo.showMarkdown()   // Demo markdown rendering
```

</details>

---

## 🌐 Browser Compatibility

| Feature | Chrome | Edge | Safari | Opera | Firefox |
|---------|--------|------|--------|-------|---------|
| Voice Input | ✅ | ✅ | ✅ | ⚠️* | ❌ |
| Core Features | ✅ | ✅ | ✅ | ✅ | ✅ |
| Glassmorphism | ✅ | ✅ | ✅ | ✅ | ✅ |

*Opera shows text input prompt as fallback

---

## 🔧 Configuration

<details>
<summary><strong>Environment Variables</strong></summary>

- `VITE_GEMINI_API_KEY` - Your Google Gemini API key (required)
- Backend runs on `http://localhost:3001` by default

</details>

<details>
<summary><strong>Customization</strong></summary>

- `src/constants.ts` - Colors, themes, and action prompts
- `EMBOSSED_STYLE_GUIDE.md` - Design system changes
- `browser-test/demo.ts` - Demo data configuration

</details>

---


## 📝 Recent Updates

<details>
<summary><strong>Enhanced Architecture with Context Providers</strong></summary>

**Centralized State Management**: App.tsx now uses React Context API for theme and settings management, providing better state consistency and performance.

- **ThemeProvider Integration**: Centralized theme management with automatic system theme detection
  - Supports light, dark, and system-based theme preferences
  - `resolvedTheme` provides the actual active theme (resolves 'system' to 'light' or 'dark')
  - Automatic theme switching based on system preferences
  - Persistent theme storage across sessions
- **SettingsProvider Integration**: Centralized settings management with theme-aware configuration
  - Receives `resolvedTheme` from ThemeProvider for theme-dependent settings
  - Manages application-wide settings state
  - Provides consistent settings access across all components
  - Eliminates prop drilling for settings data
- **Improved Component Architecture**: 
  - `SettingsWrapper` component bridges ThemeProvider and SettingsProvider
  - Ensures settings always have access to resolved theme
  - Clean separation of concerns between theme and settings logic
- **Enhanced Message Navigation**: Improved activity panel navigation with smart chat lookup
  - **navigate-to-message Event**: Direct navigation to specific messages in conversations
  - **find-message-chat Event**: Intelligent chat lookup when chatId is missing
  - **Pending Chat Support**: Handles navigation to messages in newly created chats
  - **Current Chat Check**: Prioritizes current chat when searching for messages
  - **Automatic Highlighting**: Messages automatically highlighted after navigation
  - **Activity Panel Integration**: Seamless navigation from activity logs to related messages
- **Token Tracking Integration**: Real-time token usage monitoring throughout the application
  - Conversation-level token tracking with automatic reset on new chats
  - Integration with `tokenTrackingService` for persistent usage history
  - Token display in chat interface for transparency
  - Cost estimation based on model pricing
- **Event-Driven Architecture**: Comprehensive custom event system for cross-component communication
  - `open-ai-settings`: Opens AI settings modal with API configuration
  - `ai-terminal-created`: Auto-opens terminal panel when AI creates terminals
  - `open-terminal-panel`: Opens terminal panel from mini terminal view
  - `navigate-to-message`: Navigates to specific message in conversation
  - `find-message-chat`: Finds chat containing a specific message
  - `close-activity-panel`: Closes activity panel programmatically
- **Panel Management**: Intelligent panel state management with mutual exclusivity
  - Opening one panel automatically closes conflicting panels
  - Prevents UI clutter with smart panel switching
  - Maintains clean workspace with focused panel display

**Why This Matters**: Context providers eliminate prop drilling, improve performance through memoization, and provide a single source of truth for theme and settings. The enhanced navigation system makes it easy to jump between activity logs and related conversations, while token tracking provides transparency into API usage and costs.

</details>

<details>
<summary><strong>File Explorer Panel Simplification</strong></summary>

**UI Cleanup**: Removed placeholder tabs from FileExplorerPanel to streamline the interface and reduce clutter.

- **Removed Tabs**: Links, Memories, and Bookmarks placeholder tabs removed from FileExplorerPanel
- **Simplified Navigation**: Panel now focuses on core file management features:
  - **Recent**: Recently accessed files with search and filtering
  - **Images**: Image gallery with grid/list views
  - **Disk**: Disk usage monitoring and visualization
  - **Analysis**: Storage analysis by category
  - **Cleanup**: Cleanup suggestions for reclaiming space
- **Cleaner Interface**: Reduced tab count improves usability and reduces visual noise
- **No Feature Loss**: Bookmarks functionality remains available in the separate FilesPanel component
- **Performance**: Fewer tabs means faster rendering and lower memory footprint

**Technical Changes**:
- Removed `BookmarksTab`, `LinksTab`, and `MemoriesTab` imports and components
- Updated `TabId` type to exclude removed tabs
- Simplified tab array in `useMemo` hook
- Removed unused Lucide icons: `Link2`, `Brain`, `Bookmark`

**Why This Matters**: A focused file explorer with clear purpose improves user experience. Placeholder tabs that showed "coming soon" messages created confusion and cluttered the interface. Users can still access bookmarks through the dedicated FilesPanel.

</details>

<details>
<summary><strong>Backend Status Monitoring Component</strong></summary>

**New UI Component**: Real-time backend health monitoring with automatic status checks and user-friendly error guidance.

- **BackendStatusIndicator Component**: Displays backend connection status with smart visibility (`components/ui/BackendStatusIndicator.tsx`)
  - **Automatic Health Checks**: Polls backend health endpoint every 30 seconds
  - **Smart Display Logic**: Only shows when backend is offline or checking (silent when online for clean UI)
  - **Visual Status States**:
    - **Checking**: Yellow pulsing alert icon with "Checking backend status..." message
    - **Offline**: Red warning banner with clear error message and actionable instructions
    - **Online**: No indicator shown (silent success)
  - **User-Friendly Error Handling**:
    - Clear impact explanation: "Vision/OCR won't work"
    - Inline code snippet with fix instructions: `cd backend && cargo run`
    - Manual retry button for immediate status recheck
  - **Timeout Protection**: 2-second timeout prevents hanging on unresponsive backend
  - **Responsive Design**: Glassmorphic styling consistent with design system
  - **Flexible Integration**: Optional `className` prop for custom positioning

**Usage Example**:
```tsx
import { BackendStatusIndicator } from './components/ui/BackendStatusIndicator';

// Place anywhere in your UI
<BackendStatusIndicator className="mb-4" />

// Component automatically:
// - Checks backend health on mount
// - Polls every 30 seconds
// - Shows/hides based on status
// - Provides retry functionality
```

**Technical Implementation**:
- React functional component with hooks (`useState`, `useEffect`)
- Fetch API with `AbortSignal.timeout(2000)` for request timeout
- Health endpoint: `http://localhost:3001/api/v1/health`
- Automatic cleanup with `clearInterval` on unmount
- Lucide React icons: `AlertCircle`, `CheckCircle`, `XCircle`

**Why This Matters**: Users immediately know when backend-dependent features (vision/OCR, file search, agent tools) won't work, with clear guidance on how to fix it. No more confusion about why features aren't working.

</details>

<details>
<summary><strong>Vision & Image Analysis Support</strong></summary>

**Multi-Modal AI Capability**: Skhoot supports image attachments for visual analysis with all major AI providers in both Normal Mode and Agent Mode. The vision system is fully operational with proper image passing, provider-specific formatting, and enhanced system prompts that prevent "I cannot process images" responses.

- **Message Type Enhancement**: Both `AIMessage` and `AgentChatMessage` interfaces support image attachments
  - `images` field: `Array<{ fileName: string; base64: string; mimeType: string }>`
  - Multiple images per message supported
  - Automatic MIME type detection for proper API formatting
  - Seamless integration with conversation history and message editing
  - **Full Agent Mode Support**: Images properly passed through agent chat service for vision-capable models
    - Vision capabilities automatically added to agent system prompt for supported models
    - Images included in tool calling context for enhanced agent decision-making
    - Works seamlessly with all agent tools (shell, file operations, search, etc.)
    - Provider-specific image formatting handled automatically (OpenAI, Google, Anthropic)
    - History converters preserve images across conversation turns
- **Multi-Provider Vision Support**: 
  - **OpenAI**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-4 Vision Preview
    - Uses `image_url` content type with base64 data URLs
    - High-detail mode enabled for better OCR and analysis
    - Supports multiple images in a single message
    - Works in both Normal and Agent modes
  - **Google Gemini**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
    - Uses `inlineData` format with MIME type and base64 data
    - Native multi-modal support for text + images
    - Optimized for visual understanding and OCR
    - Works in both Normal and Agent modes
  - **Anthropic Claude**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
    - Uses `image` content type with base64 source
    - Proper media type specification for each image format
    - Advanced vision capabilities for document analysis
    - Works in both Normal and Agent modes
  - **Custom Endpoints**: OpenAI-compatible vision API support
    - Falls back to standard format for maximum compatibility
    - Automatic detection of vision capability support
- **Image Format Support**: 
  - JPG/JPEG: `image/jpeg`
  - PNG: `image/png`
  - GIF: `image/gif`
  - BMP: `image/bmp`
  - WebP: `image/webp`
- **Use Cases**:
  - Extract text from screenshots and documents (OCR) in both Normal and Agent modes
  - Analyze code in images or diagrams with agent tool integration
  - Understand visual content and provide descriptions
  - Process scanned documents and handwritten notes
  - Identify objects, scenes, and patterns in photos
  - Compare multiple images side-by-side
  - **Agent Mode**: Combine vision analysis with file operations, shell commands, and search tools for powerful workflows
- **Developer API**: 
  - Pass images via `chat()` method's optional `images` parameter in both `aiService` and `agentChatService`
  - Automatic conversion to provider-specific formats
  - Status updates: "Analyzing X image(s) with [Provider]..."
  - **Agent Mode**: Images passed via `AgentChatOptions.images` parameter in `executeWithTools()`
  - **Dual Loading Strategy**: Desktop app uses Tauri's native file API for optimal performance, web version uses backend endpoint
  - **Vision System Prompt**: Vision-capable models automatically receive enhanced system instructions
    - Automatic detection of vision support based on model name
    - Clear instructions: "You CAN see and analyze images", "You have OCR capabilities"
    - Prevents "I cannot process images" responses from vision-capable models
    - Works across all providers (OpenAI, Google, Anthropic)
- **Technical Implementation**:
  - **Desktop (Tauri)**: Direct file system access via `@tauri-apps/plugin-fs` `readBinaryFile` API
  - **Web Fallback**: Backend `/api/v1/files/image` endpoint when Tauri unavailable
  - Automatic environment detection with `window.__TAURI__` check
  - Efficient Uint8Array to base64 conversion for minimal memory overhead
  - Graceful error handling with informative fallback messages
  - Seamless integration with existing conversation history
  - **Agent Mode Integration**: 
    - Images passed via `AgentChatOptions.images` parameter
    - Vision capabilities automatically added to agent system prompt for supported models
    - Provider-specific image formatting (OpenAI `image_url`, Google `inlineData`, Anthropic `image` source)
    - History converters preserve images across conversation turns
    - Status updates: "Analyzing X image(s) with [Provider]..."
  - Base64 encoding handled automatically by backend
  - Provider-specific message formatting in `aiService.ts` and `agentChatService.ts`
  - History preservation with image data across conversation turns
  - Proper error handling for unsupported formats or API failures

**Example Usage**:
```typescript
// Normal Mode - Vision API
const response = await aiService.chat(
  'What does this image show?',
  conversationHistory,
  onStatusUpdate,
  [{ fileName: 'screenshot.png', base64: '...', mimeType: 'image/png' }]
);

// Agent Mode - Vision with Tool Calling
const agentResponse = await agentChatService.executeWithTools(
  'Analyze this screenshot and extract any code you see',
  conversationHistory,
  {
    sessionId: 'session-123',
    provider: 'openai',
    model: 'gpt-4o',
    images: [{ fileName: 'code.png', base64: '...', mimeType: 'image/png' }],
    onStatusUpdate: (status) => console.log(status)
  }
);
```

</details>

<details>
<summary><strong>Message Editing & Regeneration Feature</strong></summary>

**Enhanced User Experience**: Users can now edit their sent messages and regenerate AI responses from any point in the conversation.

- **Inline Editing Interface**: Edit messages without leaving the conversation flow
  - Hover over any user message to reveal the edit button (pencil icon)
  - Click to enter edit mode with a textarea for content modification
  - Visual feedback with glassmorphic styling matching the design system
- **Keyboard Shortcuts**: 
  - **Ctrl+Enter**: Save edited message and regenerate conversation
  - **Escape**: Cancel editing and revert to original content
- **Action Buttons**: Clear save/cancel buttons with icons for intuitive interaction
  - Save button disabled when content is unchanged or empty
  - Cancel button restores original message content
- **Conversation Regeneration**: 
  - Editing a message removes all subsequent messages in the conversation
  - AI generates a fresh response based on the edited message
  - Conversation history up to the edited message is preserved
  - Works in both Normal Mode and Agent Mode
- **File Attachment Preservation**: 
  - File attachments from the original message are automatically preserved
  - File contents are reloaded and included in the regenerated conversation
  - Images are re-encoded for vision API support
  - Binary files are properly handled (skipped with informative notes)
- **State Management**: 
  - Local state tracks editing mode and edited content
  - Original message preserved until save is confirmed
  - Smooth transitions between display and edit modes
- **Accessibility**: 
  - Proper focus management when entering edit mode
  - Keyboard navigation support
  - Visual indicators for edit state
- **Integration**: 
  - `onRegenerateFromMessage` callback handles conversation regeneration
  - Compatible with existing message bubble styling and animations
  - Works seamlessly with file attachments, images, and agent mode

**Technical Implementation**: Enhanced `ChatInterface.tsx` with `handleRegenerateFromMessage` method that processes file attachments, manages conversation history, and triggers AI/agent response generation. Added `onRegenerateFromMessage` prop to `MainArea` and `MessageBubble` components.

</details>

<details>
<summary><strong>Provider Registry OCR Support</strong></summary>

**New Model Capability**: OCR (Optical Character Recognition) support added to provider registry for vision-capable models.

- **OCR Capability Detection**: New `ocr` field in `ModelCapabilities` interface tracks which models support text extraction from images
- **Vision-Enabled Models with OCR**:
  - **OpenAI**: GPT-4o, GPT-4o Mini, GPT-4 Turbo (all vision models)
  - **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
  - **Google AI**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
  - **Local Models**: Llama 3.2 (vision variant)
- **Automatic Capability Inference**: Provider registry intelligently detects OCR support based on model names and vision capabilities
- **Developer API**: Access OCR capability via `providerRegistry.getModelInfo(provider, model).capabilities.ocr`
- **Use Cases**: 
  - Extract text from screenshots, documents, and images
  - Analyze code in images or diagrams
  - Process scanned documents and handwritten notes
  - Read text from photos and visual content

**Technical Details**: OCR support is automatically enabled for all models with vision capabilities, allowing seamless text extraction from images alongside visual analysis.

</details>

<details>
<summary><strong>Agent Mode Integration (Phase 3 Complete)</strong></summary>

**Major Feature Release**: Full CLI agent mode with visual tool execution and monitoring capabilities.

- **Agent Core Module**: Complete Rust backend implementation (`backend/src/cli_agent/`)
  - Agent state machine with session management
  - 5 tool definitions: `shell`, `read_file`, `write_file`, `list_directory`, `search_files`
  - System prompts ported from codex-main behavior
  - Direct tool execution via `tokio::process::Command`
  - 21 passing unit tests
- **Tauri Commands**: 10 agent commands for frontend-backend communication
  - Session lifecycle: `create_agent_session`, `close_agent_session`, `list_agent_sessions`
  - Messaging: `send_agent_message`, `add_assistant_message`, `get_agent_messages`
  - Tool execution: `execute_agent_tool`, `cancel_agent_action`
  - Status: `get_agent_status`, `get_agent_config`
  - Event emitters: `tool_start`, `tool_complete`, `message`, `cancelled`
- **Agent Service**: Frontend TypeScript service (`services/agentService.ts`)
  - Complete session lifecycle management
  - Message sending with tool call support
  - Event listeners for agent actions (Tauri + DOM events)
  - Tool execution and cancellation
  - TypeScript interfaces for type safety
- **Agent Chat Service**: AI integration with tool calling (`services/agentChatService.ts`)
  - Multi-provider support: OpenAI, Google (Gemini), Anthropic
  - Tool execution loop with max 10 iterations
  - History conversion for each provider format
  - Streaming response handling (basic implementation)
- **Agent Log Terminal Tab**: Real-time monitoring interface (`components/terminal/AgentLogTab.tsx`)
  - Status indicators: launch, API key, terminal access, readiness
  - Real-time logging: tool calls, commands, responses, errors
  - Configuration panel: provider, model, message count, state
  - Auto-scroll with toggle, log filtering, JSON export
  - Glass morphism theme styling
- **Agent Mode Toggle**: Quick action button in chat interface
  - Cpu icon with ON/OFF state and visual indicator (green when active)
  - Auto-creates Agent Log tab when enabled
  - Routes messages to agent service vs normal AI service
  - Keyboard shortcut: Ctrl+Shift+A
  - Per-conversation preference persistence
- **Agent Action UI Components**: Rich visual rendering of tool executions
  - `AgentAction`: Tool call header with expandable content, loading/success/error states
  - `CommandExecution`: Command display with syntax highlighting, working directory, execution time, cancel button
  - `CommandOutput`: Stdout/stderr with ANSI colors, truncation with "Show more", copy button, line numbers
  - `FileOperation`: File path display, operation type, file preview, diff view for writes
  - Integrated into `MessageBubble` for seamless conversation rendering
- **File Reference Support**: Agent mode properly processes `@filename` references
  - File contents automatically loaded from backend
  - Complete file contents appended to message before sending to agent
  - Consistent behavior between normal AI mode and agent mode

**Technical Implementation**:
- Lightweight HashMap-based session storage in Tauri state
- DTOs for frontend communication: `AgentMessageDto`, `ToolCallDto`, `ToolResultDto`, `AgentStatusDto`
- Tool schemas for OpenAI, Anthropic, and Gemini formats
- Event-driven architecture with real-time updates
- Proper error handling and recovery throughout stack

**Status**: Tasks 3.1-3.8 complete. Remaining: Task 3.9 (test functions validation).

</details>

<details>
<summary><strong>File Attachment Modal Improvements</strong></summary>

- **Unified File Management Interface**: Streamlined modal with improved user experience
  - **Combined Files Tab**: Merged "Attached" and "Drop Files" tabs into single "Files" tab for simpler workflow
  - **Click-to-Browse**: Click anywhere in the drop zone to open native file picker dialog
  - **Multi-File Selection**: Select multiple files at once via file picker or drag & drop
  - **Smart Drop Zone**: 
    - Shows upload icon and instructions when empty
    - Displays attached files list when populated
    - Visual drop hint appears when dragging files over existing attachments
    - Click on files doesn't trigger file picker (event propagation stopped)
  - **Enhanced Drag & Drop**: Extended drop zone coverage across entire tab content area for easier file dropping
    - Drag events handled on both inner drop zone and outer tab content container
    - Consistent drag state management across all drop-enabled areas
    - Improved user experience with larger drop target area
  - **Tauri Native File Drop Support**: Desktop app now supports native file drop events via Tauri API
    - Listens for `tauri://drag-drop` events when modal is open on Files tab for file drops
    - Listens for `tauri://drag` events to detect drag hover state and show visual feedback
    - Automatically extracts full file paths from Tauri event payload
    - Seamless integration with existing drag & drop functionality
    - Proper cleanup of both event listeners on component unmount
    - Works alongside browser-based drag & drop for maximum compatibility
    - Visual drag state updates when files are dragged over the window
  - **Full Path Support**: Automatically extracts full file paths in Electron/Tauri environments
  - **File Input Reset**: Same file can be selected multiple times (input value cleared after selection)
  - **Improved Visual Feedback**: 
    - Emerald green theme for active states and attached files
    - Hover effects on drop zone border
    - Dynamic messaging based on drag state
  - **Two-Tab Layout**: Simplified to "Files" and "Search Files" tabs only
  - **Better UX**: Reduced cognitive load by eliminating redundant tab and combining related functionality
  - **Rich File Type Visualization**: Intelligent file type detection with color-coded icons and labels
    - **Images** (jpg, png, gif, svg, webp, etc.): Pink theme with Image icon
    - **Videos** (mp4, avi, mov, mkv, etc.): Pink theme with Video icon
    - **Audio** (mp3, wav, ogg, flac, etc.): Blue theme with Music icon
    - **Code Files** (js, ts, py, java, css, html, json, etc.): Cyan theme with FileCode icon
    - **Archives** (zip, rar, 7z, tar, gz, etc.): Orange theme with FileArchive icon
    - **Documents** (default): Emerald theme with FileText icon
    - Each file type has distinct background color, border color, text color, and icon for instant visual recognition
    - Improves file management workflow with at-a-glance file type identification

</details>

<details>
<summary><strong>File Reference Chips in Chat Input</strong></summary>

- **Visual File References**: File references now display as interactive chips above the chat input
  - **Color-Coded File Types**: Intelligent file type detection with distinct color themes for instant visual recognition
    - **Images** (jpg, png, gif, svg, webp, etc.): Pink theme with appropriate icon
    - **Videos** (mp4, avi, mov, mkv, etc.): Pink theme with video icon
    - **Audio** (mp3, wav, ogg, flac, etc.): Blue theme with music icon
    - **Code Files** (js, ts, py, java, css, html, json, etc.): Cyan theme with code icon
    - **Archives** (zip, rar, 7z, tar, gz, etc.): Orange theme with archive icon
    - **Documents** (default): Emerald theme with document icon
  - **Image Preview Thumbnails**: Image files display inline 16x16px thumbnails in file chips
    - Automatic Tauri `convertFileSrc` API integration for secure local file access
    - Graceful fallback to file type icon if image fails to load
    - Supports all common image formats (jpg, jpeg, png, gif, bmp, svg, webp, ico)
    - Rounded corners with object-cover for consistent appearance
    - Works seamlessly in both desktop (Tauri) and web environments
  - Dynamic file type icons from `getFileTypeInfo` utility for accurate representation
  - `@filename` format for clear visual identification
  - Truncated filename (max 100px) with full path on hover
  - Individual remove buttons (X) to delete specific references
  - Smooth fade-in/zoom animations when chips appear
  - Theme-aware hover effects with semi-transparent backgrounds
- **Event-Driven Architecture**: 
  - `add-file-reference` custom event for adding files from File Explorer
  - `chat-message-sent` event automatically clears all file references after sending
  - Global `__chatFileReferences` Map stores filename-to-path mappings for retrieval
- **Duplicate Prevention**: Adding the same file twice is automatically prevented
- **Seamless Integration**: Works with existing file reference loading system for AI context

</details>

<details>
<summary><strong>Agent Mode File Reference Support</strong></summary>

- **Bug Fix**: Agent mode now properly processes file references (`@filename`) in messages
- **File Content Loading**: When using agent mode with file references:
  - File contents are automatically loaded from backend via `/api/v1/files/read`
  - Complete file contents appended to message before sending to agent
  - Enables agent to access and analyze referenced files during tool execution
  - Works seamlessly with agent's tool calling capabilities
- **Consistent Behavior**: File references now work identically in both normal AI mode and agent mode
- **Technical Details**: Changed from `messageText` to `processedMessage` in `agentChatService.executeWithTools()` call

</details>

<details>
<summary><strong>Message Editing with File Attachments</strong></summary>

- **Enhanced Message Editing**: When editing messages with attached files, the file contents are now automatically reloaded and included in the regenerated conversation
- **File Content Preservation**: 
  - All attached files from the original message are processed when editing
  - File contents are read from backend via `/api/v1/files/read` endpoint
  - Complete file contents appended to edited message for AI context
  - Structured format with clear file boundaries: `--- File: filename (path) ---`
- **Smart Binary File Handling**: 
  - **Automatic Detection**: Intelligently identifies binary files (images, PDFs, archives, executables) by file extension
  - **Skip Binary Content**: Binary files are not read as text, preventing encoding errors and corrupted data
  - **Clear Notifications**: Users receive informative messages like `[Note: image.png is a binary file (image/PDF/archive) and cannot be read as text]`
  - **Supported Binary Types**: 
    - Images: jpg, jpeg, png, gif, bmp, webp, ico
    - Documents: pdf
    - Archives: zip, rar, 7z, tar, gz
    - Executables: exe, dll, so, dylib
  - **Text File Processing**: Only text-based files (code, documents, configs) have their contents loaded for AI context
- **Image Attachment Support**: 
  - **Vision API Integration**: Image files are automatically converted to base64 format for vision-capable AI models
  - **Multi-Format Support**: Handles all common image formats (jpg, jpeg, png, gif, bmp, webp)
  - **Dual Loading Strategy**: 
    - **Desktop (Tauri)**: Uses native `@tauri-apps/plugin-fs` `readBinaryFile` API for direct file system access
    - **Web Fallback**: Falls back to backend `/api/v1/files/image` endpoint when Tauri is unavailable
    - Automatic environment detection ensures optimal performance in both contexts
  - **MIME Type Detection**: Proper MIME type assignment for each image format
  - **Efficient Encoding**: Direct Uint8Array to base64 conversion for minimal overhead
  - **Structured Data**: Returns `{ fileName, base64, mimeType }` for each image
  - **Error Handling**: Graceful fallback with informative notes if image loading fails
  - **Prepared for Vision Models**: Base64 image data ready for OpenAI GPT-4 Vision, Google Gemini Vision, Claude 3 Vision, etc.
- **Seamless Regeneration**: 
  - Edited messages trigger conversation regeneration from that point
  - File attachments are preserved and their contents reloaded automatically
  - AI receives both the edited message text and all attached file contents
  - Works with multiple file attachments simultaneously (text + images)
- **Error Handling**: 
  - Graceful handling of missing or unreadable files
  - Clear error messages in file content placeholders
  - Console logging for debugging file loading issues
- **User Experience**: 
  - No manual re-attachment needed when editing messages
  - File context automatically maintained across edits
  - Consistent behavior with initial message sending
  - Binary files listed but not processed, avoiding errors
  - Images prepared for vision AI analysis
- **Technical Implementation**: 
  - Processes `editedMessage.attachedFiles` array before regeneration
  - Helper functions `isImageFile()`, `isBinaryFile()`, and `getMimeType()` for type detection
  - Appends file header with list of attached filenames
  - Includes full file contents in structured format for text files only
  - Converts images to base64 with proper MIME types for vision APIs
  - Updates search type based on edited content
  - Returns structured data: `{ fileContents, attachedFileNames, imageFiles }`

</details>

<details>
<summary><strong>File Operations Service</strong></summary>

- **New File Operations Service**: Comprehensive file management API for common file operations (`services/fileOperations.ts`)
- **Backend Integration**: All operations communicate with Rust backend REST API at `http://localhost:3001/api/v1`
- **Supported Operations**:
  - **Open**: Launch files with default system application
  - **Reveal**: Open file explorer and select the file (Windows Explorer, macOS Finder, Linux file managers)
  - **Properties**: Display native file properties dialog with metadata
  - **Open With**: Show system "Open with" application picker
  - **Delete**: Remove files with backend confirmation
  - **Compress**: Create ZIP archives from files or folders
  - **Get Info**: Retrieve file metadata (name, type, size, modified date)
- **Cross-Platform**: Consistent behavior across Windows, macOS, and Linux
- **Error Handling**: Graceful error handling with detailed console logging
- **Simple API**: Promise-based methods with boolean or object return values
- **Usage**: Import and call methods directly: `await fileOperations.open(path)`

</details>

<details>
<summary><strong>File Explorer Context Menu & File References</strong></summary>

- **Streamlined Context Menu**: Right-click or use the "more" button on any file in the File Explorer panel for essential actions
  - **Show in folder**: Reveal and select file in system file explorer
  - **Open with...**: Launch file with system application picker
  - **Delete**: Remove file via backend API with confirmation dialog
- **File Reference Support**: Use `@filename` syntax in chat to reference files for AI context
  - **File Content Loading**: When you send a message with `@filename` references:
    - Backend automatically reads the file content via `/api/v1/files/read` endpoint
    - File contents are appended to your message in a structured format
    - AI receives both your message and the complete file contents for context
    - Works in both normal AI mode and agent mode
    - Original message displayed in chat UI (without file contents for readability)
    - Full message with file contents sent to AI/agent for processing
  - Console logging for debugging: `[ChatInterface] Loaded file content for @filename`
- **Backend API Integration**: File actions use backend endpoints for reliable cross-platform support
  - `/api/v1/files/delete` - Delete files
  - `/api/v1/files/info` - Get file properties
  - `/api/v1/files/compress` - Create ZIP archives
  - `/api/v1/files/read` - Read file contents for AI context (used with `@filename` syntax)
- **Graceful Fallbacks**: All actions provide helpful clipboard + instructions fallback when APIs unavailable
- **Glassmorphic Design**: Context menu follows the embossed glassmorphic design system with smooth animations
- **Smart Positioning**: Menu automatically adjusts position to stay within viewport bounds
- **Keyboard & Mouse**: Supports both right-click context menu and click-based dropdown via more button

</details>

<details>
<summary><strong>Secure API Key Management Service</strong></summary>

- **New API Key Service**: Comprehensive secure API key management system (`services/apiKeyService.ts`)
  - **Multi-Provider Support**: Manage keys for OpenAI, Anthropic, Google AI, and custom endpoints
  - **Encrypted Storage**: All keys encrypted with AES-256-GCM before storage via Tauri backend
  - **Platform Keychain Integration**: Encryption keys stored in OS-specific secure storage
    - Linux: libsecret
    - macOS: Keychain Services  
    - Windows: Credential Manager
  - **Smart Caching**: 5-minute TTL cache for improved performance with automatic invalidation
  - **Key Operations**: Complete CRUD operations (save, load, delete, list)
  - **Provider Management**: Active provider tracking and switching
  - **Key Validation**: Test API keys and fetch available models before saving
  - **Security First**: Keys never exposed in logs or error messages
  - **TypeScript Interfaces**: Full type safety with `APIProvider` and `ProviderInfo` types
  - **Singleton Pattern**: Single service instance for consistent state management
- **AI Settings Panel Integration**: Comprehensive AI settings panel uses `apiKeyService` for secure key management
  - Provider selection UI with support for OpenAI, Anthropic, Google AI, and custom endpoints
  - Real-time API key validation with model fetching
  - Automatic key loading when switching providers
  - Model persistence: selected model is saved alongside API key and restored on provider switch
  - Visual feedback for connection status and save operations
  - Seamless integration with existing settings workflow
  - Replaces deprecated `apiKeyStore` with improved architecture
- **Backend Integration**: Tauri commands bridge frontend service to Rust backend
  - `save_api_key`: Securely store encrypted API keys
  - `load_api_key`: Retrieve and decrypt stored keys
  - `delete_api_key`: Remove keys from secure storage
  - `list_providers`: Get all configured providers
  - `get_active_provider`: Retrieve currently active provider
  - `set_active_provider`: Switch between providers
  - `test_api_key`: Validate keys and fetch model lists
  - `fetch_provider_models`: Get available models for stored keys
- **Developer Experience**:
  - Clean API with async/await pattern
  - Comprehensive error handling with descriptive messages
  - Console logging for debugging and monitoring
  - Cache management utilities
  - Provider info lookup helpers

</details>

<details>
<summary><strong>Button System Enhancement</strong></summary>

- **New EditButton Component**: Specialized edit button with pencil icon for transcription and message editing
  - Built on IconButton primitive with glass variant styling
  - Responsive icon sizing based on button size (sm: 14px, md: 18px, lg: 22px)
  - Hover brightness effect for visual feedback
  - Full accessibility with aria-label and title attributes
  - Consistent with embossed glassmorphic design system
- **ToggleSwitch Component**: Reusable toggle switch with smooth animations and glassmorphic design
  - Smooth 300ms transitions for knob movement and color changes
  - Accent color when toggled, glass border when off
  - Full accessibility with `role="switch"` and `aria-checked` attributes
  - Disabled state with proper visual feedback and cursor handling
  - Customizable via className prop for flexible integration
  - Follows embossed glassmorphic design system with border and shadow effects
- **Enhanced Button System**: Comprehensive collection of specialized buttons (close, back, tab, save, upload, connection, toggle, edit, icon)
- **Consistent Design Language**: All buttons follow the same design principles with 300ms transitions and theme-aware styling

</details>

<details>
<summary><strong>Notification Testing Enhancement</strong></summary>

- **Bypass Filter System**: Test notifications now use a dedicated `sendDirectNotification` method that bypasses all filters (frequency limits, quiet hours, type toggles) to ensure reliable testing functionality
- **Improved Test Reliability**: Test notifications always work regardless of user settings, providing consistent feedback for notification configuration
- **Enhanced Debug Logging**: More detailed console output for test notification flow and error handling
- **Better Error Messages**: Clearer error reporting when test notifications fail, with specific guidance for desktop vs web environments

</details>

<details>
<summary><strong>Native Notifications Service Enhancement</strong></summary>

- **Robust Architecture**: Comprehensive notification service with dynamic Tauri plugin loading and graceful web fallbacks
- **Advanced Settings System**: Full-featured configuration with 6 main categories:
  - **General Controls**: Master enable/disable with automatic permission handling
  - **Type Management**: Individual controls for success, error, warning, and info notifications
  - **Sound System**: Volume control (0-100%), custom sound support, and per-type audio settings
  - **Display Options**: Duration (0-30s), position (4 corners), icons, actions, and grouping
  - **Frequency Control**: Rate limiting (1-20/min) with sliding window algorithm and quiet hours
  - **Priority System**: Low/normal/high priority levels affecting notification behavior
- **Smart Features**:
  - **Quiet Hours**: Overnight scheduling support (e.g., 22:00-08:00) with automatic detection
  - **Duplicate Prevention**: Tag-based deduplication and notification replacement
  - **Action Handling**: Context-aware default actions (retry, view details, fix now, open)
  - **Permission Flow**: Automatic OS permission requests with graceful degradation
- **Developer Experience**: 
  - **Debug Mode**: Comprehensive console logging for settings and state changes
  - **Test Interface**: Built-in test methods for all notification types
  - **Service State**: Debug info including Tauri availability and queue status
  - **Persistent Storage**: Automatic localStorage with settings migration support
- **Cross-Platform Excellence**: Seamless operation across desktop (native) and web (fallback) environments

</details>

<details>
<summary><strong>Notification Panel Improvements</strong></summary>

- **Code Quality**: Fixed syntax errors in NotificationsPanel.tsx and improved component structure
- **Enhanced Test Interface**: Added missing error notification test button for complete coverage
- **UI Improvements**: Streamlined reset functionality and improved visual hierarchy
- **Type Safety**: Enhanced TypeScript type definitions and error handling

</details>

<details>
<summary><strong>Chat Interface Enhancements</strong></summary>

- **Native Notifications Integration**: Active integration for new conversation tracking with automatic title generation and metadata
- **Enhanced Error Handling**: Improved error messaging and user feedback
- **Performance Optimizations**: Streamlined message processing and state management

</details>

<details>
<summary><strong>Privacy & Security Panel</strong></summary>

- Email update with validation and confirmation workflow
- Secure password change with strong validation requirements
- One-click data export as JSON
- Privacy notice about data encryption
- Visual feedback with success/error states

</details>

<details>
<summary><strong>Help Center Panel</strong></summary>

- Comprehensive support hub for all user needs
- Quick documentation access
- Built-in support request and bug report forms
- Smooth sub-panel navigation
- Consistent design with shared components

</details>

<details>
<summary><strong>Appearance Settings</strong></summary>

- Dedicated panel for visual customization
- Theme selection (Light, Dark, System)
- UI opacity control (50-100%)
- Illumination settings with intensity and diffusion controls
- Per-theme persistence for illumination settings

</details>

<details>
<summary><strong>Enhanced Notification Settings Panel</strong></summary>

- **Complete Configuration Interface**: Fully redesigned notification settings panel with improved organization and user experience
- **General Settings**: Master enable/disable toggle with clear descriptions and visual feedback
- **Notification Type Controls**: Individual toggles for success (✅), error (❌), warning (⚠️), and info (ℹ️) notifications with descriptive labels
- **Advanced Sound Settings**: Enable/disable sounds with precise volume control (0-100% slider) and dynamic icon feedback
- **Display Customization**: 
  - Duration control (0-30 seconds, 0 for persistent notifications)
  - Position selection (top-right, top-left, bottom-right, bottom-left)
  - Action buttons and notification grouping options
- **Frequency Management**: 
  - Rate limiting with configurable max notifications per minute (1-20)
  - Quiet hours scheduling with intuitive time pickers
- **Priority System**: Individual priority levels (low/normal/high) for each notification type
- **Interactive Testing**: Enhanced test interface with all four notification types (success, error, warning, info) and live preview that bypasses all filters for reliable testing
- **Improved Reset Functionality**: Streamlined reset interface with better visual hierarchy
- **Responsive Design**: Consistent with embossed glassmorphic design system and improved component structure
- **Real-time Updates**: All settings apply immediately without requiring restart
- **Code Quality**: Fixed syntax errors and improved TypeScript type safety

</details>

<details>
<summary><strong>Audio & Voice Improvements</strong></summary>

- **Synthesis Visualizer**: Advanced voice-optimized audio visualization component (`components/ui/SynthesisVisualizer.tsx`)
  - **Multi-line Wave Rendering**: 9 layered frequencies create rich visual depth with dynamic spacing
  - **Voice-Optimized Response**: Enhanced amplitude range (0-48% of height) with power-based scaling for natural voice dynamics
  - **Real-time Frequency Harmonics**: Combines carrier waves, modulation, voice ripples, and harmonics for sophisticated audio representation
  - **Dynamic Visual Effects**: 
    - Glow intensity responds to voice peaks and volume changes (up to 40px blur)
    - Smooth breathing animation during idle states (0.8-1.0 scale)
    - Foreground highlight layer with screen blend mode for peak emphasis
  - **Performance Optimized**:
    - Canvas-based rendering with device pixel ratio support for crisp visuals
    - Adaptive frame rate with requestAnimationFrame
    - Efficient smoothing algorithm (0.25 listening, 0.12 idle) for responsive yet stable animation
    - ResizeObserver for automatic canvas scaling
  - **Customization**:
    - Theme-aware styling (white in dark mode, customizable in light mode)
    - Configurable line color via props
    - Sharp envelope windowing (power 3.0) for crisp edge definition
  - **Audio Integration**: Seamlessly integrates with `useAudioAnalyzer` hook for real-time volume data
  - **Usage**:
    ```tsx
    import SynthesisVisualizer from './components/ui/SynthesisVisualizer';
    
    <SynthesisVisualizer 
      audioStream={mediaStream} 
      lineColor="rgba(99, 102, 241, 0.85)"
      isDarkMode={isDarkMode}
    />
    ```
- **Audio Analysis Hook**: New `useAudioAnalyzer` custom hook for real-time audio stream analysis (`components/library/useAudioAnalyzer.ts`)
  - Web Audio API integration with automatic context management
  - Real-time volume calculation using RMS (Root Mean Square) algorithm
  - Frequency domain analysis with configurable FFT size (2048) and smoothing (0.8)
  - Automatic cleanup and resource management on stream changes
  - Returns normalized volume values (0-1 range) with amplification
  - Error handling with graceful fallbacks
  - Usage: `const { getVolume } = useAudioAnalyzer(audioStream)`
- **Voice Transcript Editing**: Users can now edit voice transcriptions before sending via the edit button on pending voice messages
  - `editVoiceTranscript` method in `useVoiceRecording` hook enables transcript modification
  - `onEditVoice` prop passed to `RecordButton` component for UI integration
  - Seamless editing workflow with visual feedback
- Unified voice recording architecture with centralized audio service
- Enhanced audio service API with input stream management
- Tauri microphone permission handling with platform-specific guidance
- Voice input error recovery with auto-restart
- Linux audio setup service with PolicyKit integration
- Smarter audio settings loading with lazy permission requests

</details>

<details>
<summary><strong>File Search Enhancements</strong></summary>

- Rich search metadata display
- Collapsible results with pagination
- AI-powered suggestions with contextual reasoning
- Performance metrics and error handling
- Custom search path support
- **Improved Relevance Scoring Fallback**: Enhanced fallback scoring when AI scoring is unavailable
  - Utilizes backend scores when available (converted from 0-1 to 0-100 scale)
  - Tiered keyword matching with intelligent score assignment:
    - Exact name match: 95 points (filename equals or starts with keyword)
    - Name contains keyword: 85 points
    - Path contains keyword: 70 points
    - General keyword match: 50 points
  - Results filtered to show only relevant files (score ≥ 50)
  - Sorted by relevance score for better result ordering
- **Enhanced File Reveal**: "Open Folder" button reveals and selects files in the system file explorer with comprehensive error handling
  - **Cross-Platform Support**:
    - Windows: Uses `explorer /select,"path"` to open folder with file selected
    - macOS: Uses `open -R` to reveal file in Finder
    - Linux: Tries `nautilus --select` first, falls back to `xdg-open` for parent folder
  - **Detailed Result Types**: Returns structured `RevealResult` with success status, error codes, messages, and method used
  - **Error Handling**: Specific error messages for common issues:
    - `file_not_found`: File may have been moved or deleted
    - `permission_denied`: Access denied to file location
    - `no_method_available`: Backend not running, path copied to clipboard as fallback
  - **Graceful Fallback Chain**: Backend API → Tauri shell plugin → Clipboard copy with user guidance
  - **Backend API**: `/api/v1/files/reveal` endpoint provides best cross-platform support
- **File Explorer Panel Integration**: Click on file paths in the File Explorer panel to reveal files in system explorer
  - Works in both list and grid view modes
  - Falls back to copying path to clipboard if reveal fails

</details>

<details>
<summary><strong>File Operations Service</strong></summary>

- **New File Operations Service**: Comprehensive file management system (`services/fileOperations.ts`)
  - **Backend API Integration**: All operations communicate with backend REST API (`http://localhost:3001/api/v1`)
  - **File Actions**:
    - `open(filePath)`: Open file with default system application
    - `reveal(filePath)`: Reveal and select file in system file explorer
    - `showProperties(filePath)`: Display file properties dialog (Windows/macOS/Linux)
    - `openWith(filePath)`: Show "Open with" application picker dialog
    - `delete(filePath)`: Delete file with backend confirmation
    - `compress(filePath)`: Create ZIP archive of file or folder
    - `getInfo(filePath)`: Retrieve file metadata (name, type, size, modified date)
  - **Cross-Platform Support**: Works consistently across Windows, macOS, and Linux
  - **Error Handling**: Graceful error handling with console logging for debugging
  - **Return Values**: All methods return success status, compress returns `{ success, zipPath }`
  - **Usage Example**:
    ```typescript
    import { fileOperations } from './services/fileOperations';
    
    // Open file with default app
    const opened = await fileOperations.open('/path/to/file.txt');
    
    // Reveal in file explorer
    const revealed = await fileOperations.reveal('/path/to/file.txt');
    
    // Show properties dialog
    const shown = await fileOperations.showProperties('/path/to/file.txt');
    
    // Compress to ZIP
    const result = await fileOperations.compress('/path/to/folder');
    if (result.success) {
      console.log('Created:', result.zipPath);
    }
    
    // Get file info
    const info = await fileOperations.getInfo('/path/to/file.txt');
    console.log('Size:', info.size, 'Modified:', info.modified);
    ```
  - **Backend Endpoints**:
    - `POST /api/v1/files/open` - Open file with default application
    - `POST /api/v1/files/reveal` - Reveal file in system explorer
    - `POST /api/v1/files/properties` - Show file properties dialog
    - `POST /api/v1/files/open-with` - Open "Open with" dialog
    - `POST /api/v1/files/delete` - Delete file
    - `POST /api/v1/files/compress` - Create ZIP archive
    - `GET /api/v1/files/info?path=...` - Get file information

</details>

<details>
<summary><strong>UI/UX Improvements</strong></summary>

- Quick action toggle behavior (click to deactivate)
- Dynamic quick action illumination with position-aware glow
- Tailwind-based action colors with dark mode support
- 50 unique prompts per action type
- Branding toggle with localStorage persistence
- **Animated Logo Background**: Enhanced empty state logo with smooth floating animation and interactive hover effects
  - **Floating Animation**: Continuous 3-second ease-in-out vertical float (12px range) for subtle, engaging motion
  - **Hover Scale Pulse**: Interactive scale pulse animation (1.0 to 1.08) synchronized with float on hover
  - **Smooth Transitions**: 300ms ease-out transforms for responsive hover feedback
  - **Exit Animation**: Maintains existing rotate + scale exit transition (600ms cubic-bezier)
  - **Performance Optimized**: CSS keyframe animations with GPU acceleration
  - **Theme Aware**: Consistent with glassmorphic design system and dark mode support
- **Portal-Based Rendering**: UI components that need to escape parent stacking contexts now render via React portals to `document.body`:
  - **Sidebar**: Navigation sidebar renders via portal for reliable z-index stacking above all content
  - **SecondaryPanel**: Floating panels (terminal, file explorer, workflows) prevent parent overflow clipping issues
- **GlareCard Component**: Interactive card component with mouse-following glare effect (`components/ui/GlareCard.tsx`)
  - **Pure CSS Implementation**: No external dependencies, uses native CSS and canvas for effects
  - **Mouse-Following Glare**: Radial gradient spotlight follows cursor position with smooth transitions
  - **Customizable Appearance**:
    - `glareColor`: Custom glare color (default: `rgba(255, 255, 255, 0.6)`)
    - `glareOpacity`: Opacity when hovering (default: 0.3)
    - `className`: Additional CSS classes for styling
  - **Smooth Animations**: 300ms ease-out transitions for hover states
  - **Performance Optimized**: Memoized component with useCallback hooks for event handlers
  - **Layered Rendering**: Glare overlay on separate layer (z-index 1) with content above (z-index 2)
  - **Responsive**: Calculates cursor position relative to card bounds for accurate tracking
  - **Usage**:
    ```tsx
    import { GlareCard } from './components/ui';
    
    // Basic usage
    <GlareCard>
      <div>Your content here</div>
    </GlareCard>
    
    // Custom glare color and opacity
    <GlareCard 
      glareColor="rgba(168, 85, 247, 0.4)"
      glareOpacity={0.5}
      className="rounded-2xl p-6"
    >
      <div>Premium content with purple glare</div>
    </GlareCard>
    ```
  - **Use Cases**: Logo backgrounds, feature cards, premium content highlights, interactive UI elements
- **SplittingText Component**: Advanced text animation component with typewriter effect and staggered slide-in animations (`components/ui/SplittingText.tsx`)
  - **Typewriter Effect on Mount**: Characters appear sequentially with configurable speed (default: 50ms per character)
    - Animated cursor (|) pulses during typing and disappears when complete
    - Enable/disable via `typewriter` prop (default: true)
    - Customize speed with `typewriterSpeed` prop (milliseconds per character)
  - **Character & Word Splitting**: Split text into individual characters or words for granular animation control
  - **Hover-Triggered Animation**: Smooth slide-in effect from right (150px) with staggered delays on hover (only after typewriter completes)
  - **Customizable Timing**: 
    - Characters: 0.05s delay per item for rapid sequential animation
    - Words: 0.2s delay per item for dramatic effect
  - **Smooth Easing**: Uses cubic-bezier(0.16, 1, 0.3, 1) for natural, elastic motion
  - **Performance Optimized**: Memoized component with useMemo for split calculations and efficient state management
  - **Flexible Styling**: Accepts className and style props for custom appearance
  - **Inline Styles**: Self-contained CSS-in-JS for zero external dependencies
  - **Usage**:
    ```tsx
    import { SplittingText } from './components/ui/SplittingText';
    
    // Character-based animation with typewriter (default)
    <SplittingText text="Hello World" />
    
    // Faster typewriter speed
    <SplittingText 
      text="Quick typing" 
      typewriterSpeed={30}
    />
    
    // Disable typewriter, show all text immediately
    <SplittingText 
      text="Instant text" 
      typewriter={false}
    />
    
    // Word-based animation with typewriter
    <SplittingText 
      text="Welcome to Skhoot" 
      type="words"
      typewriterSpeed={100}
      className="text-2xl font-bold"
      style={{ color: '#6366f1' }}
    />
    ```

</details>

<details>
<summary><strong>Desktop Window Management</strong></summary>

- **Custom Window Controls**: The `useTauriWindow` hook provides comprehensive window management
- **Window Operations**: Close, minimize, drag, and eight-directional resizing with dedicated header buttons
- **Minimize Button**: Convenient minimize-to-taskbar functionality accessible from the header
- **Adaptive UI**: Dynamic corner radius based on window state (fullscreen, maximized, etc.)
- **Event Handling**: Proper cleanup of window event listeners and Tauri subscriptions
- **Cross-Platform**: Consistent behavior with graceful web fallbacks

```typescript
import { useTauriWindow } from './hooks/useTauriWindow';

const { handleClose, handleMinimize, handleDragMouseDown, handleResizeStart } = useTauriWindow();

// Use in your components
<button onClick={handleClose}>Close</button>
<button onClick={handleMinimize}>Minimize</button>
<div onMouseDown={handleDragMouseDown}>Draggable Area</div>
```

</details>

<details>
<summary><strong>Backend & Integration</strong></summary>

- Advanced Rust-based file search engine
- AI-powered search suggestions and intent detection
- TypeScript interfaces for frontend-backend communication
- Hybrid search combining fuzzy matching with CLI tools
- Tauri desktop integration with cross-platform builds

</details>

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the design system guidelines
4. Test in multiple browsers
5. Submit a pull request

---

## 📄 License

This project is private and proprietary.

---

## 📄 Version

v0.2.1 - Enhanced Architecture & Context Management

**Major Features:**
- Full CLI agent mode with visual tool execution
- Agent Log terminal tab for real-time monitoring
- Multi-provider tool calling support (OpenAI, Anthropic, Google AI)
- 5 agent tools: shell, read_file, write_file, list_directory, search_files
- Rich UI components for agent actions and command output
- Theme and settings context providers for centralized state management
- Enhanced token tracking with conversation-level monitoring

---

## 🆘 Support

- Check the built-in Help Center in Settings
- Review [EMBOSSED_STYLE_GUIDE.md](./documentation/EMBOSSED_STYLE_GUIDE.md) for design questions
- Use browser console demos for testing features
