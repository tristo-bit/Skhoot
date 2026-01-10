import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { BaseButton, BaseButtonProps } from './buttons';

interface BackButtonProps extends Omit<BaseButtonProps, 'children'> {
  size?: number;
  showArrow?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  size = 18,
  showArrow = true,
  className = '',
  ...props
}) => {
  return (
    <BaseButton
      className={`
        w-8 h-8 flex items-center justify-center rounded-xl 
        hover:glass-subtle transition-all text-text-secondary
        ${className}
      `.trim()}
      aria-label="Go back"
      {...props}
    >
      {showArrow ? <ChevronLeft size={size} /> : '←'}
    </BaseButton>
  );
};