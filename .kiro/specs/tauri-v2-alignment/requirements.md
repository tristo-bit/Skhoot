# Requirements Document

## Introduction

This specification defines the requirements for aligning Skhoot's Tauri v2 desktop application with production-ready best practices, ensuring reliable cross-platform builds for Windows, Linux, and macOS. The goal is to validate and refine the existing Tauri v2 implementation to match proven patterns from reference implementations like meric-docker, while maintaining Skhoot's unique features (backend sidecar, whisper.cpp integration, terminal support).

## Glossary

- **Tauri_App**: The desktop application shell that wraps the Vite-based React UI
- **Vite_UI**: The React-based frontend user interface built with Vite
- **Backend_Sidecar**: The Rust backend service (skhoot-backend) that runs alongside the Tauri app
- **Whisper_Server**: The local whisper.cpp server for speech-to-text functionality
- **Bundle_Target**: Platform-specific output format (app/dmg for macOS, msi/nsis for Windows, deb/appimage for Linux)
- **CSP**: Content Security Policy - security configuration for web content
- **Resource_Dir**: Directory containing bundled resources (backend binary, whisper models, etc.)
- **Frontend_Dist**: The compiled Vite output directory (dist/) served by Tauri

## Requirements

### Requirement 1: Tauri Configuration Validation

**User Story:** As a developer, I want the Tauri configuration to follow v2 best practices, so that the application builds reliably across all platforms.

#### Acceptance Criteria

1. THE Tauri_App SHALL use the schema URL "https://schema.tauri.app/config/2"
2. WHEN the configuration is loaded, THE Tauri_App SHALL validate against the v2 schema
3. THE Tauri_App SHALL specify frontendDist as "../dist" relative to src-tauri directory
4. THE Tauri_App SHALL specify devUrl as "http://localhost:5173" for development
5. THE Tauri_App SHALL define beforeDevCommand to start the Vite development server
6. THE Tauri_App SHALL define beforeBuildCommand to build Vite output and prepare resources

### Requirement 2: Rust Entry Point Structure

**User Story:** As a developer, I want the Rust entry point to follow Tauri v2 patterns, so that the application initializes correctly and maintainably.

#### Acceptance Criteria

1. THE Tauri_App SHALL use main.rs as the binary entry point
2. WHEN the application starts, THE Tauri_App SHALL call tauri::Builder::default()
3. WHEN plugins are registered, THE Tauri_App SHALL register them before the setup closure
4. WHEN the setup closure executes, THE Tauri_App SHALL initialize all managed state
5. THE Tauri_App SHALL call .run(tauri::generate_context!()) to start the event loop
6. WHEN initialization fails, THE Tauri_App SHALL provide clear error messages

### Requirement 3: Dependency Management

**User Story:** As a developer, I want Rust and Node dependencies aligned with Tauri v2 requirements, so that builds are reproducible and compatible.

#### Acceptance Criteria

1. THE Tauri_App SHALL use tauri crate version 2.x in Cargo.toml
2. THE Tauri_App SHALL use tauri-build version 2.x in build-dependencies
3. THE Tauri_App SHALL use @tauri-apps/cli version 2.x in package.json devDependencies
4. THE Tauri_App SHALL use @tauri-apps/api version 2.x in package.json dependencies
5. WHEN plugins are needed, THE Tauri_App SHALL include matching Rust and Node plugin packages
6. THE Tauri_App SHALL specify rust-version in Cargo.toml for minimum Rust version

### Requirement 4: Vite Configuration Alignment

**User Story:** As a developer, I want Vite configured correctly for Tauri, so that the frontend builds optimally for desktop deployment.

#### Acceptance Criteria

1. THE Vite_UI SHALL include envPrefix for both "VITE_" and "TAURI_" environment variables
2. WHEN building for production, THE Vite_UI SHALL set build.target based on TAURI_PLATFORM
3. WHEN TAURI_DEBUG is false, THE Vite_UI SHALL enable minification
4. WHEN TAURI_DEBUG is true, THE Vite_UI SHALL generate sourcemaps
5. THE Vite_UI SHALL set clearScreen to false for Tauri compatibility
6. THE Vite_UI SHALL configure server.strictPort to true for development

### Requirement 5: Window and Security Configuration

**User Story:** As a user, I want the application window to display correctly with appropriate security settings, so that I have a secure and functional desktop experience.

#### Acceptance Criteria

1. THE Tauri_App SHALL define default window properties (title, width, height, minWidth, minHeight)
2. THE Tauri_App SHALL set window.resizable to true for user flexibility
3. THE Tauri_App SHALL configure CSP to allow necessary external resources
4. WHEN in development mode, THE Tauri_App SHALL allow localhost connections in CSP
5. WHEN in production mode, THE Tauri_App SHALL restrict CSP to required domains only
6. THE Tauri_App SHALL allow mediastream: protocol for audio recording functionality

### Requirement 6: Bundle Target Configuration

**User Story:** As a release manager, I want bundle targets configured for all platforms, so that I can distribute native installers for Windows, Linux, and macOS.

#### Acceptance Criteria

1. THE Tauri_App SHALL include "app" and "dmg" in bundle.targets for macOS
2. THE Tauri_App SHALL include "msi" and "nsis" in bundle.targets for Windows
3. THE Tauri_App SHALL include "deb" and "appimage" in bundle.targets for Linux
4. THE Tauri_App SHALL specify icon paths for all required formats
5. THE Tauri_App SHALL include resources directory in bundle.resources
6. WHEN building for Linux, THE Tauri_App SHALL specify required system dependencies in deb configuration

### Requirement 7: Backend Sidecar Integration

**User Story:** As a user, I want the backend service to start automatically with the application, so that agent features work without manual intervention.

#### Acceptance Criteria

1. WHEN the application starts, THE Tauri_App SHALL spawn the Backend_Sidecar process
2. WHEN in development mode, THE Backend_Sidecar SHALL run via cargo from the backend directory
3. WHEN in production mode, THE Backend_Sidecar SHALL run from the bundled binary in Resource_Dir
4. WHEN the Backend_Sidecar fails to start, THE Tauri_App SHALL log clear error messages
5. WHEN the Backend_Sidecar exits, THE Tauri_App SHALL log the exit status
6. THE Tauri_App SHALL wait for Backend_Sidecar startup before considering initialization complete

### Requirement 8: Whisper Integration

**User Story:** As a user, I want local speech-to-text functionality to work automatically, so that I can use voice input without external services.

#### Acceptance Criteria

1. WHEN the application starts on Linux, THE Tauri_App SHALL attempt to start the Whisper_Server
2. THE Whisper_Server SHALL run from the bundled binary in Resource_Dir/whisper
3. WHEN whisper resources are missing, THE Tauri_App SHALL log a warning and continue
4. WHEN SKHOOT_DISABLE_LOCAL_STT is set, THE Tauri_App SHALL skip Whisper_Server startup
5. THE Whisper_Server SHALL listen on 127.0.0.1:8000 for transcription requests
6. THE Tauri_App SHALL provide commands to check whisper status and manage models

### Requirement 9: Platform-Specific Features

**User Story:** As a user on Linux, I want WebKitGTK configured for media access, so that microphone recording works correctly.

#### Acceptance Criteria

1. WHEN running on Linux, THE Tauri_App SHALL enable MediaStream in WebKitGTK settings
2. WHEN running on Linux, THE Tauri_App SHALL enable WebRTC in WebKitGTK settings
3. WHEN a microphone permission request occurs on Linux, THE Tauri_App SHALL auto-allow it
4. WHEN running on macOS, THE Tauri_App SHALL rely on system microphone permission dialogs
5. WHEN running on Windows, THE Tauri_App SHALL rely on WebView2 permission handling
6. THE Tauri_App SHALL log platform-specific audio permission information at startup

### Requirement 10: Build Script Validation

**User Story:** As a developer, I want build scripts to prepare all necessary resources, so that production builds include all required files.

#### Acceptance Criteria

1. WHEN beforeBuildCommand runs, THE Tauri_App SHALL execute npm run build to compile Vite_UI
2. WHEN beforeBuildCommand runs, THE Tauri_App SHALL execute npm run prepare:whisper to prepare whisper resources
3. WHEN beforeBuildCommand runs, THE Tauri_App SHALL build the Backend_Sidecar in release mode
4. WHEN beforeBuildCommand runs, THE Tauri_App SHALL copy the Backend_Sidecar binary to resources
5. THE Tauri_App SHALL verify all required resources exist before bundling
6. WHEN resource preparation fails, THE Tauri_App SHALL fail the build with a clear error message

### Requirement 11: Development Workflow

**User Story:** As a developer, I want a smooth development workflow, so that I can iterate quickly on features.

#### Acceptance Criteria

1. WHEN running npm run tauri:dev, THE Tauri_App SHALL start the Vite development server
2. WHEN the Vite server is ready, THE Tauri_App SHALL open the application window
3. WHEN frontend code changes, THE Vite_UI SHALL hot-reload without restarting Tauri
4. WHEN Rust code changes, THE Tauri_App SHALL recompile and restart
5. THE Tauri_App SHALL display clear console output for both frontend and backend logs
6. WHEN the Backend_Sidecar is needed in development, THE Tauri_App SHALL start it automatically

### Requirement 12: Production Build Validation

**User Story:** As a release manager, I want production builds to be validated, so that distributed applications work correctly.

#### Acceptance Criteria

1. WHEN running npm run tauri:build, THE Tauri_App SHALL produce platform-specific installers
2. THE Tauri_App SHALL include all required resources in the bundle
3. THE Tauri_App SHALL set appropriate file permissions for bundled binaries
4. WHEN the bundled application starts, THE Backend_Sidecar SHALL run from Resource_Dir
5. WHEN the bundled application starts, THE Whisper_Server SHALL run from Resource_Dir
6. THE Tauri_App SHALL verify bundle integrity before distribution

### Requirement 13: Cross-Platform Compatibility

**User Story:** As a user on any platform, I want the application to work consistently, so that I have a reliable experience regardless of my operating system.

#### Acceptance Criteria

1. THE Tauri_App SHALL build successfully on Windows, Linux, and macOS
2. THE Tauri_App SHALL use platform-specific binary names (skhoot-backend.exe on Windows)
3. THE Tauri_App SHALL handle platform-specific path separators correctly
4. THE Tauri_App SHALL use conditional compilation for platform-specific features
5. THE Tauri_App SHALL provide fallback behavior when platform-specific features are unavailable
6. THE Tauri_App SHALL log platform detection information at startup

### Requirement 14: Error Handling and Logging

**User Story:** As a developer debugging issues, I want comprehensive logging, so that I can diagnose problems quickly.

#### Acceptance Criteria

1. WHEN initialization steps occur, THE Tauri_App SHALL log progress messages
2. WHEN errors occur, THE Tauri_App SHALL log detailed error messages with context
3. WHEN the Backend_Sidecar fails to start, THE Tauri_App SHALL log the failure reason
4. WHEN resources are missing, THE Tauri_App SHALL log which resources are missing
5. THE Tauri_App SHALL distinguish between development and production logging levels
6. WHEN critical errors occur, THE Tauri_App SHALL display user-friendly error dialogs

### Requirement 15: State Management

**User Story:** As a developer, I want application state managed correctly, so that features work reliably across the application lifecycle.

#### Acceptance Criteria

1. WHEN the application starts, THE Tauri_App SHALL initialize ApiKeyState with KeyStorage
2. WHEN the application starts, THE Tauri_App SHALL initialize TerminalState
3. WHEN the application starts, THE Tauri_App SHALL initialize AgentTauriState
4. WHEN the application starts, THE Tauri_App SHALL initialize WhisperState
5. THE Tauri_App SHALL make all state accessible to Tauri commands via app.manage()
6. WHEN state initialization fails, THE Tauri_App SHALL fail gracefully with error messages
