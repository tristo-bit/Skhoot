import { memo, useMemo, useState, useEffect } from 'react';

interface SplittingTextProps {
  text: string;
  type?: 'chars' | 'words';
  className?: string;
  style?: React.CSSProperties;
  /** Enable typewriter effect on mount (default: true) */
  typewriter?: boolean;
  /** Typewriter speed in ms per character (default: 50) */
  typewriterSpeed?: number;
}

/**
 * Text component that splits text into characters or words
 * with a typewriter effect on mount and staggered slide-in animation on hover
 */
export const SplittingText = memo<SplittingTextProps>(({ 
  text, 
  type = 'chars',
  className = '',
  style = {},
  typewriter = true,
  typewriterSpeed = 50,
}) => {
  const [visibleCount, setVisibleCount] = useState(typewriter ? 0 : text.length);
  const [isTypewriterComplete, setIsTypewriterComplete] = useState(!typewriter);

  // Split text into items (chars or words)
  const items = useMemo(() => {
    if (type === 'words') {
      // Split by words, keeping spaces
      const tokens = text.match(/\S+\s*/g) || [];
      return tokens;
    }
    // Split by characters
    return text.split('');
  }, [text, type]);

  // Typewriter effect on mount
  useEffect(() => {
    if (!typewriter) return;
    
    setVisibleCount(0);
    setIsTypewriterComplete(false);
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < items.length) {
        setVisibleCount(index + 1);
        index++;
      } else {
        clearInterval(interval);
        setIsTypewriterComplete(true);
      }
    }, typewriterSpeed);
    
    return () => clearInterval(interval);
  }, [text, items.length, typewriter, typewriterSpeed]);

  return (
    <span 
      className={`splitting-text-container ${className}`}
      style={style}
    >
      {items.map((item, index) => (
        <span
          key={index}
          className={`splitting-text-item ${index < visibleCount ? 'visible' : 'hidden'}`}
          style={{
            '--hover-delay': `${index * (type === 'chars' ? 0.03 : 0.15)}s`,
          } as React.CSSProperties}
        >
          {item}
        </span>
      ))}
      {!isTypewriterComplete && (
        <span className="typewriter-cursor">|</span>
      )}
      
      <style>{`
        .splitting-text-container {
          display: inline-block;
        }
        
        .splitting-text-item {
          display: inline-block;
          white-space: ${type === 'chars' ? 'pre' : 'normal'};
          opacity: 1;
          transform: translateX(0);
          will-change: transform, opacity;
        }
        
        .splitting-text-item.hidden {
          opacity: 0;
        }
        
        .splitting-text-item.visible {
          opacity: 1;
        }
        
        .typewriter-cursor {
          display: inline-block;
          margin-left: 0.125rem;
          animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Hover effect on parent - only when typewriter is complete */
        .splitting-text-container:hover .splitting-text-item.visible {
          animation: slideInFromRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: var(--hover-delay);
        }
        
        @keyframes slideInFromRight {
          0% {
            opacity: 0;
            transform: translateX(80px);
            filter: blur(4px);
          }
          60% {
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
            filter: blur(0px);
          }
        }
      `}</style>
    </span>
  );
});

SplittingText.displayName = 'SplittingText';
