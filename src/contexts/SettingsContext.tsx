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

interface SettingsContextType {
  // Illumination
  illumination: IlluminationSettings;
  setIllumination: (settings: Partial<IlluminationSettings>) => void;
  resetIllumination: (theme: 'light' | 'dark') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'skhoot-settings';

interface StoredSettings {
  illumination?: {
    light?: Partial<IlluminationSettings>;
    dark?: Partial<IlluminationSettings>;
  };
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
