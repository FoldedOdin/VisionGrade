import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Report error to monitoring service (if available)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // This would integrate with error reporting services like Sentry
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous'
    };

    // Example: Send to error reporting service
    // errorReportingService.captureException(errorData);
    console.error('Error logged:', errorData);
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          isDevelopment={process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ 
  error, 
  errorInfo, 
  errorId, 
  onRetry, 
  onReload, 
  isDevelopment 
}) => {
  const { isDark } = useTheme();

  const copyErrorDetails = () => {
    const errorDetails = `
Error ID: ${errorId}
Message: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      alert('Error details copied to clipboard');
    }).catch(() => {
      console.error('Failed to copy error details');
    });
  };

  return (
    <div className={`
      min-h-screen flex items-center justify-center p-4
      ${isDark ? 'bg-gray-900' : 'bg-gray-50'}
    `}>
      <div className={`
        max-w-md w-full glass-card rounded-lg p-6 text-center
        ${isDark ? 'bg-gray-800/80' : 'bg-white/80'}
        border ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}>
        {/* Error Icon */}
        <div className="mb-4">
          <div className={`
            w-16 h-16 mx-auto rounded-full flex items-center justify-center
            ${isDark ? 'bg-red-900/50' : 'bg-red-100'}
          `}>
            <svg 
              className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-600'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h2 className={`
          text-xl font-semibold mb-2
          ${isDark ? 'text-white' : 'text-gray-900'}
        `}>
          Something went wrong
        </h2>

        <p className={`
          text-sm mb-4
          ${isDark ? 'text-gray-300' : 'text-gray-600'}
        `}>
          We're sorry, but something unexpected happened. Please try again or reload the page.
        </p>

        {/* Error ID */}
        <div className={`
          text-xs mb-4 p-2 rounded
          ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
        `}>
          Error ID: {errorId}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={onRetry}
            variant="primary"
            className="w-full"
          >
            Try Again
          </Button>

          <Button
            onClick={onReload}
            variant="secondary"
            className="w-full"
          >
            Reload Page
          </Button>

          {isDevelopment && (
            <Button
              onClick={copyErrorDetails}
              variant="outline"
              className="w-full text-xs"
            >
              Copy Error Details
            </Button>
          )}
        </div>

        {/* Development Error Details */}
        {isDevelopment && error && (
          <details className="mt-4 text-left">
            <summary className={`
              cursor-pointer text-sm font-medium
              ${isDark ? 'text-gray-300' : 'text-gray-700'}
            `}>
              Error Details (Development)
            </summary>
            <div className={`
              mt-2 p-3 rounded text-xs font-mono overflow-auto max-h-40
              ${isDark ? 'bg-gray-900 text-red-300' : 'bg-red-50 text-red-800'}
            `}>
              <div className="mb-2">
                <strong>Message:</strong> {error.message}
              </div>
              {error.stack && (
                <div className="mb-2">
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const handleError = (error, errorInfo = {}) => {
    console.error('Error handled by useErrorHandler:', error);
    
    // In a real app, you might want to report this to an error service
    if (process.env.NODE_ENV === 'production') {
      // Report to error service
      console.error('Production error:', { error, errorInfo });
    }
  };

  return handleError;
};

export default ErrorBoundary;