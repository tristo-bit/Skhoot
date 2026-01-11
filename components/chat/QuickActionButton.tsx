import React, { memo, useState } from 'react';
import { Button } from '../buttonFormat';

interface QuickActionButtonProps {
  id: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
  isActive?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export const QuickActionButton = memo<QuickActionButtonProps>(({ 
  id, 
  icon, 
  color, 
  activeColor, 
  isActive, 
  onClick, 
  style 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    onClick();
  };
  
  return (
    <Button 
      onClick={handleClick}
      aria-label={id}
      title={id}
      variant="glass"
      size="sm"
      className={`quick-action-button flex items-center justify-center gap-2 text-xs font-medium w-full ${
        isAnimating ? 'scale-95' : ''
      } ${
        isActive 
          ? 'text-text-primary' 
          : 'text-text-secondary hover:scale-[1.02]'
      }`}
      style={{ 
        backgroundColor: isActive ? `${color}40` : `${color}15`,
        backdropFilter: 'blur(8px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.1)',
        boxShadow: isActive 
          ? `inset 0 3px 6px rgba(0, 0, 0, 0.25), inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 2px ${activeColor}40` 
          : '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        ...style
      }}
    >
      <span className={`quick-action-icon ${isActive ? 'animate-pulse' : ''}`}>
        {icon}
      </span>
      <span className="quick-action-label font-semibold">
        {id}
      </span>
    </Button>
  );
});

QuickActionButton.displayName = 'QuickActionButton';
