const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const xss = require('xss');
const logger = require('../utils/logger');
const securityMonitoringService = require('../services/securityMonitoringService');

/**
 * Input Sanitization Middleware
 * Sanitizes all user inputs to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    return res.status(400).json({
      success: false,
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Invalid input data format',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key name
      const cleanKey = sanitizeString(key);
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove XSS attempts
  let sanitized = xss(str, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });

  // Additional sanitization
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();

  return sanitized;
};

/**
 * SQL Injection Prevention Middleware
 * Validates input patterns that could indicate SQL injection attempts
 */
const preventSQLInjection = async (req, res, next) => {
  try {
    const suspiciousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\()/gi,
      /(\b(CAST|CONVERT|SUBSTRING|ASCII|CHAR_LENGTH)\s*\()/gi
    ];

    const checkForSQLInjection = async (obj, path = '') => {
      if (typeof obj === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(obj)) {
            logger.warn('Potential SQL injection attempt detected', {
              path,
              value: obj.substring(0, 100),
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              url: req.originalUrl
            });

            // Record security event
            await securityMonitoringService.recordSecurityEvent('sql_injection_attempts', {
              path,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              url: req.originalUrl,
              pattern: pattern.toString()
            });

            throw new Error('SUSPICIOUS_INPUT');
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          await checkForSQLInjection(value, path ? `${path}.${key}` : key);
        }
      }
    };

    // Check all input sources
    await checkForSQLInjection(req.body, 'body');
    await checkForSQLInjection(req.query, 'query');
    await checkForSQLInjection(req.params, 'params');

    next();
  } catch (error) {
    if (error.message === 'SUSPICIOUS_INPUT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Input contains invalid characters',
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.error('SQL injection prevention error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SECURITY_CHECK_ERROR',
        message: 'Security validation failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Enhanced Security Headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * File Upload Security Validation
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  try {
    const files = req.files || [req.file];
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const maxFiles = 10;

    if (files.length > maxFiles) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: `Maximum ${maxFiles} files allowed`,
          timestamp: new Date().toISOString()
        }
      });
    }

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 5MB limit',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        logger.warn('Unauthorized file type upload attempt', {
          filename: file.originalname,
          mimetype: file.mimetype,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not allowed',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check filename for suspicious patterns
      const suspiciousFilePatterns = [
        /\.(php|jsp|asp|aspx|exe|bat|cmd|sh|ps1)$/i,
        /\.\./,
        /[<>:"|?*]/,
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
      ];

      for (const pattern of suspiciousFilePatterns) {
        if (pattern.test(file.originalname)) {
          logger.warn('Suspicious filename detected', {
            filename: file.originalname,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILENAME',
              message: 'Invalid filename',
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      // Sanitize filename
      file.originalname = sanitizeFilename(file.originalname);
    }

    next();
  } catch (error) {
    logger.error('File validation error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FILE_VALIDATION_ERROR',
        message: 'File validation failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 255);
};

/**
 * Request size limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      success: false,
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: 'Request size exceeds limit',
        timestamp: new Date().toISOString()
      }
    });
  }

  next();
};

module.exports = {
  sanitizeInput,
  preventSQLInjection,
  securityHeaders,
  validateFileUpload,
  requestSizeLimiter,
  sanitizeString,
  sanitizeObject
};