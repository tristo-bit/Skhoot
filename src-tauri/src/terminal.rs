use serde::{Deserialize, Serialize};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::State;
use uuid::Uuid;

/// Terminal session state
pub struct TerminalState {
    sessions: Arc<Mutex<HashMap<String, PtySessionHandle>>>,
}

impl Default for TerminalState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

/// Handle to a PTY session
struct PtySessionHandle {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    output_buffer: Arc<Mutex<Vec<String>>>,
    #[allow(dead_code)]
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

/// Terminal output for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalOutputDto {
    pub output_type: String,
    pub content: String,
    pub timestamp: i64,
}

/// Session info for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfoDto {
    pub session_id: String,
    pub state: String,
    pub created_at: i64,
    pub last_activity: i64,
}

/// Create a new terminal session
#[tauri::command]
pub fn create_terminal_session(
    state: State<'_, TerminalState>,
    shell: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    let cols = cols.unwrap_or(80);
    let rows = rows.unwrap_or(24);
    
    let shell_cmd = shell.unwrap_or_else(|| {
        #[cfg(target_os = "windows")]
        { "powershell.exe".to_string() }
        #[cfg(not(target_os = "windows"))]
        { "/bin/bash".to_string() } // Use plain bash, not user's SHELL
    });
    
    println!("[Terminal] Creating session with shell: {}, size: {}x{}", shell_cmd, cols, rows);
    
    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };
    
    let pair = pty_system.openpty(size).map_err(|e| format!("Failed to open PTY: {}", e))?;
    
    // Use --norc --noprofile to skip user's bashrc/profile (avoids fancy prompts)
    let mut cmd = CommandBuilder::new(&shell_cmd);
    cmd.args(&["--norc", "--noprofile"]);
    
    // Set a simple prompt
    cmd.env("PS1", "$ ");
    cmd.env("TERM", "dumb"); // Disable colors and special sequences
    
    let child = pair.slave.spawn_command(cmd).map_err(|e| format!("Failed to spawn shell: {}", e))?;
    
    let writer = pair.master.take_writer().map_err(|e| format!("Failed to get writer: {}", e))?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to get reader: {}", e))?;
    
    let session_id = Uuid::new_v4().to_string();
    let output_buffer: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    
    // Spawn a thread to read from PTY and buffer output
    let buffer_clone = output_buffer.clone();
    let session_id_clone = session_id.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    println!("[Terminal] Reader EOF for session {}", session_id_clone);
                    break;
                }
                Ok(n) => {
                    let content = String::from_utf8_lossy(&buf[..n]).to_string();
                    if let Ok(mut buffer) = buffer_clone.lock() {
                        buffer.push(content);
                        // Keep buffer from growing too large
                        if buffer.len() > 1000 {
                            buffer.drain(0..500);
                        }
                    }
                }
                Err(e) => {
                    println!("[Terminal] Reader error for session {}: {}", session_id_clone, e);
                    break;
                }
            }
        }
    });
    
    let handle = PtySessionHandle {
        writer: Arc::new(Mutex::new(writer)),
        output_buffer,
        child,
    };
    
    {
        let mut sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
        sessions.insert(session_id.clone(), handle);
    }
    
    println!("[Terminal] Session created: {}", session_id);
    Ok(session_id)
}

/// Write data to a terminal session
#[tauri::command]
pub fn write_to_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    let session = sessions.get(&session_id).ok_or("Session not found")?;
    
    let mut writer = session.writer.lock().map_err(|e| format!("Writer lock error: {}", e))?;
    writer.write_all(data.as_bytes()).map_err(|e| format!("Write error: {}", e))?;
    writer.flush().map_err(|e| format!("Flush error: {}", e))?;
    
    Ok(())
}

/// Read output from a terminal session (non-blocking, returns buffered output)
#[tauri::command]
pub fn read_from_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<Vec<TerminalOutputDto>, String> {
    let sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    let session = sessions.get(&session_id).ok_or("Session not found")?;
    
    let mut buffer = session.output_buffer.lock().map_err(|e| format!("Buffer lock error: {}", e))?;
    
    let outputs: Vec<TerminalOutputDto> = buffer.drain(..).map(|content| {
        TerminalOutputDto {
            output_type: "stdout".to_string(),
            content,
            timestamp: chrono::Utc::now().timestamp(),
        }
    }).collect();
    
    Ok(outputs)
}

/// Resize a terminal session
#[tauri::command]
pub fn resize_terminal(
    _state: State<'_, TerminalState>,
    _session_id: String,
    _cols: u16,
    _rows: u16,
) -> Result<(), String> {
    // Resizing requires keeping the master handle
    // This is a simplified implementation
    Ok(())
}

/// Close a terminal session
#[tauri::command]
pub fn close_terminal_session(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    sessions.remove(&session_id).ok_or("Session not found")?;
    println!("[Terminal] Session closed: {}", session_id);
    Ok(())
}

/// List all active terminal sessions
#[tauri::command]
pub fn list_terminal_sessions(
    state: State<'_, TerminalState>,
) -> Result<Vec<SessionInfoDto>, String> {
    let sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = chrono::Utc::now().timestamp();
    
    Ok(sessions.keys().map(|id| SessionInfoDto {
        session_id: id.clone(),
        state: "Running".to_string(),
        created_at: now,
        last_activity: now,
    }).collect())
}

/// Get command history for a session (stub)
#[tauri::command]
pub fn get_session_history(
    _session_id: String,
) -> Result<Vec<String>, String> {
    Ok(vec![])
}

/// Get session state
#[tauri::command]
pub fn get_session_state(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<String, String> {
    let sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    if sessions.contains_key(&session_id) {
        Ok("Running".to_string())
    } else {
        Err("Session not found".to_string())
    }
}
