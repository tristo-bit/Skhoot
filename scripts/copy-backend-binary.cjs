#!/usr/bin/env node
/**
 * Copy backend binary to resources directory for Tauri bundling
 * Handles platform-specific binary names (.exe on Windows)
 */

const fs = require('fs');
const path = require('path');

// Detect if running from backend directory (beforeBuildCommand) or project root
const cwd = process.cwd();
const isInBackend = cwd.endsWith('backend') || cwd.endsWith('backend/') || cwd.endsWith('backend\\');
const projectRoot = isInBackend ? path.join(cwd, '..') : cwd;

const isWindows = process.platform === 'win32';
const binaryName = isWindows ? 'skhoot-backend.exe' : 'skhoot-backend';

const sourcePath = path.join(projectRoot, 'backend', 'target', 'release', binaryName);
const resourcesDir = path.join(projectRoot, 'src-tauri', 'resources');
const targetPath = path.join(resourcesDir, binaryName);

console.log(`[copy-backend-binary] Platform: ${process.platform}`);
console.log(`[copy-backend-binary] Project root: ${projectRoot}`);
console.log(`[copy-backend-binary] Source: ${sourcePath}`);
console.log(`[copy-backend-binary] Target: ${targetPath}`);

// Create resources directory if it doesn't exist
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
  console.log(`[copy-backend-binary] Created resources directory`);
}

// Check if source binary exists
if (!fs.existsSync(sourcePath)) {
  console.error(`[copy-backend-binary] ERROR: Backend binary not found at ${sourcePath}`);
  console.error(`[copy-backend-binary] Make sure to run 'cd backend && cargo build --release' first`);
  process.exit(1);
}

// Copy the binary
try {
  fs.copyFileSync(sourcePath, targetPath);
  
  // Make executable on Unix
  if (!isWindows) {
    fs.chmodSync(targetPath, 0o755);
  }
  
  console.log(`[copy-backend-binary] Successfully copied backend binary`);
} catch (error) {
  console.error(`[copy-backend-binary] ERROR: Failed to copy binary: ${error.message}`);
  process.exit(1);
}
