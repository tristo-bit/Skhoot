//! Terminal Service Module
//! 
//! Provides PTY-based terminal sessions with proper async support.
//! Uses tokio for async I/O and efficient resource management.

mod session;
mod manager;
mod routes;
mod snapshot;

pub use manager::TerminalManager;
pub use session::SessionConfig;
pub use routes::terminal_routes;
