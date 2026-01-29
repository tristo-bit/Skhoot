# Skhoot v0.1.7 Release Notes

**Release Date**: January 29, 2026  
**Commits Since v0.1.6**: 60  
**Previous Tag**: v0.1.6

---

## 🎯 New Features

### Kiro CLI Authentication Bridge
- **Full integration with Kiro CLI** for seamless authentication and backend connectivity
- Smart connection testing and validation before saving credentials
- Automatic token management with secure storage
- Bridge token handling that prevents accidental persistence

### Smart Search Summarization
- **AI-powered search result summarization** for agent tools
- Intelligent context extraction from search results
- Enhanced agent decision-making with summarized file content

### Custom STT Provider Support
- **Groq integration** for high-speed, free voice transcription
- Custom STT provider configuration in Sound Panel
- Alternative to paid OpenAI STT for cost-conscious users
- Maintained specialized Linux audio fallback for WebKitGTK compatibility

### Native File Picker & Drag-Drop
- **Native file picker integration** using Tauri dialog plugin
- Improved drag-and-drop file handling
- Better file attachment workflow in chat interface

### User Profile Persistence
- **LocalStorage-based user profile management**
- Persistent user settings across sessions
- Profile data survives app restarts

### Dynamic Working Directory Support
- **CLI bridge now supports working directory specification** for command execution
- Execute commands in specific directories without changing global state
- Better isolation for multi-project workflows

---

## 🚀 Improvements

### UI/UX Enhancements

#### Portal-Based Rendering Architecture
- **Complete refactor of modal and sidebar rendering** using React portals
- App corner clipping now applies uniformly to all UI elements
- Modals perfectly match the 32px rounded corner language
- Eliminated z-index conflicts and rendering issues

#### Dark Mode Refinements
- Fixed dropdown options to enforce dark backgrounds in production
- Migrated custom scrollbar styles to global CSS for consistency
- Applied custom scrollbar styling to File Explorer, Agents, and Workflows panels
- Updated HelpCenterPanel with semantic dark mode colors
- Refined SoundPanel select dropdowns with proper dark styling

#### Image Gallery Improvements
- Replaced custom modal with reusable Modal component
- Image gallery modals now match app viewport rounded corners
- Fixed "Add to Chat" button to use correct event name
- Added Toast component for user feedback

#### User Message Readability
- Improved user message bubble width for better text flow
- Enhanced visual hierarchy in conversation view

#### Sidebar & Header Polish
- Simplified sidebar toggle button with conditional rendering
- Applied full rounded corners to sidebar matching app viewport
- Removed Sign In button from AuthButton component for cleaner UI

### AI & Model Management

#### Updated AI Provider Models
- **Thought process tracking** for reasoning models
- Latest model support for OpenAI, Anthropic, and Google AI
- Improved model capability detection

#### Kiro Backend Integration
- Fixed Kiro connection test validation
- Refined Kiro authentication UI
- Proper error handling for Kiro bridge operations

### Memory System Improvements

#### Complete Memories Panel Redesign
- **Improved layout and UX** for memory management
- Normalized dropdown filters
- Fixed duplicate categories and tags
- Pixel-perfect alignment of memory card elements

### File & Storage Operations

#### OCR/Vision Fixes
- **Fixed OCR/Vision functionality** to work as intended
- Proper image processing and text extraction
- Better error handling for vision operations

#### First Message Registry Fix
- **Resolved LocalStorage issue** that caused first message to not display
- Fixed duplicate message sending that prevented tool call launches
- Proper message state management

### Terminal & Shell

#### Cross-Platform Shell Compatibility
- Improved drag handling in terminal
- Better shell detection and compatibility across platforms
- Enhanced terminal session management

---

## 🔧 Refactors

### Component Cleanup

#### Archive & Cleanup Tab Removal
- Disabled Archive tab functionality in BackupPanel
- Disabled Cleanup tab functionality in File Explorer
- Streamlined panel interfaces by removing unused features

#### Settings Panel Simplification
- Cleaned up UserPanel by removing API configuration functionality
- Moved API settings to dedicated AI Settings Modal
- Better separation of concerns

#### Notification System
- Removed debug and test utilities from NotificationsPanel
- Cleaner production code without development artifacts

#### Provider Management
- Removed Kiro provider from main provider list
- Fixed dropdown UI after provider removal
- Cleaner provider selection interface

### Platform-Specific Code Removal

#### Windows Caption Handling
- Removed Windows caption handling code (no longer needed with decorations: false)
- Cleaned up unused platform-specific dependencies
- Simplified window management logic

---

## 🐛 Bug Fixes

### UI Fixes
- Fixed dark mode dropdowns with proper background enforcement
- Fixed production animations by migrating logo and text animations to global CSS
- Fixed custom scrollbar styles not applying in production builds
- Fixed image modal corner rounding to match app viewport

### Backend Fixes
- **Fixed missing endpoints in Axum backend** for proper API coverage
- Fixed first message registry causing display and tool call issues
- Fixed "Add to Chat" button event name in Images tab

### Authentication Fixes
- Prevented saving Kiro bridge token to storage (security improvement)
- Fixed Kiro connection test validation logic

---

## 📚 Documentation

### Comprehensive System Design Documentation
- **Added detailed system design docs** for all core modules
- Architecture documentation for major components
- Implementation guides and best practices

### Known Limitations Documentation
- Added `leftout-todos.md` for tracking known limitations
- Documented dev/release gaps
- Clear roadmap for future improvements

### Agent System Requirements
- Added README for agent system update requirements
- Specification for agent capabilities and constraints

---

## 🔐 Licensing

### Business Source License 1.1
- **Added Business Source License 1.1** to project
- Clear licensing terms for commercial and non-commercial use
- Transition plan to open source after specified period

---

## 🔍 Discoveries

### Tauri v2 Portal Architecture
The portal-based rendering system solved a fundamental issue with Tauri's transparent window architecture. By creating a single clipped container and rendering all UI elements (modals, sidebars) inside it via portals, we achieved perfect corner rounding across all components without z-index hacks.

### LocalStorage Message Registry
The first message bug revealed an interesting race condition: messages saved to LocalStorage before being sent to the AI provider caused duplicate sends, which broke tool call detection. The fix required careful ordering of storage operations.

### Cross-Platform Scrollbar Styling
Custom scrollbar styles work differently in development vs production builds. Moving them to global CSS ensures consistent rendering across all build modes and platforms.

---

## 🎯 What Comes Next

### High Priority
- **Multi-workspace support** for managing multiple projects
- **Plugin system** for extensible tool integrations
- **Workflow templates marketplace** for sharing automation patterns
- **Enhanced memory system** with semantic search and clustering

### Medium Priority
- **Collaborative features** for team-based agent workflows
- **Advanced terminal features** (split panes, session management)
- **Performance optimizations** for large file operations
- **Mobile companion app** for remote agent monitoring

### Low Priority
- **Theme customization** beyond light/dark modes
- **Keyboard shortcut customization**
- **Export/import settings** for easy migration
- **Analytics dashboard** for usage insights

---

## 📦 Installation

### Desktop Apps
Download platform-specific installers from the [GitHub Releases page](https://github.com/tristo-bit/Skhoot/releases/tag/v0.1.7):

- **Linux**: `.deb` (Debian/Ubuntu) or `.AppImage` (universal)
- **macOS**: `.dmg` installer
- **Windows**: `.msi` or `.exe` installer

### Web Version
Access the web version at: [https://tristo-bit.github.io/Skhoot/](https://tristo-bit.github.io/Skhoot/)

**Note**: Web version requires a running backend server for full functionality.

---

## 🙏 Acknowledgments

Thank you to all contributors and users who provided feedback and bug reports for this release!

---

**Full Changelog**: https://github.com/tristo-bit/Skhoot/compare/v0.1.6...v0.1.7
