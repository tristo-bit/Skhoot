# Feature Request: Smart Search Result Summarization & Ranking

## Context
I am building a developer tool with an AI agent. The agent has a `search_files` tool that currently returns raw output from `grep` or `find`.
This is problematic because searching for common terms (like "test") returns 1000+ results, flooding the context window and confusing the LLM.

## Goal
Update the `search_files` tool implementation in `backend/src/cli_agent/executor.rs` to provide "Smart Summarization".

## Requirements

1.  **Switch Engine**: Stop using raw shell commands (`grep`/`find`). Instead, use the existing `CliEngine` (from `crate::search_engine::cli_engine`) which is already robust and cross-platform.
2.  **Threshold Logic**:
    *   If total results <= 50: Return the full list (as is).
    *   If total results > 50: Trigger "Summary Mode".
3.  **Summary Mode Output**:
    *   **Header**: "Found X files matching 'pattern'. Displaying top results."
    *   **Distribution**: Analyze the file paths and show a breakdown of the top 5 directories (e.g., "- node_modules/ : 800 matches (80%)").
    *   **Ranking**: Show only the top 20 results.
    *   **Tip**: Add a footer advising the user to refine their query or path.

## Technical Details
*   Modify `execute_search_files` in `AgentExecutor`.
*   Ensure you import `CliEngine` and `CliConfig`.
*   Set a high `max_results` (e.g., 1000) for the internal fetch to ensure accurate clustering statistics, even if you only display 20.
*   Preserve the existing `search_type` ("content" vs "filename") logic by calling the appropriate `CliEngine` method.

## Example Output (Summary Mode)
Found 150 files matching 'Button'. Displaying top results.

Distribution:
- src/components/ : 120 matches (80%)
- src/pages/ : 20 matches (13%)
...

Top 20 results (ranked by relevance):
src/components/Button.tsx
src/components/Button.test.tsx
...

Tip: Too many results. Please refine your search query.
