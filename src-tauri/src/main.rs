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

      // Start the backend sidecar
      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        start_backend_sidecar(&app_handle).await;
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

async fn start_backend_sidecar(app_handle: &tauri::AppHandle) {
  if cfg!(debug_assertions) {
    // In development, run cargo directly from the backend directory
    println!("Starting backend in development mode...");
    
    let mut cmd = Command::new("cargo");
    cmd.args(&["run"])
       .current_dir("../backend")
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    match cmd.spawn() {
      Ok(mut child) => {
        println!("Backend started successfully");
        tauri::async_runtime::spawn_blocking(move || {
          let _ = child.wait();
        });
      }
      Err(e) => {
        eprintln!("Failed to start backend in development: {}", e);
        eprintln!("Make sure you're in the project root directory");
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
