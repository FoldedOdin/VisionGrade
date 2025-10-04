const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Apply authentication and admin role check to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// User management routes
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Tutor assignment routes
router.get('/tutors', adminController.getTutors);
router.post('/tutors/assign', adminController.assignTutor);
router.delete('/tutors/unassign/:facultyId', adminController.unassignTutor);

// Subject management routes
router.get('/subjects', adminController.getAllSubjects);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

// Faculty-Subject assignment routes
router.get('/faculty-assignments', adminController.getFacultyAssignments);
router.post('/faculty-assignments', adminController.assignSubjectsToFaculty);
router.delete('/faculty-assignments/:facultyId/:subjectId', adminController.removeSubjectAssignment);

// System announcements
router.post('/announcements', adminController.createSystemAnnouncement);

// Student promotion and graduation
router.post('/promote-students', adminController.promoteStudents);
router.post('/graduate-students', adminController.graduateStudents);

// Dashboard data
router.get('/dashboard', adminController.getDashboardData);

module.exports = router;