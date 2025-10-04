const { User, Student, Faculty, Subject, FacultySubject, StudentSubject } = require('../models');
const { hashPassword } = require('../utils/password');
const { validateUserInput, validateProfileUpdate } = require('../utils/validation');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

/**
 * Get all users with pagination and filtering
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Filter by role if specified
    if (role && ['student', 'faculty', 'tutor', 'admin'].includes(role)) {
      whereClause.role = role;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { unique_id: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Student,
          as: 'studentProfile',
          required: false
        },
        {
          model: Faculty,
          as: 'facultyProfile',
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalUsers: count,
          hasNext: offset + users.length < count,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USERS_ERROR',
        message: 'Failed to fetch users',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get user by ID with full profile
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Student,
          as: 'studentProfile'
        },
        {
          model: Faculty,
          as: 'facultyProfile'
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USER_ERROR',
        message: 'Failed to fetch user',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Create new user
 */
const createUser = async (req, res) => {
  try {
    const { error, value } = validateUserInput(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      email,
      phone,
      password,
      role,
      studentName,
      semester,
      batchYear,
      facultyName,
      department,
      isTutor,
      tutorSemester
    } = value;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email or phone already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate unique ID and hash password
    const uniqueId = await User.generateUniqueId(role);
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      unique_id: uniqueId,
      email,
      phone,
      password_hash: passwordHash,
      role
    });

    // Create role-specific profile
    let profile = null;
    if (role === 'student') {
      profile = await Student.create({
        user_id: user.id,
        student_name: studentName,
        semester: semester || 1,
        batch_year: batchYear || new Date().getFullYear()
      });

      // Auto-enroll in semester subjects
      await StudentSubject.enrollStudentInSemesterSubjects(profile.id, profile.semester);
    } else if (role === 'faculty' || role === 'tutor') {
      profile = await Faculty.create({
        user_id: user.id,
        faculty_name: facultyName,
        department,
        is_tutor: isTutor || role === 'tutor',
        tutor_semester: tutorSemester
      });
    }

    // Return user without password
    const createdUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Student,
          as: 'studentProfile'
        },
        {
          model: Faculty,
          as: 'facultyProfile'
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: { user: createdUser },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_USER_ERROR',
        message: 'Failed to create user',
        timestamp: new Date().toISOString()
      }
    });
  }
};/**
 
* Update user
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = validateProfileUpdate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      email,
      phone,
      password,
      studentName,
      semester,
      batchYear,
      facultyName,
      department,
      isTutor,
      tutorSemester
    } = value;

    // Check for email/phone conflicts with other users
    if (email || phone) {
      const conflictUser = await User.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : [])
          ]
        }
      });

      if (conflictUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_CONFLICT',
            message: 'Email or phone already exists for another user',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Update user basic info
    const updateData = {};
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (password) updateData.password_hash = await hashPassword(password);

    if (Object.keys(updateData).length > 0) {
      await user.update(updateData);
    }

    // Update role-specific profile
    if (user.role === 'student') {
      const studentProfile = await Student.findOne({ where: { user_id: id } });
      if (studentProfile) {
        const studentUpdateData = {};
        if (studentName) studentUpdateData.student_name = studentName;
        if (semester) studentUpdateData.semester = semester;
        if (batchYear) studentUpdateData.batch_year = batchYear;

        if (Object.keys(studentUpdateData).length > 0) {
          await studentProfile.update(studentUpdateData);
        }
      }
    } else if (user.role === 'faculty' || user.role === 'tutor') {
      const facultyProfile = await Faculty.findOne({ where: { user_id: id } });
      if (facultyProfile) {
        const facultyUpdateData = {};
        if (facultyName) facultyUpdateData.faculty_name = facultyName;
        if (department) facultyUpdateData.department = department;
        if (typeof isTutor === 'boolean') facultyUpdateData.is_tutor = isTutor;
        if (tutorSemester) facultyUpdateData.tutor_semester = tutorSemester;

        if (Object.keys(facultyUpdateData).length > 0) {
          await facultyProfile.update(facultyUpdateData);
        }
      }
    }

    // Return updated user
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Student,
          as: 'studentProfile'
        },
        {
          model: Faculty,
          as: 'facultyProfile'
        }
      ]
    });

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_USER_ERROR',
        message: 'Failed to update user',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user has academic data that prevents deletion
    if (user.role === 'student') {
      const studentProfile = await Student.findOne({ where: { user_id: id } });
      if (studentProfile) {
        // Check for marks, attendance, or other academic data
        const hasAcademicData = await Promise.all([
          require('../models').Mark.findOne({ where: { student_id: studentProfile.id } }),
          require('../models').Attendance.findOne({ where: { student_id: studentProfile.id } })
        ]);

        if (hasAcademicData.some(data => data !== null)) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'CANNOT_DELETE_USER',
              message: 'Cannot delete user with existing academic data',
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    }

    // Delete user (cascade will handle related records)
    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_USER_ERROR',
        message: 'Failed to delete user',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Upload profile photo
 */
const uploadProfilePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user can update this profile (admin or own profile)
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete old profile photo if exists
    if (user.profile_photo) {
      const oldPhotoPath = path.join(__dirname, '../uploads/profiles', user.profile_photo);
      try {
        await fs.unlink(oldPhotoPath);
      } catch (error) {
        console.log('Old photo deletion failed:', error.message);
      }
    }

    // Update user with new photo filename
    await user.update({
      profile_photo: req.file.filename
    });

    res.json({
      success: true,
      data: {
        profile_photo: req.file.filename,
        photo_url: `/uploads/profiles/${req.file.filename}`
      },
      message: 'Profile photo uploaded successfully'
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to upload profile photo',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get faculty-subject assignments
 */
const getFacultySubjectAssignments = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const currentYear = academicYear || new Date().getFullYear();

    const assignments = await FacultySubject.getFacultyAssignments(currentYear);

    res.json({
      success: true,
      data: { assignments, academicYear: currentYear }
    });
  } catch (error) {
    console.error('Get faculty assignments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ASSIGNMENTS_ERROR',
        message: 'Failed to fetch faculty assignments',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Assign faculty to subject
 */
const assignFacultyToSubject = async (req, res) => {
  try {
    const { facultyId, subjectId, academicYear } = req.body;

    if (!facultyId || !subjectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Faculty ID and Subject ID are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify faculty exists
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

    // Verify subject exists
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

    const { assignment, created } = await FacultySubject.assignFacultyToSubject(
      facultyId,
      subjectId,
      academicYear
    );

    res.status(created ? 201 : 200).json({
      success: true,
      data: { assignment },
      message: created ? 'Faculty assigned to subject successfully' : 'Assignment already exists'
    });
  } catch (error) {
    console.error('Assign faculty to subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSIGNMENT_ERROR',
        message: 'Failed to assign faculty to subject',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Remove faculty assignment
 */
const removeFacultyAssignment = async (req, res) => {
  try {
    const { facultyId, subjectId } = req.params;
    const { academicYear } = req.query;

    const removed = await FacultySubject.removeFacultyAssignment(
      facultyId,
      subjectId,
      academicYear
    );

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_NOT_FOUND',
          message: 'Faculty assignment not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: 'Faculty assignment removed successfully'
    });
  } catch (error) {
    console.error('Remove faculty assignment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_ASSIGNMENT_ERROR',
        message: 'Failed to remove faculty assignment',
        timestamp: new Date().toISOString()
      }
    });
  }
};/**
 
* Get student enrollments
 */
const getStudentEnrollments = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const currentYear = academicYear || new Date().getFullYear();

    const enrollments = await StudentSubject.findAll({
      where: {
        academic_year: currentYear
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: { exclude: ['password_hash'] }
          }]
        },
        {
          model: Subject,
          as: 'subject'
        }
      ]
    });

    res.json({
      success: true,
      data: { enrollments, academicYear: currentYear }
    });
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ENROLLMENTS_ERROR',
        message: 'Failed to fetch student enrollments',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Enroll student in subject
 */
const enrollStudentInSubject = async (req, res) => {
  try {
    const { studentId, subjectId, academicYear } = req.body;

    if (!studentId || !subjectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Student ID and Subject ID are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify subject exists
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

    const { enrollment, created } = await StudentSubject.enrollStudentInSubject(
      studentId,
      subjectId,
      academicYear
    );

    res.status(created ? 201 : 200).json({
      success: true,
      data: { enrollment },
      message: created ? 'Student enrolled in subject successfully' : 'Enrollment already exists'
    });
  } catch (error) {
    console.error('Enroll student in subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ENROLLMENT_ERROR',
        message: 'Failed to enroll student in subject',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Remove student enrollment
 */
const removeStudentEnrollment = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { academicYear } = req.query;

    const removed = await StudentSubject.removeStudentEnrollment(
      studentId,
      subjectId,
      academicYear
    );

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ENROLLMENT_NOT_FOUND',
          message: 'Student enrollment not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: 'Student enrollment removed successfully'
    });
  } catch (error) {
    console.error('Remove student enrollment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_ENROLLMENT_ERROR',
        message: 'Failed to remove student enrollment',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Bulk enroll student in semester subjects
 */
const enrollStudentInSemester = async (req, res) => {
  try {
    const { studentId, semester, academicYear } = req.body;

    if (!studentId || !semester) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Student ID and semester are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const enrollments = await StudentSubject.enrollStudentInSemesterSubjects(
      studentId,
      semester,
      academicYear
    );

    res.status(201).json({
      success: true,
      data: { enrollments },
      message: `Student enrolled in semester ${semester} subjects successfully`
    });
  } catch (error) {
    console.error('Enroll student in semester error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEMESTER_ENROLLMENT_ERROR',
        message: 'Failed to enroll student in semester subjects',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Promote students to next semester
 */
const promoteStudents = async (req, res) => {
  try {
    const { studentIds, fromSemester, toSemester, academicYear } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || !fromSemester || !toSemester) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Student IDs, from semester, and to semester are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (toSemester <= fromSemester) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROMOTION',
          message: 'To semester must be greater than from semester',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update student semester in Student table
    await Student.update(
      { semester: toSemester },
      {
        where: {
          id: studentIds,
          semester: fromSemester
        }
      }
    );

    // Handle subject enrollments
    const results = await StudentSubject.promoteStudentsToNextSemester(
      studentIds,
      fromSemester,
      toSemester,
      academicYear
    );

    res.json({
      success: true,
      data: { promotionResults: results },
      message: `${studentIds.length} students promoted from semester ${fromSemester} to ${toSemester}`
    });
  } catch (error) {
    console.error('Promote students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROMOTION_ERROR',
        message: 'Failed to promote students',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get enrollment statistics
 */
const getEnrollmentStatistics = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const currentYear = academicYear || new Date().getFullYear();

    const statistics = await StudentSubject.getEnrollmentStatistics(currentYear);

    res.json({
      success: true,
      data: { statistics, academicYear: currentYear }
    });
  } catch (error) {
    console.error('Get enrollment statistics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATISTICS_ERROR',
        message: 'Failed to fetch enrollment statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
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
};