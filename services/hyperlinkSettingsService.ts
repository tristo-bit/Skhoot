/**
 * Hyperlink Settings Service
 * 
 * Manages user preferences for AI hyperlink behavior including:
 * - Master toggle for all hyperlinks
 * - Learning hyperlinks (complex terms and concepts)
 * - Source hyperlinks (citations and references)
 * 
 * Settings are persisted to localStorage and default to all enabled.
 */

export interface HyperlinkSettings {
  enabled: boolean;
  learningHyperlinks: boolean;
  sourceHyperlinks: boolean;
}

// localStorage keys
const STORAGE_KEYS = {
  ENABLED: 'skhoot_hyperlinks_enabled',
  LEARNING: 'skhoot_learning_hyperlinks_enabled',
  SOURCE: 'skhoot_source_hyperlinks_enabled',
} as const;

// Default settings - all enabled by default
const DEFAULT_SETTINGS: HyperlinkSettings = {
  enabled: true,
  learningHyperlinks: true,
  sourceHyperlinks: true,
};

class HyperlinkSettingsService {
  /**
   * Load hyperlink settings from localStorage
   * Falls back to defaults if localStorage is unavailable or values are missing
   */
  loadSettings(): HyperlinkSettings {
    try {
      const enabled = this.loadBooleanSetting(STORAGE_KEYS.ENABLED, DEFAULT_SETTINGS.enabled);
      const learningHyperlinks = this.loadBooleanSetting(
        STORAGE_KEYS.LEARNING,
        DEFAULT_SETTINGS.learningHyperlinks
      );
      const sourceHyperlinks = this.loadBooleanSetting(
        STORAGE_KEYS.SOURCE,
        DEFAULT_SETTINGS.sourceHyperlinks
      );

      return {
        enabled,
        learningHyperlinks,
        sourceHyperlinks,
      };
    } catch (error) {
      console.warn('[HyperlinkSettings] Failed to load settings, using defaults:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save a single hyperlink setting
   * @param key - The setting key to update
   * @param value - The boolean value to save
   */
  saveSetting(key: keyof HyperlinkSettings, value: boolean): void {
    try {
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(value));
      console.log(`[HyperlinkSettings] Saved ${key}:`, value);
    } catch (error) {
      console.error(`[HyperlinkSettings] Failed to save setting ${key}:`, error);
    }
  }

  /**
   * Save all hyperlink settings at once
   * @param settings - Complete settings object to persist
   */
  saveSettings(settings: HyperlinkSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(settings.enabled));
      localStorage.setItem(STORAGE_KEYS.LEARNING, JSON.stringify(settings.learningHyperlinks));
      localStorage.setItem(STORAGE_KEYS.SOURCE, JSON.stringify(settings.sourceHyperlinks));
      console.log('[HyperlinkSettings] Saved all settings:', settings);
    } catch (error) {
      console.error('[HyperlinkSettings] Failed to save settings:', error);
    }
  }

  /**
   * Helper to load a boolean setting from localStorage
   * @param key - localStorage key
   * @param defaultValue - Fallback value if key doesn't exist
   */
  private loadBooleanSetting(key: string, defaultValue: boolean): boolean {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) {
        return defaultValue;
      }
      return JSON.parse(stored) === true;
    } catch (error) {
      console.warn(`[HyperlinkSettings] Failed to parse ${key}, using default:`, error);
      return defaultValue;
    }
  }

  /**
   * Map HyperlinkSettings keys to localStorage keys
   */
  private getStorageKey(key: keyof HyperlinkSettings): string {
    switch (key) {
      case 'enabled':
        return STORAGE_KEYS.ENABLED;
      case 'learningHyperlinks':
        return STORAGE_KEYS.LEARNING;
      case 'sourceHyperlinks':
        return STORAGE_KEYS.SOURCE;
      default:
        throw new Error(`Unknown setting key: ${key}`);
    }
  }
}

// Export singleton instance
export const hyperlinkSettingsService = new HyperlinkSettingsService();
