const { sequelize } = require('../models');
const logger = require('./logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Database transaction utilities with comprehensive error handling
 */

/**
 * Execute function within a database transaction with error handling
 * @param {Function} operation - Function to execute within transaction
 * @param {Object} options - Transaction options
 * @returns {Promise} - Result of the operation
 */
const withTransaction = async (operation, options = {}) => {
  const transaction = await sequelize.transaction({
    isolationLevel: options.isolationLevel || sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    ...options
  });

  const startTime = Date.now();
  const transactionId = generateTransactionId();

  logger.info('Transaction started', {
    transactionId,
    isolationLevel: options.isolationLevel || 'READ_COMMITTED'
  });

  try {
    // Execute the operation within the transaction
    const result = await operation(transaction);

    // Commit the transaction
    await transaction.commit();

    const duration = Date.now() - startTime;
    logger.info('Transaction committed successfully', {
      transactionId,
      duration: `${duration}ms`
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Transaction failed, rolling back', {
      transactionId,
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack
    });

    try {
      await transaction.rollback();
      logger.info('Transaction rolled back successfully', { transactionId });
    } catch (rollbackError) {
      logger.error('Failed to rollback transaction', {
        transactionId,
        rollbackError: rollbackError.message,
        originalError: error.message
      });
      
      // This is a critical error - the database might be in an inconsistent state
      throw new AppError(
        'Critical database error: transaction rollback failed',
        'CRITICAL_DATABASE_ERROR',
        500,
        {
          transactionId,
          originalError: error.message,
          rollbackError: rollbackError.message
        }
      );
    }

    // Re-throw the original error after successful rollback
    throw handleTransactionError(error, transactionId);
  }
};

/**
 * Execute multiple operations in a single transaction
 * @param {Array} operations - Array of functions to execute
 * @param {Object} options - Transaction options
 * @returns {Promise<Array>} - Array of results
 */
const withBatchTransaction = async (operations, options = {}) => {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new AppError(
      'Operations array is required and must not be empty',
      'INVALID_BATCH_OPERATIONS',
      400
    );
  }

  return withTransaction(async (transaction) => {
    const results = [];
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      if (typeof operation !== 'function') {
        throw new AppError(
          `Operation at index ${i} is not a function`,
          'INVALID_OPERATION_TYPE',
          400
        );
      }

      try {
        const result = await operation(transaction);
        results.push(result);
      } catch (error) {
        logger.error(`Batch operation ${i} failed`, {
          operationIndex: i,
          error: error.message
        });
        
        throw new AppError(
          `Batch operation ${i} failed: ${error.message}`,
          'BATCH_OPERATION_FAILED',
          500,
          {
            operationIndex: i,
            originalError: error.message
          }
        );
      }
    }

    return results;
  }, options);
};

/**
 * Handle transaction-specific errors
 * @param {Error} error - Original error
 * @param {string} transactionId - Transaction identifier
 * @returns {AppError} - Formatted application error
 */
const handleTransactionError = (error, transactionId) => {
  // Handle Sequelize-specific errors
  if (error.name && error.name.startsWith('Sequelize')) {
    return handleSequelizeError(error, transactionId);
  }

  // Handle application errors
  if (error instanceof AppError) {
    error.details = { ...error.details, transactionId };
    return error;
  }

  // Handle generic errors
  return new AppError(
    `Transaction failed: ${error.message}`,
    'TRANSACTION_ERROR',
    500,
    {
      transactionId,
      originalError: error.message,
      errorType: error.constructor.name
    }
  );
};

/**
 * Handle Sequelize-specific errors within transactions
 * @param {Error} error - Sequelize error
 * @param {string} transactionId - Transaction identifier
 * @returns {AppError} - Formatted application error
 */
const handleSequelizeError = (error, transactionId) => {
  const baseDetails = { transactionId, sequelizeError: error.name };

  switch (error.name) {
    case 'SequelizeValidationError':
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value,
        type: err.type
      }));

      return new AppError(
        'Data validation failed during transaction',
        'TRANSACTION_VALIDATION_ERROR',
        400,
        {
          ...baseDetails,
          validationErrors
        }
      );

    case 'SequelizeUniqueConstraintError':
      const constraintField = error.errors[0]?.path || 'unknown';
      const constraintValue = error.errors[0]?.value || 'unknown';

      return new AppError(
        `Duplicate entry for ${constraintField}: ${constraintValue}`,
        'TRANSACTION_CONSTRAINT_ERROR',
        409,
        {
          ...baseDetails,
          field: constraintField,
          value: constraintValue,
          constraint: error.parent?.constraint
        }
      );

    case 'SequelizeForeignKeyConstraintError':
      return new AppError(
        'Foreign key constraint violation during transaction',
        'TRANSACTION_FOREIGN_KEY_ERROR',
        400,
        {
          ...baseDetails,
          table: error.table,
          constraint: error.index,
          fields: error.fields
        }
      );

    case 'SequelizeTimeoutError':
      return new AppError(
        'Transaction timed out',
        'TRANSACTION_TIMEOUT_ERROR',
        408,
        {
          ...baseDetails,
          timeout: error.parent?.timeout
        }
      );

    case 'SequelizeConnectionError':
      return new AppError(
        'Database connection lost during transaction',
        'TRANSACTION_CONNECTION_ERROR',
        503,
        baseDetails
      );

    case 'SequelizeDatabaseError':
      // Check for specific database errors
      const sqlMessage = error.parent?.sqlMessage || error.message;
      
      if (sqlMessage.includes('Deadlock')) {
        return new AppError(
          'Database deadlock detected during transaction',
          'TRANSACTION_DEADLOCK_ERROR',
          409,
          {
            ...baseDetails,
            sqlState: error.parent?.sqlState,
            errno: error.parent?.errno
          }
        );
      }

      if (sqlMessage.includes('Lock wait timeout')) {
        return new AppError(
          'Lock wait timeout during transaction',
          'TRANSACTION_LOCK_TIMEOUT_ERROR',
          408,
          {
            ...baseDetails,
            sqlState: error.parent?.sqlState,
            errno: error.parent?.errno
          }
        );
      }

      return new AppError(
        'Database error during transaction',
        'TRANSACTION_DATABASE_ERROR',
        500,
        {
          ...baseDetails,
          sqlMessage,
          sqlState: error.parent?.sqlState,
          errno: error.parent?.errno
        }
      );

    default:
      return new AppError(
        `Sequelize error during transaction: ${error.message}`,
        'TRANSACTION_SEQUELIZE_ERROR',
        500,
        baseDetails
      );
  }
};

/**
 * Generate unique transaction identifier
 * @returns {string} - Unique transaction ID
 */
const generateTransactionId = () => {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Retry transaction with exponential backoff for recoverable errors
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of successful operation
 */
const retryTransaction = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    retryableErrors = ['TRANSACTION_DEADLOCK_ERROR', 'TRANSACTION_LOCK_TIMEOUT_ERROR']
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(operation, options);
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (attempt === maxRetries || !retryableErrors.includes(error.code)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(backoffFactor, attempt);
      
      logger.warn(`Transaction attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: error.message,
        code: error.code,
        attempt: attempt + 1,
        maxRetries
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Execute operation with read-only transaction
 * @param {Function} operation - Read operation to execute
 * @param {Object} options - Transaction options
 * @returns {Promise} - Result of the operation
 */
const withReadOnlyTransaction = async (operation, options = {}) => {
  return withTransaction(operation, {
    ...options,
    readOnly: true,
    isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });
};

/**
 * Health check for database transactions
 * @returns {Promise<Object>} - Health check result
 */
const checkTransactionHealth = async () => {
  const startTime = Date.now();
  
  try {
    await withTransaction(async (transaction) => {
      // Simple test query
      await sequelize.query('SELECT 1 as test', { transaction });
      return true;
    });

    return {
      healthy: true,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  withTransaction,
  withBatchTransaction,
  retryTransaction,
  withReadOnlyTransaction,
  checkTransactionHealth,
  handleTransactionError,
  generateTransactionId
};