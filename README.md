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
<summary><strong>🤖 CLI Agent Mode with Visual Tool Execution</strong></summary>

**The Core Innovation**: Unlike terminal-only CLI agents, Skhoot renders agent tool outputs with rich, interactive UI components.

- **Visual File Operations**: `list_directory` shows interactive file lists with icons, sizes, and click-to-open functionality
- **Rich Search Results**: `search_files` displays results with syntax highlighting, line numbers, and folder navigation
- **Code Rendering**: `read_file` shows syntax-highlighted code with copy buttons and markdown rendering
- **Terminal Integration**: `shell` commands display with ANSI color support and command history
- **Unrestricted System Access**: Agents can execute ANY system command - no sandbox, no limitations
- **File Context Loading**: Use `@filename` syntax to automatically load file contents for agent context
- **Parallel Tool Execution**: Multiple tools run concurrently for maximum performance
- **Interactive Results**: Click files to open, navigate folders visually, copy code with one click

**Why This Matters**: See what your agent is doing in real-time with visual feedback. No more scrolling through terminal text - interact with results directly.

</details>

<details>
<summary><strong>🔑 Multi-Provider API Key Management</strong></summary>

**Bring Your Own API Key**: No vendor lock-in, complete freedom to choose your AI provider.

- **Supported Providers**: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Google AI (Gemini), Custom Endpoints
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
- **Rich Responses**: Support for file lists, disk usage charts, and cleanup suggestions
- **Interactive File Paths**: Click on file paths in search results to open the containing folder
- **Markdown Support**: Full markdown rendering in responses
- **File Search Integration**: AI automatically detects when file search is needed
- **Multilingual Intent Detection**: Understands search commands in English and French
- **Smart Error Handling**: Specific error messages with actionable guidance
- **Native Notifications**: Active integration for chat events and AI responses with automatic conversation tracking (desktop only)

</details>

<details>
<summary><strong>🖥️ Desktop Window Management</strong></summary>

- **Custom Window Controls**: Native close, minimize, and resize functionality with dedicated header buttons
- **Minimize to Taskbar**: One-click minimize button in header for quick window management
- **Drag & Drop**: Click and drag window from any non-interactive area
- **Adaptive Corner Radius**: Automatically adjusts window corners based on fullscreen state
- **Resize Handles**: Eight-directional window resizing (North, South, East, West, and corners)
- **Cross-Platform**: Consistent behavior across Windows, macOS, and Linux
- **Graceful Fallback**: Seamless operation in web environments without Tauri APIs

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
- **Comprehensive Settings Panel**: Full-featured notification configuration interface with:
  - **General Controls**: Master enable/disable toggle for all notifications
  - **Notification Types**: Individual controls for success (✅), error (❌), warning (⚠️), and info (ℹ️) notifications
  - **Sound Management**: Enable/disable notification sounds with volume control slider (0-100%) and custom sound support
  - **Display Customization**: Duration control (0-30s, 0=persistent), position selection (4 corners), action buttons, and notification grouping
  - **Frequency Control**: Rate limiting with max notifications per minute (1-20) and quiet hours scheduling with overnight support
  - **Priority Settings**: Individual priority levels (low/normal/high) for each notification type affecting display behavior
  - **Test Interface**: Built-in test buttons for all notification types with real-time preview and debug logging (bypasses all filters for reliable testing)
  - **Reset Functionality**: One-click restore to default settings with confirmation
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
<summary><strong>⚙️ Settings & Privacy</strong></summary>

- **Audio Settings**: Configure microphone and speaker devices with real-time testing
- **Volume Controls**: Independent input/output volume adjustment
- **Sensitivity Settings**: Auto or manual microphone sensitivity configuration
- **Privacy Controls**: Manage account settings and data export
- **Activity Logging**: Track and review your interactions
- **Help Center**: Comprehensive support hub with documentation access

</details>

<details>
<summary><strong>🔐 Secure API Key Management</strong></summary>

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
│   │   └── api/            # REST API endpoints
│   └── Cargo.toml
├── components/          # React components
│   ├── shared/          # Reusable UI components
│   ├── library/         # Reusable hooks and utilities
│   │   └── useAudioAnalyzer.ts  # Audio stream analysis
│   ├── ChatInterface.tsx
│   ├── FileSearchTest.tsx
│   └── SettingsPanel.tsx
├── services/            # API and data services
│   ├── apiKeyService.ts        # Secure API key management
│   ├── diskService.ts          # System disk information
│   ├── notificationService.ts  # Native desktop notifications
│   ├── audioService.ts         # Audio management
│   ├── backendApi.ts          # Backend communication
│   └── gemini.ts              # AI integration
├── src/
│   ├── contexts/        # React contexts
│   └── constants.ts     # App constants
├── src-tauri/           # Tauri desktop configuration
│   └── src/
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
<summary><strong>File Reference Chips in Chat Input</strong></summary>

- **Visual File References**: File references now display as interactive chips above the chat input
  - Purple-styled chips with `@filename` format for clear visual identification
  - File icon and truncated filename (max 120px) with full path on hover
  - Individual remove buttons (X) to delete specific references
  - Smooth fade-in/zoom animations when chips appear
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

- **Rich Context Menu**: Right-click or use the "more" button on any file in the File Explorer panel for quick actions
  - **Add to chat**: Insert file reference into chat input for AI context (e.g., `@config.json`)
    - Simplified reference format: `@filename` (changed from `@file:filename` for cleaner syntax)
    - Automatically focuses chat textarea and appends file reference
    - Stores file path mapping in global registry for retrieval
    - Triggers React input event for proper state synchronization
    - **File Content Loading**: When you send a message with `@filename` references:
      - Backend automatically reads the file content via `/api/v1/files/read` endpoint
      - File contents are appended to your message in a structured format
      - AI receives both your message and the complete file contents for context
      - Works in both normal AI mode and agent mode
      - Original message displayed in chat UI (without file contents for readability)
      - Full message with file contents sent to AI/agent for processing
    - Console logging for debugging: `[ChatInterface] Loaded file content for @filename`
  - **Open**: Launch file with default system application (Tauri shell.open → backend API → clipboard fallback)
  - **Open Folder**: Reveal and select file in system file explorer
  - **Copy Path**: Copy full file path to clipboard
  - **Cut**: Copy path with cut simulation
  - **Compress**: Create ZIP archive via backend API with user-friendly fallback instructions
  - **Open With**: Copy path with instructions for manual "Open with" selection
  - **Properties**: View file properties via backend API (name, type, size, modified date)
  - **Delete**: Remove file via backend API with confirmation dialog
- **Backend API Integration**: File actions use backend endpoints for reliable cross-platform support
  - `/api/v1/files/delete` - Delete files
  - `/api/v1/files/info` - Get file properties
  - `/api/v1/files/compress` - Create ZIP archives
  - `/api/v1/files/read` - Read file contents for AI context
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
- **UserPanel Integration**: Settings panel now uses `apiKeyService` for secure key management
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
- **Enhanced Button System**: Comprehensive collection of specialized buttons (close, back, tab, save, upload, connection, premium, toggle, edit, icon)
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
- **Portal-Based Rendering**: UI components that need to escape parent stacking contexts now render via React portals to `document.body`:
  - **Sidebar**: Navigation sidebar renders via portal for reliable z-index stacking above all content
  - **SecondaryPanel**: Floating panels (terminal, file explorer, workflows) prevent parent overflow clipping issues

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

v0.0.1

---

## 🆘 Support

- Check the built-in Help Center in Settings
- Review [EMBOSSED_STYLE_GUIDE.md](./documentation/EMBOSSED_STYLE_GUIDE.md) for design questions
- Use browser console demos for testing features
