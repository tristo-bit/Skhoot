<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
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
- **Message Search**: Search through conversations from Slack, Discord, iMessage
- **Disk Analysis**: Analyze disk usage and identify large files
- **Smart Cleanup**: Get recommendations for files safe to remove

### 🎤 Voice Interface
- **Voice Input**: Speak your queries naturally (Chrome, Edge, Safari)
- **Real-time Transcription**: See your speech converted to text in real-time
- **Audio Visualization**: Visual feedback with waveform display
- **Browser Compatibility**: Fallback text input for Opera and Firefox

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
- **Responsive Layout**: Optimized for desktop use
- **Accessibility**: WCAG compliant with proper contrast and focus states

### ⚙️ Settings & Privacy
- **Audio Settings**: Configure microphone and speaker devices
- **Privacy Controls**: Manage account settings and data export
- **Activity Logging**: Track and review your interactions
- **Help Center**: Built-in support and documentation

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
│   ├── ChatInterface.tsx
│   ├── FileSearchTest.tsx  # File search testing interface
│   ├── SettingsPanel.tsx
│   └── ...
├── services/           # API and data services
│   └── backendApi.ts  # Backend API integration
├── src/
│   ├── contexts/       # React contexts (Theme, etc.)
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

// Demo message search
skhootDemo.searchMessages()

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
- Modify `src/constants.ts` for colors and themes
- Update `EMBOSSED_STYLE_GUIDE.md` for design system changes
- Configure demo data in `browser-test/demo.ts`

## 📝 Recent Updates

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
