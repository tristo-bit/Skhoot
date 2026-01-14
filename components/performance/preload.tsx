/**
 * Panel Preloader System
 * 
 * Preloads panel components when user hovers over trigger buttons.
 * This reduces perceived latency when opening panels.
 * 
 * Features:
 * - Debounced preloading (prevents rapid hover spam)
 * - Idle callback scheduling (doesn't block main thread)
 * - Memory-conscious caching (limited cache size)
 * - Network-aware (skips preload on slow connections)
 * - Battery-aware (skips preload on low battery)
 */

import { useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

type PreloadFn = () => Promise<any>;

interface PreloadConfig {
  /** Delay before starting preload (ms) - prevents accidental hovers */
  hoverDelay?: number;
  /** Skip preload if connection is slow */
  respectSlowConnection?: boolean;
  /** Skip preload if battery is low */
  respectLowBattery?: boolean;
  /** Battery threshold (0-1) below which preload is skipped */
  batteryThreshold?: number;
}

interface PreloadState {
  isPreloaded: boolean;
  isPreloading: boolean;
  error: Error | null;
}

// ============================================================================
// Preload Registry
// ============================================================================

const preloadCache = new Map<string, PreloadState>();
const MAX_CACHE_SIZE = 10;

// Panel import functions - lazy loaded
export const PANEL_PRELOADERS: Record<string, PreloadFn> = {
  'file-explorer': () => import('../panels/FileExplorerPanel'),
  'workflows': () => import('../panels/WorkflowsPanel'),
  'terminal': () => import('../terminal/TerminalView'),
  'settings': () => import('../panels/SettingsPanel'),
  'activity': () => import('../activity/ActivityPanel'),
  'user-panel': () => import('../settings/UserPanel'),
  'files-panel': () => import('../panels/FilesPanel'),
  'ai-settings': () => import('../panels/AISettingsModal'),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the connection is slow (2G or slow-2g)
 */
const isSlowConnection = (): boolean => {
  const connection = (navigator as any).connection;
  if (!connection) return false;
  return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
};

/**
 * Check if battery is low
 */
const checkBattery = async (threshold: number): Promise<boolean> => {
  try {
    const battery = await (navigator as any).getBattery?.();
    if (!battery) return false;
    return battery.level < threshold && !battery.charging;
  } catch {
    return false;
  }
};

/**
 * Schedule work during idle time
 */
const scheduleIdleWork = (callback: () => void): void => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout: 2000 });
  } else {
    // Fallback for Safari
    setTimeout(callback, 100);
  }
};

// ============================================================================
// Core Preload Function
// ============================================================================

/**
 * Preload a panel component by key
 */
export const preloadPanel = async (
  panelKey: string,
  config: PreloadConfig = {}
): Promise<boolean> => {
  const {
    respectSlowConnection = true,
    respectLowBattery = true,
    batteryThreshold = 0.15,
  } = config;

  // Check if already preloaded or preloading
  const cached = preloadCache.get(panelKey);
  if (cached?.isPreloaded || cached?.isPreloading) {
    return cached.isPreloaded;
  }

  // Check connection speed
  if (respectSlowConnection && isSlowConnection()) {
    console.log(`[Preload] Skipping ${panelKey} - slow connection`);
    return false;
  }

  // Check battery level
  if (respectLowBattery) {
    const lowBattery = await checkBattery(batteryThreshold);
    if (lowBattery) {
      console.log(`[Preload] Skipping ${panelKey} - low battery`);
      return false;
    }
  }

  // Get preloader function
  const preloader = PANEL_PRELOADERS[panelKey];
  if (!preloader) {
    console.warn(`[Preload] Unknown panel: ${panelKey}`);
    return false;
  }

  // Manage cache size
  if (preloadCache.size >= MAX_CACHE_SIZE) {
    const firstKey = preloadCache.keys().next().value;
    if (firstKey) preloadCache.delete(firstKey);
  }

  // Mark as preloading
  preloadCache.set(panelKey, { isPreloaded: false, isPreloading: true, error: null });

  try {
    await preloader();
    preloadCache.set(panelKey, { isPreloaded: true, isPreloading: false, error: null });
    console.log(`[Preload] ✓ ${panelKey} preloaded`);
    return true;
  } catch (error) {
    preloadCache.set(panelKey, { 
      isPreloaded: false, 
      isPreloading: false, 
      error: error as Error 
    });
    console.error(`[Preload] ✗ ${panelKey} failed:`, error);
    return false;
  }
};

/**
 * Check if a panel is already preloaded
 */
export const isPanelPreloaded = (panelKey: string): boolean => {
  return preloadCache.get(panelKey)?.isPreloaded ?? false;
};

/**
 * Clear preload cache (useful for memory management)
 */
export const clearPreloadCache = (): void => {
  preloadCache.clear();
};

// ============================================================================
// React Hook
// ============================================================================

interface UsePreloadOnHoverOptions extends PreloadConfig {
  /** Panel key to preload */
  panelKey: string;
  /** Whether preloading is enabled */
  enabled?: boolean;
}

/**
 * Hook that returns handlers for preloading on hover
 * 
 * @example
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = usePreloadOnHover({ 
 *   panelKey: 'file-explorer' 
 * });
 * 
 * <button onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
 *   Open Files
 * </button>
 * ```
 */
export const usePreloadOnHover = (options: UsePreloadOnHoverOptions) => {
  const {
    panelKey,
    enabled = true,
    hoverDelay = 150,
    ...config
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const onMouseEnter = useCallback(() => {
    if (!enabled) return;
    
    isHoveringRef.current = true;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the preload
    timeoutRef.current = setTimeout(() => {
      // Only preload if still hovering
      if (isHoveringRef.current) {
        // Schedule during idle time to not block UI
        scheduleIdleWork(() => {
          preloadPanel(panelKey, config);
        });
      }
    }, hoverDelay);
  }, [enabled, panelKey, hoverDelay, config]);

  const onMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    
    // Cancel pending preload if user leaves quickly
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { onMouseEnter, onMouseLeave };
};

// ============================================================================
// HOC for Preloadable Buttons
// ============================================================================

interface PreloadableButtonProps {
  panelKey: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  style?: React.CSSProperties;
}

/**
 * Button wrapper that automatically preloads a panel on hover
 * 
 * @example
 * ```tsx
 * <PreloadableButton panelKey="file-explorer" onClick={openFiles}>
 *   <FolderIcon />
 * </PreloadableButton>
 * ```
 */
export const PreloadableButton: React.FC<PreloadableButtonProps> = ({
  panelKey,
  children,
  onClick,
  className,
  disabled,
  title,
  'aria-label': ariaLabel,
  style,
}) => {
  const { onMouseEnter, onMouseLeave } = usePreloadOnHover({ 
    panelKey,
    enabled: !disabled,
  });

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </button>
  );
};

PreloadableButton.displayName = 'PreloadableButton';

// ============================================================================
// Preload Multiple Panels
// ============================================================================

/**
 * Preload multiple panels at once (e.g., on app startup after idle)
 */
export const preloadPanels = async (
  panelKeys: string[],
  config: PreloadConfig = {}
): Promise<void> => {
  for (const key of panelKeys) {
    await preloadPanel(key, config);
    // Small delay between preloads to not overwhelm
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

/**
 * Preload commonly used panels after app becomes idle
 */
export const preloadCommonPanelsOnIdle = (
  panelKeys: string[] = ['file-explorer', 'terminal', 'settings']
): void => {
  scheduleIdleWork(() => {
    preloadPanels(panelKeys, { hoverDelay: 0 });
  });
};
