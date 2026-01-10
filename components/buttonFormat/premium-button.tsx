import React from 'react';
import { Button, ButtonVariantProps } from './buttons';

interface PremiumButtonProps extends Omit<ButtonVariantProps, 'children'> {
  premiumText?: string;
  children?: React.ReactNode;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  premiumText = 'Start 7-Day Free Trial',
  variant = 'violet',
  size = 'lg',
  className = '',
  children,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      className={`w-full ${className}`}
      {...props}
    >
      {children || premiumText}
    </Button>
  );
};