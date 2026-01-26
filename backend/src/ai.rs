//! AI provider management for embeddings and completions
#![allow(dead_code)]

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::error::AppError;

#[derive(Clone)]
pub struct AIManager {
    client: Client,
    providers: HashMap<String, ProviderConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub name: String,
    pub base_url: String,
    pub models: Vec<String>,
    pub embedding_model: Option<String>,
}

#[derive(Serialize)]
pub struct ProviderInfo {
    pub provider: String,
    pub models: Vec<String>,
}

#[derive(Deserialize)]
struct OpenAIModelsResponse {
    data: Vec<OpenAIModel>,
}

#[derive(Deserialize)]
struct OpenAIModel {
    id: String,
}

#[derive(Deserialize)]
struct GeminiModelsResponse {
    models: Vec<GeminiModel>,
}

#[derive(Deserialize)]
struct GeminiModel {
    name: String,
}

impl AIManager {
    pub fn new() -> Self {
        let mut providers = HashMap::new();
        
        providers.insert("openai".to_string(), ProviderConfig {
            name: "OpenAI".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            models: vec![
                "gpt-4o".to_string(),
                "gpt-4o-mini".to_string(),
                "gpt-3.5-turbo".to_string(),
            ],
            embedding_model: Some("text-embedding-3-small".to_string()),
        });

        providers.insert("anthropic".to_string(), ProviderConfig {
            name: "Anthropic".to_string(),
            base_url: "https://api.anthropic.com/v1".to_string(),
            models: vec![
                "claude-3-5-sonnet-20241022".to_string(),
                "claude-3-5-haiku-20241022".to_string(),
                "claude-3-opus-20240229".to_string(),
            ],
            embedding_model: None,
        });

        providers.insert("google".to_string(), ProviderConfig {
            name: "Google".to_string(),
            base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
            models: vec![
                "gemini-2.0-flash-exp".to_string(),
                "gemini-1.5-pro".to_string(),
                "gemini-1.5-flash".to_string(),
            ],
            embedding_model: Some("text-embedding-004".to_string()),
        });

        Self {
            client: Client::new(),
            providers,
        }
    }

    pub async fn detect_provider(&self, api_key: &str) -> Result<ProviderInfo, AppError> {
        let provider = self.detect_provider_from_key(api_key)?;
        let models = self.fetch_models(&provider, api_key).await?;
        
        Ok(ProviderInfo {
            provider: self.providers[&provider].name.clone(),
            models,
        })
    }

    fn detect_provider_from_key(&self, api_key: &str) -> Result<String, AppError> {
        if api_key.starts_with("sk-") {
            Ok("openai".to_string())
        } else if api_key.starts_with("sk-ant-") {
            Ok("anthropic".to_string())
        } else if api_key.starts_with("AIza") {
            Ok("google".to_string())
        } else {
            Err(AppError::BadRequest("Unknown API key format".to_string()))
        }
    }

    async fn fetch_models(&self, provider: &str, api_key: &str) -> Result<Vec<String>, AppError> {
        match provider {
            "openai" => self.fetch_openai_models(api_key).await,
            "google" => self.fetch_google_models(api_key).await,
            "anthropic" => {
                // Anthropic doesn't have a models endpoint, return predefined models
                Ok(self.providers["anthropic"].models.clone())
            }
            _ => Err(AppError::BadRequest("Unsupported provider".to_string())),
        }
    }

    async fn fetch_openai_models(&self, api_key: &str) -> Result<Vec<String>, AppError> {
        let response = self
            .client
            .get("https://api.openai.com/v1/models")
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Ok(self.providers["openai"].models.clone());
        }

        let models_response: OpenAIModelsResponse = response.json().await?;
        let mut models: Vec<String> = models_response
            .data
            .into_iter()
            .filter(|m| m.id.starts_with("gpt-") || m.id.starts_with("o1-"))
            .map(|m| m.id)
            .collect();

        models.sort();
        Ok(models)
    }

    async fn fetch_google_models(&self, api_key: &str) -> Result<Vec<String>, AppError> {
        let response = self
            .client
            .get(&format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Ok(self.providers["google"].models.clone());
        }

        let models_response: GeminiModelsResponse = response.json().await?;
        let mut models: Vec<String> = models_response
            .models
            .into_iter()
            .filter(|m| m.name.contains("gemini"))
            .map(|m| m.name.replace("models/", ""))
            .collect();

        models.sort();
        Ok(models)
    }

    pub async fn generate_embedding(&self, provider: &str, api_key: &str, text: &str) -> Result<Vec<f32>, AppError> {
        match provider {
            "openai" => self.generate_openai_embedding(api_key, text).await,
            "google" => self.generate_google_embedding(api_key, text).await,
            _ => Err(AppError::BadRequest("Provider doesn't support embeddings".to_string())),
        }
    }

    async fn generate_openai_embedding(&self, api_key: &str, text: &str) -> Result<Vec<f32>, AppError> {
        let payload = serde_json::json!({
            "input": text,
            "model": "text-embedding-3-small"
        });

        let response = self
            .client
            .post("https://api.openai.com/v1/embeddings")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        let result: serde_json::Value = response.json().await?;
        let embedding = result["data"][0]["embedding"]
            .as_array()
            .ok_or_else(|| AppError::Internal("Invalid embedding response".to_string()))?
            .iter()
            .map(|v| v.as_f64().unwrap_or(0.0) as f32)
            .collect();

        Ok(embedding)
    }

    async fn generate_google_embedding(&self, api_key: &str, text: &str) -> Result<Vec<f32>, AppError> {
        let payload = serde_json::json!({
            "model": "models/text-embedding-004",
            "content": {
                "parts": [{"text": text}]
            }
        });

        let response = self
            .client
            .post(&format!("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={}", api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        let result: serde_json::Value = response.json().await?;
        let embedding = result["embedding"]["values"]
            .as_array()
            .ok_or_else(|| AppError::Internal("Invalid embedding response".to_string()))?
            .iter()
            .map(|v| v.as_f64().unwrap_or(0.0) as f32)
            .collect();

        Ok(embedding)
    }
}
