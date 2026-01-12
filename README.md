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
| Offline Support | No | Yes |
| File System Access | Limited | Enhanced |
| Auto-Updates | N/A | Supported |

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
