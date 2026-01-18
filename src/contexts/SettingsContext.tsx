import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Illumination settings interface
export interface IlluminationSettings {
  enabled: boolean;
  intensity: number; // 0-100
  diffusion: number; // 0-100 (how spread out the light is)
}

// 3D Background settings interface
export interface Background3DSettings {
  enabled: boolean;
  modelId: string;
  customModelPath?: string; // Path to custom GLTF/GLB model
  rotationDuration: number; // ms for one full rotation (0 = no rotation)
  opacity: number; // 0-1
  asciiMode: boolean; // Render as ASCII art
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

// Default 3D background settings
const DEFAULT_BACKGROUND_3D: Background3DSettings = {
  enabled: false,
  modelId: 'cube',
  customModelPath: undefined,
  rotationDuration: 10000, // 10 seconds for full rotation
  opacity: 0.3,
  asciiMode: false,
};

// Search results display settings
export interface SearchDisplaySettings {
  layout: 'list' | 'grid';
  gridOnlyForMore: boolean; // Only use grid when showing "more" results
}

// Default search display settings
const DEFAULT_SEARCH_DISPLAY: SearchDisplaySettings = {
  layout: 'list',
  gridOnlyForMore: false,
};

// Token display settings
export interface TokenDisplaySettings {
  enabled: boolean;
  showModelName: boolean;
}

// Default token display settings
const DEFAULT_TOKEN_DISPLAY: TokenDisplaySettings = {
  enabled: true,
  showModelName: false,
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
  // 3D Background
  background3D: Background3DSettings;
  setBackground3D: (settings: Partial<Background3DSettings>) => void;
  resetBackground3D: () => void;
  // Search Display
  searchDisplay: SearchDisplaySettings;
  setSearchDisplay: (settings: Partial<SearchDisplaySettings>) => void;
  // Token Display
  tokenDisplay: TokenDisplaySettings;
  setTokenDisplay: (settings: Partial<TokenDisplaySettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'skhoot-settings';

interface StoredSettings {
  illumination?: {
    light?: Partial<IlluminationSettings>;
    dark?: Partial<IlluminationSettings>;
  };
  uiOpacity?: number;
  background3D?: Partial<Background3DSettings>;
  searchDisplay?: Partial<SearchDisplaySettings>;
  tokenDisplay?: Partial<TokenDisplaySettings>;
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

  // 3D Background state
  const [background3D, setBackground3DState] = useState<Background3DSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_BACKGROUND_3D;
    const stored = loadSettings();
    return { ...DEFAULT_BACKGROUND_3D, ...stored.background3D };
  });

  // Search Display state
  const [searchDisplay, setSearchDisplayState] = useState<SearchDisplaySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SEARCH_DISPLAY;
    const stored = loadSettings();
    return { ...DEFAULT_SEARCH_DISPLAY, ...stored.searchDisplay };
  });

  // Token Display state
  const [tokenDisplay, setTokenDisplayState] = useState<TokenDisplaySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_TOKEN_DISPLAY;
    const stored = loadSettings();
    // Ensure all properties have defaults (for backward compatibility)
    return { 
      enabled: stored.tokenDisplay?.enabled ?? DEFAULT_TOKEN_DISPLAY.enabled,
      showModelName: stored.tokenDisplay?.showModelName ?? DEFAULT_TOKEN_DISPLAY.showModelName,
    };
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

  // 3D Background setters
  const setBackground3D = useCallback((settings: Partial<Background3DSettings>) => {
    setBackground3DState(prev => {
      const newSettings = { ...prev, ...settings };
      
      // Save to localStorage
      const stored = loadSettings();
      saveSettings({ ...stored, background3D: newSettings });
      
      return newSettings;
    });
  }, [loadSettings, saveSettings]);

  const resetBackground3D = useCallback(() => {
    setBackground3DState(DEFAULT_BACKGROUND_3D);
    
    // Remove from localStorage
    const stored = loadSettings();
    delete stored.background3D;
    saveSettings(stored);
  }, [loadSettings, saveSettings]);

  // Search Display setter
  const setSearchDisplay = useCallback((settings: Partial<SearchDisplaySettings>) => {
    setSearchDisplayState(prev => {
      const newSettings = { ...prev, ...settings };
      
      // Save to localStorage
      const stored = loadSettings();
      saveSettings({ ...stored, searchDisplay: newSettings });
      
      return newSettings;
    });
  }, [loadSettings, saveSettings]);

  // Token Display setter
  const setTokenDisplay = useCallback((settings: Partial<TokenDisplaySettings>) => {
    setTokenDisplayState(prev => {
      const newSettings = { ...prev, ...settings };
      
      // Save to localStorage
      const stored = loadSettings();
      saveSettings({ ...stored, tokenDisplay: newSettings });
      
      return newSettings;
    });
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
      background3D,
      setBackground3D,
      resetBackground3D,
      searchDisplay,
      setSearchDisplay,
      tokenDisplay,
      setTokenDisplay,
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
export { DEFAULT_ILLUMINATION, DEFAULT_BACKGROUND_3D, DEFAULT_SEARCH_DISPLAY, DEFAULT_TOKEN_DISPLAY };
