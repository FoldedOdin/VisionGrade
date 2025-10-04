const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate limiting middleware configurations with enhanced security logging
 */

/**
 * Enhanced rate limit handler with security logging
 */
const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  return res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    }
  });
};

/**
 * Enhanced auth rate limit handler
 */
const authRateLimitHandler = (req, res) => {
  logger.warn('Authentication rate limit exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    severity: 'HIGH' // Mark as high severity for security monitoring
  });

  return res.status(429).json({
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again in 15 minutes.',
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    }
  });
};

/**
 * General API rate limiter with enhanced security
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Use env variable or default to 1000 for development
  handler: rateLimitHandler,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP + User-Agent for more specific rate limiting
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});

/**
 * Strict rate limiter for authentication endpoints with enhanced security
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 200, // Use env variable or default to 200 for development
  handler: authRateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // More restrictive key generation for auth endpoints
    return `auth-${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts, please try again in 1 hour.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration rate limiter
 */
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (reduced for development)
  max: 10, // Increased to 10 attempts per 15 minutes for development
  message: {
    success: false,
    error: {
      code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts, please try again in 15 minutes.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create a custom rate limiter with specified options
 */
const createLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default 15 minutes
    max: options.max || 100, // Default 100 requests
    message: options.message || {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options // Allow overriding any other options
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  createLimiter
};