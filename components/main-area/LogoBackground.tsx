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
        transition: isExiting ? 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
      }}
    >
      <img 
        src="/skhoot-purple.svg" 
        alt="Skhoot" 
        width={size} 
        height={size}
        className="logo-image-central"
      />
      
      <style>{`
        /* Light mode - Logo central uniquement */
        .logo-container-central {
          position: relative;
          will-change: transform, box-shadow;
          transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.8s ease-out;
          background-color: #c0b7c9;
          /* Effet embossed en light mode */
          box-shadow: 
            0 2px 4px -1px rgba(0, 0, 0, 0.1),
            0 1px 2px rgba(255, 255, 255, 0.5),
            inset 0 1px 2px rgba(255, 255, 255, 0.4),
            inset 0 -1px 2px rgba(0, 0, 0, 0.08);
        }
        
        .logo-image-central {
          transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                      filter 0.8s ease-out;
          will-change: transform, filter;
          filter: brightness(0) invert(1); /* Hibou blanc en light mode */
          /* Légère ombre portée pour le relief */
          drop-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        /* Dark mode - Logo central uniquement */
        .dark .logo-container-central {
          background-color: rgba(75, 85, 99, 0.8);
          /* Pas d'effet embossed en dark mode */
          box-shadow: none;
        }
        
        .dark .logo-image-central {
          filter: none; /* Hibou garde sa couleur d'origine en dark mode */
        }
        
        /* Animation hover - Scale Pulse */
        .logo-container-central:hover {
          animation: scalePulse 1.2s ease-in-out infinite;
        }
        
        .logo-container-central:hover .logo-image-central {
          transform: scale(1.05);
        }
        
        @keyframes scalePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }
        
        /* Dark mode - même animation */
        .dark .logo-container-central:hover {
          animation: scalePulse 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

LogoBackground.displayName = 'LogoBackground';
