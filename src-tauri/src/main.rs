// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

mod terminal;
mod api_keys;
mod agent;

use tauri::Manager;
use std::process::{Command, Stdio};
use skhoot_backend::KeyStorage;

/// Add current user to the audio group on Linux using pkexec (PolicyKit)
/// This shows the native authentication dialog
#[tauri::command]
async fn add_user_to_audio_group() -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let username = std::env::var("USER")
            .or_else(|_| std::env::var("LOGNAME"))
            .map_err(|_| "Could not determine current username".to_string())?;
        
        println!("[Skhoot] Attempting to add user '{}' to audio group via pkexec", username);
        
        // Use pkexec to show the native PolicyKit authentication dialog
        let output = Command::new("pkexec")
            .args(&["usermod", "-aG", "audio", &username])
            .output()
            .map_err(|e| format!("Failed to execute pkexec: {}", e))?;
        
        if output.status.success() {
            Ok(format!("Successfully added '{}' to the audio group. Please log out and log back in for changes to take effect.", username))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("dismissed") || stderr.contains("cancelled") || output.status.code() == Some(126) {
                Err("Authentication was cancelled by user.".to_string())
            } else if output.status.code() == Some(127) {
                Err("pkexec not found. Please install PolicyKit or run manually: sudo usermod -aG audio $USER".to_string())
            } else {
                Err(format!("Failed to add user to audio group: {}", stderr))
            }
        }
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        Err("This command is only available on Linux.".to_string())
    }
}

/// Check if the current user is in the audio group
#[tauri::command]
async fn check_audio_group_membership() -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        let output = Command::new("groups")
            .output()
            .map_err(|e| format!("Failed to check groups: {}", e))?;
        
        let groups = String::from_utf8_lossy(&output.stdout);
        Ok(groups.contains("audio"))
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        Ok(true) // Not applicable on other platforms
    }
}

/// Check if PulseAudio or PipeWire is running
#[tauri::command]
async fn check_audio_server() -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        // Check for PipeWire first (modern)
        let pipewire = Command::new("pgrep")
            .args(&["-x", "pipewire"])
            .output();
        
        if let Ok(output) = pipewire {
            if output.status.success() {
                return Ok("pipewire".to_string());
            }
        }
        
        // Check for PulseAudio
        let pulseaudio = Command::new("pgrep")
            .args(&["-x", "pulseaudio"])
            .output();
        
        if let Ok(output) = pulseaudio {
            if output.status.success() {
                return Ok("pulseaudio".to_string());
            }
        }
        
        Err("No audio server (PulseAudio/PipeWire) detected. Please ensure your audio system is running.".to_string())
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        Ok("native".to_string())
    }
}

/// Start PipeWire/PulseAudio user services
#[tauri::command]
async fn start_audio_services() -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let output = Command::new("systemctl")
            .args(&["--user", "start", "pipewire", "pipewire-pulse", "wireplumber"])
            .output();

        if let Ok(output) = output {
            if output.status.success() {
                return Ok("Started PipeWire user services.".to_string());
            }
        }

        let pulseaudio = Command::new("pulseaudio")
            .args(&["--start"])
            .output()
            .map_err(|e| format!("Failed to start audio services: {}", e))?;

        if pulseaudio.status.success() {
            return Ok("Started PulseAudio.".to_string());
        }

        let stderr = String::from_utf8_lossy(&pulseaudio.stderr);
        Err(format!("Failed to start audio services: {}", stderr))
    }

    #[cfg(not(target_os = "linux"))]
    {
        Err("This command is only available on Linux.".to_string())
    }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      // Initialize API key storage
      let app_data_dir = app.path().app_data_dir()
        .expect("Failed to get app data directory");
      
      let key_storage = KeyStorage::new(app_data_dir)
        .expect("Failed to initialize key storage");
      
      let api_key_state = api_keys::ApiKeyState::new(key_storage);
      app.manage(api_key_state);
      
      // Initialize terminal state
      app.manage(terminal::TerminalState::default());
      
      // Initialize agent state
      app.manage(agent::AgentTauriState::default());
      
      #[cfg(desktop)]
      {
        // Use an empty app-wide menu to avoid showing a menubar.
        let menu = tauri::menu::Menu::new(app.handle())?;
        app.set_menu(menu)?;
      }

      // Start local whisper.cpp server if bundled
      start_local_whisper_server(app.handle());

      // Log platform-specific audio permission info
      log_audio_permission_info();

      // Get the main window for any platform-specific setup
      if let Some(window) = app.get_webview_window("main") {
        println!("[Skhoot] Main window initialized");
        
        // Set window icon for dev mode (release uses bundle icons)
        #[cfg(debug_assertions)]
        {
          let icon_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("icons/icon.png");
          if icon_path.exists() {
            match tauri::image::Image::from_path(&icon_path) {
              Ok(icon) => {
                let _ = window.set_icon(icon);
                println!("[Skhoot] Window icon set from {:?}", icon_path);
              }
              Err(e) => {
                eprintln!("[Skhoot] Failed to load icon: {}", e);
              }
            }
          }
        }
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        add_user_to_audio_group,
        check_audio_group_membership,
        check_audio_server,
        start_audio_services,
        terminal::create_terminal_session,
        terminal::write_to_terminal,
        terminal::read_from_terminal,
        terminal::resize_terminal,
        terminal::close_terminal_session,
        terminal::list_terminal_sessions,
        terminal::get_session_history,
        terminal::get_session_state,
        api_keys::save_api_key,
        api_keys::load_api_key,
        api_keys::delete_api_key,
        api_keys::list_providers,
        api_keys::get_active_provider,
        api_keys::set_active_provider,
        api_keys::test_api_key,
        api_keys::fetch_provider_models,
        agent::create_agent_session,
        agent::send_agent_message,
        agent::get_agent_status,
        agent::execute_agent_tool,
        agent::cancel_agent_action,
        agent::close_agent_session,
        agent::list_agent_sessions,
        agent::get_agent_messages,
        agent::add_assistant_message,
        agent::get_agent_config,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn start_local_whisper_server(app_handle: &tauri::AppHandle) {
  #[cfg(target_os = "linux")]
  {
    if std::env::var("SKHOOT_DISABLE_LOCAL_STT").is_ok() {
      println!("[Skhoot] Local STT disabled via SKHOOT_DISABLE_LOCAL_STT");
      return;
    }

    let resource_dir = match app_handle.path().resource_dir() {
      Ok(dir) => dir,
      Err(err) => {
        eprintln!("[Skhoot] Failed to resolve resource dir: {}", err);
        return;
      }
    };

    let server_path = resource_dir.join("whisper/whisper-server");
    let model_path = resource_dir.join("whisper/models/ggml-base.en.bin");

    if !server_path.exists() || !model_path.exists() {
      println!("[Skhoot] Whisper server or model not found in resources.");
      return;
    }

    let _ = Command::new(&server_path)
      .args(&[
        "--model",
        model_path.to_str().unwrap_or(""),
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
        "--inference-path",
        "/v1/audio/transcriptions",
        "--threads",
        "4",
        "--convert"
      ])
      .stdin(Stdio::null())
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .spawn();

    println!("[Skhoot] Started local whisper.cpp server on 127.0.0.1:8000");
  }
}

/// Log platform-specific information about audio permissions
fn log_audio_permission_info() {
  #[cfg(target_os = "macos")]
  {
    println!("[Skhoot] macOS detected");
    println!("[Skhoot] Microphone permissions will be requested by the system when the app tries to access the microphone.");
    println!("[Skhoot] If denied, users can enable in: System Preferences → Security & Privacy → Privacy → Microphone");
  }
  
  #[cfg(target_os = "windows")]
  {
    println!("[Skhoot] Windows detected");
    println!("[Skhoot] WebView2 will handle microphone permissions through Windows privacy settings.");
    println!("[Skhoot] If denied, users can enable in: Settings → Privacy → Microphone");
  }
  
  #[cfg(target_os = "linux")]
  {
    println!("[Skhoot] Linux detected");
    println!("[Skhoot] WebKitGTK will handle microphone permissions.");
    println!("[Skhoot] Users may need to configure PulseAudio/PipeWire permissions.");
    println!("[Skhoot] For GNOME: Settings → Privacy → Microphone");
  }
}

async fn start_backend_sidecar(app_handle: &tauri::AppHandle) {
  if cfg!(debug_assertions) {
    // In development, run cargo directly from the backend directory
    println!("Starting backend in development mode...");
    
    // Get the current working directory and resolve backend path
    let current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let backend_dir = current_dir.join("backend");
    
    println!("Backend directory: {:?}", backend_dir);
    
    if !backend_dir.exists() {
      eprintln!("Backend directory not found: {:?}", backend_dir);
      return;
    }
    
    let mut cmd = Command::new("cargo");
    cmd.args(&["run"])
       .current_dir(&backend_dir)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    match cmd.spawn() {
      Ok(mut child) => {
        println!("Backend process spawned, waiting for startup...");
        
        // Wait a moment and check if process is still running
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
        
        match child.try_wait() {
          Ok(Some(status)) => {
            eprintln!("Backend process exited early with status: {}", status);
            if let Ok(output) = child.wait_with_output() {
              eprintln!("Backend stderr: {}", String::from_utf8_lossy(&output.stderr));
            }
          }
          Ok(None) => {
            println!("Backend started successfully and is running");
            tauri::async_runtime::spawn_blocking(move || {
              match child.wait() {
                Ok(status) => println!("Backend process exited with status: {}", status),
                Err(e) => eprintln!("Error waiting for backend process: {}", e),
              }
            });
          }
          Err(e) => {
            eprintln!("Error checking backend process status: {}", e);
          }
        }
      }
      Err(e) => {
        eprintln!("Failed to start backend in development: {}", e);
        eprintln!("Make sure you're in the project root directory and cargo is installed");
      }
    }
  } else {
    // In production, use the bundled binary
    let resource_path = app_handle
      .path()
      .resource_dir()
      .expect("failed to resolve resource dir");
    
    let backend_path = resource_path.join("skhoot-backend");
    
    let mut cmd = Command::new(&backend_path);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    match cmd.spawn() {
      Ok(mut child) => {
        println!("Backend sidecar started");
        tauri::async_runtime::spawn_blocking(move || {
          let _ = child.wait();
        });
      }
      Err(e) => {
        eprintln!("Failed to start backend sidecar: {}", e);
      }
    }
  }
}
