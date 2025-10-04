const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
  getFacultyDashboard,
  getFacultySubjects,
  getSubjectStudents,
  getAtRiskStudents
} = require('../controllers/facultyController');

/**
 * Faculty Routes
 * All routes require faculty, tutor, or admin authentication
 */

/**
 * @route   GET /api/faculty/dashboard
 * @desc    Get faculty dashboard data
 * @access  Private (Faculty, Tutor, Admin)
 */
router.get('/dashboard',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  getFacultyDashboard
);

/**
 * @route   GET /api/faculty/subjects
 * @desc    Get subjects assigned to faculty
 * @access  Private (Faculty, Tutor, Admin)
 */
router.get('/subjects',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  getFacultySubjects
);

/**
 * @route   GET /api/faculty/subjects/:subjectId/students
 * @desc    Get students enrolled in a specific subject
 * @access  Private (Faculty, Tutor, Admin)
 */
router.get('/subjects/:subjectId/students',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  getSubjectStudents
);

/**
 * @route   GET /api/faculty/at-risk-students
 * @desc    Get students at risk of failing in faculty's subjects
 * @access  Private (Faculty, Tutor, Admin)
 */
router.get('/at-risk-students',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  getAtRiskStudents
);

module.exports = router;