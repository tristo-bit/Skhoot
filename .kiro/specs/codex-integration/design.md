# Codex-Main Integration Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Skhoot Frontend (React)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ChatInterface│  │ TerminalPanel│  │  UserPanel   │      │
│  │              │  │  (Ratatui)   │  │ (API Config) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                    Tauri IPC Bridge                          │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                  Tauri Backend (Rust)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PTY Manager  │  │ Key Storage  │  │ Process Mgr  │      │
│  │              │  │  (Encrypted) │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │  Codex-Main    │
                    │  CLI Process   │
                    └────────────────┘
```

## Component Design

### 1. Terminal Panel Component

#### TerminalPanel.tsx
```typescript
interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TerminalTab {
  id: string;
  title: string;
  type: 'shell' | 'codex' | 'skhoot-log';
  sessionId: string;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string;
  sessions: Map<string, TerminalSession>;
}
```

**Features**:
- Tab management (create, close, switch)
- Terminal rendering using ratatui bridge
- Input handling and forwarding
- Scrollback buffer (10,000 lines)
- Copy/paste support
- Search functionality
- Split panes (optional)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ [Shell] [Codex] [Skhoot Log] [+]              [×]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  $ codex                                            │
│  Welcome to Codex CLI                               │
│  > _                                                │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Terminal Icon Button
Add to `PromptArea.tsx`:
```typescript
<IconButton
  icon={<Terminal size={20} />}
  onClick={onToggleTerminal}
  variant="ghost"
  className="terminal-toggle"
  aria-label="Toggle terminal"
/>
```

Position: Left of the prompt input, before microphone button

### 2. API Key Management

#### Enhanced UserPanel.tsx

**New Section**: Multi-Provider API Configuration

```typescript
interface APIProvider {
  id: string;
  name: string;
  icon: string;
  keyFormat: RegExp;
  testEndpoint: string;
}

interface APIKeyConfig {
  provider: string;
  apiKey: string;
  isActive: boolean;
  lastTested?: Date;
  isValid?: boolean;
}

const PROVIDERS: APIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '/providers/openai.svg',
    keyFormat: /^sk-[a-zA-Z0-9]{48}$/,
    testEndpoint: 'https://api.openai.com/v1/models'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '/providers/anthropic.svg',
    keyFormat: /^sk-ant-[a-zA-Z0-9-]{95}$/,
    testEndpoint: 'https://api.anthropic.com/v1/messages'
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '/providers/google.svg',
    keyFormat: /^[a-zA-Z0-9_-]{39}$/,
    testEndpoint: 'https://generativelanguage.googleapis.com/v1/models'
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    icon: '/providers/custom.svg',
    keyFormat: /.+/,
    testEndpoint: '' // User-provided
  }
];
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────┐
│ API Configuration                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Provider Selection:                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ │ OpenAI  │ │Anthropic│ │ Google  │ │ Custom  │  │
│ │  [✓]    │ │         │ │         │ │         │  │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                     │
│ API Key:                                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ sk-••••••••••••••••••••••••••••••••••••     │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Custom Endpoint (optional):                         │
│ ┌─────────────────────────────────────────────┐   │
│ │ https://api.example.com/v1                  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [Test Connection] [Save API Key]                   │
│                                                     │
│ Status: ✅ Connected successfully                  │
└─────────────────────────────────────────────────────┘
```

### 3. Tauri Backend Commands

#### src-tauri/src/terminal.rs
```rust
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

pub struct TerminalSession {
    pty: Box<dyn portable_pty::MasterPty + Send>,
    reader: Box<dyn portable_pty::Child + Send>,
    writer: Box<dyn std::io::Write + Send>,
}

#[tauri::command]
pub async fn create_terminal_session(
    manager: State<'_, TerminalManager>,
    shell: Option<String>,
) -> Result<String, String> {
    // Create PTY session
    // Return session ID
}

#[tauri::command]
pub async fn write_to_terminal(
    manager: State<'_, TerminalManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    // Write data to PTY
}

#[tauri::command]
pub async fn read_from_terminal(
    manager: State<'_, TerminalManager>,
    session_id: String,
) -> Result<String, String> {
    // Read data from PTY
}

#[tauri::command]
pub async fn resize_terminal(
    manager: State<'_, TerminalManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    // Resize PTY
}

#[tauri::command]
pub async fn close_terminal_session(
    manager: State<'_, TerminalManager>,
    session_id: String,
) -> Result<(), String> {
    // Close PTY and cleanup
}
```

#### src-tauri/src/api_keys.rs
```rust
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use tauri::api::path::app_data_dir;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct APIKeyConfig {
    provider: String,
    encrypted_key: Vec<u8>,
    nonce: Vec<u8>,
    is_active: bool,
    last_tested: Option<i64>,
}

pub struct KeyStorage {
    cipher: Aes256Gcm,
    storage_path: PathBuf,
}

impl KeyStorage {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        // Initialize encryption key from platform keychain
        // Set up storage path
    }

    pub fn save_key(&self, config: &APIKeyConfig) -> Result<(), String> {
        // Encrypt and save key
    }

    pub fn load_key(&self, provider: &str) -> Result<String, String> {
        // Load and decrypt key
    }

    pub fn delete_key(&self, provider: &str) -> Result<(), String> {
        // Delete key
    }

    pub fn list_providers(&self) -> Result<Vec<String>, String> {
        // List configured providers
    }
}

#[tauri::command]
pub async fn save_api_key(
    storage: State<'_, KeyStorage>,
    provider: String,
    api_key: String,
) -> Result<(), String> {
    storage.save_key(&APIKeyConfig {
        provider,
        encrypted_key: vec![], // Will be encrypted
        nonce: vec![],
        is_active: true,
        last_tested: None,
    })
}

#[tauri::command]
pub async fn load_api_key(
    storage: State<'_, KeyStorage>,
    provider: String,
) -> Result<String, String> {
    storage.load_key(&provider)
}

#[tauri::command]
pub async fn test_api_key(
    provider: String,
    api_key: String,
    endpoint: Option<String>,
) -> Result<bool, String> {
    // Test API key by making a simple request
}
```

#### src-tauri/src/codex_integration.rs
```rust
use std::process::{Command, Stdio};
use tokio::process::Child;

pub struct CodexProcess {
    child: Option<Child>,
    api_key: String,
    provider: String,
}

impl CodexProcess {
    pub fn new(api_key: String, provider: String) -> Self {
        Self {
            child: None,
            api_key,
            provider,
        }
    }

    pub async fn start(&mut self) -> Result<(), String> {
        // Get codex binary path
        let codex_bin = self.get_codex_binary_path()?;

        // Set up environment
        let mut cmd = Command::new(codex_bin);
        cmd.env("OPENAI_API_KEY", &self.api_key);
        cmd.env("CODEX_PROVIDER", &self.provider);
        cmd.stdin(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        // Spawn process
        let child = tokio::process::Command::from(cmd)
            .spawn()
            .map_err(|e| format!("Failed to start codex: {}", e))?;

        self.child = Some(child);
        Ok(())
    }

    pub async fn send_command(&mut self, command: &str) -> Result<String, String> {
        // Send command to codex stdin
        // Read response from stdout
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            child.kill().await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn get_codex_binary_path(&self) -> Result<PathBuf, String> {
        // Return bundled codex binary path based on platform
        #[cfg(target_os = "linux")]
        return Ok(PathBuf::from("resources/codex-linux"));
        
        #[cfg(target_os = "macos")]
        return Ok(PathBuf::from("resources/codex-macos"));
        
        #[cfg(target_os = "windows")]
        return Ok(PathBuf::from("resources/codex-windows.exe"));
    }
}

#[tauri::command]
pub async fn start_codex(
    state: State<'_, Arc<Mutex<CodexProcess>>>,
) -> Result<(), String> {
    let mut process = state.lock().unwrap();
    process.start().await
}

#[tauri::command]
pub async fn send_codex_command(
    state: State<'_, Arc<Mutex<CodexProcess>>>,
    command: String,
) -> Result<String, String> {
    let mut process = state.lock().unwrap();
    process.send_command(&command).await
}

#[tauri::command]
pub async fn stop_codex(
    state: State<'_, Arc<Mutex<CodexProcess>>>,
) -> Result<(), String> {
    let mut process = state.lock().unwrap();
    process.stop().await
}
```

### 4. Ratatui Integration

#### Terminal Rendering Bridge

Since ratatui is a terminal UI library that renders to stdout, we need a bridge to capture its output and display it in the Tauri app.

**Approach**: Use a virtual terminal (PTY) that ratatui writes to, then capture and forward the output to the frontend.

```rust
// src-tauri/src/ratatui_bridge.rs
use crossterm::{
    event::{self, Event, KeyCode},
    terminal::{disable_raw_mode, enable_raw_mode},
};
use ratatui::{
    backend::CrosstermBackend,
    Terminal,
};

pub struct RatatuiSession {
    terminal: Terminal<CrosstermBackend<Box<dyn Write + Send>>>,
    output_buffer: Arc<Mutex<Vec<u8>>>,
}

impl RatatuiSession {
    pub fn new() -> Result<Self, String> {
        // Create in-memory buffer for terminal output
        let buffer = Arc::new(Mutex::new(Vec::new()));
        let backend = CrosstermBackend::new(Box::new(buffer.clone()));
        let terminal = Terminal::new(backend)
            .map_err(|e| format!("Failed to create terminal: {}", e))?;

        Ok(Self {
            terminal,
            output_buffer: buffer,
        })
    }

    pub fn render<F>(&mut self, render_fn: F) -> Result<Vec<u8>, String>
    where
        F: FnOnce(&mut Frame),
    {
        self.terminal
            .draw(render_fn)
            .map_err(|e| format!("Render error: {}", e))?;

        let output = self.output_buffer.lock().unwrap().clone();
        self.output_buffer.lock().unwrap().clear();
        Ok(output)
    }
}
```

### 5. Frontend Services

#### services/terminalService.ts
```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

export interface TerminalSession {
  id: string;
  type: 'shell' | 'codex' | 'skhoot-log';
  isActive: boolean;
}

class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private listeners: Map<string, () => void> = new Map();

  async createSession(type: 'shell' | 'codex' | 'skhoot-log'): Promise<string> {
    const sessionId = await invoke<string>('create_terminal_session', {
      shell: type === 'shell' ? undefined : 'codex',
    });

    this.sessions.set(sessionId, {
      id: sessionId,
      type,
      isActive: true,
    });

    // Listen for output
    const unlisten = await listen<string>(`terminal-output-${sessionId}`, (event) => {
      this.handleOutput(sessionId, event.payload);
    });

    this.listeners.set(sessionId, unlisten);

    return sessionId;
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    await invoke('write_to_terminal', { sessionId, data });
  }

  async closeSession(sessionId: string): Promise<void> {
    const unlisten = this.listeners.get(sessionId);
    if (unlisten) {
      unlisten();
      this.listeners.delete(sessionId);
    }

    await invoke('close_terminal_session', { sessionId });
    this.sessions.delete(sessionId);
  }

  private handleOutput(sessionId: string, data: string): void {
    // Emit event for UI to handle
    window.dispatchEvent(
      new CustomEvent('terminal-data', {
        detail: { sessionId, data },
      })
    );
  }
}

export const terminalService = new TerminalService();
```

#### services/apiKeyService.ts
```typescript
import { invoke } from '@tauri-apps/api/tauri';

export interface APIProvider {
  id: string;
  name: string;
  icon: string;
  testEndpoint: string;
}

export interface APIKeyStatus {
  provider: string;
  isConfigured: boolean;
  isValid: boolean;
  lastTested?: Date;
}

class APIKeyService {
  async saveKey(provider: string, apiKey: string): Promise<void> {
    await invoke('save_api_key', { provider, apiKey });
  }

  async loadKey(provider: string): Promise<string> {
    return await invoke<string>('load_api_key', { provider });
  }

  async testKey(
    provider: string,
    apiKey: string,
    endpoint?: string
  ): Promise<boolean> {
    return await invoke<boolean>('test_api_key', {
      provider,
      apiKey,
      endpoint,
    });
  }

  async deleteKey(provider: string): Promise<void> {
    await invoke('delete_api_key', { provider });
  }

  async listProviders(): Promise<string[]> {
    return await invoke<string[]>('list_providers');
  }

  async getActiveProvider(): Promise<string | null> {
    return await invoke<string | null>('get_active_provider');
  }

  async setActiveProvider(provider: string): Promise<void> {
    await invoke('set_active_provider', { provider });
  }
}

export const apiKeyService = new APIKeyService();
```

#### services/codexService.ts
```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

class CodexService {
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) return;

    await invoke('start_codex');
    this.isRunning = true;

    // Listen for codex events
    await listen('codex-output', (event) => {
      console.log('Codex output:', event.payload);
    });
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.isRunning) {
      await this.start();
    }

    return await invoke<string>('send_codex_command', { command });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    await invoke('stop_codex');
    this.isRunning = false;
  }

  async getStatus(): Promise<{ running: boolean; version: string }> {
    return await invoke('get_codex_status');
  }
}

export const codexService = new CodexService();
```

## Data Flow

### Terminal Input/Output Flow
```
User Input → TerminalPanel → terminalService.writeToSession()
  → Tauri IPC → PTY → Shell/Codex Process
  → PTY Output → Tauri Event → terminalService listener
  → TerminalPanel Update → Ratatui Render → Display
```

### API Key Configuration Flow
```
User Input → UserPanel → apiKeyService.saveKey()
  → Tauri IPC → KeyStorage.save_key()
  → Encrypt with AES-256-GCM → Save to App Data Dir
  → Return Success → Update UI
```

### Codex Command Flow
```
Chat Input → ChatInterface → codexService.sendCommand()
  → Tauri IPC → CodexProcess.send_command()
  → Write to Codex stdin → Read from Codex stdout
  → Parse Response → Return to Frontend
  → Display in Chat or Terminal
```

## Security Considerations

### API Key Encryption
- Use AES-256-GCM for encryption
- Generate unique nonce for each encryption
- Store encryption key in platform keychain:
  - Linux: Secret Service API (libsecret)
  - macOS: Keychain Services
  - Windows: Credential Manager
- Never log or expose plaintext keys
- Clear keys from memory after use

### Terminal Security
- Sanitize all input before sending to PTY
- Prevent command injection
- Limit terminal output buffer size
- Implement rate limiting for commands
- Validate all file paths from terminal operations

### Process Isolation
- Run codex process with minimal permissions
- Use sandboxing where available
- Monitor resource usage
- Implement timeout for long-running commands
- Clean up zombie processes

## Performance Optimization

### Terminal Rendering
- Use virtual scrolling for large output
- Debounce rapid updates (16ms / 60fps)
- Implement incremental rendering
- Cache rendered frames
- Use Web Workers for heavy processing

### API Key Operations
- Cache decrypted keys in memory (with timeout)
- Lazy load provider configurations
- Batch multiple key operations
- Use async operations throughout

### Codex Integration
- Reuse codex process across commands
- Implement command queue
- Stream large outputs
- Use binary protocol where possible
- Implement connection pooling

## Error Handling

### Terminal Errors
- PTY creation failure → Show error, offer retry
- Session timeout → Auto-reconnect
- Output overflow → Truncate with warning
- Invalid input → Sanitize and warn

### API Key Errors
- Encryption failure → Clear error message
- Invalid key format → Validation before save
- Test connection failure → Detailed error info
- Storage permission denied → Guide user to fix

### Codex Errors
- Binary not found → Offer to download
- Startup failure → Check logs, show diagnostics
- Command timeout → Cancel and notify
- Crash → Auto-restart with backoff

## Testing Strategy

### Unit Tests
- Terminal session management
- API key encryption/decryption
- Command parsing and validation
- Error handling paths

### Integration Tests
- End-to-end terminal workflow
- API key save/load/test cycle
- Codex command execution
- Multi-tab terminal operations

### Security Tests
- Key encryption strength
- Input sanitization
- Process isolation
- Memory leak detection

### Performance Tests
- Terminal rendering FPS
- Large output handling
- Concurrent session management
- Memory usage under load

## Migration Plan

### Phase 1: Terminal Foundation
1. Implement PTY management in Tauri
2. Create TerminalPanel component
3. Add terminal icon button
4. Basic shell session support

### Phase 2: API Key Management
1. Implement secure storage
2. Enhance UserPanel UI
3. Add provider selection
4. Implement key testing

### Phase 3: Codex Integration
1. Bundle codex binary
2. Implement process management
3. Connect API keys to codex
4. Add codex-specific terminal tab

### Phase 4: Polish & Optimization
1. Performance tuning
2. Error handling improvements
3. UI/UX refinements
4. Documentation

## Rollback Plan

If integration fails:
1. Feature flag to disable terminal
2. Revert to external codex CLI
3. Keep API key storage for future use
4. Document lessons learned
