---
inclusion: always
---

# Skhoot Feature Guidelines

## Core Product Identity

Skhoot is the first open-source GUI for CLI agents with unrestricted system access. When implementing features:

- **Maintain Agent Freedom**: Never sandbox or restrict agent capabilities - full system access is a core value
- **Multi-Provider First**: Support OpenAI, Anthropic, Google AI, and custom endpoints equally
- **Visual Over Text**: Transform CLI text output into rich, interactive UI components
- **Voice-First Design**: Ensure voice control works seamlessly alongside keyboard/mouse
- **Open Source Transparency**: All features should be inspectable and extensible

## Feature Implementation Patterns

### Agent Mode Features

When adding agent-related functionality:

- **Tool Execution**: All agent tools must render with visual UI components (see `components/conversations/AgentAction.tsx`)
- **Event-Driven**: Use Tauri events for real-time updates (`tool_start`, `tool_complete`, `message`, `cancelled`)
- **Session Management**: Agent sessions are tied to conversations with proper lifecycle in `services/agentService.ts`
- **Unrestricted Access**: Never limit what agents can do - users control their own systems
- **Visual Feedback**: Show tool execution status, results, and errors in rich UI (not raw text)

### File Operations

File-related features should:

- **Use Backend API**: Route through `services/backendApi.ts` for consistency
- **Support @References**: Enable `@filename` syntax for file context loading
- **Visual Navigation**: Provide click-to-open, reveal-in-explorer, and folder navigation
- **Cross-Platform**: Use Tauri file APIs for desktop, HTTP endpoints for web
- **Interactive Results**: File lists should have icons, sizes, actions (open, reveal, delete, compress)

### Search Features

Search implementations must:

- **Multi-Engine**: Support fuzzy (nucleo), CLI (ripgrep/fd), and hybrid modes
- **AI-Enhanced**: Include relevance scoring and intelligent fallbacks
- **Performance**: Target <200ms for large projects (10K+ files)
- **Content Search**: Support searching inside files with snippet extraction
- **Visual Results**: Display with syntax highlighting, line numbers, click-to-open

### Voice/Audio Features

Audio-related features should:

- **Real-Time Feedback**: Provide visual feedback during recording (waveforms, volume meters)
- **Transcript Editing**: Allow users to edit voice transcriptions before sending
- **Device Management**: Support microphone/speaker selection and hot-swapping
- **Cross-Platform Audio**: Handle browser differences (Chrome/Edge/Safari)
- **Accessibility**: Ensure voice control works for all agent operations

### API Key Management

When handling credentials:

- **Encrypted Storage**: Use AES-256-GCM with platform keychain integration
- **Never Log Keys**: API keys must never appear in logs or error messages
- **Test Before Save**: Validate keys and fetch models before persisting
- **Provider Agnostic**: Support any provider with consistent interface
- **Smart Caching**: Use 5-minute TTL for performance without staleness

### UI/UX Patterns

Follow these design conventions:

- **Embossed Glassmorphism**: Use the design system from `documentation/EMBOSSED_STYLE_GUIDE.md`
- **Theme-Aware**: Support light/dark modes with smooth transitions
- **Floating Panels**: Use glassmorphic panels that float above main content
- **Interactive States**: Provide hover, active, pressed, and disabled states
- **Performance**: Use React.memo, useMemo, useCallback for optimization
- **Accessibility**: Maintain WCAG compliance with proper contrast and focus states

## Feature-Specific Rules

### Workflow Automation

- **Three-Tab Interface**: Workflows, Running, History tabs
- **Editable Chains**: Allow inline editing of workflow steps
- **Status Tracking**: Visual indicators for idle/running/completed/failed
- **Pre-Built Templates**: Include examples for code review, docs, tests
- **Quick Actions**: Integrate with chat interface quick action buttons

### Terminal Integration

- **PTY Support**: Use portable-pty for true terminal emulation
- **ANSI Colors**: Render terminal output with proper color support
- **Agent Log Tab**: Dedicated monitoring for agent tool execution
- **Session Persistence**: Handle terminal hibernation and restoration
- **Command History**: Track and display command execution history

### Notifications

- **Native Desktop**: Use Tauri notification plugin for desktop apps
- **Web Fallback**: Graceful degradation to browser notifications
- **Smart Filtering**: Implement rate limiting, quiet hours, duplicate prevention
- **Priority System**: Support low/normal/high priority levels
- **Test Mode**: Bypass filters for reliable testing

### Message Features

- **Edit & Regenerate**: Allow editing sent messages to regenerate conversation from that point
- **File Attachments**: Support image attachments with vision/OCR capabilities
- **Message Queue**: Queue new messages while AI is processing
- **Highlighting**: Visual highlighting for bookmarked or referenced messages
- **Activity Navigation**: Click activity logs to jump to related messages

## Code Organization

### Service Layer

Services should:

- **Single Responsibility**: Each service handles one domain (AI, agent, audio, etc.)
- **Error Handling**: Try-catch with user-friendly error messages
- **Type Safety**: Full TypeScript types for all public APIs
- **Event Emitters**: Use event-driven architecture for cross-component communication
- **Async/Await**: Prefer async/await over promises for readability

### Component Structure

Components must:

- **Named Exports**: Use named exports, not default exports
- **Props Interface**: Define `[ComponentName]Props` interface
- **Memo Optimization**: Wrap in React.memo for performance
- **Display Names**: Set `Component.displayName` for debugging
- **Forward Refs**: Use forwardRef when refs are needed

### Backend Integration

Backend features should:

- **REST API**: Use Axum with consistent endpoint patterns (`/api/v1/...`)
- **Error Responses**: Return structured errors with status codes
- **Streaming**: Support streaming responses for long operations
- **CORS**: Configure CORS for web version compatibility
- **Health Checks**: Provide health endpoint for status monitoring

## Testing Requirements

### Manual Testing

Provide manual testing interfaces for:

- **Complex Features**: File search, agent tools, voice recording
- **Cross-Platform**: Test on Linux, macOS, Windows
- **Browser Compatibility**: Test web version in Chrome, Edge, Safari
- **Error Scenarios**: Test with invalid inputs, network failures, missing dependencies

### Automated Testing

When adding tests:

- **Backend**: Use Rust `#[cfg(test)]` and proptest for property-based testing
- **Frontend**: Use Vitest with @testing-library/react
- **Integration**: Test service layer with mocked backends
- **Coverage**: Focus on critical paths (API key storage, agent execution, search)

## Performance Guidelines

### Frontend Optimization

- **Code Splitting**: Lazy load heavy components (3D backgrounds, visualizers)
- **Virtual Scrolling**: Use for large lists (messages, file results)
- **Canvas Rendering**: Target 60fps for visualizations
- **Debouncing**: Debounce search inputs and resize handlers
- **Memoization**: Cache expensive computations with useMemo

### Backend Optimization

- **Async Runtime**: Use Tokio for concurrent operations
- **Connection Pooling**: Reuse database and HTTP connections
- **Parallel Search**: Run multiple search engines concurrently
- **Caching**: Cache search results and AI responses appropriately
- **Release Profile**: Use `opt-level = 3` and LTO for production builds

## Security Considerations

### API Keys

- **Encryption**: AES-256-GCM for at-rest encryption
- **Keychain**: Platform keychain for encryption key storage
- **No Exposure**: Never log, display, or transmit keys in plain text
- **Validation**: Test keys before saving to prevent invalid credentials

### System Access

- **User Control**: Users explicitly enable agent mode and understand implications
- **Transparency**: Show all commands before execution in agent log
- **No Hidden Actions**: All agent operations visible in UI
- **Graceful Failures**: Handle permission errors and missing dependencies

## Documentation Standards

When documenting features:

- **User-Facing**: Update README.md with feature descriptions and usage
- **Technical**: Update ARCHITECTURE.md with implementation details
- **Development**: Log changes in DEVLOG.md with issue/solution/verification
- **Code Comments**: Explain complex logic, not obvious code
- **Type Definitions**: Use JSDoc for service APIs and complex types

## Deployment Considerations

### Multi-Platform Support

- **Desktop**: Build for Linux (.deb, .AppImage), macOS (.dmg), Windows (.msi, .exe)
- **Web**: Deploy to GitHub Pages with backend requirement documentation
- **CI/CD**: Use GitHub Actions for automated builds and releases
- **Version Management**: Semantic versioning with automated changelog generation

### Environment Modes

- **Development**: Hot reload, debug logging, relaxed CORS
- **Production**: Optimized builds, error reporting, strict security
- **Web vs Desktop**: Feature detection for Tauri APIs, graceful fallbacks
- **Backend Dependency**: Clear messaging when backend is required but unavailable