import React from 'react';
import { Button, ButtonVariantProps } from './buttons';

interface SubmitButtonProps extends Omit<ButtonVariantProps, 'children'> {
  isSubmitting?: boolean;
  submitText?: string;
  submittingText?: string;
  children?: React.ReactNode;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting = false,
  submitText = 'Submit',
  submittingText = 'Submitting...',
  variant = 'primary',
  disabled,
  children,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      disabled={disabled || isSubmitting}
      loading={isSubmitting}
      className="w-full"
      {...props}
    >
      {children || (isSubmitting ? submittingText : submitText)}
    </Button>
  );
};