const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadProfilePhoto,
  upload,
  getFacultySubjectAssignments,
  assignFacultyToSubject,
  removeFacultyAssignment,
  getStudentEnrollments,
  enrollStudentInSubject,
  removeStudentEnrollment,
  enrollStudentInSemester,
  promoteStudents,
  getEnrollmentStatistics
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireStaff } = require('../middleware/rbac');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Faculty-Subject Assignment Management (Admin only)
 * Note: These specific routes must come before parameterized routes
 */

// GET /api/users/faculty/assignments - Get all faculty-subject assignments
router.get('/faculty/assignments', requireAdmin, getFacultySubjectAssignments);

// POST /api/users/faculty/assign - Assign faculty to subject
router.post('/faculty/assign', requireAdmin, assignFacultyToSubject);

// DELETE /api/users/faculty/:facultyId/subjects/:subjectId - Remove faculty assignment
router.delete('/faculty/:facultyId/subjects/:subjectId', requireAdmin, removeFacultyAssignment);

/**
 * Student Enrollment Management (Admin only)
 */

// GET /api/users/students/enrollments - Get all student enrollments
router.get('/students/enrollments', requireAdmin, getStudentEnrollments);

// POST /api/users/students/enroll - Enroll student in subject
router.post('/students/enroll', requireAdmin, enrollStudentInSubject);

// POST /api/users/students/enroll-semester - Enroll student in semester subjects
router.post('/students/enroll-semester', requireAdmin, enrollStudentInSemester);

// DELETE /api/users/students/:studentId/subjects/:subjectId - Remove student enrollment
router.delete('/students/:studentId/subjects/:subjectId', requireAdmin, removeStudentEnrollment);

// POST /api/users/students/promote - Promote students to next semester
router.post('/students/promote', requireAdmin, promoteStudents);

// GET /api/users/students/statistics - Get enrollment statistics
router.get('/students/statistics', requireAdmin, getEnrollmentStatistics);

/**
 * User CRUD Operations (Admin only)
 */

// GET /api/users - Get all users with pagination and filtering
router.get('/', requireAdmin, getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', requireStaff, getUserById);

// POST /api/users - Create new user
router.post('/', requireAdmin, createUser);

// PUT /api/users/:id - Update user
router.put('/:id', requireAdmin, updateUser);

// DELETE /api/users/:id - Delete user
router.delete('/:id', requireAdmin, deleteUser);

/**
 * Profile Management
 */

// POST /api/users/:id/photo - Upload profile photo
router.post('/:id/photo', upload.single('profilePhoto'), uploadProfilePhoto);

module.exports = router;