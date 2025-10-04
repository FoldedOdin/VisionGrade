const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

/**
 * Student Routes
 * All routes require authentication and student role
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply RBAC middleware for student role
router.use(requireRole(['student']));

/**
 * @route   GET /api/students/dashboard
 * @desc    Get student dashboard data
 * @access  Private (Student only)
 */
router.get('/dashboard', studentController.getDashboard);

/**
 * @route   GET /api/students/marks
 * @desc    Get all marks for the student
 * @access  Private (Student only)
 */
router.get('/marks', studentController.getMarks);

/**
 * @route   GET /api/students/attendance
 * @desc    Get attendance data for the student
 * @access  Private (Student only)
 */
router.get('/attendance', studentController.getAttendance);

/**
 * @route   GET /api/students/predictions
 * @desc    Get ML predictions for the student
 * @access  Private (Student only)
 */
router.get('/predictions', studentController.getPredictions);

/**
 * @route   GET /api/students/notifications
 * @desc    Get notifications for the student
 * @access  Private (Student only)
 * @query   page, limit, type
 */
router.get('/notifications', studentController.getNotifications);

/**
 * @route   GET /api/students/notifications/count
 * @desc    Get unread notifications count
 * @access  Private (Student only)
 */
router.get('/notifications/count', studentController.getNotificationCount);

/**
 * @route   PUT /api/students/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (Student only)
 */
router.put('/notifications/:notificationId/read', studentController.markNotificationRead);

/**
 * @route   POST /api/students/report-card
 * @desc    Generate and download report card
 * @access  Private (Student only)
 */
router.post('/report-card', [
    body('format')
        .optional()
        .isIn(['pdf', 'doc'])
        .withMessage('Format must be either pdf or doc')
], studentController.generateReportCard);

/**
 * @route   GET /api/students/profile
 * @desc    Get student profile
 * @access  Private (Student only)
 */
router.get('/profile', studentController.getProfile);

module.exports = router;