import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiSettingsService } from '../aiSettingsService';

describe('aiSettingsService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should load default settings when nothing is stored', () => {
    const settings = aiSettingsService.loadSettings();
    
    expect(settings).toEqual({
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    });
  });

  it('should save and load individual settings', () => {
    aiSettingsService.saveSetting('temperature', 0.9);
    aiSettingsService.saveSetting('maxTokens', 2048);
    
    const settings = aiSettingsService.loadSettings();
    
    expect(settings.temperature).toBe(0.9);
    expect(settings.maxTokens).toBe(2048);
    // Other settings should still be defaults
    expect(settings.topP).toBe(1.0);
  });

  it('should save all settings at once', () => {
    const newSettings = {
      temperature: 0.5,
      maxTokens: 8192,
      topP: 0.95,
      frequencyPenalty: 0.5,
      presencePenalty: 0.3,
    };
    
    aiSettingsService.saveSettings(newSettings);
    const loaded = aiSettingsService.loadSettings();
    
    expect(loaded).toEqual(newSettings);
  });

  it('should reset to defaults', () => {
    // Set custom values
    aiSettingsService.saveSettings({
      temperature: 1.5,
      maxTokens: 1024,
      topP: 0.5,
      frequencyPenalty: 1.0,
      presencePenalty: 1.0,
    });
    
    // Reset
    const defaults = aiSettingsService.resetToDefaults();
    const loaded = aiSettingsService.loadSettings();
    
    expect(defaults).toEqual({
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    });
    expect(loaded).toEqual(defaults);
  });

  it('should handle corrupted localStorage gracefully', () => {
    // Corrupt the storage
    localStorage.setItem('skhoot_ai_temperature', 'not-a-number');
    
    const settings = aiSettingsService.loadSettings();
    
    // Should return NaN for corrupted value, but service should not crash
    expect(isNaN(settings.temperature)).toBe(true);
  });

  it('should persist settings across multiple loads', () => {
    aiSettingsService.saveSetting('temperature', 1.2);
    
    const load1 = aiSettingsService.loadSettings();
    const load2 = aiSettingsService.loadSettings();
    
    expect(load1.temperature).toBe(1.2);
    expect(load2.temperature).toBe(1.2);
  });
});
