// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

use tauri::Manager;
use std::process::{Command, Stdio};

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

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
        add_user_to_audio_group,
        check_audio_group_membership,
        check_audio_server
    ])
    .setup(|app| {
      #[cfg(desktop)]
      {
        // Use an empty app-wide menu to avoid showing a menubar.
        let menu = tauri::menu::Menu::new(app.handle())?;
        app.set_menu(menu)?;
      }

      // Log platform-specific audio permission info
      log_audio_permission_info();

      // Get the main window for any platform-specific setup
      if let Some(_window) = app.get_webview_window("main") {
        println!("[Skhoot] Main window initialized");
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
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
