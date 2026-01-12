use serde::{Deserialize, Serialize};

// Re-export types from backend
use skhoot_backend::cli_bridge::{
    CliBridge, TerminalOutput, OutputType,
    SessionInfo, CommandHistoryEntry,
};

/// Serializable session info for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfoDto {
    pub session_id: String,
    pub state: String,
    pub created_at: i64,
    pub last_activity: i64,
}

impl From<SessionInfo> for SessionInfoDto {
    fn from(info: SessionInfo) -> Self {
        Self {
            session_id: info.session_id,
            state: format!("{:?}", info.state),
            created_at: info.created_at.timestamp(),
            last_activity: info.last_activity.timestamp(),
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

impl From<TerminalOutput> for TerminalOutputDto {
    fn from(output: TerminalOutput) -> Self {
        Self {
            output_type: match output.output_type {
                OutputType::Stdout => "stdout".to_string(),
                OutputType::Stderr => "stderr".to_string(),
                OutputType::System => "system".to_string(),
            },
            content: output.content,
            timestamp: output.timestamp.timestamp(),
        }
    }
}

/// Command history entry for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandHistoryDto {
    pub session_id: String,
    pub command: String,
    pub args: Vec<String>,
    pub timestamp: i64,
    pub status: String,
}

impl From<CommandHistoryEntry> for CommandHistoryDto {
    fn from(entry: CommandHistoryEntry) -> Self {
        Self {
            session_id: entry.session_id,
            command: entry.command,
            args: entry.args,
            timestamp: entry.timestamp.timestamp(),
            status: format!("{:?}", entry.status),
        }
    }
}

// Thread-local CLI bridge using thread_local macro
use std::cell::RefCell;

thread_local! {
    static CLI_BRIDGE: RefCell<CliBridge> = RefCell::new(CliBridge::new());
}

/// Create a new terminal session
#[tauri::command]
pub async fn create_terminal_session(
    shell: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    println!("[Terminal] create_terminal_session called with shell={:?}, cols={:?}, rows={:?}", shell, cols, rows);
    
    // Determine shell command
    let shell_cmd = shell.unwrap_or_else(|| {
        #[cfg(target_os = "windows")]
        { 
            println!("[Terminal] Using default Windows shell: powershell.exe");
            "powershell.exe".to_string() 
        }
        #[cfg(not(target_os = "windows"))]
        { 
            let default_shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
            println!("[Terminal] Using default Unix shell: {}", default_shell);
            default_shell
        }
    });
    
    println!("[Terminal] Final shell command: {}", shell_cmd);
    
    // Run in blocking task to avoid Send issues
    tokio::task::spawn_blocking(move || {
        println!("[Terminal] Entering spawn_blocking task");
        CLI_BRIDGE.with(|bridge| {
            println!("[Terminal] Inside CLI_BRIDGE.with");
            let bridge = bridge.borrow();
            // Create a new runtime for this blocking context
            let rt = tokio::runtime::Runtime::new().unwrap();
            println!("[Terminal] Created new runtime, calling execute_command_pty");
            let result = rt.block_on(bridge.execute_command_pty(shell_cmd.clone(), vec![], cols, rows));
            println!("[Terminal] execute_command_pty result: {:?}", result);
            result
        })
    })
    .await
    .map_err(|e| {
        let err_msg = format!("Task join error: {}", e);
        eprintln!("[Terminal] {}", err_msg);
        err_msg
    })?
    .map(|handle| {
        println!("[Terminal] Session created successfully with ID: {}", handle.session_id);
        handle.session_id
    })
    .map_err(|e| {
        let err_msg = format!("Failed to create terminal session: {}", e);
        eprintln!("[Terminal] {}", err_msg);
        err_msg
    })
}

/// Write data to a terminal session
#[tauri::command]
pub async fn write_to_terminal(
    session_id: String,
    data: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        CLI_BRIDGE.with(|bridge| {
            let bridge = bridge.borrow();
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(bridge.write_input(session_id, data))
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| format!("Failed to write to terminal: {}", e))
}

/// Read output from a terminal session
#[tauri::command]
pub async fn read_from_terminal(
    session_id: String,
) -> Result<Vec<TerminalOutputDto>, String> {
    tokio::task::spawn_blocking(move || {
        CLI_BRIDGE.with(|bridge| {
            let bridge = bridge.borrow();
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(bridge.read_output(session_id))
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map(|outputs| outputs.into_iter().map(TerminalOutputDto::from).collect())
    .map_err(|e| format!("Failed to read from terminal: {}", e))
}

/// Resize a terminal session
#[tauri::command]
pub async fn resize_terminal(
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        CLI_BRIDGE.with(|bridge| {
            let bridge = bridge.borrow();
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(bridge.resize_pty(&session_id, cols, rows))
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| format!("Failed to resize terminal: {}", e))
}

/// Close a terminal session
#[tauri::command]
pub async fn close_terminal_session(
    session_id: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        CLI_BRIDGE.with(|bridge| {
            let bridge = bridge.borrow();
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(bridge.terminate_session(session_id))
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| format!("Failed to close terminal session: {}", e))
}

/// List all active terminal sessions
#[tauri::command]
pub async fn list_terminal_sessions() -> Result<Vec<SessionInfoDto>, String> {
    tokio::task::spawn_blocking(move || {
        CLI_BRIDGE.with(|bridge| {
            let bridge = bridge.borrow();
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(bridge.list_active_sessions())
        })
    })
    .await
    .map(|sessions| sessions.into_iter().map(SessionInfoDto::from).collect())
    .map_err(|e| format!("Task join error: {}", e))
}

/// Get command history for a session
#[tauri::command]
pub async fn get_session_history(
    session_id: String,
) -> Result<Vec<CommandHistoryDto>, String> {
    tokio::task::spawn_blocking(move || {
        CLI_BRIDGE.with(|bridge| {
            let bridge = bridge.borrow();
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(bridge.get_session_history(&session_id))
        })
    })
    .await
    .map(|history| history.into_iter().map(CommandHistoryDto::from).collect())
    .map_err(|e| format!("Task join error: {}", e))
}

/// Get session state
#[tauri::command]
pub async fn get_session_state(
    session_id: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        CLI_BRIDGE.with(|bridge| {
            let bridge = bridge.borrow();
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(bridge.get_session_state(&session_id))
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map(|state| format!("{:?}", state))
    .map_err(|e| format!("Failed to get session state: {}", e))
}