const express = require('express');
const router = express.Router();

// Import controllers and middleware
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  authLimiter,
  passwordResetLimiter,
  registrationLimiter
} = require('../middleware/rateLimiter');
const { 
  auditAuth,
  auditUserManagement,
  SENSITIVE_OPERATIONS
} = require('../middleware/auditLogger');
const { validateFileUpload } = require('../middleware/security');
const { 
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  createAdminSchema
} = require('../utils/validation');

/**
 * Authentication Routes
 * All routes for user authentication and profile management
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register new user with auto-ID generation
 * @access  Public
 */
router.post('/register', 
  registrationLimiter,
  validate(registerSchema),
  auditUserManagement(SENSITIVE_OPERATIONS.USER_CREATE),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with multi-channel support (ID, email, phone)
 * @access  Public
 */
router.post('/login',
  authLimiter,
  validate(loginSchema),
  auditAuth(SENSITIVE_OPERATIONS.LOGIN),
  authController.login
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email/SMS
 * @access  Public
 */
router.post('/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  auditAuth(SENSITIVE_OPERATIONS.PASSWORD_RESET),
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post('/change-password',
  authenticateToken,
  validate(changePasswordSchema),
  auditAuth(SENSITIVE_OPERATIONS.PASSWORD_CHANGE),
  authController.changePassword
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile',
  authenticateToken,
  authController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  validateFileUpload, // For profile photo uploads
  validate(updateProfileSchema),
  auditUserManagement(SENSITIVE_OPERATIONS.USER_UPDATE),
  authController.updateProfile
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  (req, res) => {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the token. Server-side logout would require token blacklisting.
    res.json({
      success: true,
      message: 'Logged out successfully. Please remove the token from client storage.',
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * @route   POST /api/auth/create-admin
 * @desc    Create administrator account (admin-only)
 * @access  Private (Admin only)
 */
router.post('/create-admin',
  authenticateToken,
  registrationLimiter,
  validate(createAdminSchema),
  auditUserManagement(SENSITIVE_OPERATIONS.ADMIN_CREATE),
  authController.createAdmin
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private
 */
router.get('/verify',
  authenticateToken,
  (req, res) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user.id,
          unique_id: req.user.unique_id,
          email: req.user.email,
          role: req.user.role
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;