import React from 'react';
import { BaseButton, BaseButtonProps } from './buttons';

interface ToggleButtonProps extends Omit<BaseButtonProps, 'children'> {
  isToggled?: boolean;
  onToggle?: (toggled: boolean) => void;
  toggledText?: string;
  untoggledText?: string;
  children?: React.ReactNode;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  isToggled = false,
  onToggle,
  toggledText = 'On',
  untoggledText = 'Off',
  className = '',
  onClick,
  children,
  ...props
}) => {
  const handleClick = () => {
    onToggle?.(!isToggled);
    onClick?.();
  };

  return (
    <BaseButton
      onClick={handleClick}
      className={`
        px-4 py-2 rounded-xl font-bold text-sm font-jakarta transition-all
        ${isToggled 
          ? 'bg-accent text-white' 
          : 'glass-subtle text-text-secondary hover:glass-elevated'
        }
        ${className}
      `.trim()}
      {...props}
    >
      {children || (isToggled ? toggledText : untoggledText)}
    </BaseButton>
  );
};