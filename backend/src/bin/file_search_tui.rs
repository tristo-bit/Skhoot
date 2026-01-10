use anyhow::Result;
use clap::Parser;
use std::path::PathBuf;

use skhoot_backend::cli_engine::tui_interface::FileSearchTui;

/// Command-line arguments for the file search TUI
#[derive(Parser)]
#[command(name = "file-search-tui")]
#[command(about = "Interactive file search TUI inspired by Codex CLI")]
#[command(version)]
struct Args {
    /// Starting directory for file search
    #[arg(short, long, default_value = ".")]
    directory: PathBuf,

    /// Enable debug logging
    #[arg(short, long)]
    debug: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize logging
    if args.debug {
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .init();
    }

    // Resolve the directory path
    let search_dir = if args.directory.is_absolute() {
        args.directory
    } else {
        std::env::current_dir()?.join(args.directory)
    };

    if !search_dir.exists() {
        eprintln!("Error: Directory '{}' does not exist", search_dir.display());
        std::process::exit(1);
    }

    if !search_dir.is_dir() {
        eprintln!("Error: '{}' is not a directory", search_dir.display());
        std::process::exit(1);
    }

    println!("Starting File Search TUI in: {}", search_dir.display());
    println!("Press '?' for help, 'q' to quit");

    // Create and run the TUI
    let mut tui = FileSearchTui::new(search_dir)?;
    
    if let Err(e) = tui.run().await {
        eprintln!("TUI error: {}", e);
        std::process::exit(1);
    }

    Ok(())
}