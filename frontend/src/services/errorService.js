/**
 * Error handling service for consistent error management across the application
 */

class ErrorService {
  constructor() {
    this.errorHandlers = new Map();
    this.globalErrorHandler = null;
  }

  /**
   * Register a global error handler
   */
  setGlobalErrorHandler(handler) {
    this.globalErrorHandler = handler;
  }

  /**
   * Register an error handler for specific error types
   */
  registerErrorHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }

  /**
   * Handle different types of errors with appropriate user messages
   */
  handleError(error, context = {}) {
    const errorInfo = this.parseError(error);
    
    // Try specific error handler first
    const specificHandler = this.errorHandlers.get(errorInfo.type);
    if (specificHandler) {
      return specificHandler(errorInfo, context);
    }

    // Fall back to global handler
    if (this.globalErrorHandler) {
      return this.globalErrorHandler(errorInfo, context);
    }

    // Default handling
    return this.getDefaultErrorMessage(errorInfo);
  }

  /**
   * Parse error object to extract useful information
   */
  parseError(error) {
    const errorInfo = {
      type: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: null,
      statusCode: null,
      timestamp: new Date().toISOString(),
      recoverable: true
    };

    if (!error) {
      return errorInfo;
    }

    // Handle Axios errors
    if (error.response) {
      errorInfo.statusCode = error.response.status;
      
      if (error.response.data?.error) {
        const apiError = error.response.data.error;
        errorInfo.type = apiError.code || this.getErrorTypeFromStatus(error.response.status);
        errorInfo.message = apiError.message || errorInfo.message;
        errorInfo.details = apiError.details || null;
      } else {
        errorInfo.type = this.getErrorTypeFromStatus(error.response.status);
        errorInfo.message = this.getMessageFromStatus(error.response.status);
      }
    }
    // Handle network errors
    else if (error.request) {
      errorInfo.type = 'NETWORK_ERROR';
      errorInfo.message = 'Unable to connect to the server. Please check your internet connection.';
      errorInfo.recoverable = true;
    }
    // Handle JavaScript errors
    else if (error instanceof Error) {
      errorInfo.type = 'CLIENT_ERROR';
      errorInfo.message = error.message;
      errorInfo.recoverable = false;
    }
    // Handle string errors
    else if (typeof error === 'string') {
      errorInfo.message = error;
    }

    return errorInfo;
  }

  /**
   * Get error type based on HTTP status code
   */
  getErrorTypeFromStatus(status) {
    const statusMap = {
      400: 'VALIDATION_ERROR',
      401: 'AUTHENTICATION_ERROR',
      403: 'AUTHORIZATION_ERROR',
      404: 'NOT_FOUND_ERROR',
      409: 'CONFLICT_ERROR',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_ERROR',
      500: 'SERVER_ERROR',
      502: 'SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
      504: 'TIMEOUT_ERROR'
    };

    return statusMap[status] || 'HTTP_ERROR';
  }

  /**
   * Get user-friendly message based on HTTP status code
   */
  getMessageFromStatus(status) {
    const messageMap = {
      400: 'Invalid request. Please check your input.',
      401: 'Please log in to continue.',
      403: 'You don\'t have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'This action conflicts with existing data.',
      422: 'Please check your input and try again.',
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'Server error. Please try again later.',
      502: 'Server is temporarily unavailable.',
      503: 'Service is temporarily unavailable.',
      504: 'Request timed out. Please try again.'
    };

    return messageMap[status] || 'An unexpected error occurred.';
  }

  /**
   * Get default error message based on error type
   */
  getDefaultErrorMessage(errorInfo) {
    const messageMap = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTHENTICATION_ERROR: 'Please log in to continue.',
      AUTHORIZATION_ERROR: 'You don\'t have permission to perform this action.',
      NOT_FOUND_ERROR: 'The requested resource was not found.',
      NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
      SERVER_ERROR: 'Server error. Please try again later.',
      RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
      SERVICE_UNAVAILABLE: 'Service is temporarily unavailable.',
      TIMEOUT_ERROR: 'Request timed out. Please try again.',
      CLIENT_ERROR: 'An error occurred in the application.',
      UNKNOWN_ERROR: 'An unexpected error occurred.'
    };

    return {
      message: messageMap[errorInfo.type] || errorInfo.message,
      type: errorInfo.type,
      recoverable: errorInfo.recoverable,
      details: errorInfo.details
    };
  }

  /**
   * Create user-friendly error messages with recovery suggestions
   */
  createUserMessage(errorInfo) {
    const baseMessage = this.getDefaultErrorMessage(errorInfo);
    
    const recoverySuggestions = {
      NETWORK_ERROR: [
        'Check your internet connection',
        'Try refreshing the page',
        'Contact support if the problem persists'
      ],
      AUTHENTICATION_ERROR: [
        'Log in again',
        'Clear your browser cache',
        'Reset your password if needed'
      ],
      VALIDATION_ERROR: [
        'Review the highlighted fields',
        'Ensure all required information is provided',
        'Check the format of your input'
      ],
      SERVER_ERROR: [
        'Try again in a few moments',
        'Refresh the page',
        'Contact support if the issue continues'
      ],
      RATE_LIMIT_ERROR: [
        'Wait a moment before trying again',
        'Reduce the frequency of your requests'
      ]
    };

    return {
      ...baseMessage,
      suggestions: recoverySuggestions[errorInfo.type] || ['Try again later']
    };
  }

  /**
   * Log error for debugging and monitoring
   */
  logError(error, context = {}) {
    const errorInfo = this.parseError(error);
    
    const logData = {
      ...errorInfo,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: localStorage.getItem('userId') || 'anonymous'
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', logData);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(logData);
    }

    return logData;
  }

  /**
   * Send error to external monitoring service
   */
  sendToMonitoringService(errorData) {
    // This would integrate with services like Sentry, LogRocket, etc.
    try {
      // Example: Sentry integration
      // Sentry.captureException(errorData);
      
      // For now, just log to console
      console.error('Production error:', errorData);
    } catch (monitoringError) {
      console.error('Failed to send error to monitoring service:', monitoringError);
    }
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error) {
    const errorInfo = this.parseError(error);
    return errorInfo.recoverable;
  }

  /**
   * Get retry strategy for recoverable errors
   */
  getRetryStrategy(error) {
    const errorInfo = this.parseError(error);
    
    const retryStrategies = {
      NETWORK_ERROR: { maxRetries: 3, delay: 1000, backoff: 2 },
      TIMEOUT_ERROR: { maxRetries: 2, delay: 2000, backoff: 1.5 },
      SERVER_ERROR: { maxRetries: 2, delay: 3000, backoff: 2 },
      RATE_LIMIT_ERROR: { maxRetries: 1, delay: 5000, backoff: 1 }
    };

    return retryStrategies[errorInfo.type] || null;
  }

  /**
   * Format validation errors for display
   */
  formatValidationErrors(errors) {
    if (!errors || !Array.isArray(errors)) {
      return {};
    }

    return errors.reduce((acc, error) => {
      if (error.field && error.message) {
        acc[error.field] = error.message;
      }
      return acc;
    }, {});
  }

  /**
   * Create error toast configuration
   */
  createToastConfig(error, options = {}) {
    const errorInfo = this.parseError(error);
    const userMessage = this.createUserMessage(errorInfo);

    return {
      type: 'error',
      message: userMessage.message,
      duration: options.duration || 5000,
      actions: options.showRetry && errorInfo.recoverable ? [
        {
          label: 'Retry',
          action: options.onRetry
        }
      ] : undefined
    };
  }
}

// Create singleton instance
const errorService = new ErrorService();

// Register enhanced error handlers with secure messaging
errorService.registerErrorHandler('AUTHENTICATION_ERROR', (errorInfo, context) => {
  // Secure handling of authentication errors
  const isLoginPage = window.location.pathname.includes('/login');
  const isSignupPage = window.location.pathname.includes('/signup');
  
  // Clear sensitive data
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  
  // Determine appropriate message based on context
  let message = 'Authentication required. Please log in.';
  let suggestions = ['Log in with your credentials'];
  
  if (errorInfo.statusCode === 401) {
    if (context?.action === 'token_refresh') {
      message = 'Your session has expired. Please log in again.';
      suggestions = [
        'Log in again to continue',
        'Check if your account is still active',
        'Clear browser cache if issues persist'
      ];
    } else if (context?.action === 'login_attempt') {
      message = 'Invalid credentials. Please check your login information.';
      suggestions = [
        'Verify your email/phone and password',
        'Check if Caps Lock is on',
        'Use "Forgot Password" if needed',
        'Contact support if account is locked'
      ];
    } else {
      message = 'Please log in to access this feature.';
      suggestions = ['Log in to continue'];
    }
  }
  
  // Redirect to login if not on auth pages
  if (!isLoginPage && !isSignupPage) {
    setTimeout(() => {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }, 2000);
  }
  
  return {
    message,
    type: 'AUTHENTICATION_ERROR',
    recoverable: true,
    suggestions,
    autoRedirect: !isLoginPage && !isSignupPage
  };
});

errorService.registerErrorHandler('AUTHORIZATION_ERROR', (errorInfo, context) => {
  const userRole = localStorage.getItem('userRole') || 'unknown';
  
  let message = 'You don\'t have permission to perform this action.';
  let suggestions = [
    'Contact your administrator for access',
    'Check if you\'re logged in with the correct account'
  ];
  
  // Provide role-specific guidance
  if (context?.requiredRole) {
    if (userRole === 'student' && context.requiredRole === 'faculty') {
      message = 'This feature is only available to faculty members.';
      suggestions = [
        'Contact your instructor for assistance',
        'Use the student dashboard instead'
      ];
    } else if (userRole === 'faculty' && context.requiredRole === 'admin') {
      message = 'This feature requires administrator privileges.';
      suggestions = [
        'Contact the system administrator',
        'Use the faculty dashboard for available features'
      ];
    }
  }
  
  return {
    message,
    type: 'AUTHORIZATION_ERROR',
    recoverable: false,
    suggestions,
    userRole,
    requiredRole: context?.requiredRole
  };
});

errorService.registerErrorHandler('VALIDATION_ERROR', (errorInfo, context) => {
  const fieldCount = errorInfo.details?.length || 0;
  
  let message = 'Please check your input and try again.';
  let suggestions = [
    'Review the highlighted fields',
    'Ensure all required information is provided'
  ];
  
  if (fieldCount > 1) {
    message = `Please fix ${fieldCount} validation errors.`;
    suggestions = [
      'Check all highlighted fields',
      'Ensure required fields are filled',
      'Verify data formats are correct'
    ];
  } else if (fieldCount === 1) {
    const field = errorInfo.details[0];
    message = `Please fix the error in ${field.field}.`;
    suggestions = [
      `Check the ${field.field} field`,
      field.suggestion || 'Verify the format is correct'
    ];
  }
  
  return {
    message,
    type: 'VALIDATION_ERROR',
    recoverable: true,
    details: errorInfo.details,
    suggestions,
    fieldCount
  };
});

errorService.registerErrorHandler('NETWORK_ERROR', (errorInfo, context) => {
  return {
    message: 'Unable to connect to the server. Please check your connection.',
    type: 'NETWORK_ERROR',
    recoverable: true,
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN if using one',
      'Contact IT support if issues persist'
    ],
    retryable: true
  };
});

errorService.registerErrorHandler('SERVER_ERROR', (errorInfo, context) => {
  const isMaintenanceTime = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 2 && hour <= 4; // Assume maintenance window 2-4 AM
  };
  
  let message = 'Server error occurred. Please try again.';
  let suggestions = [
    'Try again in a few moments',
    'Refresh the page',
    'Contact support if the issue continues'
  ];
  
  if (isMaintenanceTime()) {
    message = 'The system may be under maintenance. Please try again later.';
    suggestions = [
      'Try again in 10-15 minutes',
      'Check for maintenance announcements',
      'Contact support if urgent'
    ];
  }
  
  return {
    message,
    type: 'SERVER_ERROR',
    recoverable: true,
    suggestions,
    retryable: true,
    maintenanceWindow: isMaintenanceTime()
  };
});

errorService.registerErrorHandler('RATE_LIMIT_ERROR', (errorInfo, context) => {
  const retryAfter = errorInfo.details?.retryAfter || 60;
  
  return {
    message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
    type: 'RATE_LIMIT_ERROR',
    recoverable: true,
    suggestions: [
      `Wait ${retryAfter} seconds before retrying`,
      'Reduce the frequency of your requests',
      'Contact support if you need higher limits'
    ],
    retryAfter,
    retryable: true
  };
});

export default errorService;