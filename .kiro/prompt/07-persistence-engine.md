# Prompt 07: Robust Persistence & Quota Management

"Design a storage system for long-running AI conversations that respects the strict limits of browser LocalStorage.

Architecture:
1. Implement an 'Individual Key' storage model (e.g., `skhoot_chat_{id}`) rather than a single monolith array. This grants each conversation its own 5MB quota.
2. Data Stripping: Implement a serialization layer that automatically strips or truncates large, non-essential data from tool results (like full web page extracts in `gathered_pages`) before saving to disk.
3. General Truncation: Enforce a hard 100KB limit per tool output to prevent any single operation from breaking the storage.
4. Migration Logic: Include a startup routine that detects old-format storage and migrates it to the new indexed-key format seamlessly."
