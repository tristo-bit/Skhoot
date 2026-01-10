// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::process::{Command, Stdio};

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      #[cfg(desktop)]
      {
        // Use an empty app-wide menu to avoid showing a menubar.
        let menu = tauri::menu::Menu::new(app.handle())?;
        app.set_menu(menu)?;
      }

      // Backend sidecar disabled - start manually with `npm run backend:dev`
      // let app_handle = app.handle().clone();
      // tauri::async_runtime::spawn(async move {
      //   start_backend_sidecar(&app_handle).await;
      // });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
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
