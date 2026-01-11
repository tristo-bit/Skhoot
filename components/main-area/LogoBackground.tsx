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
      className="w-28 h-28 rounded-[2.5rem] mb-10 mx-auto flex items-center justify-center rotate-0 transition-all hover:rotate-[-4deg] duration-500 origin-center glass-subtle" 
      style={{ 
        backgroundColor: 'rgba(75, 85, 99, 0.8)',
        transform: isExiting ? 'rotate(12deg) scale(0.6)' : undefined,
        transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <img 
        src="/skhoot-purple.svg" 
        alt="Skhoot" 
        width={size} 
        height={size}
        className="drop-shadow-lg dark:drop-shadow-none dark:brightness-150 dark:contrast-75 dark:hue-rotate-15"
      />
    </div>
  );
});

LogoBackground.displayName = 'LogoBackground';
