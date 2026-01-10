import React from 'react';
import { Check } from 'lucide-react';
import { Button, ButtonVariantProps } from './buttons';

interface SaveButtonProps extends Omit<ButtonVariantProps, 'children'> {
  isSaved?: boolean;
  saveText?: string;
  savedText?: string;
  children?: React.ReactNode;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  isSaved = false,
  saveText = 'Save',
  savedText = 'Saved!',
  variant = 'violet',
  size = 'sm',
  disabled,
  children,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isSaved}
      icon={isSaved ? <Check size={12} /> : undefined}
      iconPosition="left"
      {...props}
    >
      {children || (isSaved ? savedText : saveText)}
    </Button>
  );
};