# Fix Plan: Path Resolution and Search Intelligence

## Context
The current agent fails to intuitively handle user paths (e.g., "Desktop") and relies on a search tool that hides relevant files (hidden/gitignored) by default. This creates a friction-filled user experience compared to `codex-main`.

## Why `codex-main` Works Flawlessly
Analysis of `codex-main` reveals:
1.  **Robust Shell Environment:** It maintains a persistent `Shell` session with a proper environment (`cwd`, `env` vars) that mimics a real user terminal.
2.  **Smart Path Resolution:** The `TurnContext` and `ShellHandler` (in `shell.rs`) automatically resolve paths relative to the current `cwd` or home directory before executing commands.
3.  **Tool Selection:** It often prefers `shell_command` (executing `ls`, `find`, `grep` directly) over rigid API tools. This gives the LLM full power to use standard flags (`-la`, `--hidden`) naturally.

## Plan

### Fix 1: Intelligent Path Resolution (Critical)
**Goal:** Ensure "Desktop" resolves to `/home/user/Desktop` and tools default to the User's Home, not the App Binary folder.

1.  **Update `AgentState` in Backend:**
    *   Modify `backend/src/cli_agent/agent.rs` (or `executor.rs`) to initialize the `working_directory` to the User's Home Directory (`dirs::home_dir()`) instead of `std::env::current_dir()` (which is the binary's location).
2.  **Enhance `resolve_path` in `executor.rs`:**
    *   We already improved this, but we need to ensure it's *always* used for every file tool.
    *   Add a specific check: if a path doesn't exist relative to CWD, try resolving it relative to Home before failing.
3.  **Frontend Context:**
    *   Update `agentChatService.ts` to explicitly send the `user_home` path as a variable to the System Prompt, so the LLM *knows* where it is.

### Fix 2: Search Intelligence & "Unrestricted" Mode (Critical/High)
**Goal:** Prevent "Too many results" and "File not found" errors by making the search smarter.

1.  **Adaptive "Unrestricted" Retry:**
    *   Modify `services/agent/ToolExecutor.ts` (Frontend):
        *   If `search_files` returns 0 results AND `unrestricted` was `false`:
        *   **Automatically** re-run the tool call with `unrestricted: true`.
        *   Inform the user: *"Standard search found nothing, retrying with deep search..."*
2.  **Result Ranking & Summarization:**
    *   Modify `backend/src/api/search.rs`:
        *   If results > 50, don't return the raw list.
        *   Return a "Summary Object": `{ "total": 140, "top_5": [...], "categories": { "src": 20, "node_modules": 120 }, "suggestion": "Refine query with path or extension" }`.
    *   This prevents context window overflow and hallucination.

### Implementation Steps

1.  **Backend:** Change default `AgentExecutor` CWD to Home.
2.  **Backend:** Implement "Smart Fallback" in `resolve_path`.
3.  **Frontend:** Update System Prompt with `${homeDir}` context.
4.  **Frontend:** Implement auto-retry logic in `ToolExecutor`.

## GitHub Issue for Fix 2 (Later)

**Title:** [Enhancement] Smart Search Result Summarization & Ranking

**Body:**
> Currently, the `search_files` tool returns raw lists. If a broad query returns 1000+ files, it overwhelms the LLM context or gets truncated arbitrarily.
>
> **Requirements:**
> 1.  **Clustering:** Backend should group results (e.g., "80% of results are in `node_modules`").
> 2.  **Ranking:** Use a relevance score (filename match > content match) to return the top 20 most valuable results.
> 3.  **Summary Response:** Return a structured summary to the agent if results exceed a threshold (e.g., 50), asking for refinement instead of dumping data.
