# Vision: Unified Persistent Shell Agent (Skhoot)

## Core Goal
To bridge the gap between ephemeral CLI tools and a true "AI Co-pilot" by binding the AI Agent directly to a persistent, stateful Terminal Session. This aligns Skhoot with `codex-main`'s capabilities while retaining its modern GUI advantages.

## The Missing Link
Currently, Skhoot operates in two disconnected modes:
1.  **Agent Mode:** Ephemeral execution. Every command (`ls`, `git status`) runs in a fresh, isolated shell. No state (like `cd` or `export`) is preserved.
2.  **Terminal Mode:** Persistent PTY sessions (via `TerminalManager`), but the AI cannot "see" or "control" them directly.

## Implementation Strategy

### 1. Dynamic Working Directory (User Control)
**Requirement:** Users must be able to open Skhoot in *any* directory (via right-click or CLI arg) and change it dynamically.

*   **Launch Context:**
    *   When launching via CLI (`skhoot .`), pass the path as an argument to the Tauri frontend.
    *   Frontend initializes `AgentChatService` with this `initialPath`.
    *   Backend `AgentConfig` accepts this path instead of defaulting to Home.
*   **Runtime Context Switching:**
    *   **UI:** Add a "Working Directory" indicator/picker in the Chat Header.
    *   **Logic:** When changed, it updates the `AgentState` in the backend.
    *   **AI Command:** Allow the AI to change its own context via a `change_directory` tool (which updates the state, not just runs `cd`).

### 2. Binding Agent to Terminal Session
**Goal:** When the AI runs a shell command, it shouldn't spawn `cmd /c`. It should inject the command into a real, running PTY session.

*   **Architecture Change:**
    *   Update `AgentExecutor` to hold a reference to a `session_id` from `TerminalManager`.
    *   **Tool:** `shell` tool logic changes from `CliBridge::execute` -> `TerminalManager::write(session_id, command)`.
    *   **Feedback:** The AI reads the *actual* terminal output stream, including ANSI colors and interactive states.

### 3. "Open in Skhoot" (OS Integration)
*   **Windows/Linux/macOS:** Register Skhoot as a handler for directories.
*   **Context Passing:** The OS passes the folder path -> Tauri Window -> Agent Context.

## Roadmap to Release

1.  **Refine Path Initialization:** (Immediate) Ensure CLI args/Env vars override the default "Home" path.
2.  **Persistent Shell Tool:** (High Value) Create a new `persistent_shell` tool that connects to `TerminalManager`.
3.  **UI Controls:** (Polish) Add the CWD picker to the UI.

This architecture delivers the "exact same capabilities" as Codex because the AI *is* a user in your terminal, not just a script runner.
