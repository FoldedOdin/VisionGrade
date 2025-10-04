const { Subject, Faculty, FacultySubject, Student, StudentSubject, User } = require('../models');
const { validateSubjectCreation, validateSubjectUpdate, validateFacultyAssignment } = require('../utils/validation');

/**
 * Subjects Controller
 * Handles subject management for administrators
 */

/**
 * Get all subjects
 * GET /api/subjects
 */
const getAllSubjects = async (req, res) => {
  try {
    const { semester, subject_type, academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    // Build where clause
    const whereClause = {};
    if (semester) {
      whereClause.semester = parseInt(semester);
    }
    if (subject_type) {
      whereClause.subject_type = subject_type;
    }

    const subjects = await Subject.findAll({
      where: whereClause,
      include: [
        {
          model: FacultySubject,
          as: 'facultyAssignments',
          where: { academic_year: currentYear },
          required: false,
          include: [{
            model: Faculty,
            as: 'faculty',
            include: [{
              model: User,
              as: 'user',
              attributes: ['unique_id', 'email']
            }]
          }]
        }
      ],
      order: [
        ['semester', 'ASC'],
        ['subject_type', 'ASC'],
        ['subject_name', 'ASC']
      ]
    });

    // Format response with faculty assignments
    const formattedSubjects = subjects.map(subject => ({
      id: subject.id,
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      subject_type: subject.subject_type,
      semester: subject.semester,
      credits: subject.credits,
      assigned_faculty: subject.facultyAssignments.map(assignment => ({
        faculty_id: assignment.faculty.id,
        faculty_name: assignment.faculty.faculty_name,
        department: assignment.faculty.department,
        user: assignment.faculty.user
      }))
    }));

    res.json({
      success: true,
      data: {
        subjects: formattedSubjects,
        total_subjects: formattedSubjects.length,
        filters: {
          semester: semester || 'all',
          subject_type: subject_type || 'all',
          academic_year: currentYear
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get all subjects error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_SUBJECTS_ERROR',
        message: 'Failed to fetch subjects',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get subject by ID
 * GET /api/subjects/:subjectId
 */
const getSubjectById = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    const subject = await Subject.findByPk(subjectId, {
      include: [
        {
          model: FacultySubject,
          as: 'facultyAssignments',
          where: { academic_year: currentYear },
          required: false,
          include: [{
            model: Faculty,
            as: 'faculty',
            include: [{
              model: User,
              as: 'user',
              attributes: ['unique_id', 'email']
            }]
          }]
        },
        {
          model: StudentSubject,
          as: 'studentEnrollments',
          where: { academic_year: currentYear },
          required: false,
          include: [{
            model: Student,
            as: 'student',
            include: [{
              model: User,
              as: 'user',
              attributes: ['unique_id', 'email']
            }]
          }]
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBJECT_NOT_FOUND',
          message: 'Subject not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get subject statistics
    const statistics = await subject.getSubjectStatistics(currentYear);

    res.json({
      success: true,
      data: {
        subject: {
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          subject_type: subject.subject_type,
          semester: subject.semester,
          credits: subject.credits
        },
        assigned_faculty: subject.facultyAssignments.map(assignment => ({
          faculty_id: assignment.faculty.id,
          faculty_name: assignment.faculty.faculty_name,
          department: assignment.faculty.department,
          user: assignment.faculty.user
        })),
        enrolled_students: subject.studentEnrollments.map(enrollment => ({
          student_id: enrollment.student.id,
          student_name: enrollment.student.student_name,
          semester: enrollment.student.semester,
          user: enrollment.student.user
        })),
        statistics,
        academic_year: currentYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get subject by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_SUBJECT_ERROR',
        message: 'Failed to fetch subject details',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Create new subject (Admin only)
 * POST /api/subjects
 */
const createSubject = async (req, res) => {
  try {
    const { error, value } = validateSubjectCreation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { subject_code, subject_name, subject_type, semester, credits } = value;

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({
      where: { subject_code }
    });

    if (existingSubject) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SUBJECT_CODE_EXISTS',
          message: 'Subject code already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    const subject = await Subject.create({
      subject_code,
      subject_name,
      subject_type,
      semester,
      credits
    });

    res.status(201).json({
      success: true,
      data: {
        subject: {
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          subject_type: subject.subject_type,
          semester: subject.semester,
          credits: subject.credits
        }
      },
      message: 'Subject created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_SUBJECT_ERROR',
        message: 'Failed to create subject',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Update subject (Admin only)
 * PUT /api/subjects/:subjectId
 */
const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { error, value } = validateSubjectUpdate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString()
        }
      });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBJECT_NOT_FOUND',
          message: 'Subject not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if subject code is being changed and if it already exists
    if (value.subject_code && value.subject_code !== subject.subject_code) {
      const existingSubject = await Subject.findOne({
        where: { 
          subject_code: value.subject_code,
          id: { [require('sequelize').Op.ne]: subjectId }
        }
      });

      if (existingSubject) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SUBJECT_CODE_EXISTS',
            message: 'Subject code already exists',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    await subject.update(value);

    res.json({
      success: true,
      data: {
        subject: {
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          subject_type: subject.subject_type,
          semester: subject.semester,
          credits: subject.credits
        }
      },
      message: 'Subject updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_SUBJECT_ERROR',
        message: 'Failed to update subject',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Delete subject (Admin only)
 * DELETE /api/subjects/:subjectId
 */
const deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBJECT_NOT_FOUND',
          message: 'Subject not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if subject has any associated data (marks, attendance, etc.)
    const hasMarks = await subject.getMarks({ limit: 1 });
    const hasAttendance = await subject.getAttendanceRecords({ limit: 1 });
    const hasEnrollments = await subject.getStudentEnrollments({ limit: 1 });

    if (hasMarks.length > 0 || hasAttendance.length > 0 || hasEnrollments.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SUBJECT_HAS_DATA',
          message: 'Cannot delete subject with existing academic data (marks, attendance, or enrollments)',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete faculty assignments first
    await FacultySubject.destroy({
      where: { subject_id: subjectId }
    });

    await subject.destroy();

    res.json({
      success: true,
      message: 'Subject deleted successfully',
      data: {
        deleted_subject: {
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_SUBJECT_ERROR',
        message: 'Failed to delete subject',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Assign faculty to subject (Admin only)
 * POST /api/subjects/:subjectId/assign-faculty
 */
const assignFacultyToSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { error, value } = validateFacultyAssignment(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { faculty_id, academic_year } = value;
    const currentYear = academic_year || new Date().getFullYear();

    // Check if subject exists
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBJECT_NOT_FOUND',
          message: 'Subject not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if faculty exists
    const faculty = await Faculty.findByPk(faculty_id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['unique_id', 'email']
      }]
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FACULTY_NOT_FOUND',
          message: 'Faculty not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Assign faculty to subject
    const { assignment, created } = await FacultySubject.assignFacultyToSubject(
      faculty_id,
      subjectId,
      currentYear
    );

    res.status(created ? 201 : 200).json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          faculty: {
            id: faculty.id,
            faculty_name: faculty.faculty_name,
            department: faculty.department,
            user: faculty.user
          },
          subject: {
            id: subject.id,
            subject_code: subject.subject_code,
            subject_name: subject.subject_name,
            subject_type: subject.subject_type,
            semester: subject.semester
          },
          academic_year: currentYear
        }
      },
      message: created ? 'Faculty assigned to subject successfully' : 'Faculty assignment already exists',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Assign faculty to subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSIGN_FACULTY_ERROR',
        message: 'Failed to assign faculty to subject',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Remove faculty assignment from subject (Admin only)
 * DELETE /api/subjects/:subjectId/faculty/:facultyId
 */
const removeFacultyFromSubject = async (req, res) => {
  try {
    const { subjectId, facultyId } = req.params;
    const { academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    // Check if subject exists
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBJECT_NOT_FOUND',
          message: 'Subject not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if faculty exists
    const faculty = await Faculty.findByPk(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FACULTY_NOT_FOUND',
          message: 'Faculty not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Remove faculty assignment
    const removed = await FacultySubject.removeFacultyAssignment(
      facultyId,
      subjectId,
      currentYear
    );

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_NOT_FOUND',
          message: 'Faculty assignment not found for the specified academic year',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: 'Faculty assignment removed successfully',
      data: {
        subject: {
          id: subject.id,
          subject_name: subject.subject_name
        },
        faculty: {
          id: faculty.id,
          faculty_name: faculty.faculty_name
        },
        academic_year: currentYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Remove faculty from subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_FACULTY_ERROR',
        message: 'Failed to remove faculty assignment',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get subjects by semester (for default semester setup)
 * GET /api/subjects/semester/:semester
 */
const getSubjectsBySemester = async (req, res) => {
  try {
    const { semester } = req.params;
    const { academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEMESTER',
          message: 'Semester must be between 1 and 8',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get default subjects for semester (6 theory + 2 lab)
    const defaultSubjects = await Subject.getDefaultSemesterSubjects(semesterNum);

    // Get all subjects for the semester with faculty assignments
    const allSubjects = await Subject.findAll({
      where: { semester: semesterNum },
      include: [{
        model: FacultySubject,
        as: 'facultyAssignments',
        where: { academic_year: currentYear },
        required: false,
        include: [{
          model: Faculty,
          as: 'faculty',
          include: [{
            model: User,
            as: 'user',
            attributes: ['unique_id', 'email']
          }]
        }]
      }],
      order: [['subject_type', 'ASC'], ['subject_name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        semester: semesterNum,
        default_subjects: defaultSubjects.map(subject => ({
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          subject_type: subject.subject_type,
          credits: subject.credits
        })),
        all_subjects: allSubjects.map(subject => ({
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          subject_type: subject.subject_type,
          credits: subject.credits,
          assigned_faculty: subject.facultyAssignments.map(assignment => ({
            faculty_id: assignment.faculty.id,
            faculty_name: assignment.faculty.faculty_name,
            department: assignment.faculty.department,
            user: assignment.faculty.user
          }))
        })),
        academic_year: currentYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get subjects by semester error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_SEMESTER_SUBJECTS_ERROR',
        message: 'Failed to fetch subjects for semester',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFacultyToSubject,
  removeFacultyFromSubject,
  getSubjectsBySemester
};