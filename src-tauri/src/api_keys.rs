//! Tauri commands for secure API key management
//! This module acts as a bridge between the frontend and the backend KeyStorage

use skhoot_backend::{AIManager, KeyStorage};
use std::sync::{Arc, Mutex};
use tauri::State;
use serde::{Deserialize, Serialize};

/// State for API key storage
pub struct ApiKeyState {
    storage: Arc<Mutex<KeyStorage>>,
    ai_manager: Arc<AIManager>,
}

impl ApiKeyState {
    pub fn new(storage: KeyStorage) -> Self {
        Self {
            storage: Arc::new(Mutex::new(storage)),
            ai_manager: Arc::new(AIManager::new()),
        }
    }
}

/// Provider information returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub provider: String,
    pub models: Vec<String>,
}

/// Get the Kiro access token from the CLI bridge
#[tauri::command]
pub async fn get_kiro_token() -> Result<String, String> {
    skhoot_backend::kiro_bridge::get_access_token()
        .await
        .map_err(|e| format!("Failed to get Kiro token: {}", e))
}

/// Save an API key for a provider
#[tauri::command]
pub async fn save_api_key(
    state: State<'_, ApiKeyState>,
    provider: String,
    api_key: String,
    is_active: bool,
) -> Result<(), String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    
    storage
        .save_key(&provider, &api_key, is_active)
        .map_err(|e| format!("Failed to save API key: {}", e))?;
    
    Ok(())
}

/// Load an API key for a provider
#[tauri::command]
pub async fn load_api_key(
    state: State<'_, ApiKeyState>,
    provider: String,
) -> Result<String, String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    
    storage
        .load_key(&provider)
        .map_err(|e| format!("Failed to load API key: {}", e))
}

/// Delete an API key for a provider
#[tauri::command]
pub async fn delete_api_key(
    state: State<'_, ApiKeyState>,
    provider: String,
) -> Result<(), String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    
    storage
        .delete_key(&provider)
        .map_err(|e| format!("Failed to delete API key: {}", e))?;
    
    Ok(())
}

/// List all configured providers
#[tauri::command]
pub async fn list_providers(
    state: State<'_, ApiKeyState>,
) -> Result<Vec<String>, String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    
    storage
        .list_providers()
        .map_err(|e| format!("Failed to list providers: {}", e))
}

/// Get the active provider
#[tauri::command]
pub async fn get_active_provider(
    state: State<'_, ApiKeyState>,
) -> Result<Option<String>, String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    
    storage
        .get_active_provider()
        .map_err(|e| format!("Failed to get active provider: {}", e))
}

/// Set a provider as active
#[tauri::command]
pub async fn set_active_provider(
    state: State<'_, ApiKeyState>,
    provider: String,
) -> Result<(), String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    
    storage
        .set_active_provider(&provider)
        .map_err(|e| format!("Failed to set active provider: {}", e))?;
    
    Ok(())
}

/// Test an API key and fetch available models
#[tauri::command]
pub async fn test_api_key(
    state: State<'_, ApiKeyState>,
    provider: String,
    api_key: String,
) -> Result<ProviderInfo, String> {
    let ai_manager = state.ai_manager.clone();
    
    // Detect provider and fetch models
    let provider_info = ai_manager
        .detect_provider(&api_key)
        .await
        .map_err(|e| format!("Failed to validate API key: {}", e))?;
    
    // Update last tested timestamp
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    let timestamp = chrono::Utc::now().timestamp();
    let _ = storage.update_last_tested(&provider, timestamp);
    
    Ok(ProviderInfo {
        provider: provider_info.provider,
        models: provider_info.models,
    })
}

/// Fetch available models for a provider (using stored API key)
#[tauri::command]
pub async fn fetch_provider_models(
    state: State<'_, ApiKeyState>,
    provider: String,
) -> Result<Vec<String>, String> {
    // Load the API key
    let api_key = {
        let storage = state.storage.lock().map_err(|e| e.to_string())?;
        storage
            .load_key(&provider)
            .map_err(|e| format!("Failed to load API key: {}", e))?
    }; // Lock is released here
    
    // Fetch models using AI manager
    let ai_manager = state.ai_manager.clone();
    let provider_info = ai_manager
        .detect_provider(&api_key)
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;
    
    Ok(provider_info.models)
}
