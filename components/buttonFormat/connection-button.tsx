import React from 'react';
import { Button, ButtonVariantProps } from './buttons';

interface ConnectionButtonProps extends Omit<ButtonVariantProps, 'children'> {
  isConnected?: boolean;
  isTesting?: boolean;
  testText?: string;
  connectedText?: string;
  disconnectedText?: string;
  children?: React.ReactNode;
}

export const ConnectionButton: React.FC<ConnectionButtonProps> = ({
  isConnected = false,
  isTesting = false,
  testText = 'Test Connection',
  connectedText = 'Connected Successfully',
  disconnectedText = 'Test Connection',
  variant = 'blue',
  loading,
  children,
  ...props
}) => {
  const getButtonText = () => {
    if (children) return children;
    if (isTesting) return 'Testing Connection...';
    if (isConnected) return connectedText;
    return testText;
  };

  const getIcon = () => {
    if (isTesting) {
      return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
    }
    if (isConnected) {
      return <span>✓</span>;
    }
    return null;
  };

  return (
    <Button
      variant={variant}
      loading={loading || isTesting}
      icon={getIcon()}
      iconPosition="left"
      className="w-full"
      {...props}
    >
      {getButtonText()}
    </Button>
  );
};