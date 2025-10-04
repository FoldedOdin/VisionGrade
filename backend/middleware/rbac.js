/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if user has required role(s) to access resource
 */

/**
 * Check if user has required role
 * @param {string|Array} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const userRole = req.user.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'RBAC_ERROR',
          message: 'Role verification failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Check if user is faculty or tutor
 */
const requireFaculty = requireRole(['faculty', 'tutor']);

/**
 * Check if user is student
 */
const requireStudent = requireRole('student');

/**
 * Check if user is faculty, tutor, or admin
 */
const requireStaff = requireRole(['faculty', 'tutor', 'admin']);

module.exports = {
  requireRole,
  requireAdmin,
  requireFaculty,
  requireStudent,
  requireStaff
};