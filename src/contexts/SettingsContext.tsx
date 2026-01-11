import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Illumination settings interface
export interface IlluminationSettings {
  enabled: boolean;
  intensity: number; // 0-100
  diffusion: number; // 0-100 (how spread out the light is)
}

// Default illumination settings per theme
const DEFAULT_ILLUMINATION: Record<'light' | 'dark', IlluminationSettings> = {
  light: {
    enabled: true,
    intensity: 40,
    diffusion: 50,
  },
  dark: {
    enabled: true,
    intensity: 20,
    diffusion: 70,
  },
};

// Default opacity
const DEFAULT_OPACITY = 0.85;

interface SettingsContextType {
  // Illumination
  illumination: IlluminationSettings;
  setIllumination: (settings: Partial<IlluminationSettings>) => void;
  resetIllumination: (theme: 'light' | 'dark') => void;
  // Opacity
  uiOpacity: number;
  setUiOpacity: (value: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'skhoot-settings';

interface StoredSettings {
  illumination?: {
    light?: Partial<IlluminationSettings>;
    dark?: Partial<IlluminationSettings>;
  };
  uiOpacity?: number;
}

export function SettingsProvider({ 
  children, 
  resolvedTheme 
}: { 
  children: React.ReactNode;
  resolvedTheme: 'light' | 'dark';
}) {
  // Load settings from localStorage
  const loadSettings = useCallback((): StoredSettings => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((settings: StoredSettings) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, []);

  // Get illumination for current theme
  const getIlluminationForTheme = useCallback((theme: 'light' | 'dark'): IlluminationSettings => {
    const stored = loadSettings();
    const themeSettings = stored.illumination?.[theme];
    return {
      ...DEFAULT_ILLUMINATION[theme],
      ...themeSettings,
    };
  }, [loadSettings]);

  const [illumination, setIlluminationState] = useState<IlluminationSettings>(() => 
    getIlluminationForTheme(resolvedTheme)
  );

  // Opacity state
  const [uiOpacity, setUiOpacityState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_OPACITY;
    const stored = loadSettings();
    return stored.uiOpacity ?? DEFAULT_OPACITY;
  });

  // Apply opacity to CSS variables
  const applyOpacity = useCallback((value: number, isDarkMode: boolean) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const level = Math.min(1, Math.max(0.5, value));
    const light = Math.max(0.1, level - 0.15);
    const heavy = Math.min(1, level + 0.1);
    const base = isDarkMode ? '30, 30, 30' : '255, 255, 255';

    root.style.setProperty('--glass-opacity-level', level.toString());
    root.style.setProperty('--glass-opacity-light', light.toString());
    root.style.setProperty('--glass-opacity-medium', level.toString());
    root.style.setProperty('--glass-opacity-heavy', heavy.toString());
    root.style.setProperty('--glass-bg', `rgba(${base}, ${level})`);
  }, []);

  // Apply opacity when it changes or theme changes
  useEffect(() => {
    applyOpacity(uiOpacity, resolvedTheme === 'dark');
  }, [uiOpacity, resolvedTheme, applyOpacity]);

  const setUiOpacity = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0.5, value));
    setUiOpacityState(clamped);
    
    // Save to localStorage
    const stored = loadSettings();
    saveSettings({ ...stored, uiOpacity: clamped });
  }, [loadSettings, saveSettings]);

  // Update illumination when theme changes
  useEffect(() => {
    setIlluminationState(getIlluminationForTheme(resolvedTheme));
  }, [resolvedTheme, getIlluminationForTheme]);

  const setIllumination = useCallback((settings: Partial<IlluminationSettings>) => {
    setIlluminationState(prev => {
      const newSettings = { ...prev, ...settings };
      
      // Save to localStorage for current theme
      const stored = loadSettings();
      saveSettings({
        ...stored,
        illumination: {
          ...stored.illumination,
          [resolvedTheme]: newSettings,
        },
      });
      
      return newSettings;
    });
  }, [resolvedTheme, loadSettings, saveSettings]);

  const resetIllumination = useCallback((theme: 'light' | 'dark') => {
    const defaults = DEFAULT_ILLUMINATION[theme];
    setIlluminationState(defaults);
    
    // Remove from localStorage
    const stored = loadSettings();
    if (stored.illumination) {
      delete stored.illumination[theme];
      saveSettings(stored);
    }
  }, [loadSettings, saveSettings]);

  return (
    <SettingsContext.Provider value={{
      illumination,
      setIllumination,
      resetIllumination,
      uiOpacity,
      setUiOpacity,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Export defaults for reference
export { DEFAULT_ILLUMINATION };
