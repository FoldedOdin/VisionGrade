const logger = require('../utils/logger');
const { User } = require('../models');

/**
 * Audit Logging Middleware for Sensitive Operations
 * Logs all sensitive operations for security monitoring and compliance
 */

/**
 * Sensitive operations that require audit logging
 */
const SENSITIVE_OPERATIONS = {
  // Authentication operations
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  ACCOUNT_LOCKOUT: 'ACCOUNT_LOCKOUT',
  
  // User management operations
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  ADMIN_CREATE: 'ADMIN_CREATE',
  
  // Academic data operations
  MARKS_CREATE: 'MARKS_CREATE',
  MARKS_UPDATE: 'MARKS_UPDATE',
  MARKS_DELETE: 'MARKS_DELETE',
  ATTENDANCE_UPDATE: 'ATTENDANCE_UPDATE',
  
  // Administrative operations
  SYSTEM_CONFIG_CHANGE: 'SYSTEM_CONFIG_CHANGE',
  BULK_OPERATION: 'BULK_OPERATION',
  DATA_EXPORT: 'DATA_EXPORT',
  STUDENT_PROMOTION: 'STUDENT_PROMOTION',
  
  // Security events
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SESSION_HIJACK: 'SESSION_HIJACK'
};

/**
 * Audit log levels
 */
const AUDIT_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Create audit log entry
 */
const createAuditLog = (operation, level, details, req, user = null) => {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    operation,
    level,
    userId: user?.id || req?.user?.id || null,
    userRole: user?.role || req?.user?.role || null,
    ip: req?.ip || 'unknown',
    userAgent: req?.get('User-Agent') || 'unknown',
    url: req?.originalUrl || 'unknown',
    method: req?.method || 'unknown',
    sessionId: req?.sessionData?.sessionId?.substring(0, 8) + '...' || null,
    details: {
      ...details,
      // Sanitize sensitive data
      ...(details.password && { password: '[REDACTED]' }),
      ...(details.token && { token: '[REDACTED]' }),
      ...(details.oldPassword && { oldPassword: '[REDACTED]' }),
      ...(details.newPassword && { newPassword: '[REDACTED]' })
    }
  };

  // Log to appropriate level
  switch (level) {
    case AUDIT_LEVELS.CRITICAL:
      logger.error('AUDIT_CRITICAL', auditEntry);
      break;
    case AUDIT_LEVELS.ERROR:
      logger.error('AUDIT_ERROR', auditEntry);
      break;
    case AUDIT_LEVELS.WARNING:
      logger.warn('AUDIT_WARNING', auditEntry);
      break;
    default:
      logger.info('AUDIT_INFO', auditEntry);
  }

  return auditEntry;
};

/**
 * Audit middleware for authentication operations
 */
const auditAuth = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (operation === SENSITIVE_OPERATIONS.LOGIN) {
          if (responseData.success) {
            createAuditLog(
              SENSITIVE_OPERATIONS.LOGIN,
              AUDIT_LEVELS.INFO,
              {
                loginMethod: req.body.loginMethod || 'unknown',
                identifier: req.body.identifier || 'unknown',
                success: true
              },
              req
            );
          } else {
            createAuditLog(
              SENSITIVE_OPERATIONS.LOGIN,
              AUDIT_LEVELS.WARNING,
              {
                loginMethod: req.body.loginMethod || 'unknown',
                identifier: req.body.identifier || 'unknown',
                success: false,
                errorCode: responseData.error?.code || 'unknown'
              },
              req
            );
          }
        }
        
        if (operation === SENSITIVE_OPERATIONS.PASSWORD_RESET) {
          createAuditLog(
            SENSITIVE_OPERATIONS.PASSWORD_RESET,
            responseData.success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.WARNING,
            {
              identifier: req.body.identifier || 'unknown',
              success: responseData.success
            },
            req
          );
        }
      } catch (error) {
        logger.error('Audit logging error:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Audit middleware for user management operations
 */
const auditUserManagement = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        
        let auditDetails = {
          success: responseData.success,
          targetUserId: req.params.id || req.body.userId || null
        };

        if (operation === SENSITIVE_OPERATIONS.USER_CREATE) {
          auditDetails = {
            ...auditDetails,
            newUserRole: req.body.role,
            newUserEmail: req.body.email
          };
        }

        if (operation === SENSITIVE_OPERATIONS.USER_UPDATE) {
          auditDetails = {
            ...auditDetails,
            updatedFields: Object.keys(req.body || {})
          };
        }

        if (operation === SENSITIVE_OPERATIONS.ROLE_CHANGE) {
          auditDetails = {
            ...auditDetails,
            oldRole: req.body.oldRole,
            newRole: req.body.newRole
          };
        }

        createAuditLog(
          operation,
          responseData.success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.WARNING,
          auditDetails,
          req
        );
      } catch (error) {
        logger.error('User management audit error:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Audit middleware for academic data operations
 */
const auditAcademicData = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        
        let auditDetails = {
          success: responseData.success,
          studentId: req.body.studentId || req.params.studentId || null,
          subjectId: req.body.subjectId || req.params.subjectId || null
        };

        if (operation === SENSITIVE_OPERATIONS.MARKS_CREATE || 
            operation === SENSITIVE_OPERATIONS.MARKS_UPDATE) {
          auditDetails = {
            ...auditDetails,
            examType: req.body.examType,
            marksObtained: req.body.marksObtained,
            maxMarks: req.body.maxMarks
          };
        }

        if (operation === SENSITIVE_OPERATIONS.ATTENDANCE_UPDATE) {
          auditDetails = {
            ...auditDetails,
            totalClasses: req.body.totalClasses,
            attendedClasses: req.body.attendedClasses
          };
        }

        createAuditLog(
          operation,
          responseData.success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.WARNING,
          auditDetails,
          req
        );
      } catch (error) {
        logger.error('Academic data audit error:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Audit middleware for administrative operations
 */
const auditAdminOperations = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        
        let auditDetails = {
          success: responseData.success
        };

        if (operation === SENSITIVE_OPERATIONS.STUDENT_PROMOTION) {
          auditDetails = {
            ...auditDetails,
            studentsAffected: req.body.studentIds?.length || 0,
            fromSemester: req.body.fromSemester,
            toSemester: req.body.toSemester
          };
        }

        if (operation === SENSITIVE_OPERATIONS.BULK_OPERATION) {
          auditDetails = {
            ...auditDetails,
            operationType: req.body.operationType,
            recordsAffected: req.body.recordIds?.length || 0
          };
        }

        if (operation === SENSITIVE_OPERATIONS.DATA_EXPORT) {
          auditDetails = {
            ...auditDetails,
            exportType: req.body.exportType || req.query.type,
            filters: req.body.filters || req.query
          };
        }

        createAuditLog(
          operation,
          AUDIT_LEVELS.INFO,
          auditDetails,
          req
        );
      } catch (error) {
        logger.error('Admin operations audit error:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Audit security events
 */
const auditSecurityEvent = (operation, level, details, req, user = null) => {
  createAuditLog(operation, level, details, req, user);
};

/**
 * Middleware to audit unauthorized access attempts
 */
const auditUnauthorizedAccess = (req, res, next) => {
  const originalStatus = res.status;
  
  res.status = function(code) {
    if (code === 401 || code === 403) {
      createAuditLog(
        SENSITIVE_OPERATIONS.UNAUTHORIZED_ACCESS,
        AUDIT_LEVELS.WARNING,
        {
          statusCode: code,
          attemptedResource: req.originalUrl,
          hasToken: !!req.headers.authorization
        },
        req
      );
    }
    
    return originalStatus.call(this, code);
  };
  
  next();
};

/**
 * Get audit logs (for admin dashboard)
 */
const getAuditLogs = async (filters = {}) => {
  try {
    // This would typically query a dedicated audit log database/table
    // For now, we'll return a placeholder response
    return {
      success: true,
      message: 'Audit logs would be retrieved from dedicated audit storage',
      filters
    };
  } catch (error) {
    logger.error('Error retrieving audit logs:', error);
    throw error;
  }
};

module.exports = {
  SENSITIVE_OPERATIONS,
  AUDIT_LEVELS,
  createAuditLog,
  auditAuth,
  auditUserManagement,
  auditAcademicData,
  auditAdminOperations,
  auditSecurityEvent,
  auditUnauthorizedAccess,
  getAuditLogs
};