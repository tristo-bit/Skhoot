use anyhow::Result;
use sqlx::sqlite::SqlitePoolOptions;
use std::path::PathBuf;

/// Retrieve the Kiro access token from the local CLI database
pub async fn get_access_token() -> Result<String> {
    let home = std::env::var("HOME")?;
    let db_path = PathBuf::from(home).join(".local/share/kiro-cli/data.sqlite3");
    
    if !db_path.exists() {
        return Err(anyhow::anyhow!("Kiro CLI database not found at {:?}", db_path));
    }
    
    let conn_str = format!("sqlite://{}", db_path.to_string_lossy());
    
    // Connect to the DB (read-only)
    let pool = SqlitePoolOptions::new()
        .connect(&conn_str)
        .await?;
    
    // Fetch the token JSON
    // The key is 'kirocli:odic:token'
    let row: (String,) = sqlx::query_as("SELECT value FROM auth_kv WHERE key = 'kirocli:odic:token'")
        .fetch_one(&pool)
        .await
        .map_err(|_| anyhow::anyhow!("Token not found in database. Please run 'kiro-cli login'."))?;
        
    // Parse JSON to get access_token
    let json: serde_json::Value = serde_json::from_str(&row.0)?;
    let token = json["access_token"].as_str()
        .ok_or_else(|| anyhow::anyhow!("access_token field missing in JSON"))?;
        
    Ok(token.to_string())
}
