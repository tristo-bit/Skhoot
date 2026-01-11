import React from 'react';

export interface BaseButtonProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  ariaLabel?: string;
  title?: string;
}

export interface ButtonVariantProps extends BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass' | 'violet' | 'blue';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const getVariantClasses = (variant: ButtonVariantProps['variant'] = 'primary') => {
  const variants = {
    primary: 'bg-accent text-white hover:opacity-90',
    secondary: 'glass-subtle text-text-primary hover:glass-elevated',
    danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
    ghost: 'text-text-secondary hover:text-text-primary hover:glass-subtle',
    glass: 'glass-subtle text-text-primary hover:brightness-95',
    violet: 'text-white hover:opacity-90',
    blue: 'text-white hover:opacity-90'
  };
  return variants[variant];
};

const getSizeClasses = (size: ButtonVariantProps['size'] = 'md') => {
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  return sizes[size];
};

export const BaseButton: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = '',
  style,
  type = 'button',
  'aria-label': ariaLabelProp,
  ariaLabel,
  title,
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-bold font-jakarta transition-all duration-200 rounded-xl
        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `.trim()}
      style={style}
      aria-label={ariaLabelProp || ariaLabel}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
};

export const Button: React.FC<ButtonVariantProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  disabled,
  style,
  className = '',
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);
  
  // Special styling for violet and blue variants
  const specialStyle = variant === 'violet' 
    ? { backgroundColor: '#9a8ba3', ...style }
    : variant === 'blue'
    ? { backgroundColor: '#DDEBF4', ...style }
    : style;

  const buttonContent = (
    <>
      {icon && iconPosition === 'left' && (
        <span className={`${children ? 'mr-2' : ''}`}>{icon}</span>
      )}
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
      {icon && iconPosition === 'right' && (
        <span className={`${children ? 'ml-2' : ''}`}>{icon}</span>
      )}
    </>
  );

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        font-bold font-jakarta transition-all duration-200 rounded-xl
        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        ${variantClasses}
        ${sizeClasses}
        ${className}
      `.trim()}
      style={specialStyle}
      {...props}
    >
      {buttonContent}
    </button>
  );
};