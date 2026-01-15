# Skhoot Demo Video Script

**Duration**: 2-3 minutes  
**Goal**: Showcase key features that differentiate Skhoot from CLI-only agents

---

## Pre-Recording Checklist

- [ ] Backend running (`npm run backend:dev`)
- [ ] Desktop app launched (`npm run tauri:dev`)
- [ ] API key configured (Google Gemini or OpenAI)
- [ ] Screen recording software ready (OBS, QuickTime, etc.)
- [ ] Audio input tested (clear voice, no background noise)
- [ ] Sample project directory ready (e.g., a small codebase)
- [ ] Browser tab with https://tristo-bit.github.io/Skhoot/ open

---

## Recording Setup

**Screen Resolution**: 1920x1080 (Full HD)  
**Frame Rate**: 30fps minimum  
**Audio**: Clear voice narration with no background music  
**Recording Area**: Full screen or application window only

---

## Script

### Opening (0:00 - 0:15)
**Visual**: Show Skhoot logo/banner, then open the desktop app

**Narration**:
> "Meet Skhoot - the first open-source GUI for CLI agents. Unlike terminal-only agents, Skhoot gives you visual feedback, voice control, and unrestricted system access."

**Actions**:
- Show the main interface with chat area
- Briefly show the sidebar with chat history

---

### Feature 1: Agent Mode with Visual Tool Execution (0:15 - 0:50)
**Visual**: Demonstrate agent executing tools with visual rendering

**Narration**:
> "Watch as the agent executes tools with rich visual feedback. Instead of raw text, you get interactive file lists, syntax-highlighted code, and clickable results."

**Actions**:
1. Type or say: "List all TypeScript files in the components directory"
2. Show agent executing `list_directory` tool
3. Highlight the visual file list with icons, sizes, and action buttons
4. Click on a file to open it (show the file opening in system editor)
5. Click "Show in folder" to reveal file in file explorer
6. Type: "Search for 'useState' in the codebase"
7. Show `search_files` tool with syntax-highlighted results
8. Click on a search result to navigate to that file

**Key Points to Show**:
- Visual file lists (not raw text)
- Interactive buttons (Open, Show in folder, Copy path)
- Syntax highlighting in search results
- Click-to-open functionality

---

### Feature 2: Voice Control (0:50 - 1:20)
**Visual**: Demonstrate voice input with real-time transcription

**Narration**:
> "Skhoot is voice-first. Speak naturally, and watch your words appear in real-time with our advanced audio visualizer."

**Actions**:
1. Click the microphone button
2. Show the audio visualizer animating (9-layer frequency visualization)
3. Speak clearly: "Find all files modified in the last 24 hours"
4. Show real-time transcription appearing
5. Show agent executing the command with visual results
6. (Optional) Edit the transcription before sending

**Key Points to Show**:
- Microphone button activation
- Real-time audio visualization (voice-optimized)
- Live transcription as you speak
- Ability to edit transcription before sending

---

### Feature 3: Multi-Provider Support (1:20 - 1:45)
**Visual**: Show API key management and provider switching

**Narration**:
> "Bring your own API key. Skhoot supports OpenAI, Anthropic, Google AI, and custom endpoints. Switch providers anytime - no vendor lock-in."

**Actions**:
1. Open Settings (gear icon)
2. Navigate to API Configuration section
3. Show the provider dropdown (OpenAI, Anthropic, Google AI, Custom)
4. Show the secure key input field (masked)
5. Show "Test Connection" button
6. Briefly show model selection dropdown
7. Close settings

**Key Points to Show**:
- Multiple provider options
- Secure key storage (keys are masked)
- Model selection per provider
- Easy provider switching

---

### Feature 4: File Operations (1:45 - 2:10)
**Visual**: Demonstrate file operations from agent results

**Narration**:
> "Interact with files directly from agent results. Open, reveal in explorer, compress to ZIP, or view properties - all with one click."

**Actions**:
1. From a previous file list result, click the "more" button (⋮) on a file
2. Show the context menu with options:
   - Open
   - Open Folder
   - Copy Path
   - Compress
   - Properties
3. Click "Compress" and show the ZIP creation confirmation
4. Click "Properties" and show file metadata (size, modified date, type)

**Key Points to Show**:
- Context menu on files
- Multiple file operations available
- Instant feedback (notifications or confirmations)

---

### Feature 5: Unrestricted Access (2:10 - 2:30)
**Visual**: Show agent executing system commands

**Narration**:
> "Unlike sandboxed agents, Skhoot gives agents full system access. Execute any command, access any file - complete freedom with visual feedback."

**Actions**:
1. Type: "Show me the system disk usage"
2. Show agent executing `shell` tool with `df -h` or similar
3. Show terminal output rendered in the UI
4. Type: "Create a new directory called 'test-project'"
5. Show agent executing `mkdir` command
6. Show success confirmation

**Key Points to Show**:
- Shell command execution
- Terminal output in UI
- File system modifications
- No restrictions or sandboxing

---

### Closing (2:30 - 2:50)
**Visual**: Show the GitHub repo and website

**Narration**:
> "Skhoot is completely open source. Try the live demo at tristo-bit.github.io/Skhoot, or download desktop binaries for Linux, macOS, and Windows. Star us on GitHub and join the community building the future of agent interfaces."

**Actions**:
1. Show browser with https://tristo-bit.github.io/Skhoot/
2. Show GitHub repo page (https://github.com/tristo-bit/skhoot)
3. Show releases page with binaries (.deb, .dmg, .msi, .AppImage, .exe)
4. End with Skhoot logo and tagline: "The GUI that CLI agents deserve"

---

## Post-Recording

### Editing Checklist
- [ ] Trim any dead air or mistakes
- [ ] Add smooth transitions between sections
- [ ] Ensure audio is clear and balanced
- [ ] Add text overlays for key features (optional)
- [ ] Add background music (optional, keep it subtle)
- [ ] Export in 1080p at 30fps minimum

### Upload Checklist
- [ ] Upload to YouTube
- [ ] Title: "Skhoot - The First Open-Source GUI for CLI Agents"
- [ ] Description: Include GitHub link, website link, and feature list
- [ ] Tags: CLI agents, AI, GUI, open source, voice control, Tauri, Rust, TypeScript
- [ ] Thumbnail: Skhoot logo or screenshot of main interface
- [ ] Set visibility to Public

### Update README
- [ ] Copy YouTube video URL
- [ ] Update README.md demo link: `[Watch Demo Video](https://youtube.com/watch?v=YOUR_VIDEO_ID)`
- [ ] Commit and push changes

---

## Alternative: Quick Demo (1 minute)

If you need a shorter version, focus on these 3 key features:

1. **Agent Mode** (30s): Show visual tool execution with file lists and search results
2. **Voice Control** (20s): Demonstrate voice input with real-time transcription
3. **Multi-Provider** (10s): Show provider switching and API key management

---

## Tips for Great Demo Video

1. **Speak Clearly**: Enunciate and speak at a moderate pace
2. **Show, Don't Tell**: Let the visuals do the talking, narration should complement
3. **Keep It Moving**: Don't linger too long on any one feature
4. **Highlight Interactions**: Use mouse movements to draw attention to clickable elements
5. **Test First**: Do a practice run to catch any issues
6. **Good Lighting**: If showing your face, ensure good lighting
7. **Stable Recording**: Use a tripod or stable surface for screen recording
8. **Edit Ruthlessly**: Cut anything that doesn't add value

---

## Sample Commands for Demo

**File Operations**:
- "List all files in the src directory"
- "Find all TypeScript files"
- "Search for 'useState' in the codebase"
- "Show me the package.json file"

**System Commands**:
- "Show system disk usage"
- "List running processes"
- "Check the current directory"
- "Create a new directory called test"

**Voice Commands** (speak naturally):
- "Find all files modified today"
- "Search for TODO comments"
- "List all JavaScript files in components"
- "Show me the README file"

---

## Recording Software Recommendations

**Free Options**:
- **OBS Studio** (Windows/Mac/Linux) - Professional, feature-rich
- **QuickTime Player** (Mac) - Simple screen recording
- **Windows Game Bar** (Windows) - Built-in, easy to use
- **SimpleScreenRecorder** (Linux) - Lightweight and reliable

**Paid Options**:
- **Camtasia** - Professional editing features
- **ScreenFlow** (Mac) - Great for tutorials
- **Snagit** - Simple and effective

---

## Final Checklist Before Submission

- [ ] Video uploaded to YouTube
- [ ] Video is public and accessible
- [ ] README.md updated with video link
- [ ] Video demonstrates all key features
- [ ] Audio is clear and professional
- [ ] Video length is 2-3 minutes (or 1 minute for quick version)
- [ ] Video showcases Skhoot's unique value proposition
- [ ] GitHub repo link in video description

---

**Good luck with your demo video! This will significantly boost your presentation score and help judges understand Skhoot's value quickly.**
