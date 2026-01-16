/**
 * Tauri Detection Utility
 * 
 * Provides utilities to detect if the app is running in Tauri desktop mode
 * or as a web app. Some features (like terminal) require Tauri.
 */

/**
 * Check if the app is running in Tauri desktop mode
 * @returns true if running in Tauri, false if running in browser
 */
export function isTauriApp(): boolean {
  if (typeof window === 'undefined') return false;
  // Tauri v1 uses __TAURI__, Tauri v2 uses __TAURI_INTERNALS__
  const hasTauriV1 = !!(window as any).__TAURI__;
  const hasTauriV2 = !!(window as any).__TAURI_INTERNALS__;
  const result = hasTauriV1 || hasTauriV2;
  console.log('[TauriDetection] isTauriApp check:', { hasTauriV1, hasTauriV2, result });
  return result;
}

/**
 * Get a user-friendly message for features that require Tauri
 * @param featureName - Name of the feature (e.g., "Terminal")
 * @returns Error message with instructions
 */
export function getTauriRequiredMessage(featureName: string): string {
  return `${featureName} requires the Tauri desktop app.\n\nTo use this feature:\n1. Stop the current dev server\n2. Run: npm run tauri:dev\n\nOr build the desktop app:\nnpm run tauri:build`;
}

/**
 * Check if Tauri is available and throw an error if not
 * @param featureName - Name of the feature requiring Tauri
 * @throws Error if not running in Tauri
 */
export function requireTauri(featureName: string): void {
  if (!isTauriApp()) {
    throw new Error(getTauriRequiredMessage(featureName));
  }
}
