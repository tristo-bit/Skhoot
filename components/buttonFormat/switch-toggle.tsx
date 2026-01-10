import React from 'react';

interface SwitchToggleProps {
  isToggled: boolean;
  onToggle: (toggled: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SwitchToggle: React.FC<SwitchToggleProps> = ({
  isToggled,
  onToggle,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-12 h-6',
    lg: 'w-16 h-8'
  };

  const knobSizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  };

  const translateClasses = {
    sm: isToggled ? 'translate-x-4' : 'translate-x-0.5',
    md: isToggled ? 'translate-x-6' : 'translate-x-0.5',
    lg: isToggled ? 'translate-x-8' : 'translate-x-0.5'
  };

  return (
    <button 
      onClick={() => !disabled && onToggle(!isToggled)}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        rounded-full transition-all duration-300 relative
        ${isToggled ? 'bg-accent' : 'bg-glass-border'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `.trim()}
      role="switch"
      aria-checked={isToggled}
    >
      <div 
        className={`
          ${knobSizes[size]}
          absolute top-0.5 rounded-full glass-subtle shadow-md 
          transition-all duration-300
          ${translateClasses[size]}
        `.trim()}
      />
    </button>
  );
};