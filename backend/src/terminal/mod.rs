//! Terminal Service Module
//! 
//! Provides PTY-based terminal sessions with proper async support.
//! Uses tokio for async I/O and efficient resource management.

mod session;
mod manager;
mod routes;

pub use session::{TerminalSession, SessionConfig};
pub use manager::TerminalManager;
pub use routes::terminal_routes;
