import React from 'react';
import { BaseButton, BaseButtonProps } from './buttons';

interface IconButtonProps extends Omit<BaseButtonProps, 'children'> {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'glass' | 'subtle';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'md',
  variant = 'ghost',
  className = '',
  ...props
}) => {
  const getSizeClasses = () => {
    const sizes = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10'
    };
    return sizes[size];
  };

  const getVariantClasses = () => {
    const variants = {
      ghost: 'hover:glass-subtle text-text-secondary',
      glass: 'glass-subtle text-text-primary hover:brightness-95',
      subtle: 'hover:bg-black/5 text-text-secondary'
    };
    return variants[variant];
  };

  return (
    <BaseButton
      className={`
        ${getSizeClasses()}
        flex items-center justify-center rounded-xl transition-all
        ${getVariantClasses()}
        ${className}
      `.trim()}
      {...props}
    >
      {icon}
    </BaseButton>
  );
};