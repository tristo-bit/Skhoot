/**
 * Browser Navigation Service
 * 
 * Handles opening URLs in the user's default browser.
 * Supports both Tauri and web environments with appropriate fallbacks.
 * 
 * In Tauri: Uses the secure shell API to open external URLs
 * In Web: Falls back to window.open with security attributes
 */

class BrowserNavigationService {
  /**
   * Open a URL in the user's default browser
   * 
   * @param url - The URL to open
   * @throws Error if all opening methods fail
   */
  async openUrl(url: string): Promise<void> {
    console.log('[BrowserNavigation] Opening URL:', url);
    
    // Check if we're in Tauri environment
    const isTauri = typeof window !== 'undefined' && 
      ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
    
    if (isTauri) {
      try {
        // Dynamically import Tauri shell API
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        console.log('[BrowserNavigation] Opened with Tauri shell');
        return;
      } catch (error) {
        console.error('[BrowserNavigation] Tauri shell failed:', error);
        // Fall through to window.open fallback
      }
    }
    
    // Fallback to window.open
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow || newWindow.closed) {
        console.warn('[BrowserNavigation] Popup may have been blocked');
        // Try one more time without window features
        window.open(url, '_blank');
      }
      
      console.log('[BrowserNavigation] Opened with window.open');
    } catch (error) {
      console.error('[BrowserNavigation] Failed to open URL:', error);
      throw new Error('Failed to open URL in browser');
    }
  }
}

// Export singleton instance
export const browserNavigationService = new BrowserNavigationService();
