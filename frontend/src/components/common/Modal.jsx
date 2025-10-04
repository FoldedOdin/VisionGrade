import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Button, { IconButton } from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  glass = true,
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  ...props
}) => {
  const { isDark } = useTheme();

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
      {...props}
    >
      <div className={`
        relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden
        ${glass 
          ? (isDark ? 'glass-card-dark' : 'glass-card')
          : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')
        }
        rounded-2xl shadow-strong animate-scale-in
        ${className}
      `}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`
            flex items-center justify-between p-6 border-b
            ${isDark ? 'border-gray-700' : 'border-gray-200'}
          `}>
            {title && (
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <IconButton
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
                onClick={onClose}
                variant="ghost"
                size="small"
                className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Specialized modal components
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
  ...props
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      {...props}
    >
      <div className="space-y-4">
        {message && (
          <p className="text-gray-600 dark:text-gray-300">
            {message}
          </p>
        )}
        <div className="flex space-x-3 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const AlertModal = ({
  isOpen,
  onClose,
  title = 'Alert',
  message,
  buttonText = 'OK',
  variant = 'primary',
  ...props
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      {...props}
    >
      <div className="space-y-4">
        {message && (
          <p className="text-gray-600 dark:text-gray-300">
            {message}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            variant={variant}
            onClick={onClose}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Modal;