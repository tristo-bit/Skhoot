<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://i.imgur.com/ZvKMfME.jpeg" />
</div>

# Skhoot - Your Desktop AI Assistant

Skhoot is an intelligent desktop assistant that helps you find files, search conversations, analyze disk usage, and manage your digital workspace. Built with React, TypeScript, Tauri, and powered by Google's Gemini AI, it features a modern embossed glassmorphic design system and runs as both a web application and native desktop app.

View your app in AI Studio: https://ai.studio/apps/drive/1yPnxkAry7gQ3SPvIsRQW4eBCoYkV7iwP

## ✨ Features

### 🔍 Advanced Search & Discovery
- **Intelligent File Search**: Multi-engine file search with fuzzy matching, CLI integration, and AI-powered suggestions
- **Built-in Test Interface**: Interactive file search testing panel accessible via header search icon for debugging and validation
- **Rich Search Results**: Comprehensive search metadata including execution time, search mode, result count, and intelligent query suggestions
- **Hybrid Search Modes**: Combines Rust-based fuzzy search with CLI tools (ripgrep, fd) for optimal results
- **AI Search Assistance**: Context-aware search suggestions and intent detection with reasoning explanations
- **Content Search**: Search inside files with snippet extraction and line number references
- **Performance Tracking**: Real-time search performance metrics and execution time display
- **Error Resilience**: Graceful fallback handling with informative error messages
- **Agent Assistance**: Ask specialized agents for help with various tasks
- **Disk Analysis**: Analyze disk usage and identify large files
- **Smart Cleanup**: Get recommendations for files safe to remove

### 🎤 Voice Interface
- **Voice Input**: Speak your queries naturally (Chrome, Edge, Safari)
- **Real-time Transcription**: See your speech converted to text in real-time
- **Audio Visualization**: Visual feedback with waveform display
- **Browser Compatibility**: Fallback text input for Opera and Firefox
- **Advanced Audio Service**: Full-featured audio management with device selection, volume control, and sensitivity settings
- **Microphone Testing**: Real-time audio level monitoring with waveform visualization
- **Device Hot-Swapping**: Automatic detection and handling of audio device changes
- **Linux Audio Setup**: Automatic detection and guided setup for Linux audio permissions (audio group membership, PulseAudio/PipeWire)

### 💬 AI Chat Interface
- **Conversational AI**: Powered by Google Gemini for natural interactions
- **Chat History**: Save and manage multiple conversation threads
- **Rich Responses**: Support for file lists with enhanced search metadata, disk usage charts, and cleanup suggestions
- **Markdown Support**: Full markdown rendering in responses
- **File Search Integration**: AI automatically detects when file search is needed and provides intelligent suggestions with detailed search context
- **Search Result Enhancement**: File search results display comprehensive metadata including query details, execution time, search mode, and AI-generated suggestions for query refinement
- **Smart Error Handling**: Specific error messages for API key issues, quota limits, and network problems with actionable guidance

### 🎨 Modern Design System
- **Embossed Glassmorphism**: Tactile, interactive design with depth
- **Theme Support**: Light and dark mode with smooth transitions
- **Illumination Settings**: Customizable ambient lighting effects with per-theme intensity and diffusion controls
- **Branding Toggle**: Show or hide Skhoot branding elements (persisted to localStorage)
- **Responsive Layout**: Optimized for desktop use
- **Accessibility**: WCAG compliant with proper contrast and focus states

### ⚙️ Settings & Privacy
- **Audio Settings**: Configure microphone and speaker devices with real-time testing
- **Volume Controls**: Independent input/output volume adjustment
- **Sensitivity Settings**: Auto or manual microphone sensitivity configuration
- **Privacy Controls**: Manage account settings and data export
- **Activity Logging**: Track and review your interactions
- **Help Center**: Comprehensive support hub with documentation access, support request submission, and bug reporting

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Rust** (for desktop builds and backend search engine - [Install Rust](https://rustup.rs/))
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))
- **Backend Search Engine** (Rust-based file indexing and search service)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd skhoot
   npm install
   ```

2. **Configure your API key:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Gemini API key:
   # VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. **Set up the backend search engine:**
   ```bash
   # Install Rust if not already installed
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Build and start the backend
   cd backend
   cargo build --release
   cargo run --bin skhoot-backend
   # Backend will start on http://localhost:3001
   ```

4. **Start the development server:**
   
   **Web Version:**
   ```bash
   npm run dev          # Opens browser automatically
   npm run dev:no-open  # Starts server without opening browser
   ```
   
   **Desktop Version:**
   ```bash
   npm run tauri:dev
   ```

5. **Open your browser (web version only):**
   Navigate to `http://localhost:5173`

## 🛠️ Development

### Development Tools

**File Search Testing:**
- Use the search icon (🔍) in the header to access the built-in file search test interface
- Test backend connectivity, search queries, and AI suggestions
- Monitor search performance and debug issues in real-time
- Verify integration between frontend and Rust backend

**Available Scripts:**

**Backend Development:**
- `npm run backend:dev` - Start Rust backend search engine (runs `cargo run --bin skhoot-backend`)
- `npm run backend:build` - Build optimized backend
- `npm run backend:test` - Run backend tests
- `cargo run --bin skhoot-backend` - Start backend directly (from backend/ directory)

**Web Development:**
- `npm run dev` - Start web development server (opens browser automatically)
- `npm run dev:no-open` - Start web development server without opening browser
- `npm run dev:full` - Start both backend and frontend concurrently
- `npm run build` - Build web version for production
- `npm run preview` - Preview web production build

**Desktop Development:**
- `npm run tauri:dev` - Start desktop development with hot reload
- `npm run tauri:full` - Start both backend and Tauri dev server concurrently (recommended for full-stack development)
- `npm run tauri:build` - Build desktop app for current platform
- `npm run tauri:build:ubuntu` - Build desktop app for Ubuntu/Linux
- `npm run tauri` - Run Tauri CLI commands

### Project Structure
```
skhoot/
├── backend/             # Rust backend search engine
│   ├── src/            # Rust source code
│   │   ├── search_engine/  # File search implementation
│   │   ├── cli_engine/     # CLI tool integration
│   │   └── api/           # REST API endpoints
│   ├── examples/       # Usage examples
│   └── Cargo.toml     # Rust dependencies
├── components/          # React components
│   ├── shared/         # Reusable UI components
│   │   ├── TypewriterText.tsx  # Typewriter text animation
│   │   ├── GlassButton.tsx     # Glassmorphic button component
│   │   ├── Modal.tsx           # Modal dialog component
│   │   └── ...
│   ├── ChatInterface.tsx
│   ├── FileSearchTest.tsx  # File search testing interface
│   ├── SettingsPanel.tsx
│   └── ...
├── services/           # API and data services
│   └── backendApi.ts  # Backend API integration
├── src/
│   ├── contexts/       # React contexts (Theme, Settings, etc.)
│   └── constants.ts    # App constants and config
├── src-tauri/          # Tauri desktop app configuration
│   ├── src/           # Rust desktop code
│   ├── icons/         # Desktop app icons
│   └── tauri.conf.json # Tauri configuration
├── browser-test/       # Demo and testing utilities
└── public/            # Static assets
```

### Design System
Skhoot uses an **Embossed Glassmorphic Design System**. See [EMBOSSED_STYLE_GUIDE.md](./EMBOSSED_STYLE_GUIDE.md) for detailed guidelines on:
- Component styling patterns
- Color system and theming
- Interactive states and animations
- Accessibility considerations

## 🔍 File Search System

Skhoot includes a powerful Rust-based file search engine with multiple search modes and AI integration:

### Search Engines
- **Rust Fuzzy Search**: Ultra-fast fuzzy matching using nucleo-matcher
- **CLI Integration**: Leverages ripgrep, fd, find, and grep for comprehensive search
- **Hybrid Mode**: Combines multiple engines for optimal results
- **Auto Mode**: Intelligently selects the best engine for each query

### AI-Powered Features
- **Intent Detection**: Automatically detects when file search is needed from conversation context
- **Smart Suggestions**: Provides intelligent query refinements based on project context
- **Context Awareness**: Uses current file and recent activity to improve search results
- **Search History**: Learns from previous searches to enhance future suggestions

### API Integration
The frontend integrates with the backend search engine through comprehensive TypeScript interfaces:

```typescript
// Search for files with multiple engines
const results = await backendApi.searchFiles("config.json", 50);

// AI-powered file search with custom options
const aiResults = await backendApi.aiFileSearch("main.rs", {
  mode: 'hybrid',
  max_results: 50,
  search_path: '/path/to/project',  // Custom search directory
  file_types: 'rs,ts,js'
});

// Search inside file contents with custom options
const contentResults = await backendApi.searchContent("TODO", {
  case_sensitive: false,
  search_path: '/path/to/project',  // Custom search directory
  file_types: 'ts,js,rs'
});

// Get AI-powered search suggestions
const suggestions = await backendApi.getSearchSuggestions({
  prompt: "find the main configuration file",
  current_file: "src/main.ts",
  project_type: "typescript"
});

// Open file location in system file explorer
await backendApi.openFileLocation("/path/to/file.txt");

// Check if file search should be suggested
if (suggestions.should_suggest_file_search) {
  // Show file search UI with suggested queries
}
```

### Performance
- **Small projects** (< 1K files): ~10ms average search time
- **Medium projects** (1K-10K files): ~50ms average search time  
- **Large projects** (10K+ files): ~200ms average search time

## 🖥️ Desktop vs Web

Skhoot is available in two versions:

### 🌐 Web Version
- Runs in any modern browser
- Instant access, no installation required
- Full feature set with voice input support
- Perfect for quick access and testing

### 🖥️ Desktop Version (Tauri)
- Native desktop application
- Better performance and system integration
- Offline capabilities
- Native file system access with enhanced search performance
- **File Location Opening**: Click "Go" on search results to open file locations via backend API
- System tray integration
- Auto-updater support
- Direct integration with backend search engine
- **Linux Audio Setup**: Guided audio permission setup with PolicyKit integration for seamless microphone access

**Choose the version that best fits your workflow!**

## 🧪 Testing & Demo Features

### File Search Integration Testing

Skhoot includes a built-in **File Search Test Interface** accessible via the search icon (🔍) in the header. This testing panel allows developers and users to:

- **Test Backend Connectivity**: Check if the Rust backend search engine is running and accessible
- **Live File Search Testing**: Search for files using different query patterns and search modes
- **AI Suggestion Testing**: Test the AI-powered search suggestion system
- **Performance Monitoring**: View search execution times and result metadata
- **Debug Information**: Access detailed search results and error messages in the browser console

**To use the File Search Test Interface:**
1. Ensure the Rust backend is running: `npm run backend:dev` or `cd backend && cargo run --bin skhoot-backend`
2. Click the search icon (🔍) in the header
3. Test various search queries like "main", "*.rs", "config", etc.
4. Use the "Test AI Suggestion Detection" button to verify AI integration
5. Check browser console for detailed logs and debugging information

### Demo Commands

Open browser console and try these demo commands:
```javascript
// Show all available demo commands
skhootDemo.help()

// Demo intelligent file search
skhootDemo.searchFiles()

// Demo AI-powered search suggestions
skhootDemo.searchSuggestions()

// Demo agent assistance
skhootDemo.askAgent()

// Demo disk analysis
skhootDemo.analyzeDisk()

// Demo cleanup suggestions
skhootDemo.cleanup()

// Demo markdown rendering
skhootDemo.showMarkdown()
```

## 🌐 Browser Compatibility

| Feature | Chrome | Edge | Safari | Opera | Firefox |
|---------|--------|------|--------|-------|---------|
| Voice Input | ✅ Full | ✅ Full | ✅ Full | ⚠️ Fallback* | ❌ Limited |
| Core Features | ✅ | ✅ | ✅ | ✅ | ✅ |
| Glassmorphism | ✅ | ✅ | ✅ | ✅ | ✅ |

*Opera shows a text input prompt as fallback for voice input

## 🔧 Configuration

### Environment Variables
- `VITE_GEMINI_API_KEY` - Your Google Gemini API key (required)
- Backend runs on `http://localhost:3001` by default

### Customization
- Modify `src/constants.ts` for colors, themes, and action prompts
  - `ACTION_PROMPTS` - Customize placeholder prompts for each QuickAction mode
  - `ACTION_ACTIVE_COLORS` - Tailwind class mappings for active state colors (light/dark mode)
  - `QUICK_ACTIONS` - Configure action IDs, colors, `activeColorClass` (Tailwind classes), and default placeholders
- Update `EMBOSSED_STYLE_GUIDE.md` for design system changes
- Configure demo data in `browser-test/demo.ts`

## 📝 Recent Updates

### Privacy & Security Panel
- **Email Update**: Change account email with comprehensive validation (format checking, duplicate detection) and confirmation email workflow
- **Password Change**: Secure password update with strong validation requirements:
  - Minimum 8 characters
  - Must contain uppercase, lowercase, and number
  - Confirmation matching
  - Different from current password
- **Data Export**: One-click download of all user data (profile, conversations, settings) as JSON file with timestamped filename
- **Privacy Notice**: Informative section about data encryption and security practices
- **Visual Feedback**: Success/error states with clear messaging for all operations
- **Loading States**: Proper loading indicators during async operations

### Help Center Panel
- **Comprehensive Support Hub**: New `HelpCenterPanel` component provides a centralized location for all user support needs
- **Documentation Access**: Quick link to external documentation with clear visual guidance
- **Support Request System**: Built-in form for submitting support requests with 24-hour response commitment
- **Bug Reporting**: Dedicated bug report submission with detailed description fields and visual feedback
- **Sub-Panel Navigation**: Smooth navigation between main help center and specialized forms (bug reports, support requests)
- **Visual Feedback**: Loading states, success confirmations, and error handling for all form submissions
- **Consistent Design**: Uses shared components (`PanelHeader`, `SectionLabel`, `InfoBox`, `SubmitButton`) for unified styling

### Appearance Settings Panel
- **Dedicated Appearance Panel**: New `AppearancePanel` component consolidates all visual customization options in one organized settings section
- **Theme Selection**: Radio-button interface for choosing Light, Dark, or System theme with clear descriptions
- **UI Opacity Control**: Slider to adjust the glassmorphic opacity of the interface (50-100%)
- **Illumination Settings**: Full control over quick action illumination effects:
  - Enable/disable toggle for the glow effect on prompt area
  - Intensity slider (10-80%) for brightness control
  - Diffusion slider (20-100%) for light spread adjustment
  - Reset button to restore theme-specific defaults
  - Live preview hint when illumination is enabled
- **Dynamic Illumination Rendering**: Illumination values are calculated in real-time from settings:
  - Intensity controls the hex alpha values for gradient color stops
  - Diffusion controls the percentage positions of gradient stops for light spread
  - Theme-aware adjustments (darker backgrounds in dark mode)
- **Branding Toggle**: Show or hide the app logo and title in the interface
- **Per-Theme Persistence**: Illumination settings are saved separately for light and dark themes

```typescript
// Using illumination settings in components
import { useSettings } from './src/contexts/SettingsContext';

const { illumination, setIllumination, resetIllumination } = useSettings();

// Adjust intensity (affects gradient alpha values)
setIllumination({ intensity: 50 });

// Adjust diffusion (affects gradient spread)
setIllumination({ diffusion: 70 });

// Toggle illumination
setIllumination({ enabled: !illumination.enabled });

// Reset to theme defaults
resetIllumination('dark');
```

### Quick Action Toggle Behavior
- **Toggle Off Support**: Clicking an already-active quick action button now toggles it off, returning to the default state
- **Cleaner UX**: Users can now easily deactivate a mode by clicking the same button again, rather than having to clear the input

### Dynamic Quick Action Illumination
- **Position-Aware Glow Effect**: When a quick action button is selected, a radial gradient illumination emanates from that button's position at the top of the prompt panel
- **Settings-Driven Rendering**: Illumination appearance is controlled by user settings:
  - Intensity setting maps to gradient alpha values (hex opacity)
  - Diffusion setting controls gradient stop positions for light spread
- **Background Tint**: The entire prompt panel receives a subtle color tint matching the active action's theme color for cohesive visual feedback
- **Smooth Transitions**: Illumination and background tint smoothly animate between button positions using cubic-bezier easing
- **Color-Matched Lighting**: The glow color and background tint match the active action's theme color for visual consistency
- **Theme-Aware Opacity**: Dark mode uses reduced background tint opacity for better visual balance
- **Subtle Visual Feedback**: Creates a soft, ambient lighting effect that reinforces which action mode is currently active

### Tailwind-Based Action Colors
- **Theme-Aware Active Colors**: QuickAction button active states now use Tailwind CSS classes (`text-action-files`, `text-action-agents`, etc.) instead of hardcoded hex colors
- **Dark Mode Support**: Active colors automatically adapt to dark mode via `dark:text-action-*-dark` class variants
- **Centralized Theming**: `ACTION_ACTIVE_COLORS` now maps to Tailwind classes for consistent theming across light and dark modes
- **QUICK_ACTIONS Update**: Each action now uses `activeColorClass` property instead of `activeColor` for Tailwind integration

### Action-Specific Prompts & Active States
- **50 Unique Prompts Per Action**: Each QuickAction mode (Files, Agents, Space, Cleanup) now has its own pool of 50 randomized placeholder prompts for a more engaging, conversational experience
- **Natural Language Variety**: Prompts range from simple ("What file do you need?") to conversational ("Lost something? Describe it...") tailored to each action type
- **Active Color States**: QuickAction buttons and prompt text now feature distinct active colors (darker/more saturated) when selected, providing clear visual feedback
- **Context-Aware Suggestions**: Placeholder prompts guide users with action-specific language - file descriptions for Files, task automation for Agents, storage analysis for Space, and cleanup guidance for Cleanup
- **Prompt Re-randomization**: New `promptKey` prop allows forcing a new random prompt selection when the same action is re-activated

### Simplified Placeholder Text
- **Unified Placeholder**: Prompt area now uses a consistent "Skhoot is listening..." placeholder across all modes
- **Cleaner UX**: Removed animated typewriter placeholder in favor of simpler, static placeholder text
- **Voice Message Context**: Shows "Send your message?" when there's a pending voice message

### Quick Actions Update
- **Agents Quick Action**: Replaced "Messages" quick action with "Agents" for asking specialized agents for help
- **Updated Placeholder**: New placeholder text "Ask an agent for help..." for the Agents action

### Linux Audio Setup Service
- **Automatic Detection**: Detects Linux environment and checks audio configuration status in Tauri desktop app
- **Audio Group Membership**: Checks if user is in the `audio` group and provides guided setup via PolicyKit authentication
- **Audio Server Detection**: Identifies whether PulseAudio or PipeWire is running
- **Manual Instructions**: Provides step-by-step manual setup instructions for users who prefer command-line configuration
- **Tauri Integration**: Uses Tauri commands for native system operations with proper privilege escalation

### Linux Audio Setup UI Banner
- **In-Settings Banner**: New amber warning banner in Sound settings when Linux audio setup is required
- **One-Click Fix**: "Fix Audio Permissions" button that triggers PolicyKit authentication to add user to audio group
- **Status Display**: Shows which issues were detected (missing audio group membership, no audio server)
- **Success Feedback**: Green success banner with confirmation message after successful fix
- **Error Handling**: Clear error messages displayed inline when the fix fails

### Smarter Audio Settings Loading
- **Lazy Permission Request**: Audio settings now load saved preferences (volume, sensitivity) immediately without requesting microphone permission
- **Permission-Aware Device Enumeration**: Device lists are only populated when permission is already granted, avoiding unnecessary permission prompts
- **Graceful Fallback**: When permission hasn't been granted, the panel shows the "Enable Microphone" button instead of triggering automatic permission requests
- **Cached Permission Check**: Uses `audioService.getPermissionStatus()` to check cached permission state before attempting device enumeration

### Improved Microphone Permission UX
- **Enable Microphone Button**: New prominent "Enable Microphone Access" button shown when permission hasn't been granted yet, with clear visual guidance
- **Better Error Recovery**: Permission error banner now includes "Try Again" and "Dismiss" buttons for improved user control
- **Permission Reset**: Users can dismiss errors and reset permission state via `audioService.resetPermission()`
- **Conditional Device Settings**: Audio device selection controls are now hidden until microphone permission is granted, reducing confusion
- **Clearer Loading State**: Loading indicator now shows "Requesting microphone access..." for better feedback during permission flow

### Auto-Save Audio Settings
- **Real-Time Settings Persistence**: Audio settings (device selections, volumes, sensitivity) are now automatically saved whenever they change in the Sound settings panel
- **Seamless Experience**: No manual save button needed - changes are persisted immediately via `audioService.saveSettings()`
- **Explicit Permission Request**: New "Request Permission" button allows users to explicitly grant microphone access with clear feedback on success or failure
- **Device Refresh on Permission**: When permission is granted, the device list automatically refreshes and selects appropriate defaults

### Settings Panel Audio Service Integration
- **Unified Device Management**: Settings panel now uses the centralized `audioService` for all audio device operations, replacing direct `navigator.mediaDevices` calls
- **Persistent Audio Settings**: Device selections, volume levels, and sensitivity settings are automatically saved and restored via `audioService.getSettings()`
- **Device Hot-Swap Support**: Settings panel now listens for audio device changes via `audioService.onDeviceChange()` and automatically refreshes the device list
- **Smart Default Selection**: Automatically selects default devices when saved devices are unavailable, with preference for system-marked defaults
- **Permission Status Display**: Shows clear error messages when microphone access is denied, with platform-specific instructions

### Unified Voice Recording Architecture
- **Audio Service Integration**: Voice recording in ChatInterface now uses the centralized `audioService` for all audio operations, replacing direct browser API calls
- **Cleaner Permission Flow**: Microphone permission is now requested through `audioService.requestPermission()` before starting recording, with clear error messages
- **Improved Error Handling**: Speech recognition errors now display platform-specific instructions via `audioService.getPermissionInstructions()`
- **Better Logging**: All voice-related operations now use `[Voice]` prefixed console logs for easier debugging
- **Simplified Code**: Removed redundant browser detection functions in favor of `audioService.isSpeechRecognitionSupported()` and `audioService.getPlatform()`

### Enhanced Audio Service API
- **Input Stream Management**: New `getInputStream()` method for obtaining media streams from selected input devices with automatic fallback to default device
- **Audio Context Creation**: New `createAudioContext()` method with output device routing support via `setSinkId`
- **Speech Recognition Factory**: New `createSpeechRecognition()` method for creating pre-configured Web Speech API instances
- **Microphone Testing**: New `testMicrophone()` method providing real-time audio level and waveform data via callbacks
- **Device Change Monitoring**: New `onDeviceChange()` method for subscribing to audio device connect/disconnect events
- **High-Quality Audio**: Configured for 48kHz sample rate with disabled echo cancellation, noise suppression, and auto gain for raw audio capture

### Tauri Microphone Permission Handling
- **Platform-Specific Guidance**: When microphone access is denied in the Tauri desktop app, users now receive clear instructions for their specific OS (macOS, Windows, Linux)
- **Tauri Environment Detection**: Automatically detects when running in Tauri vs browser for appropriate error handling
- **Graceful Fallback**: Continues without audio visualization if microphone access fails for non-permission reasons
- **Enhanced Logging**: Added console logging for debugging microphone access issues in desktop builds

### Voice Input Error Recovery
- **Improved Speech Recognition Startup**: Added robust error handling when starting voice recording
- **Auto-Recovery**: Automatically attempts to restart speech recognition if it was already running
- **Clear Error Messages**: User-friendly alerts for specific failure scenarios (already started, permission issues, etc.)
- **Graceful Degradation**: Properly cleans up resources and resets state on startup failures

### Branding Toggle
- **New Setting**: Added ability to show/hide Skhoot branding elements throughout the UI
- **Persistent Preference**: Branding visibility preference is saved to localStorage (`skhoot-show-branding`)
- **Theme Context Integration**: Available via `useTheme()` hook as `showBranding` and `setShowBranding`

### Custom Search Path Support
- **Flexible Search Directories**: Both `aiFileSearch` and `searchContent` now accept a `search_path` option to search in custom directories
- **Project-Scoped Search**: Search within specific project folders instead of defaulting to user home
- **API Enhancement**: New `search_path` parameter in `/api/v1/search/files` and `/api/v1/search/content` endpoints

### File Location Opening
- **Multi-Platform Support**: "Go" button on file search results now opens file locations across platforms
- **Backend API Integration**: Uses `POST /api/v1/files/open` endpoint to open file locations via the Rust backend
- **Graceful Fallback**: Copies path to clipboard with instructions if backend is unavailable
- **Simplified Architecture**: Unified approach using backend API for consistent cross-platform behavior

### Enhanced Gemini Error Handling
- **Specific Error Messages**: AI chat now provides targeted error messages for different failure scenarios
- **API Key Validation**: Clear guidance when API key is invalid or missing
- **Quota Management**: Helpful messages when API rate limits are exceeded
- **Network Diagnostics**: Informative feedback for connection issues with troubleshooting hints
- **Debug Support**: Detailed error information available in browser console for developers

### File Search Testing Interface
- **New Testing Panel**: Added interactive file search test interface accessible via header search icon (🔍)
- **Backend Connectivity Testing**: Real-time backend status checking and connection validation
- **Live Search Testing**: Interactive search query testing with multiple search modes and result display
- **AI Suggestion Testing**: Built-in testing for AI-powered search suggestion system
- **Debug Integration**: Comprehensive error handling and browser console logging for development
- **Performance Monitoring**: Real-time search execution time and result metadata display

### Enhanced File Search Results Display
- **Rich Search Metadata**: File search results now display comprehensive search information including query details, execution time, search mode, and total results count
- **Collapsible Results**: Large result sets are paginated with "Show more/less" controls, initially displaying 5 results for cleaner UI
- **AI-Powered Suggestions**: Search results include intelligent suggestions for query refinement with contextual reasoning
- **Performance Metrics**: Real-time display of search execution time and result statistics
- **Error Handling**: Graceful display of fallback messages when search engines encounter issues
- **Search Context**: Enhanced FileList component now receives and displays searchInfo metadata for better user understanding

### Advanced File Search Integration
- Added comprehensive Rust-based file search engine with multiple search modes
- Integrated AI-powered search suggestions and intent detection
- Added TypeScript interfaces for seamless frontend-backend communication
- Implemented hybrid search combining fuzzy matching with CLI tools (ripgrep, fd)
- Added context-aware search with project type detection and file history

### Backend API Enhancement
- New file search endpoints with detailed result metadata
- Search suggestion API for AI-driven query improvements
- Performance tracking and search analytics
- Support for multiple search engines with automatic fallbacks

### Tauri Desktop Integration
- Added desktop application support with Tauri
- New build scripts for cross-platform desktop builds
- Enhanced native system integration capabilities
- Ubuntu/Linux specific build target support

### Design System Improvements
- Resolved merge conflicts in SettingsPanel component
- Enhanced glassmorphic design consistency
- Improved theme context integration
- Updated modal sizing for better UX (max-height: 80% → 90%)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the design system guidelines
4. Test in multiple browsers
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🆘 Support

- Check the built-in Help Center in Settings
- Review [EMBOSSED_STYLE_GUIDE.md](./EMBOSSED_STYLE_GUIDE.md) for design questions
- Use browser console demos for testing features
