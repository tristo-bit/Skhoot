import React from 'react';

interface ToggleSwitchProps {
  isToggled: boolean;
  onToggle: (toggled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  isToggled,
  onToggle,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      onClick={() => !disabled && onToggle(!isToggled)}
      disabled={disabled}
      className={`
        settings-toggle
        rounded-full transition-all duration-300 relative
        border-2
        ${isToggled 
          ? 'bg-accent border-accent' 
          : 'glass-subtle border-white/40 hover:glass-elevated hover:border-white/60'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `.trim()}
      role="switch"
      aria-checked={isToggled}
    >
      <div
        className={`
          settings-toggle-knob
          absolute top-0.5 rounded-full shadow-md
          transition-all duration-300 border-2 border-white/50
          ${isToggled ? 'bg-white translate-x-5' : 'bg-white/90 translate-x-1'}
        `.trim()}
      />
    </button>
  );
};
