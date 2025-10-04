import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Card = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  glass = false,
  padding = 'default',
  ...props 
}) => {
  const { isDark } = useTheme();

  const paddingClasses = {
    none: '',
    small: 'p-4',
    default: 'p-6',
    large: 'p-8'
  };

  const variantClasses = {
    default: isDark 
      ? 'bg-gray-800 border-gray-700' 
      : 'bg-white border-gray-200',
    secondary: isDark 
      ? 'bg-gray-700 border-gray-600' 
      : 'bg-gray-50 border-gray-100',
    success: isDark 
      ? 'bg-green-900 border-green-700' 
      : 'bg-green-50 border-green-200',
    warning: isDark 
      ? 'bg-yellow-900 border-yellow-700' 
      : 'bg-yellow-50 border-yellow-200',
    error: isDark 
      ? 'bg-red-900 border-red-700' 
      : 'bg-red-50 border-red-200',
    transparent: 'bg-transparent border-transparent'
  };

  const baseClasses = `
    rounded-xl border shadow-soft transition-all-smooth
    ${paddingClasses[padding]}
    ${glass ? (isDark ? 'glass-card-dark' : 'glass-card') : variantClasses[variant]}
    ${hover ? 'hover-lift hover:shadow-medium' : ''}
    ${className}
  `;

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  );
};

// Specialized card components
export const StatsCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendValue, 
  className = '',
  ...props 
}) => {
  const { isDark } = useTheme();
  
  const trendColor = trend === 'up' 
    ? 'text-green-500' 
    : trend === 'down' 
    ? 'text-red-500' 
    : 'text-gray-500';

  return (
    <Card className={`${className}`} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
          {trend && trendValue && (
            <div className={`flex items-center mt-1 text-sm ${trendColor}`}>
              <span className="mr-1">
                {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '➡️'}
              </span>
              {trendValue}
            </div>
          )}
        </div>
        {icon && (
          <div className={`text-3xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export const ActionCard = ({ 
  title, 
  description, 
  action, 
  actionText = 'Action',
  icon,
  className = '',
  ...props 
}) => {
  const { isDark } = useTheme();

  return (
    <Card className={`${className}`} hover={true} {...props}>
      <div className="flex items-start space-x-4">
        {icon && (
          <div className={`text-2xl ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          {description && (
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {description}
            </p>
          )}
          {action && (
            <button
              onClick={action}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all-smooth
                ${isDark 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
                hover-lift
              `}
            >
              {actionText}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Card;