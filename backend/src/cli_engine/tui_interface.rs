//! TUI interface for file search - reserved for standalone CLI tool
#![allow(dead_code)]

use anyhow::Result;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::Line,
    widgets::{
        Block, Borders, Clear, List, ListItem, ListState, Paragraph, Wrap,
    },
    Frame, Terminal,
};
use std::io;
use std::path::PathBuf;
use tokio::sync::mpsc;

use crate::search_engine::{FileSearchEngine, FileSearchConfig, FileMatch};
use crate::cli_engine::command_executor::CommandExecutor;

/// TUI Application for file search inspired by Codex CLI
pub struct FileSearchTui {
    /// Current search query
    query: String,
    /// Search results
    results: Vec<FileMatch>,
    /// Selected result index
    selected_result: usize,
    /// Current working directory
    current_dir: PathBuf,
    /// Search engine
    search_engine: FileSearchEngine,
    /// Command executor for CLI operations
    command_executor: CommandExecutor,
    /// Input mode
    input_mode: InputMode,
    /// Status message
    status_message: String,
    /// Search history
    search_history: Vec<String>,
    /// History index
    history_index: usize,
    /// Show help
    show_help: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum InputMode {
    Normal,
    Editing,
    Command,
}

/// TUI Events
#[derive(Debug, Clone)]
pub enum TuiEvent {
    Input(String),
    Search(String),
    SelectResult(usize),
    OpenFile(String),
    ChangeDirectory(PathBuf),
    ExecuteCommand(String),
    Quit,
}

impl FileSearchTui {
    pub fn new(initial_dir: PathBuf) -> Result<Self> {
        let config = FileSearchConfig::default();
        let search_engine = FileSearchEngine::new(config);
        let command_executor = CommandExecutor::new(initial_dir.clone());

        Ok(Self {
            query: String::new(),
            results: Vec::new(),
            selected_result: 0,
            current_dir: initial_dir,
            search_engine,
            command_executor,
            input_mode: InputMode::Normal,
            status_message: "Ready - Press '/' to search, '?' for help".to_string(),
            search_history: Vec::new(),
            history_index: 0,
            show_help: false,
        })
    }

    /// Run the TUI application
    pub async fn run(&mut self) -> Result<()> {
        // Setup terminal
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
        let backend = CrosstermBackend::new(stdout);
        let mut terminal = Terminal::new(backend)?;

        // Create event channel
        let (tx, mut rx) = mpsc::unbounded_channel();

        // Spawn input handler
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            loop {
                if let Ok(event) = event::read() {
                    if let Event::Key(key) = event {
                        if key.kind == KeyEventKind::Press {
                            if tx_clone.send(key).is_err() {
                                break;
                            }
                        }
                    }
                }
            }
        });

        // Main event loop
        loop {
            terminal.draw(|f| self.ui(f))?;

            if let Some(key) = rx.recv().await {
                match self.handle_input(key).await {
                    Ok(should_quit) => {
                        if should_quit {
                            break;
                        }
                    }
                    Err(e) => {
                        self.status_message = format!("Error: {}", e);
                    }
                }
            }
        }

        // Restore terminal
        disable_raw_mode()?;
        execute!(
            terminal.backend_mut(),
            LeaveAlternateScreen,
            DisableMouseCapture
        )?;
        terminal.show_cursor()?;

        Ok(())
    }

    /// Handle keyboard input
    async fn handle_input(&mut self, key: crossterm::event::KeyEvent) -> Result<bool> {
        match self.input_mode {
            InputMode::Normal => {
                match key.code {
                    KeyCode::Char('q') => return Ok(true),
                    KeyCode::Char('/') => {
                        self.input_mode = InputMode::Editing;
                        self.query.clear();
                        self.status_message = "Enter search query...".to_string();
                    }
                    KeyCode::Char(':') => {
                        self.input_mode = InputMode::Command;
                        self.status_message = "Enter command...".to_string();
                    }
                    KeyCode::Char('?') => {
                        self.show_help = !self.show_help;
                    }
                    KeyCode::Down | KeyCode::Char('j') => {
                        if !self.results.is_empty() {
                            self.selected_result = (self.selected_result + 1) % self.results.len();
                        }
                    }
                    KeyCode::Up | KeyCode::Char('k') => {
                        if !self.results.is_empty() {
                            self.selected_result = if self.selected_result == 0 {
                                self.results.len() - 1
                            } else {
                                self.selected_result - 1
                            };
                        }
                    }
                    KeyCode::Enter => {
                        if !self.results.is_empty() {
                            let selected_path = self.results[self.selected_result].path.clone();
                            self.open_file(&selected_path).await?;
                        }
                    }
                    KeyCode::Char('r') => {
                        if !self.query.is_empty() {
                            self.perform_search().await?;
                        }
                    }
                    _ => {}
                }
            }
            InputMode::Editing => {
                match key.code {
                    KeyCode::Enter => {
                        if !self.query.is_empty() {
                            self.search_history.push(self.query.clone());
                            self.perform_search().await?;
                        }
                        self.input_mode = InputMode::Normal;
                    }
                    KeyCode::Char(c) => {
                        self.query.push(c);
                        // Perform live search for short queries
                        if self.query.len() >= 2 {
                            self.perform_search().await?;
                        }
                    }
                    KeyCode::Backspace => {
                        self.query.pop();
                        if self.query.len() >= 2 {
                            self.perform_search().await?;
                        } else {
                            self.results.clear();
                        }
                    }
                    KeyCode::Esc => {
                        self.input_mode = InputMode::Normal;
                        self.status_message = "Search cancelled".to_string();
                    }
                    KeyCode::Up => {
                        if !self.search_history.is_empty() && self.history_index > 0 {
                            self.history_index -= 1;
                            self.query = self.search_history[self.history_index].clone();
                        }
                    }
                    KeyCode::Down => {
                        if self.history_index < self.search_history.len() - 1 {
                            self.history_index += 1;
                            self.query = self.search_history[self.history_index].clone();
                        }
                    }
                    _ => {}
                }
            }
            InputMode::Command => {
                match key.code {
                    KeyCode::Enter => {
                        let query = self.query.clone();
                        self.execute_command(&query).await?;
                        self.query.clear();
                        self.input_mode = InputMode::Normal;
                    }
                    KeyCode::Char(c) => {
                        self.query.push(c);
                    }
                    KeyCode::Backspace => {
                        self.query.pop();
                    }
                    KeyCode::Esc => {
                        self.input_mode = InputMode::Normal;
                        self.query.clear();
                        self.status_message = "Command cancelled".to_string();
                    }
                    _ => {}
                }
            }
        }

        Ok(false)
    }

    /// Perform file search
    async fn perform_search(&mut self) -> Result<()> {
        self.status_message = format!("Searching for '{}'...", self.query);
        
        match self.search_engine.search(&self.query, &self.current_dir, true).await {
            Ok(search_results) => {
                self.results = search_results.matches;
                self.selected_result = 0;
                self.status_message = format!(
                    "Found {} results in {}ms", 
                    search_results.total_matches,
                    search_results.search_time_ms
                );
            }
            Err(e) => {
                self.status_message = format!("Search error: {}", e);
                self.results.clear();
            }
        }

        Ok(())
    }

    /// Open a file using the system default application
    async fn open_file(&mut self, file_path: &str) -> Result<()> {
        let full_path = self.current_dir.join(file_path);
        
        match self.command_executor.open_file(&full_path).await {
            Ok(_) => {
                self.status_message = format!("Opened: {}", file_path);
            }
            Err(e) => {
                self.status_message = format!("Failed to open {}: {}", file_path, e);
            }
        }

        Ok(())
    }

    /// Execute a command
    async fn execute_command(&mut self, command: &str) -> Result<()> {
        let parts: Vec<&str> = command.split_whitespace().collect();
        
        match parts.first() {
            Some(&"cd") => {
                if let Some(path) = parts.get(1) {
                    let new_path = if path.starts_with('/') {
                        PathBuf::from(path)
                    } else {
                        self.current_dir.join(path)
                    };
                    
                    if new_path.exists() && new_path.is_dir() {
                        self.current_dir = new_path;
                        self.status_message = format!("Changed directory to: {}", self.current_dir.display());
                        self.results.clear(); // Clear results when changing directory
                    } else {
                        self.status_message = format!("Directory not found: {}", path);
                    }
                }
            }
            Some(&"ls") => {
                match self.command_executor.list_directory(&self.current_dir, false).await {
                    Ok(files) => {
                        self.status_message = format!("Listed {} items", files.len());
                        // Convert directory listing to search results for display
                        self.results = files.into_iter().take(20).map(|file| FileMatch {
                            score: 100,
                            path: file.clone(),
                            relative_path: file.clone(),
                            file_name: std::path::Path::new(&file)
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                            file_size: None,
                            modified: None,
                            file_type: std::path::Path::new(&file)
                                .extension()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                            indices: None,
                        }).collect();
                        self.selected_result = 0;
                    }
                    Err(e) => {
                        self.status_message = format!("ls failed: {}", e);
                    }
                }
            }
            Some(&"pwd") => {
                self.status_message = format!("Current directory: {}", self.current_dir.display());
            }
            Some(&"clear") => {
                self.results.clear();
                self.status_message = "Results cleared".to_string();
            }
            Some(&"help") => {
                self.show_help = true;
            }
            _ => {
                self.status_message = format!("Unknown command: {}", command);
            }
        }

        Ok(())
    }

    /// Render the UI
    fn ui(&mut self, f: &mut Frame) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3), // Header
                Constraint::Min(0),    // Main content
                Constraint::Length(3), // Status bar
            ])
            .split(f.size());

        // Header
        self.render_header(f, chunks[0]);

        // Main content
        if self.show_help {
            self.render_help(f, chunks[1]);
        } else {
            let main_chunks = Layout::default()
                .direction(Direction::Horizontal)
                .constraints([Constraint::Percentage(100)])
                .split(chunks[1]);

            self.render_results(f, main_chunks[0]);
        }

        // Status bar
        self.render_status_bar(f, chunks[2]);

        // Input overlay
        if self.input_mode != InputMode::Normal {
            self.render_input_overlay(f);
        }
    }

    fn render_header(&self, f: &mut Frame, area: Rect) {
        let title = format!("File Search TUI - {}", self.current_dir.display());
        let header = Paragraph::new(title)
            .style(Style::default().fg(Color::Cyan))
            .alignment(Alignment::Center)
            .block(Block::default().borders(Borders::ALL));
        f.render_widget(header, area);
    }

    fn render_results(&mut self, f: &mut Frame, area: Rect) {
        let items: Vec<ListItem> = self.results
            .iter()
            .enumerate()
            .map(|(i, result)| {
                let style = if i == self.selected_result {
                    Style::default().bg(Color::Blue).fg(Color::White)
                } else {
                    Style::default()
                };

                let content = format!(
                    "{} ({})", 
                    result.relative_path,
                    result.file_type
                );

                ListItem::new(content).style(style)
            })
            .collect();

        let results_list = List::new(items)
            .block(Block::default()
                .title(format!("Results ({})", self.results.len()))
                .borders(Borders::ALL))
            .highlight_style(Style::default().add_modifier(Modifier::BOLD));

        let mut list_state = ListState::default();
        list_state.select(Some(self.selected_result));

        f.render_stateful_widget(results_list, area, &mut list_state);
    }

    fn render_help(&self, f: &mut Frame, area: Rect) {
        let help_text = vec![
            Line::from("File Search TUI - Help"),
            Line::from(""),
            Line::from("Navigation:"),
            Line::from("  j/↓        - Move down"),
            Line::from("  k/↑        - Move up"),
            Line::from("  Enter      - Open selected file"),
            Line::from(""),
            Line::from("Search:"),
            Line::from("  /          - Start search"),
            Line::from("  r          - Refresh search"),
            Line::from(""),
            Line::from("Commands:"),
            Line::from("  :          - Enter command mode"),
            Line::from("  :cd <path> - Change directory"),
            Line::from("  :ls        - List directory"),
            Line::from("  :pwd       - Show current directory"),
            Line::from("  :clear     - Clear results"),
            Line::from(""),
            Line::from("Other:"),
            Line::from("  ?          - Toggle this help"),
            Line::from("  q          - Quit"),
            Line::from(""),
            Line::from("Press ? again to close help"),
        ];

        let help = Paragraph::new(help_text)
            .block(Block::default().title("Help").borders(Borders::ALL))
            .wrap(Wrap { trim: true });

        f.render_widget(help, area);
    }

    fn render_status_bar(&self, f: &mut Frame, area: Rect) {
        let mode_text = match self.input_mode {
            InputMode::Normal => "NORMAL",
            InputMode::Editing => "SEARCH",
            InputMode::Command => "COMMAND",
        };

        let status = Paragraph::new(format!("[{}] {}", mode_text, self.status_message))
            .style(Style::default().fg(Color::Yellow))
            .block(Block::default().borders(Borders::ALL));

        f.render_widget(status, area);
    }

    fn render_input_overlay(&self, f: &mut Frame) {
        let area = centered_rect(60, 20, f.size());
        f.render_widget(Clear, area);

        let title = match self.input_mode {
            InputMode::Editing => "Search",
            InputMode::Command => "Command",
            _ => "Input",
        };

        let input = Paragraph::new(self.query.as_str())
            .style(Style::default().fg(Color::Yellow))
            .block(Block::default().title(title).borders(Borders::ALL));

        f.render_widget(input, area);
    }
}

/// Helper function to create a centered rectangle
fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_tui_creation() {
        let temp_dir = TempDir::new().unwrap();
        let tui = FileSearchTui::new(temp_dir.path().to_path_buf());
        assert!(tui.is_ok());
    }
}