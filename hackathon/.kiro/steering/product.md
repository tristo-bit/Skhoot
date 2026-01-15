# Product Overview

## Product Purpose
Skhoot is the first open-source GUI for CLI agents, providing unrestricted system access with voice control, visual file management, and multi-provider AI support. It transforms terminal-only agent interactions into a rich, interactive visual experience while maintaining complete agent freedom.

## Target Users
- **Developers using CLI agents** (Claude Code, Cursor, Aider) who want visual feedback during agent operations
- **Teams needing transparency** in agent tool execution with interactive file management
- **Users requiring accessibility** through voice-first interface and hands-free operation
- **Organizations avoiding vendor lock-in** who want to bring their own API keys

## Key Features
- **Visual Agent Tool Execution**: File lists, search results, and code highlighting instead of raw terminal text
- **Multi-Provider AI**: OpenAI, Anthropic, Google AI, or custom endpoints - bring your own API key
- **Voice-First Interface**: Natural speech control with real-time transcription and advanced audio visualization
- **Unrestricted System Access**: No sandboxing - agents can execute any system command and access any file
- **Secure API Key Management**: AES-256-GCM encryption with platform-specific keychain integration (Linux/macOS/Windows)
- **Hybrid Search Engine**: Rust fuzzy matching + CLI tools (ripgrep, fd) + AI relevance scoring
- **Native Desktop Integration**: Custom window controls, native notifications, file operations
- **Cross-Platform**: Linux, macOS, Windows desktop apps + web version

## Business Objectives
- Provide the first open-source alternative to proprietary agent GUIs
- Enable accessibility through voice control and visual feedback
- Support any AI provider to avoid vendor lock-in
- Maintain complete transparency with open-source architecture
- Build community-driven extensible platform

## User Journey
1. **Setup**: Install desktop app or use web version, configure API key for preferred AI provider
2. **Interact**: Use voice or text to send commands to the agent
3. **Execute**: Agent runs tools (list_directory, search_files, read_file, shell) with visual feedback
4. **Explore**: View results in interactive UI - click files to open, navigate folders, copy paths
5. **Continue**: Maintain conversation context with full history and file references
6. **Customize**: Switch providers, adjust settings, manage workflows

## Success Criteria
- **Functionality**: Successful agent tool execution with visual rendering for all tool types
- **Voice Accuracy**: >90% transcription accuracy for natural speech commands
- **Provider Support**: 3+ AI providers working seamlessly (OpenAI, Anthropic, Google AI)
- **Security**: Zero critical vulnerabilities, secure key storage with platform keychain
- **Performance**: File search <200ms for 10K+ files, smooth UI at 60fps
- **Adoption**: GitHub stars, community contributions, production deployments
