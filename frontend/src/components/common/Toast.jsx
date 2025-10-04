import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Toast = ({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose,
  className = ''
}) => {
  const { isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const typeStyles = {
    success: {
      icon: '✅',
      color: isDark ? 'bg-green-800 border-green-600' : 'bg-green-100 border-green-400',
      textColor: isDark ? 'text-green-200' : 'text-green-800'
    },
    error: {
      icon: '❌',
      color: isDark ? 'bg-red-800 border-red-600' : 'bg-red-100 border-red-400',
      textColor: isDark ? 'text-red-200' : 'text-red-800'
    },
    warning: {
      icon: '⚠️',
      color: isDark ? 'bg-yellow-800 border-yellow-600' : 'bg-yellow-100 border-yellow-400',
      textColor: isDark ? 'text-yellow-200' : 'text-yellow-800'
    },
    info: {
      icon: 'ℹ️',
      color: isDark ? 'bg-blue-800 border-blue-600' : 'bg-blue-100 border-blue-400',
      textColor: isDark ? 'text-blue-200' : 'text-blue-800'
    }
  };

  const style = typeStyles[type];

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-in-out
      ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      ${className}
    `}>
      <div className={`
        glass-card rounded-lg p-4 border-l-4
        ${style.color}
        shadow-strong
        animate-slide-in-down
      `}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3 text-lg">
            {style.icon}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${style.textColor}`}>
              {message}
            </p>
          </div>
          <button
            onClick={handleClose}
            className={`
              flex-shrink-0 ml-3 text-lg opacity-70 hover:opacity-100
              transition-opacity duration-200 ${style.textColor}
            `}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Container for managing multiple toasts
export const ToastContainer = ({ toasts = [], onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemoveToast?.(toast.id || index)}
          className={`animate-slide-in-down`}
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
};

export default Toast;