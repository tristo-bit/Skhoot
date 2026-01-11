import React, { memo, type ReactNode, type CSSProperties } from 'react';

interface GlassButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  hoverEffect?: 'scale' | 'brightness' | 'none';
  style?: CSSProperties;
  ariaLabel?: string;
  title?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
} as const;

export const GlassButton = memo<GlassButtonProps>(({ 
  children, 
  onClick, 
  disabled = false,
  isActive = false,
  size = 'md',
  className = '',
  hoverEffect = 'scale',
  style,
  ariaLabel,
  title,
}) => {
  const hoverClass = {
    scale: 'hover:scale-[1.02] active:scale-95',
    brightness: 'hover:brightness-105 active:scale-95',
    none: 'active:scale-95',
  }[hoverEffect];

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      data-tauri-drag-region="false"
      data-no-drag
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`
        ${SIZE_MAP[size]}
        flex items-center justify-center 
        transition-all duration-200
        glass-subtle
        ${hoverClass}
        ${isActive ? 'text-text-primary' : 'text-text-secondary'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        backdropFilter: 'blur(8px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.1)',
        boxShadow: isActive 
          ? 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)' 
          : '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
        ...style,
      }}
    >
      {children}
    </button>
  );
});

GlassButton.displayName = 'GlassButton';
