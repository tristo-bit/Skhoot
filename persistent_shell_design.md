# Design: Persistent Shell Loop for Skhoot

## Goal
To elevate Skhoot from a "Command Runner" to a true "Terminal Co-pilot," matching the capabilities of `codex-main`. The AI should operate within a persistent shell session, maintaining state (cwd, env vars, history) and supporting interactive workflows.

## Current vs. Target Architecture

| Feature | Current Skhoot (Ephemeral) | Target Skhoot (Persistent) |
| :--- | :--- | :--- |
| **Execution** | `cmd /c` or `sh -c` spawned per tool call | Single long-lived PTY session (`bash`, `zsh`, `powershell`) |
| **State** | Lost after every command (`cd` does nothing) | Persisted (`cd` changes CWD for next command) |
| **Visibility** | User sees static output logs | User sees a live terminal (xterm.js) mirroring AI actions |
| **Interactivity** | Non-interactive only | Supports REPLs (python, node), sudo, etc. |

## Implementation Plan

### 1. Backend: Agent-Terminal Bridge
We need to connect `cli_agent` (the brain) with `terminal` (the body).

*   **Modify `AgentState`:**
    *   Add `terminal_session_id: Option<String>`.
    *   When an agent starts, it can either spin up a new hidden terminal or attach to an existing user terminal.

*   **New Tools (Mirroring `codex-main`):**
    *   `terminal_execute(command: str)`: Writes to the PTY master.
    *   `terminal_read()`: Reads the PTY output buffer (with ANSI stripping option for AI consumption).
    *   `terminal_resize(rows, cols)`: For adjusting the view.

*   **Logic:**
    *   Instead of `std::process::Command`, the `Executor` delegates to `TerminalManager::write`.
    *   It waits for a "prompt" or "idle" signal (heuristic) to know when the command finished.

### 2. Frontend: The "Mirror" Terminal
The user needs to see what the AI is doing in real-time.

*   **Component:** Reuse the existing `<Terminal />` (XTerm.js) component.
*   **Mode:** "AI Driven Mode".
    *   The terminal is read-only for the user while the AI is typing.
    *   The AI's input appears as if typed.
    *   The output streams directly from the backend PTY websocket.

### 3. Safety & Control
*   **Interrupt:** A "Stop" button in the UI must send `Ctrl+C` to the PTY.
*   **Approval:** For sensitive commands (like `rm -rf`), the AI proposes the command, and the user must click "Run" (or press Enter) in the UI to let the PTY execute it.

## Technical Roadmap

1.  **Backend Refactor:**
    *   Expose `TerminalManager` to `AgentExecutor`.
    *   Implement `execute_in_pty` tool handler.
    *   Implement "Output Scraper" (to return PTY output as tool result).

2.  **Frontend Wiring:**
    *   Create `useAgentTerminal` hook.
    *   Connect the Chat Interface to the Terminal Panel (auto-open terminal when AI uses it).

3.  **Prompt Engineering:**
    *   Update System Prompt to teach the AI it is running in a persistent shell (e.g., "You are logged into a bash session. Use `ls` to see where you are.").

## Comparison with `codex-main`
`codex-main` uses a `Shell` struct that wraps a PTY. We have `TerminalSession`. They are conceptually identical. The main difference is `codex-main` is a CLI app, so it *is* the terminal. Skhoot is a GUI, so we must *render* the terminal and *bridge* the input.
