const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireStaff } = require('../middleware/rbac');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFacultyToSubject,
  removeFacultyFromSubject,
  getSubjectsBySemester
} = require('../controllers/subjectsController');

/**
 * Subjects Routes
 * Read operations require staff authentication (faculty, tutor, admin)
 * Write operations require admin authentication
 */

// Get all subjects (accessible by all staff)
router.get('/', authenticateToken, requireStaff, getAllSubjects);

// Get subjects by semester (accessible by all staff)
router.get('/semester/:semester', authenticateToken, requireStaff, getSubjectsBySemester);

// Get subject by ID (accessible by all staff)
router.get('/:subjectId', authenticateToken, requireStaff, getSubjectById);

// Create new subject (admin only)
router.post('/', authenticateToken, requireAdmin, createSubject);

// Update subject (admin only)
router.put('/:subjectId', authenticateToken, requireAdmin, updateSubject);

// Delete subject (admin only)
router.delete('/:subjectId', authenticateToken, requireAdmin, deleteSubject);

// Assign faculty to subject (admin only)
router.post('/:subjectId/assign-faculty', authenticateToken, requireAdmin, assignFacultyToSubject);

// Remove faculty assignment from subject (admin only)
router.delete('/:subjectId/faculty/:facultyId', authenticateToken, requireAdmin, removeFacultyFromSubject);

module.exports = router;