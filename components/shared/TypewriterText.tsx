import React, { useState, useEffect, useCallback, memo } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export const TypewriterText = memo<TypewriterTextProps>(({ 
  text, 
  speed = 50,
  onComplete 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span 
      className="inline-block"
      style={{ 
        // Fixed width container prevents layout shift on hover
        minWidth: isComplete ? undefined : `${text.length * 0.6}em`,
      }}
    >
      <span 
        className={`
          inline-block origin-left
          ${isComplete ? 'hover:scale-x-[1.02] transition-transform duration-300 cursor-default' : ''}
        `}
      >
        {displayText}
        {!isComplete && <span className="animate-pulse ml-0.5">|</span>}
      </span>
    </span>
  );
});

TypewriterText.displayName = 'TypewriterText';
