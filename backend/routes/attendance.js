const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireFaculty } = require('../middleware/rbac');
const {
  getAttendanceBySubject,
  addOrUpdateAttendance,
  bulkUpdateAttendance,
  getStudentAttendance,
  getStudentsWithLowAttendance,
  getAttendanceStatistics
} = require('../controllers/attendanceController');

/**
 * Attendance Routes
 * All routes require faculty authentication
 */

// Get attendance for a specific subject
router.get('/subject/:subjectId', authenticateToken, requireFaculty, getAttendanceBySubject);

// Add or update attendance for a student
router.post('/', authenticateToken, requireFaculty, addOrUpdateAttendance);

// Bulk update attendance for multiple students
router.post('/bulk', authenticateToken, requireFaculty, bulkUpdateAttendance);

// Get attendance for a specific student (faculty's subjects only)
router.get('/student/:studentId', authenticateToken, requireFaculty, getStudentAttendance);

// Get students with low attendance
router.get('/low-attendance', authenticateToken, requireFaculty, getStudentsWithLowAttendance);

// Get attendance statistics for faculty's subjects
router.get('/statistics', authenticateToken, requireFaculty, getAttendanceStatistics);

module.exports = router;