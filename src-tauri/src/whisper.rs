//! Cross-platform Whisper STT installation and management
//! 
//! This module handles downloading, installing, and managing the whisper.cpp
//! server binary and models for local speech-to-text on Windows, macOS, and Linux.
//! 
//! Since whisper.cpp doesn't provide pre-built binaries, this module:
//! - On Linux: Builds from source using cmake (requires build tools)
//! - Downloads models from HuggingFace
//! - Manages the whisper server process

use std::path::PathBuf;
use std::process::{Command, Child, Stdio};
use std::sync::Mutex;
use tauri::{Manager, Emitter};
use serde::{Deserialize, Serialize};

/// Whisper installation and runtime status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub binary_path: Option<String>,
    pub models: Vec<WhisperModel>,
    pub server_running: bool,
    pub server_port: Option<u16>,
    pub platform: String,
    pub arch: String,
    pub build_available: bool,
    pub build_requirements: Vec<String>,
}

/// Information about an installed Whisper model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperModel {
    pub name: String,
    pub size_mb: u64,
    pub path: String,
    pub is_downloaded: bool,
}

/// Available models for download
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailableModel {
    pub name: String,
    pub display_name: String,
    pub size_mb: u64,
    pub url: String,
    pub description: String,
}

/// Installation progress event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProgress {
    pub stage: String,
    pub progress: f32,
    pub message: String,
}

/// State for managing the whisper server process
pub struct WhisperState {
    server_process: Mutex<Option<Child>>,
    server_port: Mutex<Option<u16>>,
}

impl Default for WhisperState {
    fn default() -> Self {
        Self {
            server_process: Mutex::new(None),
            server_port: Mutex::new(None),
        }
    }
}

/// Get the whisper data directory for the current platform
fn get_whisper_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_data.join("whisper"))
}

/// Get the binary name for the current platform
fn get_binary_name() -> &'static str {
    #[cfg(target_os = "windows")]
    { "whisper-server.exe" }
    #[cfg(not(target_os = "windows"))]
    { "whisper-server" }
}

/// Get current platform identifier
fn get_platform() -> &'static str {
    #[cfg(target_os = "windows")]
    { "windows" }
    #[cfg(target_os = "macos")]
    { "macos" }
    #[cfg(target_os = "linux")]
    { "linux" }
}

/// Get current architecture
fn get_arch() -> &'static str {
    #[cfg(target_arch = "x86_64")]
    { "x86_64" }
    #[cfg(target_arch = "aarch64")]
    { "aarch64" }
    #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
    { "unknown" }
}

/// Check if build tools are available
fn check_build_requirements() -> (bool, Vec<String>) {
    let mut missing = Vec::new();
    
    // Check cmake
    if Command::new("cmake").arg("--version").output().is_err() {
        missing.push("cmake".to_string());
    }
    
    // Check git
    if Command::new("git").arg("--version").output().is_err() {
        missing.push("git".to_string());
    }
    
    // Check for C++ compiler
    #[cfg(target_os = "linux")]
    {
        if Command::new("g++").arg("--version").output().is_err() 
           && Command::new("clang++").arg("--version").output().is_err() {
            missing.push("g++ or clang++".to_string());
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if Command::new("clang++").arg("--version").output().is_err() {
            missing.push("Xcode Command Line Tools".to_string());
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        // On Windows, check for Visual Studio or MinGW
        missing.push("Visual Studio Build Tools or MinGW".to_string());
    }
    
    (missing.is_empty(), missing)
}

/// Get available models with their download URLs
fn get_available_models() -> Vec<AvailableModel> {
    let base_url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";
    
    vec![
        AvailableModel {
            name: "ggml-tiny.en.bin".to_string(),
            display_name: "Tiny (English)".to_string(),
            size_mb: 75,
            url: format!("{}/ggml-tiny.en.bin", base_url),
            description: "Fastest, basic quality. Good for quick transcriptions.".to_string(),
        },
        AvailableModel {
            name: "ggml-base.en.bin".to_string(),
            display_name: "Base (English)".to_string(),
            size_mb: 142,
            url: format!("{}/ggml-base.en.bin", base_url),
            description: "Fast with good quality. Recommended for most users.".to_string(),
        },
        AvailableModel {
            name: "ggml-small.en.bin".to_string(),
            display_name: "Small (English)".to_string(),
            size_mb: 466,
            url: format!("{}/ggml-small.en.bin", base_url),
            description: "Better accuracy, slower. Good for important transcriptions.".to_string(),
        },
        AvailableModel {
            name: "ggml-medium.en.bin".to_string(),
            display_name: "Medium (English)".to_string(),
            size_mb: 1500,
            url: format!("{}/ggml-medium.en.bin", base_url),
            description: "High accuracy, requires more RAM. Best quality for English.".to_string(),
        },
        AvailableModel {
            name: "ggml-tiny.bin".to_string(),
            display_name: "Tiny (Multilingual)".to_string(),
            size_mb: 75,
            url: format!("{}/ggml-tiny.bin", base_url),
            description: "Fastest multilingual model. Supports 99 languages.".to_string(),
        },
        AvailableModel {
            name: "ggml-base.bin".to_string(),
            display_name: "Base (Multilingual)".to_string(),
            size_mb: 142,
            url: format!("{}/ggml-base.bin", base_url),
            description: "Fast multilingual with good quality.".to_string(),
        },
    ]
}

/// Check the current whisper installation status
#[tauri::command]
pub async fn check_whisper_status(app_handle: tauri::AppHandle) -> Result<WhisperStatus, String> {
    let whisper_dir = get_whisper_dir(&app_handle)?;
    let binary_path = whisper_dir.join("bin").join(get_binary_name());
    let models_dir = whisper_dir.join("models");
    
    let installed = binary_path.exists();
    
    // Check which models are downloaded
    let mut models = Vec::new();
    for available in get_available_models() {
        let model_path = models_dir.join(&available.name);
        let is_downloaded = model_path.exists();
        models.push(WhisperModel {
            name: available.name,
            size_mb: available.size_mb,
            path: model_path.to_string_lossy().to_string(),
            is_downloaded,
        });
    }
    
    // Check if server is running
    let state = app_handle.state::<WhisperState>();
    let server_running = state.server_process.lock()
        .map(|p| p.is_some())
        .unwrap_or(false);
    let server_port = state.server_port.lock()
        .map(|p| *p)
        .unwrap_or(None);
    
    // Check build requirements
    let (build_available, build_requirements) = check_build_requirements();
    
    Ok(WhisperStatus {
        installed,
        version: if installed { Some("1.8.1".to_string()) } else { None },
        binary_path: if installed { Some(binary_path.to_string_lossy().to_string()) } else { None },
        models,
        server_running,
        server_port,
        platform: get_platform().to_string(),
        arch: get_arch().to_string(),
        build_available,
        build_requirements,
    })
}

/// Get list of available models for download
#[tauri::command]
pub async fn get_whisper_models() -> Result<Vec<AvailableModel>, String> {
    Ok(get_available_models())
}

/// Build and install whisper from source
#[tauri::command]
pub async fn install_whisper_binary(
    app_handle: tauri::AppHandle,
    window: tauri::Window,
) -> Result<String, String> {
    let whisper_dir = get_whisper_dir(&app_handle)?;
    let bin_dir = whisper_dir.join("bin");
    let source_dir = whisper_dir.join("source");
    
    // Check build requirements first
    let (build_available, missing) = check_build_requirements();
    if !build_available {
        return Err(format!(
            "Missing build requirements: {}. Please install them first.",
            missing.join(", ")
        ));
    }
    
    // Create directories
    std::fs::create_dir_all(&bin_dir)
        .map_err(|e| format!("Failed to create bin directory: {}", e))?;
    std::fs::create_dir_all(&source_dir)
        .map_err(|e| format!("Failed to create source directory: {}", e))?;
    
    let whisper_src = source_dir.join("whisper.cpp");
    
    // Clone or update whisper.cpp
    let _ = window.emit("whisper-install-progress", InstallProgress {
        stage: "cloning".to_string(),
        progress: 10.0,
        message: "Cloning whisper.cpp repository...".to_string(),
    });
    
    if !whisper_src.exists() {
        let output = Command::new("git")
            .args(&["clone", "--depth", "1", "--branch", "v1.8.1", 
                   "https://github.com/ggml-org/whisper.cpp.git"])
            .arg(&whisper_src)
            .output()
            .map_err(|e| format!("Failed to clone whisper.cpp: {}", e))?;
        
        if !output.status.success() {
            return Err(format!("Git clone failed: {}", String::from_utf8_lossy(&output.stderr)));
        }
    }
    
    // Build with cmake
    let _ = window.emit("whisper-install-progress", InstallProgress {
        stage: "configuring".to_string(),
        progress: 30.0,
        message: "Configuring build with cmake...".to_string(),
    });
    
    let build_dir = whisper_src.join("build");
    std::fs::create_dir_all(&build_dir)
        .map_err(|e| format!("Failed to create build directory: {}", e))?;
    
    // Configure cmake
    let output = Command::new("cmake")
        .current_dir(&whisper_src)
        .args(&["-B", "build", "-DCMAKE_BUILD_TYPE=Release"])
        .output()
        .map_err(|e| format!("Failed to run cmake configure: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("CMake configure failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    let _ = window.emit("whisper-install-progress", InstallProgress {
        stage: "building".to_string(),
        progress: 50.0,
        message: "Building whisper.cpp (this may take a few minutes)...".to_string(),
    });
    
    // Build
    let num_jobs = num_cpus::get().to_string();
    let output = Command::new("cmake")
        .current_dir(&whisper_src)
        .args(&["--build", "build", "-j", &num_jobs])
        .output()
        .map_err(|e| format!("Failed to run cmake build: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("CMake build failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    let _ = window.emit("whisper-install-progress", InstallProgress {
        stage: "installing".to_string(),
        progress: 90.0,
        message: "Installing whisper server...".to_string(),
    });
    
    // Find and copy the server binary
    let server_candidates = [
        build_dir.join("bin/whisper-server"),
        build_dir.join("bin/server"),
        build_dir.join("whisper-server"),
        build_dir.join("server"),
    ];
    
    let mut found_binary = None;
    for candidate in &server_candidates {
        if candidate.exists() {
            found_binary = Some(candidate.clone());
            break;
        }
    }
    
    let source_binary = found_binary.ok_or("Could not find whisper-server binary after build")?;
    let target_binary = bin_dir.join(get_binary_name());
    
    std::fs::copy(&source_binary, &target_binary)
        .map_err(|e| format!("Failed to copy binary: {}", e))?;
    
    // Make executable on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&target_binary)
            .map_err(|e| format!("Failed to get permissions: {}", e))?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&target_binary, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }
    
    let _ = window.emit("whisper-install-progress", InstallProgress {
        stage: "complete".to_string(),
        progress: 100.0,
        message: "Whisper installed successfully!".to_string(),
    });
    
    Ok("Whisper installed successfully".to_string())
}

/// Download a specific whisper model
#[tauri::command]
pub async fn download_whisper_model(
    app_handle: tauri::AppHandle,
    window: tauri::Window,
    model_name: String,
) -> Result<String, String> {
    let whisper_dir = get_whisper_dir(&app_handle)?;
    let models_dir = whisper_dir.join("models");
    
    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Failed to create models directory: {}", e))?;
    
    // Find the model URL
    let available = get_available_models();
    let model = available.iter()
        .find(|m| m.name == model_name)
        .ok_or_else(|| format!("Unknown model: {}", model_name))?;
    
    let _ = window.emit("whisper-install-progress", InstallProgress {
        stage: "downloading_model".to_string(),
        progress: 0.0,
        message: format!("Downloading {} model (~{}MB)...", model.display_name, model.size_mb),
    });
    
    let model_path = models_dir.join(&model_name);
    
    // Download with progress using curl (more reliable for large files)
    let output = Command::new("curl")
        .args(&["-L", "-o"])
        .arg(&model_path)
        .arg(&model.url)
        .args(&["--progress-bar"])
        .output()
        .map_err(|e| format!("Failed to download model: {}", e))?;
    
    if !output.status.success() {
        // Try with wget as fallback
        let output = Command::new("wget")
            .args(&["-O"])
            .arg(&model_path)
            .arg(&model.url)
            .output()
            .map_err(|e| format!("Failed to download model (wget): {}", e))?;
        
        if !output.status.success() {
            return Err(format!("Model download failed: {}", String::from_utf8_lossy(&output.stderr)));
        }
    }
    
    let _ = window.emit("whisper-install-progress", InstallProgress {
        stage: "complete".to_string(),
        progress: 100.0,
        message: format!("{} model downloaded successfully!", model.display_name),
    });
    
    Ok(format!("Model {} downloaded successfully", model_name))
}

/// Start the local whisper server
#[tauri::command]
pub async fn start_whisper_server(
    app_handle: tauri::AppHandle,
    model_name: String,
    port: u16,
) -> Result<String, String> {
    let whisper_dir = get_whisper_dir(&app_handle)?;
    let binary_path = whisper_dir.join("bin").join(get_binary_name());
    let model_path = whisper_dir.join("models").join(&model_name);
    
    if !binary_path.exists() {
        return Err("Whisper binary not installed. Please install it first.".to_string());
    }
    
    if !model_path.exists() {
        return Err(format!("Model {} not found. Please download it first.", model_name));
    }
    
    let state = app_handle.state::<WhisperState>();
    
    // Stop existing server if running
    if let Ok(mut process) = state.server_process.lock() {
        if let Some(mut child) = process.take() {
            let _ = child.kill();
        }
    }
    
    // Start new server
    let child = Command::new(&binary_path)
        .args(&[
            "--model", model_path.to_str().unwrap_or(""),
            "--host", "127.0.0.1",
            "--port", &port.to_string(),
            "--inference-path", "/v1/audio/transcriptions",
            "--threads", "4",
            "--convert",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start whisper server: {}", e))?;
    
    if let Ok(mut process) = state.server_process.lock() {
        *process = Some(child);
    }
    if let Ok(mut p) = state.server_port.lock() {
        *p = Some(port);
    }
    
    println!("[Skhoot] Started whisper server on 127.0.0.1:{}", port);
    
    Ok(format!("Whisper server started on port {}", port))
}

/// Stop the local whisper server
#[tauri::command]
pub async fn stop_whisper_server(app_handle: tauri::AppHandle) -> Result<String, String> {
    let state = app_handle.state::<WhisperState>();
    
    if let Ok(mut process) = state.server_process.lock() {
        if let Some(mut child) = process.take() {
            child.kill().map_err(|e| format!("Failed to stop server: {}", e))?;
            println!("[Skhoot] Stopped whisper server");
        }
    }
    if let Ok(mut p) = state.server_port.lock() {
        *p = None;
    }
    
    Ok("Whisper server stopped".to_string())
}

/// Uninstall whisper (remove binary and optionally models)
#[tauri::command]
pub async fn uninstall_whisper(
    app_handle: tauri::AppHandle,
    remove_models: bool,
) -> Result<String, String> {
    // Stop server first
    let _ = stop_whisper_server(app_handle.clone()).await;
    
    let whisper_dir = get_whisper_dir(&app_handle)?;
    
    // Remove binary
    let bin_dir = whisper_dir.join("bin");
    if bin_dir.exists() {
        std::fs::remove_dir_all(&bin_dir)
            .map_err(|e| format!("Failed to remove binary: {}", e))?;
    }
    
    // Remove source
    let source_dir = whisper_dir.join("source");
    if source_dir.exists() {
        std::fs::remove_dir_all(&source_dir)
            .map_err(|e| format!("Failed to remove source: {}", e))?;
    }
    
    // Optionally remove models
    if remove_models {
        let models_dir = whisper_dir.join("models");
        if models_dir.exists() {
            std::fs::remove_dir_all(&models_dir)
                .map_err(|e| format!("Failed to remove models: {}", e))?;
        }
    }
    
    Ok("Whisper uninstalled successfully".to_string())
}

/// Delete a specific model
#[tauri::command]
pub async fn delete_whisper_model(
    app_handle: tauri::AppHandle,
    model_name: String,
) -> Result<String, String> {
    let whisper_dir = get_whisper_dir(&app_handle)?;
    let model_path = whisper_dir.join("models").join(&model_name);
    
    if model_path.exists() {
        std::fs::remove_file(&model_path)
            .map_err(|e| format!("Failed to delete model: {}", e))?;
    }
    
    Ok(format!("Model {} deleted", model_name))
}
