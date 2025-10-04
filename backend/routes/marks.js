const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireFaculty } = require('../middleware/rbac');
const { 
  auditAcademicData,
  SENSITIVE_OPERATIONS
} = require('../middleware/auditLogger');
const {
  getMarksBySubject,
  addOrUpdateMarks,
  bulkAddOrUpdateMarks,
  getStudentMarks,
  deleteMarks,
  getPerformanceStatistics
} = require('../controllers/marksController');

/**
 * Marks Routes
 * All routes require faculty authentication
 */

// Get marks for a specific subject
router.get('/subject/:subjectId', authenticateToken, requireFaculty, getMarksBySubject);

// Add or update marks for a student
router.post('/', 
  authenticateToken, 
  requireFaculty, 
  auditAcademicData(SENSITIVE_OPERATIONS.MARKS_CREATE),
  addOrUpdateMarks
);

// Bulk add/update marks for multiple students
router.post('/bulk', 
  authenticateToken, 
  requireFaculty, 
  auditAcademicData(SENSITIVE_OPERATIONS.MARKS_CREATE),
  bulkAddOrUpdateMarks
);

// Get marks for a specific student (faculty's subjects only)
router.get('/student/:studentId', authenticateToken, requireFaculty, getStudentMarks);

// Delete marks entry
router.delete('/:markId', 
  authenticateToken, 
  requireFaculty, 
  auditAcademicData(SENSITIVE_OPERATIONS.MARKS_DELETE),
  deleteMarks
);

// Get performance statistics for faculty's subjects
router.get('/statistics', authenticateToken, requireFaculty, getPerformanceStatistics);

module.exports = router;