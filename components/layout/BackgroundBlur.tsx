// Background blur effect component - extracted from App.tsx
import React, { memo } from 'react';
import { useSettings } from '../../src/contexts/SettingsContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { QUICK_ACTIONS } from '../../src/constants';

// Static decorative blur (currently disabled in App)
interface BackgroundBlurProps {
  position: string;
}

export const BackgroundBlur = memo<BackgroundBlurProps>(({ position }) => (
  <div className={`absolute ${position} w-[720px] h-[720px] rounded-full pointer-events-none`}>
    <div
      className="absolute inset-0 rounded-full blur-[180px] opacity-35"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(169, 131, 247, 0.55) 0%, rgba(169, 131, 247, 0.35) 45%, rgba(169, 131, 247, 0) 70%)',
      }}
    />
    <div
      className="absolute inset-8 rounded-full blur-[240px] opacity-30"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(3, 201, 255, 0.5) 0%, rgba(3, 201, 255, 0.25) 45%, rgba(3, 201, 255, 0) 70%)',
      }}
    />
    <div
      className="absolute -inset-10 rounded-full blur-[300px] opacity-25"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(169, 131, 247, 0.35) 0%, rgba(169, 131, 247, 0.18) 50%, rgba(169, 131, 247, 0) 75%)',
      }}
    />
    <div 
      className="absolute inset-0 rounded-full opacity-10 mix-blend-overlay" 
      style={{ 
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.06) 0.5px, transparent 0.6px)', 
        backgroundSize: '3px 3px' 
      }} 
    />
  </div>
));

BackgroundBlur.displayName = 'BackgroundBlur';

// Dynamic illumination background based on active quick action
interface AppBackgroundProps {
  activeMode: string | null;
}

/**
 * Main app background with illumination effect
 * Creates a glow effect on the entire app background when a quick action is active
 * This sits behind all content and provides the ambient lighting effect
 */
export const AppBackground = memo<AppBackgroundProps>(({ activeMode }) => {
  const { illumination } = useSettings();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Find the active action's color
  const activeAction = activeMode 
    ? QUICK_ACTIONS.find(a => a.id === activeMode) 
    : null;

  if (!illumination.enabled || !activeAction) {
    return null;
  }

  // Calculate illumination values from settings
  // For background, we use lower intensity than the prompt area overlay
  const bgIntensity = Math.round(illumination.intensity * 0.6);
  const intensityHex = Math.round(bgIntensity * 2.55).toString(16).padStart(2, '0');
  const intensityMidHex = Math.round(bgIntensity * 1.5).toString(16).padStart(2, '0');
  const intensityLowHex = Math.round(bgIntensity * 0.8).toString(16).padStart(2, '0');
  
  // More spread for background effect
  const diffusion = Math.min(100, illumination.diffusion + 20);
  const diffusionStop1 = Math.round(diffusion * 0.3);
  const diffusionStop2 = Math.round(diffusion * 0.5);
  const diffusionStop3 = Math.round(diffusion * 0.8);

  const smoothEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none z-0"
      style={{
        height: '40%',
        background: `radial-gradient(ellipse 120% 100% at 50% 100%, ${activeAction.color}${intensityHex} 0%, ${activeAction.color}${intensityMidHex} ${diffusionStop1}%, ${activeAction.color}${intensityLowHex} ${diffusionStop2}%, transparent ${diffusionStop3}%)`,
        opacity: isDarkMode ? 0.6 : 0.8,
        transition: `opacity 0.5s ${smoothEasing}, background 0.5s ${smoothEasing}`,
      }}
    />
  );
});

AppBackground.displayName = 'AppBackground';
