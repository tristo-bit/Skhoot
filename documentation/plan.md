# Plan: Build Skhoot as a Standalone Tauri v2 App (Windows/Linux/macOS)

## Goals
- Render the existing Skhoot Vite UI in a Tauri v2 desktop shell.
- Produce native executables for Windows, Linux, and macOS (same outcome as meric-docker).
- Align Skhoot’s Tauri v2 setup with meric-docker’s known-working implementation.

## Steps
1. **Align Tauri v2 config schema and build pipeline**
   - Update `src-tauri/tauri.conf.json` to use the same `$schema` as meric-docker (`https://schema.tauri.app/config/2`).
   - Ensure build settings point at Vite output:
     - `build.frontendDist = "../dist"`
     - `build.devUrl = "http://localhost:5173"`
     - `build.beforeDevCommand` / `build.beforeBuildCommand` match Skhoot scripts.

2. **Entry point alignment (main.rs vs lib.rs)**
   - Move from a `lib.rs` entrypoint to a `main.rs` binary entrypoint to mirror meric-docker’s Tauri v2 layout:
     - Create `src-tauri/src/main.rs` with `tauri::Builder::default()`.
     - Keep any existing `setup` logic (e.g., logging) inside `.setup(...)`.
     - Call `.run(tauri::generate_context!())`.
   - If logging is required, add the same plugin wiring in `main.rs`.

3. **Rust dependencies parity**
   - Update `src-tauri/Cargo.toml` to align with meric-docker’s Tauri v2 dependency layout:
     - `tauri = { version = "2", features = [] }`
     - Only add plugins actually needed by Skhoot (shell/dialog/log).
   - Keep `tauri-build` at v2 and ensure `build.rs` calls `tauri_build::build()`.

4. **Vite config alignment**
   - Confirm `vite.config.ts` contains:
     - `envPrefix: ["VITE_", "TAURI_"]`
     - `build.target` based on `TAURI_PLATFORM`
     - `minify`/`sourcemap` bound to `TAURI_DEBUG`

5. **Node dependencies and scripts**
   - In `package.json`:
     - Confirm `@tauri-apps/cli` v2 and `@tauri-apps/api` v2.
     - Add plugin packages only if used by the Rust side.
     - Ensure scripts: `tauri`, `tauri:dev`, `tauri:build`, plus platform build targets if needed.

6. **Security, windows, and CSP**
   - Set `app.windows` defaults so the Vite UI renders correctly.
   - Set `app.security.csp` explicitly (use meric-docker style if needed for external assets) or keep `null` only for dev.

7. **Bundle targets for Windows/Linux/macOS**
   - In `src-tauri/tauri.conf.json`, ensure `bundle.targets` includes:
     - `app` for macOS
     - `msi`/`nsis` for Windows
     - `deb`/`appimage` for Linux
   - Verify icons exist in `src-tauri/icons`.

8. **Build validation**
   - `npm run tauri:dev` to ensure Vite renders inside the Tauri window.
   - `npm run tauri:build` for local platform packaging.
   - For cross-platform deliverables, use CI or build on each OS (Tauri’s standard requirement).

9. **Distribution requirements**
   - macOS: signing + notarization before distribution.
   - Windows: code signing for SmartScreen trust.
   - Linux: no signing required but package metadata should be set.

## Deliverables
- Skhoot Vite UI runs inside a Tauri v2 window.
- `src-tauri/` matches meric-docker’s v2 structure where applicable.
- Build artifacts for Windows, Linux, and macOS produced via Tauri.
