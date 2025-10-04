const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  getNotificationStats,
  getRecentNotifications,
  markNotificationAsRead,
  markMultipleAsRead,
  sendSystemAnnouncement,
  sendSubjectAnnouncement,
  checkAndSendAttendanceAlerts,
  checkAndSendAtRiskAlerts,
  cleanupOldNotifications
} = require('../controllers/notificationController');

const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * Notification Routes
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for authenticated user with pagination
 * @access  Private (All authenticated users)
 * @query   page, limit, unread_only, notification_type
 */
router.get('/', getUserNotifications);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics for authenticated user
 * @access  Private (All authenticated users)
 */
router.get('/stats', getNotificationStats);

/**
 * @route   GET /api/notifications/recent
 * @desc    Get recent notifications for dashboard
 * @access  Private (All authenticated users)
 * @query   limit
 */
router.get('/recent', getRecentNotifications);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark specific notification as read
 * @access  Private (All authenticated users)
 */
router.put('/:id/read', markNotificationAsRead);

/**
 * @route   PUT /api/notifications/mark-read
 * @desc    Mark multiple notifications as read
 * @access  Private (All authenticated users)
 * @body    { notification_ids: [1, 2, 3] }
 */
router.put('/mark-read', markMultipleAsRead);

/**
 * @route   POST /api/notifications/system-announcement
 * @desc    Send system-wide announcement
 * @access  Private (Admin only)
 * @body    { title, message, recipient_ids? }
 */
router.post('/system-announcement', 
  requireRole(['admin']),
  rateLimiter.createLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 announcements per 15 minutes
  sendSystemAnnouncement
);

/**
 * @route   POST /api/notifications/subject-announcement
 * @desc    Send announcement to students in a specific subject
 * @access  Private (Faculty only)
 * @body    { subject_id, title, message, academic_year? }
 */
router.post('/subject-announcement',
  requireRole(['faculty', 'tutor']),
  rateLimiter.createLimiter({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 announcements per 15 minutes
  sendSubjectAnnouncement
);

/**
 * @route   POST /api/notifications/check-attendance-alerts
 * @desc    Check and send low attendance alerts to students
 * @access  Private (Admin and Faculty)
 * @body    { threshold?, subject_id? }
 */
router.post('/check-attendance-alerts',
  requireRole(['admin', 'faculty', 'tutor']),
  rateLimiter.createLimiter({ windowMs: 60 * 60 * 1000, max: 5 }), // 5 checks per hour
  checkAndSendAttendanceAlerts
);

/**
 * @route   POST /api/notifications/check-at-risk-alerts
 * @desc    Check and send at-risk student alerts to faculty
 * @access  Private (Admin only)
 * @body    { academic_year? }
 */
router.post('/check-at-risk-alerts',
  requireRole(['admin']),
  rateLimiter.createLimiter({ windowMs: 60 * 60 * 1000, max: 3 }), // 3 checks per hour
  checkAndSendAtRiskAlerts
);

/**
 * @route   DELETE /api/notifications/cleanup
 * @desc    Delete old read notifications (cleanup)
 * @access  Private (Admin only)
 * @body    { days_old? }
 */
router.delete('/cleanup',
  requireRole(['admin']),
  rateLimiter.createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 2 }), // 2 cleanups per day
  cleanupOldNotifications
);

module.exports = router;