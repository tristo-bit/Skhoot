// Dynamic illumination background based on active quick action
import { memo, useMemo } from 'react';
import { useSettings } from '../../src/contexts/SettingsContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { QUICK_ACTIONS } from '../../src/constants';

// ============================================================================
// Color Utilities
// ============================================================================

export const toHex = (value: number): string => 
  Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');

export const withAlpha = (color: string, alpha: number): string => 
  `${color}${toHex(alpha * 2.55)}`;

// ============================================================================
// Animation Constants
// ============================================================================

export const ILLUMINATION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const ILLUMINATION_DURATION = '1s';

// ============================================================================
// Hook for Illumination State
// ============================================================================

export const useIllumination = (activeMode: string | null) => {
  const { illumination } = useSettings();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  return useMemo(() => {
    const activeAction = activeMode 
      ? QUICK_ACTIONS.find(a => a.id === activeMode) 
      : null;

    return {
      isActive: illumination.enabled && !!activeAction,
      color: activeAction?.color || '#a983f7',
      intensity: illumination.intensity,
      diffusion: illumination.diffusion,
      isDarkMode,
    };
  }, [activeMode, illumination.enabled, illumination.intensity, illumination.diffusion, isDarkMode]);
};

// ============================================================================
// Component
// ============================================================================

interface AppBackgroundProps {
  activeMode: string | null;
}

/**
 * Subtle ambient illumination that emanates from the prompt area at the bottom.
 * Designed to be barely noticeable - just a gentle color wash, not an obvious glow.
 */
export const AppBackground = memo<AppBackgroundProps>(({ activeMode }) => {
  const { isActive, color, intensity, diffusion, isDarkMode } = useIllumination(activeMode);

  // Very subtle opacity - should be barely perceptible
  const maxOpacity = isDarkMode ? 0.25 : 0.15;
  const opacity = (intensity / 100) * maxOpacity;
  
  // Blur scales with diffusion
  const blur = 60 + diffusion * 0.8;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-[var(--app-radius)]"
      style={{ zIndex: 5 }}
    >
      {/* Pill-shaped glow under prompt area */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(var(--prompt-area-x) + 20px)',
          left: '25%',
          transform: 'translateX(-50%)',
          width: 'min(90%, 600px)',
          height: '40px',
          borderRadius: '9999px',
          background: isActive ? color : 'transparent',
          filter: `blur(${blur}px)`,
          opacity: isActive ? opacity : 0,
          transition: `opacity ${ILLUMINATION_DURATION} ${ILLUMINATION_EASING}`,
          willChange: 'opacity',
        }}
      />
    </div>
  );
});

AppBackground.displayName = 'AppBackground';
