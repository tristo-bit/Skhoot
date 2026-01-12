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
    md: 'settings-toggle',
    lg: 'w-16 h-8'
  };

  const knobSizes = {
    sm: 'w-3 h-3',
    md: 'settings-toggle-knob',
    lg: 'w-7 h-7'
  };

  const translateClasses = {
    sm: isToggled ? 'translate-x-4' : 'translate-x-0.5',
    md: isToggled ? 'translate-x-5' : 'translate-x-1',
    lg: isToggled ? 'translate-x-8' : 'translate-x-0.5'
  };

  return (
    <button 
      onClick={() => !disabled && onToggle(!isToggled)}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        rounded-full transition-all duration-300 relative
        border-2
        ${isToggled ? 'bg-accent border-accent' : 'bg-glass-border border-white/40'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/60'}
        ${className}
      `.trim()}
      role="switch"
      aria-checked={isToggled}
    >
      <div 
        className={`
          ${knobSizes[size]}
          absolute top-0.5 rounded-full shadow-md 
          transition-all duration-300 border-2 border-white/50
          ${isToggled ? 'bg-white' : 'bg-white/90'}
          ${translateClasses[size]}
        `.trim()}
      />
    </button>
  );
};