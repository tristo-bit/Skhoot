import React, { useState } from 'react';
import { BaseButton, BaseButtonProps } from './buttons';

interface TabButtonProps extends Omit<BaseButtonProps, 'children'> {
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onTabClick?: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({
  label,
  icon,
  isActive = false,
  onTabClick,
  className = '',
  onClick,
  ...props
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    onTabClick?.();
    onClick?.();
    
    // Reset clicked state after animation
    setTimeout(() => {
      setIsClicked(false);
    }, 200);
  };

  return (
    <BaseButton
      onClick={handleClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl 
        text-[11px] font-bold font-jakarta transition-all duration-200
        ${isActive 
          ? 'glass-subtle text-text-primary' 
          : 'hover:glass-subtle text-text-secondary'
        }
        ${isClicked 
          ? 'bg-gray-300 dark:bg-gray-700 shadow-inner transform scale-95' 
          : ''
        }
        ${className}
      `.trim()}
      style={isClicked ? {
        backgroundColor: '#d1d5db',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
        filter: 'brightness(0.8)'
      } : {}}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon && <span className="files-tab-icon">{icon}</span>}
      <span className="files-tab-label">{label}</span>
    </BaseButton>
  );
};