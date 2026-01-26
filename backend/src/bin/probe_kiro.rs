use keyring::Entry;
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let services = [
        "kiro-cli",
        "kiro",
        "dev.kiro.cli",
        "kiro-cli:auth",
        "kiro-cli-release",
        "kiro-dev",
        "vscode-lib-secret-store", // VS Code standard
        "code-oss-keyring",
    ];

    let usernames = [
        "default",
        "user",
        "moebius", // current user
        "auth-token",
        "session",
        "kiro-cli",
        "token",
    ];

    println!("Probing keyring for Kiro CLI credentials...");

    for service in services {
        for user in usernames {
            // println!("Checking {} / {}", service, user);
            match Entry::new(service, user) {
                Ok(entry) => {
                    if let Ok(password) = entry.get_password() {
                        println!("✅ FOUND MATCH!");
                        println!("Service: {}", service);
                        println!("User:    {}", user);
                        // Don't print full token for security, just length or prefix
                        println!(
                            "Token:   {}...",
                            &password.chars().take(10).collect::<String>()
                        );
                    }
                }
                Err(_) => {}
            }
        }
    }

    // Also try to find VS Code specific patterns if it is VS Code based
    // VS Code stores secrets in 'vscode-lib-secret-store' with json keys
    // We can try to list items but keyring crate doesn't easily support listing without specific backend access
    // But we can blindly try expected keys if we knew them.

    Ok(())
}
