use std::error::Error;
use skhoot_backend::kiro_bridge::get_access_token;
use reqwest::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    println!("Fetching Kiro token...");
    let token = get_access_token().await?;
    println!("Token found (len: {})", token.len());

    let client = Client::new();
    let resp = client
        .get("https://api.kiro.dev/v1/models")
        .bearer_auth(&token)
        .send()
        .await?;

    println!("Status: {}", resp.status());
    let body = resp.text().await?;
    println!("Body: {}", body);

    Ok(())
}
