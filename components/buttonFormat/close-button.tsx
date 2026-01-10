import React from 'react';
import { X } from 'lucide-react';
import { BaseButton, BaseButtonProps } from './buttons';

interface CloseButtonProps extends Omit<BaseButtonProps, 'children'> {
  size?: number;
}

export const CloseButton: React.FC<CloseButtonProps> = ({
  size = 18,
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
      aria-label="Close"
      {...props}
    >
      <X size={size} />
    </BaseButton>
  );
};