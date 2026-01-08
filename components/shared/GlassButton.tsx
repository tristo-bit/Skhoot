import React, { memo, type ReactNode, type CSSProperties } from 'react';
import { GLASS_STYLES } from '../../constants';

interface GlassButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  hoverEffect?: 'scale' | 'brightness' | 'none';
  style?: CSSProperties;
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
      className={`
        ${SIZE_MAP[size]}
        flex items-center justify-center 
        transition-all duration-200
        border border-black/5
        ${hoverClass}
        ${isActive ? 'text-gray-700' : 'text-gray-500'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        ...GLASS_STYLES.base,
        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.03)',
        ...style,
      }}
    >
      {children}
    </button>
  );
});

GlassButton.displayName = 'GlassButton';
