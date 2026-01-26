// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

mod terminal;
mod api_keys;
mod agent;
mod disk_info;
mod webview_renderer;
mod http_bridge;

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

/// Get the app's local data directory path
#[tauri::command]
async fn get_local_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_local_data_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get local data directory: {}", e))
}

/// Open the app's local data directory in the system file explorer
#[tauri::command]
async fn open_local_data_dir(app: tauri::AppHandle) -> Result<(), String> {
    // On Windows with WebView2, localStorage is stored in the WebView2 user data folder
    // This is where actual user settings (temperature, agentMode, etc.) are stored
    #[cfg(target_os = "windows")]
    {
        // WebView2 stores data in: AppData\Local\[app-name]\WebView2\EBWebView\Default\
        let app_data_local = std::env::var("LOCALAPPDATA")
            .map_err(|_| "Failed to get LOCALAPPDATA path".to_string())?;
        
        // Get app identifier from tauri config
        let app_name = app.config().identifier.clone();
        
        // Construct WebView2 data path
        let webview_path = std::path::PathBuf::from(app_data_local)
            .join(&app_name)
            .join("WebView2");
        
        // If WebView2 folder exists, open it (contains localStorage)
        if webview_path.exists() {
            std::process::Command::new("explorer")
                .arg(&webview_path)
                .spawn()
                .map_err(|e| format!("Failed to open file explorer: {}", e))?;
        } else {
            // Fallback to app local data dir if WebView2 folder doesn't exist yet
            let local_data_path = app.path()
                .app_local_data_dir()
                .map_err(|e| format!("Failed to get local data directory: {}", e))?;
            
            if !local_data_path.exists() {
                std::fs::create_dir_all(&local_data_path)
                    .map_err(|e| format!("Failed to create local data directory: {}", e))?;
            }
            
            std::process::Command::new("explorer")
                .arg(&local_data_path)
                .spawn()
                .map_err(|e| format!("Failed to open file explorer: {}", e))?;
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // On macOS, WebKit stores data in ~/Library/WebKit/[bundle-id]/
        let home = std::env::var("HOME")
            .map_err(|_| "Failed to get HOME path".to_string())?;
        
        let bundle_id = app.config().identifier.clone();
        
        let webkit_path = std::path::PathBuf::from(home)
            .join("Library")
            .join("WebKit")
            .join(&bundle_id);
        
        if webkit_path.exists() {
            std::process::Command::new("open")
                .arg(&webkit_path)
                .spawn()
                .map_err(|e| format!("Failed to open Finder: {}", e))?;
        } else {
            // Fallback to app local data dir
            let local_data_path = app.path()
                .app_local_data_dir()
                .map_err(|e| format!("Failed to get local data directory: {}", e))?;
            
            if !local_data_path.exists() {
                std::fs::create_dir_all(&local_data_path)
                    .map_err(|e| format!("Failed to create local data directory: {}", e))?;
            }
            
            std::process::Command::new("open")
                .arg(&local_data_path)
                .spawn()
                .map_err(|e| format!("Failed to open Finder: {}", e))?;
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // On Linux, WebKitGTK stores data in ~/.local/share/[app-name]/
        let home = std::env::var("HOME")
            .map_err(|_| "Failed to get HOME path".to_string())?;
        
        let app_name = app.config().identifier.clone();
        
        let webkit_path = std::path::PathBuf::from(home)
            .join(".local")
            .join("share")
            .join(&app_name);
        
        let path_to_open = if webkit_path.exists() {
            webkit_path
        } else {
            // Fallback to app local data dir
            let local_data_path = app.path()
                .app_local_data_dir()
                .map_err(|e| format!("Failed to get local data directory: {}", e))?;
            
            if !local_data_path.exists() {
                std::fs::create_dir_all(&local_data_path)
                    .map_err(|e| format!("Failed to create local data directory: {}", e))?;
            }
            
            local_data_path
        };
        
        // Try xdg-open first (most common)
        let result = std::process::Command::new("xdg-open")
            .arg(&path_to_open)
            .spawn();
        
        if result.is_err() {
            // Fallback to other common file managers
            let file_managers = ["nautilus", "dolphin", "thunar", "nemo", "caja"];
            let mut opened = false;
            
            for fm in &file_managers {
                if let Ok(_) = std::process::Command::new(fm).arg(&path_to_open).spawn() {
                    opened = true;
                    break;
                }
            }
            
            if !opened {
                return Err("Failed to open file manager. Please install xdg-utils or a file manager.".to_string());
            }
        }
    }
    
    Ok(())
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

/// Open a native folder picker dialog from Rust
#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
  use tauri_plugin_dialog::DialogExt;
  
  println!("[Skhoot] Opening folder picker via Rust...");
  
  let file_path = app.dialog().file().blocking_pick_folder();
  
  match file_path {
      Some(path) => {
          let path_str = path.to_string();
          println!("[Skhoot] Folder selected: {}", path_str);
          Ok(Some(path_str))
      },
      None => {
          println!("[Skhoot] Folder selection cancelled");
          Ok(None)
      }
  }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_fs::init())
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
      
      // Initialize WebView renderer state
      let renderer_state = webview_renderer::WebViewRendererState::default();
      renderer_state.initialize(app.handle().clone());
      app.manage(renderer_state.clone());
      
      // Start HTTP bridge server for backend communication
      let app_handle_for_bridge = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        http_bridge::start_http_bridge(app_handle_for_bridge, renderer_state).await;
      });
      
      #[cfg(desktop)]
      {
        // Use an empty app-wide menu to avoid showing a menubar.
        let menu = tauri::menu::Menu::new(app.handle())?;
        app.set_menu(menu)?;
      }

      // Start the backend sidecar
      let app_handle_clone = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        start_backend_sidecar(&app_handle_clone).await;
      });

      // Log platform-specific audio permission info
      log_audio_permission_info();

      // Get the main window for any platform-specific setup
      if let Some(window) = app.get_webview_window("main") {
        println!("[Skhoot] Main window initialized");
        
        // Windows: Fix caption leak in transparent frameless window
        #[cfg(target_os = "windows")]
        {
          use windows::Win32::Foundation::{HWND, RECT};
          use windows::Win32::UI::WindowsAndMessaging::{
            GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GetWindowRect,
            GWL_STYLE, GWL_EXSTYLE,
            WS_CAPTION, WS_THICKFRAME, WS_MINIMIZEBOX, WS_MAXIMIZEBOX, WS_SYSMENU,
            WS_EX_APPWINDOW, WS_EX_WINDOWEDGE,
            SWP_FRAMECHANGED, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SWP_NOACTIVATE,
            HWND_TOP
          };
          
          // Function to remove Windows caption and force redraw
          let remove_caption = |hwnd: HWND| {
            unsafe {
              // Get current styles
              let mut style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
              let mut ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
              
              // Remove caption and borders that cause the title leak
              style &= !(WS_CAPTION.0 | WS_THICKFRAME.0);
              // Keep window controls functionality
              style |= WS_MINIMIZEBOX.0 | WS_MAXIMIZEBOX.0 | WS_SYSMENU.0;
              
              // Ensure proper extended styles for frameless transparent window
              ex_style |= WS_EX_APPWINDOW.0;
              ex_style &= !WS_EX_WINDOWEDGE.0;
              
              // Apply new styles
              SetWindowLongPtrW(hwnd, GWL_STYLE, style as isize);
              SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style as isize);
              
              // CRITICAL: Force window to redraw with new styles
              let mut rect = RECT::default();
              let _ = GetWindowRect(hwnd, &mut rect);
              
              let _ = SetWindowPos(
                hwnd,
                HWND_TOP,
                rect.left,
                rect.top,
                rect.right - rect.left,
                rect.bottom - rect.top,
                SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
              );
            }
          };
          
          // Apply caption removal on startup
          if let Ok(hwnd) = window.hwnd() {
            let hwnd = HWND(hwnd.0 as isize);
            remove_caption(hwnd);
            println!("[Skhoot] Windows: Caption removed on startup");
          }
          
          // Re-apply caption removal on window events (minimize, maximize, restore, focus)
          // Windows resets styles during these events, so we need to reapply
          let window_clone = window.clone();
          window.on_window_event(move |event| {
            use tauri::WindowEvent;
            match event {
              WindowEvent::Focused(focused) => {
                if *focused {
                  if let Ok(hwnd) = window_clone.hwnd() {
                    let hwnd = HWND(hwnd.0 as isize);
                    remove_caption(hwnd);
                    println!("[Skhoot] Windows: Caption removed on focus");
                  }
                }
              }
              WindowEvent::Resized(_) => {
                // Reapply on resize (includes maximize/restore)
                if let Ok(hwnd) = window_clone.hwnd() {
                  let hwnd = HWND(hwnd.0 as isize);
                  remove_caption(hwnd);
                  println!("[Skhoot] Windows: Caption removed on resize");
                }
              }
              _ => {}
            }
          });
        }
        
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

        // Linux: Enable MediaStream/WebRTC in WebKitGTK and auto-allow mic permissions
        #[cfg(target_os = "linux")]
        {
          use webkit2gtk::{WebViewExt, SettingsExt, PermissionRequestExt};
          use webkit2gtk::glib::prelude::ObjectExt;
          
          window.with_webview(|webview| {
            let wv = webview.inner();
            
            // Enable MediaStream and WebRTC in WebKitGTK settings
            if let Some(settings) = wv.settings() {
              settings.set_enable_media_stream(true);
              settings.set_enable_webrtc(true);
              println!("[Skhoot] WebKitGTK MediaStream and WebRTC enabled");
            }
            
            // Auto-allow microphone permission requests
            wv.connect_permission_request(|_, req| {
              if req.is::<webkit2gtk::UserMediaPermissionRequest>() {
                req.allow();
                println!("[Skhoot] Auto-allowed UserMedia permission request");
                return true;
              }
              false
            });
          }).ok();
        }
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        add_user_to_audio_group,
        check_audio_group_membership,
        check_audio_server,
        start_audio_services,
        get_local_data_dir,
        open_local_data_dir,
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
        api_keys::get_kiro_token,
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
        disk_info::get_system_disks,
        webview_renderer::render_page,
        pick_folder,
    ])
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
    println!("[Skhoot] Starting backend in development mode...");
    
    // Get the current working directory and resolve backend path
    let current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let backend_dir = current_dir.join("backend");
    
    println!("[Skhoot] Backend directory: {:?}", backend_dir);
    
    if !backend_dir.exists() {
      eprintln!("[Skhoot] Backend directory not found: {:?}", backend_dir);
      return;
    }
    
    let mut cmd = Command::new("cargo");
    cmd.args(&["run"])
       .current_dir(&backend_dir)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    match cmd.spawn() {
      Ok(mut child) => {
        println!("[Skhoot] Backend process spawned, waiting for startup...");
        
        // Wait a moment and check if process is still running
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
        
        match child.try_wait() {
          Ok(Some(status)) => {
            eprintln!("[Skhoot] Backend process exited early with status: {}", status);
            if let Ok(output) = child.wait_with_output() {
              eprintln!("[Skhoot] Backend stderr: {}", String::from_utf8_lossy(&output.stderr));
            }
          }
          Ok(None) => {
            println!("[Skhoot] Backend started successfully and is running");
            tauri::async_runtime::spawn_blocking(move || {
              match child.wait() {
                Ok(status) => println!("[Skhoot] Backend process exited with status: {}", status),
                Err(e) => eprintln!("[Skhoot] Error waiting for backend process: {}", e),
              }
            });
          }
          Err(e) => {
            eprintln!("[Skhoot] Error checking backend process status: {}", e);
          }
        }
      }
      Err(e) => {
        eprintln!("[Skhoot] Failed to start backend in development: {}", e);
        eprintln!("[Skhoot] Make sure you're in the project root directory and cargo is installed");
      }
    }
  } else {
    // In production, use the bundled binary from resources
    println!("[Skhoot] Starting backend sidecar in production mode...");
    
    let resource_path = match app_handle.path().resource_dir() {
      Ok(path) => path,
      Err(e) => {
        eprintln!("[Skhoot] Failed to resolve resource dir: {}", e);
        return;
      }
    };
    
    // Platform-specific binary name
    let binary_name = if cfg!(target_os = "windows") {
      "skhoot-backend.exe"
    } else {
      "skhoot-backend"
    };
    
    let backend_path = resource_path.join(binary_name);
    
    println!("[Skhoot] Backend binary path: {:?}", backend_path);
    
    if !backend_path.exists() {
      eprintln!("[Skhoot] Backend binary not found at {:?}", backend_path);
      eprintln!("[Skhoot] The backend will not be available. Agent features may not work.");
      return;
    }
    
    let mut cmd = Command::new(&backend_path);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    match cmd.spawn() {
      Ok(mut child) => {
        println!("[Skhoot] Backend sidecar started successfully");
        
        // Monitor the backend process
        tauri::async_runtime::spawn_blocking(move || {
          match child.wait() {
            Ok(status) => {
              if status.success() {
                println!("[Skhoot] Backend sidecar exited normally");
              } else {
                eprintln!("[Skhoot] Backend sidecar exited with status: {}", status);
              }
            }
            Err(e) => eprintln!("[Skhoot] Error waiting for backend sidecar: {}", e),
          }
        });
      }
      Err(e) => {
        eprintln!("[Skhoot] Failed to start backend sidecar: {}", e);
        eprintln!("[Skhoot] Agent features may not work correctly.");
      }
    }
  }
}
