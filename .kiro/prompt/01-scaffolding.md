# Prompt 01: The Foundation (Tauri + React + Rust Sidecar)

"Scaffold a high-performance desktop application using Tauri v2 and React. 

The application needs a unique hybrid architecture: 
1. A main Tauri window with transparency and custom window controls.
2. A separate Rust backend sidecar (using Axum) that handles heavy operations like local file indexing, terminal PTY management, and local API bridges.
3. A centralized service layer in TypeScript that communicates with both the Tauri Rust core (via `invoke`) and the Axum sidecar (via `fetch`).

Design requirements: 
- Use Tailwind CSS v4 with PostCSS.
- Support full dark/light mode with glassmorphic effects (backdrop blurs).
- Implement a 32px rounded corner design language that works across Windows, macOS, and Linux."
