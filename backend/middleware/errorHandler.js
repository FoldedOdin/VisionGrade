const logger = require('../utils/logger');

/**
 * Comprehensive error handling middleware
 */

/**
 * Error types and their corresponding HTTP status codes
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  CONFLICT_ERROR: 409,
  RATE_LIMIT_ERROR: 429,
  SERVER_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, code = 'SERVER_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database error handler
 */
const handleDatabaseError = (error) => {
  logger.error('Database error:', error);

  // Sequelize validation errors
  if (error.name === 'SequelizeValidationError') {
    const details = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    return new AppError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      details
    );
  }

  // Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path || 'field';
    const value = error.errors[0]?.value || 'value';

    return new AppError(
      `${field} '${value}' already exists`,
      'CONFLICT_ERROR',
      409,
      { field, value }
    );
  }

  // Sequelize foreign key constraint errors
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new AppError(
      'Referenced record does not exist',
      'VALIDATION_ERROR',
      400,
      { constraint: error.index }
    );
  }

  // Sequelize connection errors
  if (error.name === 'SequelizeConnectionError') {
    return new AppError(
      'Database connection failed',
      'DATABASE_ERROR',
      500
    );
  }

  // Sequelize timeout errors
  if (error.name === 'SequelizeTimeoutError') {
    return new AppError(
      'Database operation timed out',
      'DATABASE_ERROR',
      500
    );
  }

  // Generic database error
  return new AppError(
    'Database operation failed',
    'DATABASE_ERROR',
    500
  );
};

/**
 * JWT error handler
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError(
      'Invalid authentication token',
      'AUTHENTICATION_ERROR',
      401
    );
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError(
      'Authentication token has expired',
      'AUTHENTICATION_ERROR',
      401
    );
  }

  return new AppError(
    'Authentication failed',
    'AUTHENTICATION_ERROR',
    401
  );
};

/**
 * Validation error handler (Joi)
 */
const handleValidationError = (error) => {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));

  return new AppError(
    'Validation failed',
    'VALIDATION_ERROR',
    400,
    details
  );
};

/**
 * File upload error handler
 */
const handleFileUploadError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(
      'File size exceeds the maximum allowed limit',
      'VALIDATION_ERROR',
      400,
      { maxSize: error.limit }
    );
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError(
      'Too many files uploaded',
      'VALIDATION_ERROR',
      400,
      { maxCount: error.limit }
    );
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(
      'Unexpected file field',
      'VALIDATION_ERROR',
      400,
      { field: error.field }
    );
  }

  return new AppError(
    'File upload failed',
    'VALIDATION_ERROR',
    400
  );
};

/**
 * Rate limiting error handler
 */
const handleRateLimitError = (error) => {
  return new AppError(
    'Too many requests. Please try again later.',
    'RATE_LIMIT_ERROR',
    429,
    {
      retryAfter: error.retryAfter || 60,
      limit: error.limit,
      remaining: error.remaining
    }
  );
};

/**
 * External service error handler
 */
const handleExternalServiceError = (error, serviceName = 'external service') => {
  logger.error(`${serviceName} error:`, error);

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new AppError(
      `${serviceName} is currently unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      502
    );
  }

  if (error.code === 'ETIMEDOUT') {
    return new AppError(
      `${serviceName} request timed out`,
      'EXTERNAL_SERVICE_ERROR',
      504
    );
  }

  return new AppError(
    `${serviceName} error occurred`,
    'EXTERNAL_SERVICE_ERROR',
    502
  );
};

/**
 * Convert operational errors to AppError instances
 */
const normalizeError = (error) => {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Database errors
  if (error.name && error.name.startsWith('Sequelize')) {
    return handleDatabaseError(error);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return handleJWTError(error);
  }

  // Joi validation errors
  if (error.isJoi) {
    return handleValidationError(error);
  }

  // Multer file upload errors
  if (error.code && error.code.startsWith('LIMIT_')) {
    return handleFileUploadError(error);
  }

  // Rate limiting errors
  if (error.status === 429) {
    return handleRateLimitError(error);
  }

  // Network/external service errors
  if (error.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code)) {
    return handleExternalServiceError(error);
  }

  // Generic server error
  return new AppError(
    error.message || 'Internal server error',
    'SERVER_ERROR',
    500
  );
};

/**
 * Format error response
 */
const formatErrorResponse = (error, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  // Add details for validation errors
  if (error.details) {
    response.error.details = error.details;
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.error.stack = error.stack;
  }

  // Add request context in development
  if (isDevelopment) {
    response.error.request = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    };
  }

  return response;
};

/**
 * Log error with appropriate level
 */
const logError = (error, req) => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    },
    timestamp: new Date().toISOString()
  };

  // Log based on error severity
  if (error.statusCode >= 500) {
    logger.error('Server error:', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error:', logData);
  } else {
    logger.info('Request error:', logData);
  }
};

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  // Normalize error to AppError
  const normalizedError = normalizeError(error);

  // Log error
  logError(normalizedError, req);

  // Send error response
  const errorResponse = formatErrorResponse(normalizedError, req);
  res.status(normalizedError.statusCode).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    'NOT_FOUND_ERROR',
    404
  );
  next(error);
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Database transaction error handler
 */
const handleTransactionError = async (transaction, error) => {
  if (transaction) {
    try {
      await transaction.rollback();
      logger.info('Transaction rolled back due to error');
    } catch (rollbackError) {
      logger.error('Failed to rollback transaction:', rollbackError);
    }
  }
  throw error;
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server, cleanupCallback = null) => {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Run cleanup callback if provided
    if (cleanupCallback && typeof cleanupCallback === 'function') {
      try {
        await cleanupCallback();
      } catch (error) {
        logger.error('Error during cleanup:', error);
      }
    }
    
    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Unhandled rejection and exception handlers
 */
const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Exit the process for uncaught exceptions
    process.exit(1);
  });
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleTransactionError,
  gracefulShutdown,
  setupGlobalErrorHandlers,
  ERROR_TYPES
};