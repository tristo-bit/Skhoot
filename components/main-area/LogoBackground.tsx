import { memo } from 'react';
import { useTheme } from '../../src/contexts/ThemeContext';

interface LogoBackgroundProps {
  size?: number;
  isExiting?: boolean;
}

/**
 * The Skhoot logo displayed in the empty state
 */
export const LogoBackground = memo<LogoBackgroundProps>(({ size = 64, isExiting = false }) => {
  const { showBranding } = useTheme();

  if (!showBranding) return null;

  return (
    <div 
      className="logo-container-central w-28 h-28 rounded-[2.5rem] mb-10 mx-auto flex items-center justify-center glass-subtle" 
      style={{ 
        transform: isExiting ? 'rotate(12deg) scale(0.6)' : undefined,
        transition: isExiting ? 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
      }}
    >
      <img 
        src="/skhoot-purple.svg" 
        alt="Skhoot" 
        width={size} 
        height={size}
        className="logo-image-central"
      />
    </div>
  );
});

LogoBackground.displayName = 'LogoBackground';
