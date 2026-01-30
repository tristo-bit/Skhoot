//! Terminal Session - Individual PTY session management

use portable_pty::{native_pty_system, CommandBuilder, PtySize, Child};
use std::io::{Read, Write};
use std::sync::Arc;
use std::path::PathBuf;
use tokio::sync::{Mutex, mpsc};
use tokio::task::JoinHandle;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Configuration for a terminal session
#[derive(Debug, Clone)]
pub struct SessionConfig {
    pub shell: String,
    pub cwd: Option<PathBuf>,
    pub cols: u16,
    pub rows: u16,
    pub env: Vec<(String, String)>,
}

impl Default for SessionConfig {
    fn default() -> Self {
        let shell = if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            // Check if bash exists, fallback to sh
            if std::path::Path::new("/bin/bash").exists() {
                "/bin/bash".to_string()
            } else {
                "/bin/sh".to_string()
            }
        };

        Self {
            shell,
            cwd: None,
            cols: 80,
            rows: 24,
            env: vec![
                ("PS1".to_string(), "$ ".to_string()),  // Simple prompt
                ("TERM".to_string(), "xterm-256color".to_string()), // More standard than 'dumb'
                // Force UTF-8 encoding in PowerShell to prevent issues with special characters in prod
                ("PYTHONIOENCODING".to_string(), "utf-8".to_string()),
            ],
        }
    }
}

/// A terminal session with PTY support
pub struct TerminalSession {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    config: SessionConfig,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    // Store history in a shared buffer instead of consuming channel
    history: Arc<tokio::sync::RwLock<Vec<String>>>,
    _reader_handle: JoinHandle<()>,
    _child: Box<dyn Child + Send + Sync>,
}

impl TerminalSession {
    /// Create a new terminal session
    pub fn new(config: SessionConfig) -> Result<Self, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        tracing::info!("Creating terminal session {} with shell: {}", id, config.shell);
        
        let pty_system = native_pty_system();
        let size = PtySize {
            rows: config.rows,
            cols: config.cols,
            pixel_width: 0,
            pixel_height: 0,
        };
        
        let pair = pty_system.openpty(size)
            .map_err(|e| format!("Failed to open PTY: {}", e))?;
        
        let mut cmd = CommandBuilder::new(&config.shell);
        
        // Set working directory if provided
        if let Some(ref cwd) = config.cwd {
            cmd.cwd(cwd);
        }
        
        // On Windows, use -NoLogo -NoProfile -ExecutionPolicy Bypass for powershell
        // This ensures a clean, fast startup and prevents policy blocks in prod
        if cfg!(target_os = "windows") && config.shell.contains("powershell.exe") {
            cmd.args(&["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass"]);
        }

        // Add --norc --noprofile to skip user's bashrc (avoids fancy prompts)
        if config.shell.contains("bash") {
            cmd.args(&["--norc", "--noprofile"]);
        }
        for (key, value) in &config.env {
            cmd.env(key, value);
        }
        
        let child = pair.slave.spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;
        
        let writer = pair.master.take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {}", e))?;
        
        let mut reader = pair.master.try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {}", e))?;
        
        // Shared history buffer
        let history = Arc::new(tokio::sync::RwLock::new(Vec::new()));
        
        // Spawn async task to read from PTY
        let session_id = id.clone();
        let history_clone = history.clone();
        
        let reader_handle = tokio::task::spawn_blocking(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        tracing::debug!("PTY reader EOF for session {}", session_id);
                        break;
                    }
                    Ok(n) => {
                        let content = String::from_utf8_lossy(&buf[..n]).to_string();
                        // Append to history
                        let history = history_clone.blocking_write();
                        let mut history = history; // satisfy borrow checker if needed
                        history.push(content);
                        
                        // Limit history size (e.g. 5000 chunks)
                        if history.len() > 5000 {
                            let keep = history.len() - 4000;
                            history.drain(0..keep);
                        }
                    }
                    Err(e) => {
                        tracing::warn!("PTY read error for session {}: {}", session_id, e);
                        break;
                    }
                }
            }
        });
        
        Ok(Self {
            id,
            created_at: now,
            last_activity: now,
            config,
            writer: Arc::new(Mutex::new(writer)),
            history,
            _reader_handle: reader_handle,
            _child: child,
        })
    }
    
    /// Write data to the terminal
    pub async fn write(&self, data: &str) -> Result<(), String> {
        let mut writer = self.writer.lock().await;
        writer.write_all(data.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        writer.flush()
            .map_err(|e| format!("Flush error: {}", e))?;
        Ok(())
    }
    
    /// Read recent output
    /// Returns lines since the last read index if provided, or the tail.
    /// Returns (lines, new_index)
    pub async fn read_from(&self, start_index: usize) -> (Vec<String>, usize) {
        let history = self.history.read().await;
        let len = history.len();
        
        if start_index >= len {
            return (Vec::new(), len);
        }
        
        let lines = history[start_index..].to_vec();
        (lines, len)
    }

    /// Read recent output (legacy compatibility)
    pub async fn read(&self) -> Vec<String> {
        let history = self.history.read().await;
        // Return last 100 chunks if history is large
        let start = history.len().saturating_sub(100);
        history[start..].to_vec()
    }
    
    /// Get session info
    pub fn info(&self) -> SessionInfo {
        SessionInfo {
            id: self.id.clone(),
            shell: self.config.shell.clone(),
            cols: self.config.cols,
            rows: self.config.rows,
            created_at: self.created_at,
            last_activity: self.last_activity,
        }
    }
}

/// Session information for API responses
#[derive(Debug, Clone, serde::Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub shell: String,
    pub cols: u16,
    pub rows: u16,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}
