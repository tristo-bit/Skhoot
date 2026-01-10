//! Application configuration
#![allow(dead_code)]

use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub port: u16,
    pub host: String,
    pub index_paths: Vec<String>,
    pub excluded_patterns: Vec<String>,
}

impl AppConfig {
    pub fn new() -> Result<Self> {
        let home_dir = env::var("HOME").or_else(|_| env::var("USERPROFILE"))?;
        let data_dir = format!("{}/.skhoot", home_dir);
        std::fs::create_dir_all(&data_dir)?;
        
        Ok(Self {
            database_url: format!("sqlite://{}/skhoot.db", data_dir),
            port: 3001,
            host: "127.0.0.1".to_string(),
            index_paths: vec![
                home_dir.clone(),
                format!("{}/Documents", home_dir),
                format!("{}/Desktop", home_dir),
                format!("{}/Downloads", home_dir),
            ],
            excluded_patterns: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                ".cache".to_string(),
                "target".to_string(),
                "*.tmp".to_string(),
                "*.log".to_string(),
            ],
        })
    }
}
