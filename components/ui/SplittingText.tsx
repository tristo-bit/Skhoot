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
    </span>
  );
});

SplittingText.displayName = 'SplittingText';
