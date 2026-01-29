# Prompt 03: Cross-Platform Terminal Backend

"Develop a Rust-based terminal management system for the Axum sidecar. 

Technical Specs:
1. Use `portable-pty` or a similar crate to handle pseudo-terminal (PTY) creation on Windows (using conpty), macOS, and Linux.
2. Dynamically select the default shell: `powershell.exe` on Windows, `/bin/bash` (if available) or `/bin/sh` on Unix.
3. Implement a session management system that:
   - Supports multiple concurrent terminal instances.
   - Provides an HTTP endpoint for reading/writing bytes to the PTY.
   - Includes a 'snapshot' system to capture terminal states for AI context.
4. Ensure the system handles tilde expansion (`~`) and proper absolute path resolution across all operating systems."
