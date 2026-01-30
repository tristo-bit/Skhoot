//! PTY (Pseudo-Terminal) support for terminal emulation
//!
//! This module provides PTY session management for proper terminal emulation,
//! including ANSI escape code support, terminal resizing, and interactive shell support.

use super::error::CliError;
use super::types::TerminalOutput;
use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty, Child};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
// use tokio::sync::Mutex; // Replaced with std::sync::Mutex for synchronous access
use tracing::{debug, warn, error};

/// Default terminal size
const DEFAULT_COLS: u16 = 80;
const DEFAULT_ROWS: u16 = 24;

/// PTY session wrapper for managing pseudo-terminal operations
pub struct PtySession {
    /// The master PTY handle
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    /// The child process
    child: Box<dyn Child + Send + Sync>,
    /// Current terminal size
    size: PtySize,
    /// Output buffer for PTY data
    output_buffer: Arc<tokio::sync::Mutex<Vec<TerminalOutput>>>,
    /// Session ID for tracking
    session_id: String,
}

impl PtySession {
    /// Create a new PTY session with the specified command
    pub fn new(
        session_id: String,
        cmd: &str,
        args: &[String],
        cwd: Option<std::path::PathBuf>,
        cols: Option<u16>,
        rows: Option<u16>,
    ) -> Result<Self, CliError> {
        let pty_system = native_pty_system();
        
        // Set up terminal size
        let size = PtySize {
            rows: rows.unwrap_or(DEFAULT_ROWS),
            cols: cols.unwrap_or(DEFAULT_COLS),
            pixel_width: 0,
            pixel_height: 0,
        };

        debug!(
            "Creating PTY session {} with size {}x{} for command: {} {:?} (cwd: {:?})",
            session_id, size.cols, size.rows, cmd, args, cwd
        );

        // Create the PTY pair
        let pair = pty_system
            .openpty(size)
            .map_err(|e| {
                error!("Failed to create PTY: {}", e);
                CliError::SpawnFailed(format!("Failed to create PTY: {}", e))
            })?;

        // Build the command
        let mut command = CommandBuilder::new(cmd);
        command.args(args);
        
        // On Windows, use -NoLogo -NoProfile -ExecutionPolicy Bypass for powershell
        if cfg!(target_os = "windows") && cmd.contains("powershell.exe") {
            command.args(&["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass"]);
        }

        if let Some(dir) = cwd {
            command.cwd(dir);
        }

        // Spawn the child process in the PTY
        let child = pair.slave.spawn_command(command).map_err(|e| {
            error!("Failed to spawn command in PTY: {}", e);
            if e.to_string().contains("No such file") {
                CliError::CommandNotFound(cmd.to_string())
            } else {
                CliError::SpawnFailed(format!("Failed to spawn command: {}", e))
            }
        })?;

        debug!("PTY session {} created successfully", session_id);

        Ok(Self {
            master: Arc::new(Mutex::new(pair.master)),
            child,
            size,
            output_buffer: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            session_id,
        })
    }

    /// Write input to the PTY (sends to child process stdin)
    pub fn write_input(&mut self, input: &str) -> Result<(), CliError> {
        debug!("Writing to PTY session {}: {}", self.session_id, input);
        
        // Lock master (blocking)
        let mut master = self.master.lock().map_err(|_| {
            CliError::Internal("Failed to lock PTY master".to_string())
        })?;
        
        let writer = master.take_writer().map_err(|e| {
            error!("Failed to get PTY writer: {}", e);
            CliError::Internal(format!("Failed to get PTY writer: {}", e))
        })?;

        let mut writer = writer;
        
        // Write input with newline
        let input_with_newline = format!("{}\n", input);
        writer.write_all(input_with_newline.as_bytes()).map_err(|e| {
            error!("Failed to write to PTY: {}", e);
            CliError::Io(format!("Failed to write to PTY: {}", e))
        })?;

        writer.flush().map_err(|e| {
            error!("Failed to flush PTY writer: {}", e);
            CliError::Io(format!("Failed to flush PTY writer: {}", e))
        })?;

        debug!("Successfully wrote to PTY session {}", self.session_id);
        Ok(())
    }

    /// Read output from the PTY (non-blocking)
    pub fn read_output(&mut self) -> Result<Vec<u8>, CliError> {
        let master = self.master.lock().map_err(|_| {
            CliError::Internal("Failed to lock PTY master".to_string())
        })?;
        
        let mut reader = master.try_clone_reader().map_err(|e| {
            error!("Failed to clone PTY reader: {}", e);
            CliError::Internal(format!("Failed to clone PTY reader: {}", e))
        })?;
        drop(master); // Unlock immediately

        let mut buffer = vec![0u8; 8192]; // 8KB buffer
        let mut output = Vec::new();

        // Non-blocking read
        match reader.read(&mut buffer) {
            Ok(0) => {
                // EOF - process may have exited
                debug!("PTY session {} reached EOF", self.session_id);
            }
            Ok(n) => {
                output.extend_from_slice(&buffer[..n]);
                debug!("Read {} bytes from PTY session {}", n, self.session_id);
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // No data available, this is fine for non-blocking read
                debug!("No data available from PTY session {}", self.session_id);
            }
            Err(e) => {
                warn!("Error reading from PTY session {}: {}", self.session_id, e);
                return Err(CliError::Io(format!("Failed to read from PTY: {}", e)));
            }
        }

        Ok(output)
    }

    /// Resize the PTY terminal
    pub fn resize(&mut self, cols: u16, rows: u16) -> Result<(), CliError> {
        debug!(
            "Resizing PTY session {} to {}x{}",
            self.session_id, cols, rows
        );

        self.size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let mut master = self.master.lock().map_err(|_| {
            CliError::Internal("Failed to lock PTY master".to_string())
        })?;
        
        master.resize(self.size).map_err(|e| {
            error!("Failed to resize PTY: {}", e);
            CliError::Internal(format!("Failed to resize PTY: {}", e))
        })?;

        debug!("Successfully resized PTY session {}", self.session_id);
        Ok(())
    }

    /// Get the current terminal size
    pub fn get_size(&self) -> (u16, u16) {
        (self.size.cols, self.size.rows)
    }

    /// Check if the child process is still running
    pub fn is_running(&mut self) -> bool {
        match self.child.try_wait() {
            Ok(Some(_)) => {
                debug!("PTY session {} process has exited", self.session_id);
                false
            }
            Ok(None) => {
                // Still running
                true
            }
            Err(e) => {
                warn!("Error checking PTY session {} status: {}", self.session_id, e);
                false
            }
        }
    }

    /// Wait for the child process to exit and get the exit status
    pub fn wait(&mut self) -> Result<Option<i32>, CliError> {
        match self.child.wait() {
            Ok(status) => {
                // ExitStatus from portable-pty returns exit_code() as u32
                // We need to convert it to Option<i32>
                let exit_code = status.exit_code();
                debug!(
                    "PTY session {} exited with code: {}",
                    self.session_id, exit_code
                );
                // Convert u32 to i32, wrapping if necessary
                Ok(Some(exit_code as i32))
            }
            Err(e) => {
                error!("Error waiting for PTY session {}: {}", self.session_id, e);
                Err(CliError::Internal(format!("Failed to wait for process: {}", e)))
            }
        }
    }

    /// Kill the child process
    pub fn kill(&mut self) -> Result<(), CliError> {
        debug!("Killing PTY session {}", self.session_id);
        
        self.child.kill().map_err(|e| {
            error!("Failed to kill PTY session {}: {}", self.session_id, e);
            CliError::Internal(format!("Failed to kill process: {}", e))
        })?;

        debug!("Successfully killed PTY session {}", self.session_id);
        Ok(())
    }

    /// Get the session ID
    pub fn session_id(&self) -> &str {
        &self.session_id
    }

    /// Start a background task to continuously read PTY output
    pub fn start_output_reader(&self) -> tokio::task::JoinHandle<()> {
        let session_id = self.session_id.clone();
        let output_buffer = self.output_buffer.clone();
        let master_clone = self.master.clone();
        
        // Clone the reader for the background task
        tokio::spawn(async move {
            let reader_result = {
                let master = master_clone.lock().unwrap(); // Use unwrap in thread/task context
                master.try_clone_reader()
            };

            let mut reader = match reader_result {
                Ok(r) => r,
                Err(e) => {
                    error!("Failed to clone PTY reader for background task: {}", e);
                    return;
                }
            };

            let mut buffer = vec![0u8; 8192];
            
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF - process exited
                        debug!("PTY reader for session {} reached EOF", session_id);
                        break;
                    }
                    Ok(n) => {
                        // Convert raw bytes to string, preserving ANSI codes
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        
                        let output = TerminalOutput {
                            timestamp: chrono::Utc::now(),
                            output_type: super::types::OutputType::Stdout,
                            content: data,
                            ansi_formatted: true, // PTY output includes ANSI codes
                        };

                        let mut buf = output_buffer.lock().await;
                        buf.push(output);
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        // No data available, wait a bit
                        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                    }
                    Err(e) => {
                        warn!("Error reading from PTY session {}: {}", session_id, e);
                        break;
                    }
                }
            }
            
            debug!("PTY reader task for session {} terminated", session_id);
        })
    }

    /// Get buffered output
    pub async fn get_buffered_output(&self) -> Vec<TerminalOutput> {
        let buffer = self.output_buffer.lock().await;
        buffer.clone()
    }

    /// Clear the output buffer
    pub async fn clear_buffer(&self) {
        let mut buffer = self.output_buffer.lock().await;
        buffer.clear();
    }
}

impl std::fmt::Debug for PtySession {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PtySession")
            .field("session_id", &self.session_id)
            .field("size", &format!("{}x{}", self.size.cols, self.size.rows))
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pty_session_creation() {
        let result = PtySession::new(
            "test-session".to_string(),
            "echo",
            &["hello".to_string()],
            None,
            Some(80),
            Some(24),
        );
        
        assert!(result.is_ok());
        let session = result.unwrap();
        assert_eq!(session.session_id(), "test-session");
        assert_eq!(session.get_size(), (80, 24));
    }

    #[test]
    fn test_pty_session_invalid_command() {
        let result = PtySession::new(
            "test-session".to_string(),
            "nonexistent_command_xyz",
            &[],
            None,
            None,
            None,
        );
        
        assert!(result.is_err());
        // PTY might return SpawnFailed instead of CommandNotFound depending on the system
        let err = result.unwrap_err();
        assert!(
            matches!(err, CliError::CommandNotFound(_)) || matches!(err, CliError::SpawnFailed(_)),
            "Expected CommandNotFound or SpawnFailed, got: {:?}", err
        );
    }

    #[test]
    fn test_pty_resize() {
        let mut session = PtySession::new(
            "test-session".to_string(),
            "echo",
            &["test".to_string()],
            None,
            Some(80),
            Some(24),
        ).unwrap();

        let result = session.resize(100, 30);
        assert!(result.is_ok());
        assert_eq!(session.get_size(), (100, 30));
    }
}
