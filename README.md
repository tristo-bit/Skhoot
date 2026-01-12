<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://i.imgur.com/ZvKMfME.jpeg" />

<br />
<br />

[![Star on GitHub](https://img.shields.io/github/stars/tristo-bit/skhoot?style=social)](https://github.com/tristo-bit/skhoot/stargazers)
[![Fork on GitHub](https://img.shields.io/github/forks/tristo-bit/skhoot?style=social)](https://github.com/tristo-bit/skhoot/network/members)
[![Watch on GitHub](https://img.shields.io/github/watchers/tristo-bit/skhoot?style=social)](https://github.com/tristo-bit/skhoot/watchers)

<br />

**An intelligent desktop assistant for file search, conversation management, and workspace organization.**

Built with React • TypeScript • Tauri • Rust • Tailwind CSS

</div>

---

## ✨ Features

<details>
<summary><strong>🔍 Advanced Search & Discovery</strong></summary>

- **Intelligent File Search**: Multi-engine file search with fuzzy matching, CLI integration, and AI-powered suggestions
- **Built-in Test Interface**: Interactive file search testing panel accessible via header search icon
- **Rich Search Results**: Comprehensive metadata including execution time, search mode, and result count
- **Hybrid Search Modes**: Combines Rust-based fuzzy search with CLI tools (ripgrep, fd)
- **AI Search Assistance**: Context-aware suggestions and intent detection with reasoning
- **Content Search**: Search inside files with snippet extraction and line number references
- **Performance Tracking**: Real-time search metrics and execution time display
- **Error Resilience**: Graceful fallback handling with informative error messages

</details>

<details>
<summary><strong>🎤 Voice Interface</strong></summary>

- **Voice Input**: Speak your queries naturally (Chrome, Edge, Safari)
- **Real-time Transcription**: See your speech converted to text in real-time
- **Audio Visualization**: Visual feedback with waveform display
- **Browser Compatibility**: Fallback text input for Opera and Firefox
- **Advanced Audio Service**: Full-featured audio management with device selection, volume control, and sensitivity settings
- **Microphone Testing**: Real-time audio level monitoring with waveform visualization
- **Device Hot-Swapping**: Automatic detection and handling of audio device changes
- **Linux Audio Setup**: Automatic detection and guided setup for Linux audio permissions

</details>

<details>
<summary><strong>💬 AI Chat Interface</strong></summary>

- **Conversational AI**: Powered by Google Gemini for natural interactions
- **Chat History**: Save and manage multiple conversation threads
- **Rich Responses**: Support for file lists, disk usage charts, and cleanup suggestions
- **Markdown Support**: Full markdown rendering in responses
- **File Search Integration**: AI automatically detects when file search is needed
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
  - **Display Customization**: Duration control (0-30s, 0=persistent), position selection (4 corners), icon display, action buttons, and notification grouping
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

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Rust** (for desktop builds and backend - [Install Rust](https://rustup.rs/))
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone and install
git clone <repository-url>
cd skhoot
npm install

# Configure API key
cp .env.example .env
# Edit .env: VITE_GEMINI_API_KEY=your_api_key_here

# Start the backend
cd backend
cargo build --release
cargo run --bin skhoot-backend
# Backend runs on http://localhost:3001

# Start development (in project root)
npm run dev          # Web version
npm run tauri:dev    # Desktop version
```

---

## 🛠️ Development

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
│   ├── ChatInterface.tsx
│   ├── FileSearchTest.tsx
│   └── SettingsPanel.tsx
├── services/            # API and data services
│   ├── notificationService.ts  # Native desktop notifications
│   ├── audioService.ts         # Audio management
│   ├── backendApi.ts          # Backend communication
│   └── gemini.ts              # AI integration
├── src/
│   ├── contexts/        # React contexts
│   └── constants.ts     # App constants
├── src-tauri/           # Tauri desktop configuration
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
<summary><strong>Button System Enhancement</strong></summary>

- **New SwitchToggle Component**: Reusable switch toggle with smooth animations and multiple size options (sm, md, lg)
- **Accessibility**: Full ARIA support with `role="switch"` and `aria-checked` attributes
- **Flexible Sizing**: Three size variants with responsive knob animations and positioning
- **Theme Integration**: Seamless light/dark mode support with accent color transitions
- **Disabled State**: Proper visual feedback and cursor handling for disabled toggles
- **Consistent Design**: Follows embossed glassmorphic design system with 300ms transitions

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
  - Icon display toggle for notification type indicators
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
- File location opening across platforms

</details>

<details>
<summary><strong>UI/UX Improvements</strong></summary>

- Quick action toggle behavior (click to deactivate)
- Dynamic quick action illumination with position-aware glow
- Tailwind-based action colors with dark mode support
- 50 unique prompts per action type
- Branding toggle with localStorage persistence

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

## 🆘 Support

- Check the built-in Help Center in Settings
- Review [EMBOSSED_STYLE_GUIDE.md](./documentation/EMBOSSED_STYLE_GUIDE.md) for design questions
- Use browser console demos for testing features
