# Prompt 08: The Local File 'Seeker' Manager

"Create a high-performance file search and indexing system in Rust for the Axum sidecar.

Features:
1. Implement a `SearchManager` that combines fuzzy searching (via local index) and exact CLI-based searching (via `rg` or `fd`).
2. Hybrid Mode: Parallelize search requests—running both the Rust-native engine and local CLI tools—then merge and deduplicate results based on relevance scores.
3. Local Indexer: Build a background worker that scans specific directories (like the configured Working Directory) and extracts metadata for fast retrieval.
4. Native Operations: Provide endpoints for system-level actions like 'Reveal in Explorer', 'Open With...', and 'Show Properties' using platform-specific shell commands."
