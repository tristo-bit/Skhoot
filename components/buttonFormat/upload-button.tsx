import React from 'react';
import { Upload } from 'lucide-react';
import { Button, ButtonVariantProps } from './buttons';

interface UploadButtonProps extends Omit<ButtonVariantProps, 'children'> {
  uploadText?: string;
  children?: React.ReactNode;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  uploadText = 'Upload Photo',
  variant = 'violet',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      icon={<Upload size={16} />}
      iconPosition="left"
      {...props}
    >
      {children || uploadText}
    </Button>
  );
};