/**
 * AI Settings Service
 * Manages loading and saving AI configuration parameters
 */

export interface AISettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  userInstructions?: string;
}

const STORAGE_KEYS = {
  temperature: 'skhoot_ai_temperature',
  maxTokens: 'skhoot_ai_max_tokens',
  topP: 'skhoot_ai_top_p',
  frequencyPenalty: 'skhoot_ai_frequency_penalty',
  presencePenalty: 'skhoot_ai_presence_penalty',
  userInstructions: 'skhoot_user_instructions',
};

const DEFAULT_SETTINGS: AISettings = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  userInstructions: undefined,
};

class AISettingsService {
  /**
   * Load all AI settings from localStorage
   */
  loadSettings(): AISettings {
    try {
      return {
        temperature: parseFloat(localStorage.getItem(STORAGE_KEYS.temperature) || String(DEFAULT_SETTINGS.temperature)),
        maxTokens: parseInt(localStorage.getItem(STORAGE_KEYS.maxTokens) || String(DEFAULT_SETTINGS.maxTokens)),
        topP: parseFloat(localStorage.getItem(STORAGE_KEYS.topP) || String(DEFAULT_SETTINGS.topP)),
        frequencyPenalty: parseFloat(localStorage.getItem(STORAGE_KEYS.frequencyPenalty) || String(DEFAULT_SETTINGS.frequencyPenalty)),
        presencePenalty: parseFloat(localStorage.getItem(STORAGE_KEYS.presencePenalty) || String(DEFAULT_SETTINGS.presencePenalty)),
        userInstructions: localStorage.getItem(STORAGE_KEYS.userInstructions) || undefined,
      };
    } catch (error) {
      console.warn('[AISettingsService] Failed to load settings, using defaults:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save a specific setting
   */
  saveSetting(key: keyof AISettings, value: number | string | undefined): void {
    try {
      const storageKey = STORAGE_KEYS[key];
      if (value !== undefined) {
        localStorage.setItem(storageKey, String(value));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('[AISettingsService] Failed to save setting:', key, error);
    }
  }

  /**
   * Save all settings at once
   */
  saveSettings(settings: AISettings): void {
    try {
      Object.entries(settings).forEach(([key, value]) => {
        this.saveSetting(key as keyof AISettings, value);
      });
    } catch (error) {
      console.error('[AISettingsService] Failed to save settings:', error);
    }
  }

  /**
   * Reset to default settings
   */
  resetToDefaults(): AISettings {
    this.saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
}

export const aiSettingsService = new AISettingsService();
