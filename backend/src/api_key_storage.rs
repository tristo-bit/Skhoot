//! Secure API key storage with AES-256-GCM encryption and platform keychain integration
#![allow(dead_code)]

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use anyhow::{Context, Result};
use keyring::Entry;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

const SERVICE_NAME: &str = "com.skhoot.app";
const ENCRYPTION_KEY_NAME: &str = "encryption_key";
const STORAGE_FILE: &str = "api_keys.json";

/// Encrypted API key configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedKeyConfig {
    pub provider: String,
    pub encrypted_key: Vec<u8>,
    pub nonce: Vec<u8>,
    pub is_active: bool,
    pub last_tested: Option<i64>,
}

/// API key storage with encryption
pub struct KeyStorage {
    storage_path: PathBuf,
    cipher: Aes256Gcm,
}

impl KeyStorage {
    /// Create a new KeyStorage instance
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        // Ensure the directory exists
        fs::create_dir_all(&app_data_dir)
            .context("Failed to create app data directory")?;

        let storage_path = app_data_dir.join(STORAGE_FILE);

        // Get or create encryption key from platform keychain
        let encryption_key = Self::get_or_create_encryption_key()?;
        let cipher = Aes256Gcm::new_from_slice(&encryption_key)
            .context("Failed to create cipher")?;

        Ok(Self {
            storage_path,
            cipher,
        })
    }

    /// Get or create the encryption key from platform keychain
    fn get_or_create_encryption_key() -> Result<Vec<u8>> {
        let entry = Entry::new(SERVICE_NAME, ENCRYPTION_KEY_NAME)
            .context("Failed to create keyring entry")?;

        // Try to get existing key
        match entry.get_password() {
            Ok(key_hex) => {
                // Decode hex string to bytes
                hex::decode(&key_hex).context("Failed to decode encryption key")
            }
            Err(_) => {
                // Generate new key
                let mut key = vec![0u8; 32]; // 256 bits
                OsRng.fill_bytes(&mut key);

                // Store in keychain as hex string
                let key_hex = hex::encode(&key);
                entry
                    .set_password(&key_hex)
                    .context("Failed to store encryption key in keychain")?;

                Ok(key)
            }
        }
    }

    /// Load all stored keys from disk
    fn load_storage(&self) -> Result<HashMap<String, EncryptedKeyConfig>> {
        if !self.storage_path.exists() {
            return Ok(HashMap::new());
        }

        let content = fs::read_to_string(&self.storage_path)
            .context("Failed to read storage file")?;

        let storage: HashMap<String, EncryptedKeyConfig> = serde_json::from_str(&content)
            .context("Failed to parse storage file")?;

        Ok(storage)
    }

    /// Save all keys to disk
    fn save_storage(&self, storage: &HashMap<String, EncryptedKeyConfig>) -> Result<()> {
        let content = serde_json::to_string_pretty(storage)
            .context("Failed to serialize storage")?;

        fs::write(&self.storage_path, content)
            .context("Failed to write storage file")?;

        Ok(())
    }

    /// Encrypt an API key
    fn encrypt_key(&self, api_key: &str) -> Result<(Vec<u8>, Vec<u8>)> {
        // Generate random nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt the key
        let encrypted = self
            .cipher
            .encrypt(nonce, api_key.as_bytes())
            .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;

        Ok((encrypted, nonce_bytes.to_vec()))
    }

    /// Decrypt an API key
    fn decrypt_key(&self, encrypted: &[u8], nonce_bytes: &[u8]) -> Result<String> {
        let nonce = Nonce::from_slice(nonce_bytes);

        let decrypted = self
            .cipher
            .decrypt(nonce, encrypted)
            .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;

        String::from_utf8(decrypted).context("Invalid UTF-8 in decrypted key")
    }

    /// Save an API key for a provider
    pub fn save_key(&self, provider: &str, api_key: &str, is_active: bool) -> Result<()> {
        // Validate that the key is not empty
        if api_key.trim().is_empty() {
            anyhow::bail!("API key cannot be empty");
        }

        // Encrypt the key
        let (encrypted_key, nonce) = self.encrypt_key(api_key)?;

        // Load existing storage
        let mut storage = self.load_storage()?;

        // Create new config
        let config = EncryptedKeyConfig {
            provider: provider.to_string(),
            encrypted_key,
            nonce,
            is_active,
            last_tested: None,
        };

        // Store the config
        storage.insert(provider.to_string(), config);

        // Save to disk
        self.save_storage(&storage)?;

        Ok(())
    }

    /// Load an API key for a provider
    pub fn load_key(&self, provider: &str) -> Result<String> {
        let storage = self.load_storage()?;

        let config = storage
            .get(provider)
            .ok_or_else(|| anyhow::anyhow!("No API key found for provider: {}", provider))?;

        self.decrypt_key(&config.encrypted_key, &config.nonce)
    }

    /// Delete an API key for a provider
    pub fn delete_key(&self, provider: &str) -> Result<()> {
        let mut storage = self.load_storage()?;

        if storage.remove(provider).is_none() {
            anyhow::bail!("No API key found for provider: {}", provider);
        }

        self.save_storage(&storage)?;

        Ok(())
    }

    /// List all configured providers
    pub fn list_providers(&self) -> Result<Vec<String>> {
        let storage = self.load_storage()?;
        Ok(storage.keys().cloned().collect())
    }

    /// Get the active provider
    pub fn get_active_provider(&self) -> Result<Option<String>> {
        let storage = self.load_storage()?;

        for (provider, config) in storage.iter() {
            if config.is_active {
                return Ok(Some(provider.clone()));
            }
        }

        Ok(None)
    }

    /// Set a provider as active
    pub fn set_active_provider(&self, provider: &str) -> Result<()> {
        let mut storage = self.load_storage()?;

        // Check if provider exists
        if !storage.contains_key(provider) {
            anyhow::bail!("Provider not found: {}", provider);
        }

        // Deactivate all providers
        for config in storage.values_mut() {
            config.is_active = false;
        }

        // Activate the specified provider
        if let Some(config) = storage.get_mut(provider) {
            config.is_active = true;
        }

        self.save_storage(&storage)?;

        Ok(())
    }

    /// Update the last tested timestamp for a provider
    pub fn update_last_tested(&self, provider: &str, timestamp: i64) -> Result<()> {
        let mut storage = self.load_storage()?;

        if let Some(config) = storage.get_mut(provider) {
            config.last_tested = Some(timestamp);
            self.save_storage(&storage)?;
            Ok(())
        } else {
            anyhow::bail!("Provider not found: {}", provider);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_save_and_load_key() {
        let temp_dir = TempDir::new().unwrap();
        let storage = KeyStorage::new(temp_dir.path().to_path_buf()).unwrap();

        let provider = "openai";
        let api_key = "sk-test1234567890";

        // Save key
        storage.save_key(provider, api_key, true).unwrap();

        // Load key
        let loaded_key = storage.load_key(provider).unwrap();
        assert_eq!(loaded_key, api_key);
    }

    #[test]
    fn test_delete_key() {
        let temp_dir = TempDir::new().unwrap();
        let storage = KeyStorage::new(temp_dir.path().to_path_buf()).unwrap();

        let provider = "openai";
        let api_key = "sk-test1234567890";

        // Save and delete
        storage.save_key(provider, api_key, true).unwrap();
        storage.delete_key(provider).unwrap();

        // Should fail to load
        assert!(storage.load_key(provider).is_err());
    }

    #[test]
    fn test_list_providers() {
        let temp_dir = TempDir::new().unwrap();
        let storage = KeyStorage::new(temp_dir.path().to_path_buf()).unwrap();

        storage.save_key("openai", "sk-test1", true).unwrap();
        storage.save_key("anthropic", "sk-ant-test2", false).unwrap();

        let providers = storage.list_providers().unwrap();
        assert_eq!(providers.len(), 2);
        assert!(providers.contains(&"openai".to_string()));
        assert!(providers.contains(&"anthropic".to_string()));
    }

    #[test]
    fn test_active_provider() {
        let temp_dir = TempDir::new().unwrap();
        let storage = KeyStorage::new(temp_dir.path().to_path_buf()).unwrap();

        storage.save_key("openai", "sk-test1", true).unwrap();
        storage.save_key("anthropic", "sk-ant-test2", false).unwrap();

        let active = storage.get_active_provider().unwrap();
        assert_eq!(active, Some("openai".to_string()));

        // Change active provider
        storage.set_active_provider("anthropic").unwrap();
        let active = storage.get_active_provider().unwrap();
        assert_eq!(active, Some("anthropic".to_string()));
    }
}
