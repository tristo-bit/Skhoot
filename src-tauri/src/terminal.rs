use serde::{Deserialize, Serialize};
use skhoot_backend::TerminalManager;
use tauri::State;

/// Terminal session state
pub struct TerminalState {
    pub manager: TerminalManager,
}

impl Default for TerminalState {
    fn default() -> Self {
        Self {
            manager: TerminalManager::default(),
        }
    }
}

/// Terminal output for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalOutputDto {
    pub output_type: String,
    pub content: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalReadResultDto {
    pub outputs: Vec<TerminalOutputDto>,
    pub next_cursor: usize,
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
pub async fn create_terminal_session(
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
        { "/bin/bash".to_string() }
    });
    
    println!("[Terminal] Creating session with shell: {}, size: {}x{}", shell_cmd, cols, rows);
    
    let config = skhoot_backend::terminal::SessionConfig {
        shell: shell_cmd,
        cols,
        rows,
        env: vec![
            ("TERM".to_string(), "xterm-256color".to_string()),
            ("PS1".to_string(), "$ ".to_string()),
        ],
    };
    
    state.manager.create_session(Some(config)).await
}

/// Write data to a terminal session
#[tauri::command]
pub async fn write_to_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state.manager.write(&session_id, &data).await
}

/// Read output from a terminal session
#[tauri::command]
pub async fn read_from_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
    cursor: Option<usize>,
) -> Result<TerminalReadResultDto, String> {
    let start_index = cursor.unwrap_or(0);
    let (raw_lines, next_cursor) = state.manager.read_from(&session_id, start_index).await?;
    
    let outputs: Vec<TerminalOutputDto> = raw_lines.into_iter().map(|content| {
        TerminalOutputDto {
            output_type: "stdout".to_string(),
            content,
            timestamp: chrono::Utc::now().timestamp(),
        }
    }).collect();
    
    Ok(TerminalReadResultDto {
        outputs,
        next_cursor,
    })
}

/// Resize a terminal session
#[tauri::command]
pub async fn resize_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    // Note: TerminalManager doesn't expose resize yet, but we can add it
    // For now this is a stub
    Ok(())
}

/// Close a terminal session
#[tauri::command]
pub async fn close_terminal_session(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<(), String> {
    state.manager.close_session(&session_id).await
}

/// List all active terminal sessions
#[tauri::command]
pub async fn list_terminal_sessions(
    state: State<'_, TerminalState>,
) -> Result<Vec<SessionInfoDto>, String> {
    let sessions = state.manager.list_sessions().await;
    
    Ok(sessions.into_iter().map(|s| SessionInfoDto {
        session_id: s.id,
        state: "Running".to_string(),
        created_at: s.created_at.timestamp(),
        last_activity: s.last_activity.timestamp(),
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
pub async fn get_session_state(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<String, String> {
    if state.manager.get_session(&session_id).await.is_some() {
        Ok("Running".to_string())
    } else {
        Err("Session not found".to_string())
    }
}
