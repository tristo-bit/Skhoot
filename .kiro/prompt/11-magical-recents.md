# Prompt 11: The Magical Recent Files Timeline

"Implement a 'Smart Timeline' for the Recent Files tab that combines local activity with system-wide awareness.

Technical Components:
1. **Backend Scanner (Rust)**: Create an endpoint that scans system `Downloads` and `Documents` folders for files modified within the last 24 hours, excluding system noise (.tmp, .crdownload, etc.).
2. **Action Logging (TypeScript)**: Develop a `RecentFilesService` that logs every AI interaction (SEARCHED, OPENED, EDITED, CREATED) and deduplicates entries based on file paths.
3. **Contextual Metadata**: Store and display 'Action Badges' (e.g., 📥 DOWNLOADED, ✨ CREATED) to explain why a file is in the timeline.
4. **Timeline Grouping**: In the UI, group files into logical sections like 'Right Now' (last 5m), 'Active Session' (last hour), and 'Earlier Today' to create a natural work rhythm.
5. **Noise Cancellation**: Implement aggressive filtering for development and system folders (node_modules, .git, target) to keep the UI clean."
