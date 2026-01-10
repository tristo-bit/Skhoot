import React from 'react';
import { BaseButton, BaseButtonProps } from './buttons';

interface PlanButtonProps extends Omit<BaseButtonProps, 'children'> {
  isActive?: boolean;
  icon?: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export const PlanButton: React.FC<PlanButtonProps> = ({
  isActive = false,
  icon,
  title,
  description,
  className = '',
  children,
  ...props
}) => {
  return (
    <BaseButton
      className={`
        p-4 rounded-xl transition-all relative
        ${isActive 
          ? 'glass-subtle border-2' 
          : 'glass-subtle hover:glass'
        }
        ${className}
      `.trim()}
      style={isActive ? { borderColor: '#9a8ba3' } : {}}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        {icon && (
          <span 
            className={isActive ? 'text-text-primary' : 'text-text-secondary'} 
            style={isActive ? { color: '#9a8ba3' } : {}}
          >
            {icon}
          </span>
        )}
        <span 
          className={`text-sm font-bold font-jakarta ${
            isActive ? 'text-text-primary' : 'text-text-secondary'
          }`} 
          style={isActive ? { color: '#9a8ba3' } : {}}
        >
          {title}
        </span>
        <span className="text-xs text-text-secondary font-jakarta">{description}</span>
      </div>
      {children}
    </BaseButton>
  );
};