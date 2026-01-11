import React, { memo } from 'react';
import { useSettings } from '../src/contexts/SettingsContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { QUICK_ACTIONS } from '../src/constants';

interface BackgroundIlluminationProps {
  activeMode: string | null;
}

/**
 * Background illumination effect that sits behind the prompt area
 * Creates a glow effect on the main app background when a quick action is active
 */
export const BackgroundIllumination = memo<BackgroundIlluminationProps>(({ activeMode }) => {
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
        height: '40%', // Cover bottom portion of the app
        background: `radial-gradient(ellipse 120% 100% at 50% 100%, ${activeAction.color}${intensityHex} 0%, ${activeAction.color}${intensityMidHex} ${diffusionStop1}%, ${activeAction.color}${intensityLowHex} ${diffusionStop2}%, transparent ${diffusionStop3}%)`,
        opacity: isDarkMode ? 0.6 : 0.8,
        transition: `opacity 0.5s ${smoothEasing}, background 0.5s ${smoothEasing}`,
      }}
    />
  );
});

BackgroundIllumination.displayName = 'BackgroundIllumination';

export default BackgroundIllumination;
