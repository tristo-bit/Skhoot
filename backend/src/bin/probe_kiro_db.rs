use sqlx::sqlite::SqlitePoolOptions;
use std::error::Error;
use sqlx::Row;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let home = std::env::var("HOME").unwrap();
    let db_path = format!("{}/.local/share/kiro-cli/data.sqlite3", home);
    let conn_str = format!("sqlite://{}", db_path);

    let pool = SqlitePoolOptions::new()
        .connect(&conn_str)
        .await?;

    println!("Querying auth_kv table...");
    // We don't know column names, but typically KV tables are (key, value).
    // Let's try to fetch using dynamic rows.
    
    let rows = sqlx::query("SELECT * FROM auth_kv")
        .fetch_all(&pool)
        .await?;

    for row in rows {
        // Try to get columns by index or common names
        let key: String = row.try_get(0).unwrap_or_else(|_| "UNKNOWN".to_string());
        let val: String = row.try_get(1).unwrap_or_else(|_| "blob/unknown".to_string());
        
        println!("Key: {}", key);
        println!("Value: {}", val.chars().take(50).collect::<String>());
        println!("---");
    }

    Ok(())
}
