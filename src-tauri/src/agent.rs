//! Agent Tauri Commands
//!
//! Provides Tauri commands for the CLI Agent, enabling the frontend to
//! create agent sessions, send messages, and execute tools.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;

/// Session state - lightweight, no PTY or complex types
#[derive(Debug, Clone)]
struct AgentSessionState {
    id: String,
    provider: String,
    model: String,
    working_directory: PathBuf,
    temperature: f32,
    max_tokens: u32,
    messages: Vec<StoredMessage>,
    state: String,
    created_at: u64,
    last_activity: u64,
}

/// Stored message in session
#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredMessage {
    id: String,
    role: String,
    content: String,
    tool_calls: Option<Vec<ToolCallDto>>,
    tool_call_id: Option<String>,
    timestamp: u64,
}

/// Agent state managed by Tauri
pub struct AgentTauriState {
    sessions: Arc<RwLock<HashMap<String, AgentSessionState>>>,
}

impl Default for AgentTauriState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

/// Agent session creation options
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CreateAgentSessionOptions {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub working_directory: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

/// Agent message for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessageDto {
    pub id: String,
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCallDto>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    pub timestamp: u64,
}


/// Tool call for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallDto {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

/// Tool execution request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteToolRequest {
    pub tool_call_id: String,
    pub tool_name: String,
    pub arguments: serde_json::Value,
}

/// Tool result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResultDto {
    pub tool_call_id: String,
    pub success: bool,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
}

/// Agent status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatusDto {
    pub session_id: String,
    pub state: String,
    pub message_count: usize,
    pub pending_tool_calls: usize,
    pub created_at: u64,
    pub last_activity: u64,
    pub provider: String,
    pub model: String,
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn generate_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let count = COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("{}-{}", current_timestamp(), count)
}

/// Create a new agent session
#[tauri::command]
pub async fn create_agent_session(
    state: State<'_, AgentTauriState>,
    session_id: String,
    options: Option<CreateAgentSessionOptions>,
) -> Result<AgentStatusDto, String> {
    println!("[Agent] Creating session: {}", session_id);
    
    let opts = options.unwrap_or_default();
    let now = current_timestamp();
    
    let session = AgentSessionState {
        id: session_id.clone(),
        provider: opts.provider.unwrap_or_else(|| "google".to_string()),
        model: opts.model.unwrap_or_else(|| "gemini-2.0-flash".to_string()),
        working_directory: opts.working_directory
            .map(PathBuf::from)
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))),
        temperature: opts.temperature.unwrap_or(0.7),
        max_tokens: opts.max_tokens.unwrap_or(4096),
        messages: Vec::new(),
        state: "ready".to_string(),
        created_at: now,
        last_activity: now,
    };
    
    let status = AgentStatusDto {
        session_id: session.id.clone(),
        state: session.state.clone(),
        message_count: 0,
        pending_tool_calls: 0,
        created_at: session.created_at,
        last_activity: session.last_activity,
        provider: session.provider.clone(),
        model: session.model.clone(),
    };
    
    state.sessions.write().await.insert(session_id.clone(), session);
    
    println!("[Agent] Session created: {}", session_id);
    Ok(status)
}

/// Send a message to the agent
#[tauri::command]
pub async fn send_agent_message(
    state: State<'_, AgentTauriState>,
    app_handle: AppHandle,
    session_id: String,
    message: String,
) -> Result<AgentMessageDto, String> {
    println!("[Agent] Message to session {}: {}", session_id, &message[..message.len().min(50)]);
    
    let mut sessions = state.sessions.write().await;
    let session = sessions.get_mut(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;
    
    let msg = StoredMessage {
        id: generate_id(),
        role: "user".to_string(),
        content: message.clone(),
        tool_calls: None,
        tool_call_id: None,
        timestamp: current_timestamp(),
    };
    
    session.messages.push(msg.clone());
    session.last_activity = current_timestamp();
    
    let dto = AgentMessageDto {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tool_calls: None,
        tool_call_id: None,
        timestamp: msg.timestamp,
    };
    
    let _ = app_handle.emit(&format!("agent:message:{}", session_id), &dto);
    Ok(dto)
}

/// Get the current status of an agent session
#[tauri::command]
pub async fn get_agent_status(
    state: State<'_, AgentTauriState>,
    session_id: String,
) -> Result<AgentStatusDto, String> {
    let sessions = state.sessions.read().await;
    let session = sessions.get(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;
    
    let pending = session.messages.iter()
        .filter_map(|m| m.tool_calls.as_ref())
        .flatten()
        .count();
    
    Ok(AgentStatusDto {
        session_id: session.id.clone(),
        state: session.state.clone(),
        message_count: session.messages.len(),
        pending_tool_calls: pending,
        created_at: session.created_at,
        last_activity: session.last_activity,
        provider: session.provider.clone(),
        model: session.model.clone(),
    })
}


/// Execute a tool call
#[tauri::command]
pub async fn execute_agent_tool(
    state: State<'_, AgentTauriState>,
    app_handle: AppHandle,
    session_id: String,
    request: ExecuteToolRequest,
) -> Result<ToolResultDto, String> {
    println!("[Agent] Executing tool {} for session {}", request.tool_name, session_id);
    
    let working_dir = {
        let sessions = state.sessions.read().await;
        let session = sessions.get(&session_id)
            .ok_or_else(|| format!("Session not found: {}", session_id))?;
        session.working_directory.clone()
    };
    
    let _ = app_handle.emit(&format!("agent:tool_start:{}", session_id), &ToolCallDto {
        id: request.tool_call_id.clone(),
        name: request.tool_name.clone(),
        arguments: request.arguments.clone(),
    });
    
    let result = execute_tool_direct(&request, &working_dir).await;
    
    {
        let mut sessions = state.sessions.write().await;
        if let Some(session) = sessions.get_mut(&session_id) {
            let msg = StoredMessage {
                id: generate_id(),
                role: "tool".to_string(),
                content: if result.success { result.output.clone() } else { 
                    format!("Error: {}", result.error.as_deref().unwrap_or("Unknown error"))
                },
                tool_calls: None,
                tool_call_id: Some(request.tool_call_id.clone()),
                timestamp: current_timestamp(),
            };
            session.messages.push(msg);
            session.last_activity = current_timestamp();
        }
    }
    
    let _ = app_handle.emit(&format!("agent:tool_complete:{}", session_id), &result);
    println!("[Agent] Tool {} completed: success={}", request.tool_name, result.success);
    Ok(result)
}

async fn execute_tool_direct(request: &ExecuteToolRequest, working_dir: &PathBuf) -> ToolResultDto {
    let start = std::time::Instant::now();
    
    let result = match request.tool_name.as_str() {
        "shell" => execute_shell_direct(request, working_dir).await,
        "read_file" => execute_read_file_direct(request, working_dir).await,
        "write_file" => execute_write_file_direct(request, working_dir).await,
        "list_directory" => execute_list_directory_direct(request, working_dir).await,
        "search_files" => execute_search_files_direct(request, working_dir).await,
        _ => Err(format!("Unknown tool: {}", request.tool_name)),
    };
    
    let duration_ms = start.elapsed().as_millis() as u64;
    
    match result {
        Ok(output) => ToolResultDto {
            tool_call_id: request.tool_call_id.clone(),
            success: true,
            output,
            error: None,
            duration_ms: Some(duration_ms),
        },
        Err(e) => ToolResultDto {
            tool_call_id: request.tool_call_id.clone(),
            success: false,
            output: String::new(),
            error: Some(e),
            duration_ms: Some(duration_ms),
        },
    }
}

async fn execute_shell_direct(request: &ExecuteToolRequest, default_workdir: &PathBuf) -> Result<String, String> {
    let args = &request.arguments;
    
    let command = args.get("command")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'command' argument".to_string())?;
    
    let workdir = args.get("workdir")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| default_workdir.clone());
    
    let timeout_ms = args.get("timeout_ms")
        .and_then(|v| v.as_u64())
        .unwrap_or(30000);
    
    let output = tokio::time::timeout(
        std::time::Duration::from_millis(timeout_ms),
        async {
            if cfg!(target_os = "windows") {
                tokio::process::Command::new("cmd")
                    .args(&["/C", command])
                    .current_dir(&workdir)
                    .output()
                    .await
            } else {
                tokio::process::Command::new("sh")
                    .args(&["-c", command])
                    .current_dir(&workdir)
                    .output()
                    .await
            }
        }
    )
    .await
    .map_err(|_| format!("Command timed out after {}ms", timeout_ms))?
    .map_err(|e| format!("Failed to execute command: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    let mut result = stdout.to_string();
    if !stderr.is_empty() {
        if !result.is_empty() {
            result.push_str("\n--- stderr ---\n");
        }
        result.push_str(&stderr);
    }
    
    const MAX_SIZE: usize = 1024 * 1024;
    if result.len() > MAX_SIZE {
        result.truncate(MAX_SIZE);
        result.push_str("\n... [output truncated]");
    }
    
    Ok(result)
}

async fn execute_read_file_direct(request: &ExecuteToolRequest, working_dir: &PathBuf) -> Result<String, String> {
    let args = &request.arguments;
    
    let path_str = args.get("path")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'path' argument".to_string())?;
    
    let path = resolve_path(path_str, working_dir);
    
    let start_line = args.get("start_line")
        .and_then(|v| v.as_u64())
        .map(|v| v as usize)
        .unwrap_or(1);
    
    let end_line = args.get("end_line")
        .and_then(|v| v.as_u64())
        .map(|v| v as usize);
    
    // Use spawn_blocking for file I/O to avoid blocking the async runtime
    let result = tokio::task::spawn_blocking(move || {
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
        
        let lines: Vec<&str> = content.lines().collect();
        let total_lines = lines.len();
        
        let start_idx = start_line.saturating_sub(1).min(total_lines);
        let end_idx = end_line.map(|e| e.min(total_lines)).unwrap_or(total_lines);
        
        let output = lines[start_idx..end_idx].join("\n");
        
        const MAX_SIZE: usize = 1024 * 1024;
        if output.len() > MAX_SIZE {
            let mut truncated = output[..MAX_SIZE].to_string();
            truncated.push_str("\n... [content truncated]");
            Ok(truncated)
        } else {
            Ok(output)
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;
    
    result
}


async fn execute_write_file_direct(request: &ExecuteToolRequest, working_dir: &PathBuf) -> Result<String, String> {
    let args = &request.arguments;
    
    let path_str = args.get("path")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'path' argument".to_string())?;
    
    let content = args.get("content")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'content' argument".to_string())?
        .to_string();
    
    let mode = args.get("mode")
        .and_then(|v| v.as_str())
        .unwrap_or("overwrite")
        .to_string();
    
    let path = resolve_path(path_str, working_dir);
    let content_len = content.len();
    
    // Use spawn_blocking for file I/O to avoid blocking the async runtime
    tokio::task::spawn_blocking(move || {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        match mode.as_str() {
            "append" => {
                use std::io::Write;
                let mut file = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&path)
                    .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;
                
                file.write_all(content.as_bytes())
                    .map_err(|e| format!("Failed to write: {}", e))?;
            }
            _ => {
                std::fs::write(&path, &content)
                    .map_err(|e| format!("Failed to write {}: {}", path.display(), e))?;
            }
        }
        
        Ok::<String, String>(format!("Successfully wrote {} bytes to {}", content_len, path.display()))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

async fn execute_list_directory_direct(request: &ExecuteToolRequest, working_dir: &PathBuf) -> Result<String, String> {
    let args = &request.arguments;
    
    let path_str = args.get("path")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'path' argument".to_string())?;
    
    let depth = args.get("depth")
        .and_then(|v| v.as_u64())
        .unwrap_or(1) as usize;
    
    let include_hidden = args.get("include_hidden")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let path = resolve_path(path_str, working_dir);
    
    // Use spawn_blocking for filesystem operations to avoid blocking the async runtime
    let entries = tokio::task::spawn_blocking(move || {
        list_dir_sync(&path, depth, include_hidden)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| format!("Directory listing error: {}", e))?;
    
    Ok(entries.join("\n"))
}

/// Synchronous directory listing - runs in spawn_blocking
fn list_dir_sync(path: &std::path::Path, max_depth: usize, include_hidden: bool) -> Result<Vec<String>, String> {
    let mut entries = Vec::new();
    let mut stack: Vec<(PathBuf, usize)> = vec![(path.to_path_buf(), 0)];
    
    while let Some((current_path, depth)) = stack.pop() {
        if depth > max_depth {
            continue;
        }
        
        let indent = "  ".repeat(depth);
        
        let dir = std::fs::read_dir(&current_path)
            .map_err(|e| format!("Failed to read directory {}: {}", current_path.display(), e))?;
        
        let mut dir_entries: Vec<(String, String, bool, PathBuf)> = Vec::new();
        
        for entry_result in dir {
            let entry = entry_result
                .map_err(|e| format!("Failed to read entry: {}", e))?;
            
            let name = entry.file_name().to_string_lossy().to_string();
            
            if !include_hidden && name.starts_with('.') {
                continue;
            }
            
            let metadata = entry.metadata()
                .map_err(|e| format!("Failed to get metadata: {}", e))?;
            
            let type_indicator = if metadata.is_dir() { "/" } else { "" };
            let size = if metadata.is_file() {
                format!(" ({} bytes)", metadata.len())
            } else {
                String::new()
            };
            
            dir_entries.push((
                name.clone(), 
                format!("{}{}{}{}", indent, name, type_indicator, size), 
                metadata.is_dir(), 
                entry.path()
            ));
        }
        
        dir_entries.sort_by(|a, b| a.0.cmp(&b.0));
        
        for (_, formatted, is_dir, entry_path) in dir_entries {
            entries.push(formatted);
            if is_dir && depth < max_depth {
                stack.push((entry_path, depth + 1));
            }
        }
    }
    
    Ok(entries)
}

async fn execute_search_files_direct(request: &ExecuteToolRequest, working_dir: &PathBuf) -> Result<String, String> {
    let args = &request.arguments;
    
    let pattern = args.get("pattern")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'pattern' argument".to_string())?;
    
    let path_str = args.get("path")
        .and_then(|v| v.as_str())
        .unwrap_or(".");
    
    let search_type = args.get("search_type")
        .and_then(|v| v.as_str())
        .unwrap_or("filename");
    
    let max_results = args.get("max_results")
        .and_then(|v| v.as_u64())
        .unwrap_or(100);
    
    let path = resolve_path(path_str, working_dir);
    
    let command = match search_type {
        "content" => {
            if cfg!(target_os = "windows") {
                format!("findstr /s /n /i \"{}\" *", pattern)
            } else {
                format!("grep -rn \"{}\" . 2>/dev/null | head -n {}", pattern, max_results)
            }
        }
        _ => {
            if cfg!(target_os = "windows") {
                format!("dir /s /b *{}*", pattern)
            } else {
                format!("find . -name \"{}\" 2>/dev/null | head -n {}", pattern, max_results)
            }
        }
    };
    
    let search_request = ExecuteToolRequest {
        tool_call_id: format!("{}-search", request.tool_call_id),
        tool_name: "shell".to_string(),
        arguments: serde_json::json!({
            "command": command,
            "workdir": path.to_string_lossy()
        }),
    };
    
    execute_shell_direct(&search_request, working_dir).await
}

fn resolve_path(path_str: &str, working_dir: &std::path::Path) -> PathBuf {
    let path = std::path::Path::new(path_str);
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        working_dir.join(path)
    }
}


/// Cancel the current agent action
#[tauri::command]
pub async fn cancel_agent_action(
    state: State<'_, AgentTauriState>,
    app_handle: AppHandle,
    session_id: String,
) -> Result<(), String> {
    println!("[Agent] Cancelling action for session: {}", session_id);
    
    {
        let mut sessions = state.sessions.write().await;
        if let Some(session) = sessions.get_mut(&session_id) {
            session.state = "ready".to_string();
            session.last_activity = current_timestamp();
        }
    }
    
    let _ = app_handle.emit(&format!("agent:cancelled:{}", session_id), ());
    Ok(())
}

/// Close an agent session
#[tauri::command]
pub async fn close_agent_session(
    state: State<'_, AgentTauriState>,
    session_id: String,
) -> Result<(), String> {
    println!("[Agent] Closing session: {}", session_id);
    
    state.sessions.write().await.remove(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;
    
    println!("[Agent] Session closed: {}", session_id);
    Ok(())
}

/// List all active agent sessions
#[tauri::command]
pub async fn list_agent_sessions(
    state: State<'_, AgentTauriState>,
) -> Result<Vec<AgentStatusDto>, String> {
    let sessions = state.sessions.read().await;
    
    Ok(sessions.values().map(|s| {
        let pending = s.messages.iter()
            .filter_map(|m| m.tool_calls.as_ref())
            .flatten()
            .count();
        
        AgentStatusDto {
            session_id: s.id.clone(),
            state: s.state.clone(),
            message_count: s.messages.len(),
            pending_tool_calls: pending,
            created_at: s.created_at,
            last_activity: s.last_activity,
            provider: s.provider.clone(),
            model: s.model.clone(),
        }
    }).collect())
}

/// Get message history for a session
#[tauri::command]
pub async fn get_agent_messages(
    state: State<'_, AgentTauriState>,
    session_id: String,
) -> Result<Vec<AgentMessageDto>, String> {
    let sessions = state.sessions.read().await;
    let session = sessions.get(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;
    
    Ok(session.messages.iter().map(|m| AgentMessageDto {
        id: m.id.clone(),
        role: m.role.clone(),
        content: m.content.clone(),
        tool_calls: m.tool_calls.clone(),
        tool_call_id: m.tool_call_id.clone(),
        timestamp: m.timestamp,
    }).collect())
}

/// Add an assistant message with tool calls to the session
#[tauri::command]
pub async fn add_assistant_message(
    state: State<'_, AgentTauriState>,
    app_handle: AppHandle,
    session_id: String,
    content: String,
    tool_calls: Option<Vec<ToolCallDto>>,
) -> Result<AgentMessageDto, String> {
    let mut sessions = state.sessions.write().await;
    let session = sessions.get_mut(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;
    
    let msg = StoredMessage {
        id: generate_id(),
        role: "assistant".to_string(),
        content: content.clone(),
        tool_calls: tool_calls.clone(),
        tool_call_id: None,
        timestamp: current_timestamp(),
    };
    
    session.messages.push(msg.clone());
    session.last_activity = current_timestamp();
    
    let dto = AgentMessageDto {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
        tool_call_id: None,
        timestamp: msg.timestamp,
    };
    
    let _ = app_handle.emit(&format!("agent:message:{}", session_id), &dto);
    Ok(dto)
}

/// Get session configuration
#[tauri::command]
pub async fn get_agent_config(
    state: State<'_, AgentTauriState>,
    session_id: String,
) -> Result<serde_json::Value, String> {
    let sessions = state.sessions.read().await;
    let session = sessions.get(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;
    
    Ok(serde_json::json!({
        "provider": session.provider,
        "model": session.model,
        "working_directory": session.working_directory.to_string_lossy(),
        "temperature": session.temperature,
        "max_tokens": session.max_tokens,
    }))
}
