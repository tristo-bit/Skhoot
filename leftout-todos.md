# Leftout TODOs

- Agent execution persistence is still in-memory (not file-based), and the `message` field in execute requests is unused (marked Phase 2). `backend/src/api/agents.rs`
- CLI sandboxing is incomplete on all OSes (Linux seccomp/namespaces/cgroups, Windows job objects, macOS restrictions). `backend/src/cli_bridge/executor.rs`
- Workflow execution results are missing real timing, and persistence wiring is explicitly left unresolved. `services/WorkflowExecutor.ts`
- Tool-result summarization uses a “for now” shortcut (generic summary prompt instead of provider-aware formatting). `services/aiService.ts`
- Disk/analysis/cleanup panels fall back to mock data on backend failure (real pipeline not guaranteed). `components/panels/FileExplorerPanel.tsx`
- Usage stats are mock data. `components/panels/AISettingsModal.tsx`
- 3D background settings are disabled / “coming soon.” `components/settings/AppearancePanel.tsx`

## Release vs Dev Tauri parity gaps (likely causes of dev/release drift)

- Backend sidecar path depends on a bundled binary copied into `src-tauri/resources`; if the copy step is skipped or resources aren’t packaged, release can’t start the backend. `src-tauri/src/main.rs`, `scripts/copy-backend-binary.cjs`, `src-tauri/tauri.conf.json`
- Backend base URL is hard‑coded to `http://localhost:3001` in multiple services with no env/config override, so any port mismatch or backend startup failure in release breaks features. `services/backendApi.ts`, `services/agentService.ts`, `services/fileOperations.ts`, `services/terminal/terminalHttpService.ts`
- Only Terminal has an IPC fallback when HTTP backend isn’t available; most other features don’t. If the sidecar fails in release, tools/CLI/file ops break. `services/terminal/terminalService.ts`, `services/backendApi.ts`, `services/agentService.ts`
- No readiness/health gating for backend startup in release. The sidecar is spawned and assumed ready; errors only log to stderr. Missing retry/backoff or UI warnings. `src-tauri/src/main.rs`
- `beforeDevCommand` only runs `npm run dev`; backend relies on `cargo run` spawned inside the Tauri process. If `cargo` is missing or CWD doesn’t align, dev is okay but release differs because it uses a binary in resources. `src-tauri/src/main.rs`, `src-tauri/tauri.conf.json`
