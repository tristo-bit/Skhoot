/**
 * Memory Settings Service
 * Manages settings for AI memory features
 */

const STORAGE_KEY = 'skhoot_memory_settings';

export interface MemorySettings {
  enabled: boolean;
  autoSave: boolean;
  importance: 'low' | 'medium' | 'high';
}

const DEFAULT_SETTINGS: MemorySettings = {
  enabled: true,
  autoSave: true,
  importance: 'medium',
};

class MemorySettingsService {
  loadSettings(): MemorySettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('[MemorySettingsService] Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: MemorySettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[MemorySettingsService] Failed to save settings:', error);
    }
  }

  isEnabled(): boolean {
    return this.loadSettings().enabled;
  }

  setEnabled(enabled: boolean): void {
    const settings = this.loadSettings();
    settings.enabled = enabled;
    this.saveSettings(settings);
  }

  isAutoSaveEnabled(): boolean {
    return this.loadSettings().autoSave;
  }

  setAutoSave(enabled: boolean): void {
    const settings = this.loadSettings();
    settings.autoSave = enabled;
    this.saveSettings(settings);
  }

  getImportance(): 'low' | 'medium' | 'high' {
    return this.loadSettings().importance;
  }

  setImportance(importance: 'low' | 'medium' | 'high'): void {
    const settings = this.loadSettings();
    settings.importance = importance;
    this.saveSettings(settings);
  }
}

export const memorySettingsService = new MemorySettingsService();
