import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  glass = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const { isDark } = useTheme();

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
    xlarge: 'px-8 py-4 text-xl'
  };

  const variantClasses = {
    primary: glass 
      ? 'glass-button text-white' 
      : isDark
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: glass
      ? 'glass-button text-white'
      : isDark
      ? 'bg-gray-600 hover:bg-gray-700 text-white'
      : 'bg-gray-500 hover:bg-gray-600 text-white',
    success: glass
      ? 'glass-button text-white'
      : isDark
      ? 'bg-green-600 hover:bg-green-700 text-white'
      : 'bg-green-500 hover:bg-green-600 text-white',
    warning: glass
      ? 'glass-button text-white'
      : isDark
      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
      : 'bg-yellow-500 hover:bg-yellow-600 text-white',
    error: glass
      ? 'glass-button text-white'
      : isDark
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-red-500 hover:bg-red-600 text-white',
    outline: glass
      ? 'glass border-2 border-white border-opacity-30 text-white hover:border-opacity-50'
      : isDark
      ? 'border-2 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white'
      : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: glass
      ? 'text-white hover:bg-white hover:bg-opacity-10'
      : isDark
      ? 'text-gray-300 hover:bg-gray-700'
      : 'text-gray-700 hover:bg-gray-100'
  };

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all-smooth focus:outline-none focus:ring-2 focus:ring-offset-2
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${!glass ? 'hover-lift' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  const iconElement = icon && (
    <span className={`${iconPosition === 'right' ? 'ml-2' : 'mr-2'}`}>
      {icon}
    </span>
  );

  return (
    <button
      className={baseClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          size="small" 
          color={glass || variant === 'outline' || variant === 'ghost' ? 'white' : 'white'} 
          className="mr-2"
        />
      )}
      {!loading && iconPosition === 'left' && iconElement}
      {children}
      {!loading && iconPosition === 'right' && iconElement}
    </button>
  );
};

// Specialized button components
export const IconButton = ({ 
  icon, 
  size = 'medium', 
  variant = 'ghost',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    small: 'p-1.5',
    medium: 'p-2',
    large: 'p-3',
    xlarge: 'p-4'
  };

  return (
    <Button
      variant={variant}
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
};

export const FloatingActionButton = ({ 
  icon, 
  className = '',
  ...props 
}) => {
  return (
    <Button
      variant="primary"
      className={`
        fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-strong
        animate-float hover:animate-glow z-50
        ${className}
      `}
      {...props}
    >
      {icon}
    </Button>
  );
};

export default Button;