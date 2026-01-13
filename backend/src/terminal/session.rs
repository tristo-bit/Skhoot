//! Terminal Session - Individual PTY session management

use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty, Child};
use std::io::{Read, Write};
use std::sync::Arc;
use tokio::sync::{Mutex, mpsc};
use tokio::task::JoinHandle;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Configuration for a terminal session
#[derive(Debug, Clone)]
pub struct SessionConfig {
    pub shell: String,
    pub cols: u16,
    pub rows: u16,
    pub env: Vec<(String, String)>,
}

impl Default for SessionConfig {
    fn default() -> Self {
        // Use plain bash without user's custom config
        Self {
            shell: "/bin/bash".to_string(),
            cols: 80,
            rows: 24,
            env: vec![
                ("PS1".to_string(), "$ ".to_string()),  // Simple prompt
                ("TERM".to_string(), "dumb".to_string()), // Disable fancy sequences
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
    output_rx: Arc<Mutex<mpsc::Receiver<String>>>,
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
        
        // Create channel for output
        let (output_tx, output_rx) = mpsc::channel::<String>(1000);
        
        // Spawn async task to read from PTY
        let session_id = id.clone();
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
                        if output_tx.blocking_send(content).is_err() {
                            tracing::debug!("Output channel closed for session {}", session_id);
                            break;
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
            output_rx: Arc::new(Mutex::new(output_rx)),
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
    
    /// Read available output (non-blocking)
    pub async fn read(&self) -> Vec<String> {
        let mut rx = self.output_rx.lock().await;
        let mut output = Vec::new();
        
        // Drain all available messages without blocking
        while let Ok(msg) = rx.try_recv() {
            output.push(msg);
        }
        
        output
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
