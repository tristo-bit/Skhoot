use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{error, info};

use crate::search_engine::history_manager::{ActivityType, HistoryManager};

pub struct FileWatcher {
    watcher: RecommendedWatcher,
    // We keep receiver here just to keep the channel alive if needed, 
    // though typically the processing loop holds it.
}

impl FileWatcher {
    pub fn new(
        path: PathBuf,
        history_manager: Arc<HistoryManager>,
        create_activity: Option<ActivityType>,
    ) -> anyhow::Result<Self> {
        let (tx, mut rx) = mpsc::channel(100);
        let create_activity = create_activity.unwrap_or(ActivityType::FileCreated);

        let watcher_config = Config::default();
        let mut watcher = RecommendedWatcher::new(move |res| {
            if let Ok(event) = res {
                let _ = tx.blocking_send(event);
            }
        }, watcher_config)?;

        watcher.watch(&path, RecursiveMode::Recursive)?;

        info!("Started file watcher on {:?}", path);

        // Spawn async task to process events
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                handle_event(event, &history_manager, create_activity.clone()).await;
            }
        });

        Ok(Self { watcher })
    }
}

async fn handle_event(event: Event, history_manager: &Arc<HistoryManager>, create_activity: ActivityType) {
    use notify::EventKind;

    // Filter out irrelevant paths
    let valid_paths: Vec<PathBuf> = event.paths.into_iter()
        .filter(|p| !is_ignored(p))
        .collect();

    if valid_paths.is_empty() {
        return;
    }

    match event.kind {
        EventKind::Create(_) => {
            for path in valid_paths {
                if let Some(path_str) = path.to_str() {
                    history_manager.add_entry(path_str.to_string(), create_activity.clone()).await;
                }
            }
        }
        EventKind::Modify(_) => {
             for path in valid_paths {
                if let Some(path_str) = path.to_str() {
                    // We might want to debounce this, as modify events fire rapidly
                    // For now, let HistoryManager handle deduplication at the top of the list
                    // Modifications are always modifications, regardless of folder context
                    history_manager.add_entry(path_str.to_string(), ActivityType::FileModified).await;
                }
            }
        }
        _ => {}
    }
}

fn is_ignored(path: &Path) -> bool {
    // Basic filtering to avoid spamming the history with build artifacts
    let path_str = path.to_string_lossy();
    
    // Ignore git and common build directories
    if path_str.contains("/.git/") || 
       path_str.contains("/node_modules/") || 
       path_str.contains("/target/") ||
       path_str.contains("/dist/") ||
       path_str.contains("/build/") {
        return true;
    }

    // Ignore temporary files and browser partial downloads
    if path_str.ends_with(".tmp") ||
       path_str.ends_with(".log") ||
       path_str.ends_with(".crdownload") ||
       path_str.ends_with(".part") ||
       path_str.ends_with(".opdownload") { // Opera
        return true;
    }

    // Ignore hidden files that are likely system/temp files (starting with dot)
    // But allow .env, .gitignore etc in root if needed, though typically we want to see user files.
    // For downloads specifically, dotfiles are usually junk.
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        if name.starts_with('.') {
            return true;
        }
    }

    false
}
