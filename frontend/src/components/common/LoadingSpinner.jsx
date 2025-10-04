import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'white', 
  text = '', 
  variant = 'spinner',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16'
  };

  const colorClasses = {
    white: 'border-white',
    blue: 'border-blue-400',
    green: 'border-green-400',
    purple: 'border-purple-400',
    gray: 'border-gray-400'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  };

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center space-x-1 ${className}`}>
        <div className={`animate-bounce ${sizeClasses[size]} bg-current rounded-full`} style={{ animationDelay: '0ms' }}></div>
        <div className={`animate-bounce ${sizeClasses[size]} bg-current rounded-full`} style={{ animationDelay: '150ms' }}></div>
        <div className={`animate-bounce ${sizeClasses[size]} bg-current rounded-full`} style={{ animationDelay: '300ms' }}></div>
        {text && (
          <span className={`ml-3 ${textSizeClasses[size]} animate-pulse`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`animate-pulse ${sizeClasses[size]} bg-current rounded-full opacity-75`}></div>
        {text && (
          <span className={`mt-2 ${textSizeClasses[size]} animate-pulse`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-opacity-20 ${colorClasses[color]} ${sizeClasses[size]}`}>
        <div className={`rounded-full border-2 border-transparent border-t-current ${sizeClasses[size]}`}></div>
      </div>
      {text && (
        <span className={`mt-2 ${textSizeClasses[size]} animate-pulse`}>
          {text}
        </span>
      )}
    </div>
  );
};

// Progress Bar Component
export const ProgressBar = ({ 
  progress = 0, 
  className = '', 
  showPercentage = true,
  color = 'blue',
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div 
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
};

// Skeleton Loader Component
export const SkeletonLoader = ({ 
  lines = 3, 
  className = '',
  variant = 'text'
}) => {
  if (variant === 'card') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-300 dark:bg-gray-600 rounded-lg h-48 w-full mb-4"></div>
        <div className="space-y-2">
          <div className="bg-gray-300 dark:bg-gray-600 rounded h-4 w-3/4"></div>
          <div className="bg-gray-300 dark:bg-gray-600 rounded h-4 w-1/2"></div>
        </div>
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={`animate-pulse flex items-center space-x-3 ${className}`}>
        <div className="bg-gray-300 dark:bg-gray-600 rounded-full h-10 w-10"></div>
        <div className="space-y-2 flex-1">
          <div className="bg-gray-300 dark:bg-gray-600 rounded h-4 w-3/4"></div>
          <div className="bg-gray-300 dark:bg-gray-600 rounded h-3 w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className="bg-gray-300 dark:bg-gray-600 rounded h-4"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

export default LoadingSpinner;