import React from 'react';
import { Pencil } from 'lucide-react';
import { IconButton } from './icon-button';

interface EditButtonProps {
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const EditButton: React.FC<EditButtonProps> = ({
  onClick,
  size = 'md',
  className = '',
  disabled = false,
}) => {
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 22;

  return (
    <IconButton
      onClick={onClick}
      icon={<Pencil size={iconSize} />}
      variant="glass"
      size={size}
      disabled={disabled}
      className={`text-text-primary hover:brightness-95 ${className}`.trim()}
      aria-label="Edit message"
      title="Edit transcription"
    />
  );
};
