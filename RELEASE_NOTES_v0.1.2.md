# Skhoot Desktop Seeker v0.1.2

## 🚀 What's New

### 🔧 Critical Bug Fix: Agent Mode Now Works in Release Builds

This release fixes a critical issue where the embedded AI agent couldn't use its tools in release/production builds. Users were seeing "Session not found" errors when trying to use agent features like file search, directory listing, and file reading.

**What was fixed:**
- The backend service now properly starts when the app launches
- The backend binary is now correctly bundled in all release packages
- Agent tools (list_directory, search_files, read_file, write_file, shell) now work correctly

---

## 📥 Download & Installation

### Windows
| File | Description |
|------|-------------|
| `Skhoot-Desktop-Seeker_0.1.2_x64-setup.exe` | **Recommended** - NSIS installer with auto-updates |
| `Skhoot-Desktop-Seeker_0.1.2_x64_en-US.msi` | MSI installer for enterprise deployment |

**Installation:**
1. Download the `.exe` installer
2. Double-click to run
3. Follow the installation wizard
4. Launch Skhoot from Start Menu or Desktop shortcut

### macOS
| File | Description |
|------|-------------|
| `Skhoot-Desktop-Seeker_0.1.2_universal.dmg` | Universal binary (Intel + Apple Silicon) |

**Installation:**
1. Download the `.dmg` file
2. Double-click to mount
3. Drag Skhoot to your Applications folder
4. First launch: Right-click → Open (to bypass Gatekeeper)

### Linux
| File | Description |
|------|-------------|
| `skhoot-desktop-seeker_0.1.2_amd64.deb` | Debian/Ubuntu package |
| `skhoot-desktop-seeker_0.1.2_amd64.AppImage` | Portable, runs on any distro |

**Debian/Ubuntu Installation:**
```bash
sudo dpkg -i skhoot-desktop-seeker_0.1.2_amd64.deb
sudo apt-get install -f  # Install dependencies if needed
```

**AppImage Installation:**
```bash
chmod +x skhoot-desktop-seeker_0.1.2_amd64.AppImage
./skhoot-desktop-seeker_0.1.2_amd64.AppImage
```

---

## 🔑 First-Time Setup

1. **Launch Skhoot** from your applications
2. **Configure AI Provider** (Settings → API Keys):
   - Google Gemini (recommended, free tier available)
   - OpenAI
   - Anthropic Claude
3. **Start chatting!** Ask questions, search files, or use voice input

---

## 💡 Tips for New Users

- **Voice Input**: Click the microphone button to speak your queries
- **File Search**: Just ask "find my documents" or "search for .pdf files"
- **Agent Mode**: Enable for advanced file operations and terminal access
- **Dark Mode**: Toggle in Settings for a comfortable night experience

---

## 🐛 Known Issues

- On Linux, you may need to install audio dependencies for voice features:
  ```bash
  sudo apt install pipewire pipewire-pulse wireplumber
  ```

---

## 📋 Full Changelog

See [DEVLOG.md](https://github.com/tristo-bit/skhoot/blob/main/DEVLOG.md) for detailed development history.

---

## ❤️ Support

If you find Skhoot useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs via GitHub Issues
- 💬 Sharing feedback and suggestions
