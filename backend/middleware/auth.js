const jwt = require('jsonwebtoken');
const { User } = require('../models');
const cacheService = require('../services/cacheService');

/**
 * JWT Authentication Middleware with enhanced security and error handling
 * Verifies JWT token and attaches user to request object
 */
const authenticateToken = async (req, res, next) => {
  const logger = require('../utils/logger');
  
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Enhanced token validation
    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate token format
    if (!token.match(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)) {
      logger.warn('Invalid token format', {
        ip: req.ip,
        tokenPrefix: token.substring(0, 10) + '...'
      });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid authentication token format',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify token with enhanced error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      logger.warn('JWT verification failed', {
        error: jwtError.name,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (jwtError.name === 'NotBeforeError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_NOT_ACTIVE',
            message: 'Authentication token not yet active',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Generic JWT error
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_VERIFICATION_FAILED',
          message: 'Authentication token verification failed',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate token payload
    if (!decoded.userId || typeof decoded.userId !== 'number') {
      logger.warn('Invalid token payload', {
        payload: decoded,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_PAYLOAD',
          message: 'Invalid authentication token payload',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Try to get user from cache first
    let user = await cacheService.getUser(decoded.userId);
    
    if (!user) {
      // Get user from database with role-specific data
      user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password_hash'] },
        include: [
          {
            model: require('../models').Student,
            as: 'studentProfile',
            required: false
          },
          {
            model: require('../models').Faculty,
            as: 'facultyProfile',
            required: false
          }
        ]
      });

      // Cache user data for future requests
      if (user) {
        await cacheService.setUser(decoded.userId, user.toJSON());
      }
    }

    if (!user) {
      logger.warn('User not found for valid token', {
        userId: decoded.userId,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user account is active (if you have account status)
    // if (user.status === 'inactive' || user.status === 'suspended') {
    //   logger.warn('Inactive user attempted access', {
    //     userId: user.id,
    //     status: user.status,
    //     ip: req.ip
    //   });
    //   
    //   return res.status(403).json({
    //     success: false,
    //     error: {
    //       code: 'ACCOUNT_INACTIVE',
    //       message: 'Account is inactive',
    //       timestamp: new Date().toISOString()
    //     }
    //   });
    // }

    // Attach user to request with additional role-specific IDs
    req.user = user;
    
    // Add convenience properties for role-specific IDs
    if (user.studentProfile) {
      req.user.studentId = user.studentProfile.id;
    }
    if (user.facultyProfile) {
      req.user.facultyId = user.facultyProfile.id;
    }

    // Log successful authentication (optional, for audit trail)
    logger.info('Successful authentication', {
      userId: user.id,
      role: user.role,
      ip: req.ip,
      url: req.originalUrl
    });

    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service temporarily unavailable',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = { authenticateToken };