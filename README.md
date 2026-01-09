<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Skhoot - Your Desktop AI Assistant

Skhoot is an intelligent desktop assistant that helps you find files, search conversations, analyze disk usage, and manage your digital workspace. Built with React, TypeScript, Tauri, and powered by Google's Gemini AI, it features a modern embossed glassmorphic design system and runs as both a web application and native desktop app.

View your app in AI Studio: https://ai.studio/apps/drive/1yPnxkAry7gQ3SPvIsRQW4eBCoYkV7iwP

## ✨ Features

### 🔍 Smart Search & Discovery
- **File Search**: Find files across your system with intelligent search
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
- **Rich Responses**: Support for file lists, disk usage charts, and cleanup suggestions
- **Markdown Support**: Full markdown rendering in responses

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
- **Rust** (for desktop builds - [Install Rust](https://rustup.rs/))
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))

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

3. **Start the development server:**
   
   **Web Version:**
   ```bash
   npm run dev          # Opens browser automatically
   npm run dev:no-open  # Starts server without opening browser
   ```
   
   **Desktop Version:**
   ```bash
   npm run tauri:dev
   ```

4. **Open your browser (web version only):**
   Navigate to `http://localhost:5173`

## 🛠️ Development

### Available Scripts

**Web Development:**
- `npm run dev` - Start web development server (opens browser automatically)
- `npm run dev:no-open` - Start web development server without opening browser
- `npm run build` - Build web version for production
- `npm run preview` - Preview web production build

**Desktop Development:**
- `npm run tauri:dev` - Start desktop development with hot reload
- `npm run tauri:build` - Build desktop app for current platform
- `npm run tauri:build:ubuntu` - Build desktop app for Ubuntu/Linux
- `npm run tauri` - Run Tauri CLI commands

### Project Structure
```
skhoot/
├── components/           # React components
│   ├── shared/          # Reusable UI components
│   ├── ChatInterface.tsx
│   ├── SettingsPanel.tsx
│   └── ...
├── services/            # API and data services
├── src/
│   ├── contexts/        # React contexts (Theme, etc.)
│   └── constants.ts     # App constants and config
├── src-tauri/           # Tauri desktop app configuration
│   ├── src/            # Rust backend code
│   ├── icons/          # Desktop app icons
│   └── tauri.conf.json # Tauri configuration
├── browser-test/        # Demo and testing utilities
└── public/             # Static assets
```

### Design System
Skhoot uses an **Embossed Glassmorphic Design System**. See [EMBOSSED_STYLE_GUIDE.md](./EMBOSSED_STYLE_GUIDE.md) for detailed guidelines on:
- Component styling patterns
- Color system and theming
- Interactive states and animations
- Accessibility considerations

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
- Native file system access
- System tray integration
- Auto-updater support

**Choose the version that best fits your workflow!**

## 🎮 Demo Features

Open browser console and try these demo commands:
```javascript
// Show all available demo commands
skhootDemo.help()

// Demo file search
skhootDemo.searchFiles()

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

### Customization
- Modify `src/constants.ts` for colors and themes
- Update `EMBOSSED_STYLE_GUIDE.md` for design system changes
- Configure demo data in `browser-test/demo.ts`

## 📝 Recent Updates

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
