const { User, Student, Faculty, Subject, FacultySubject, StudentSubject, Notification } = require('../models');
const { generateUniqueId } = require('../utils/idGenerator');
const { hashPassword } = require('../utils/password');
const { validateUser, validateSubject } = require('../utils/validation');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class AdminController {
  // Dashboard data
  async getDashboardData(req, res) {
    try {
      const [
        totalUsers,
        totalStudents,
        totalFaculty,
        totalSubjects,
        activeStudents,
        graduatedStudents
      ] = await Promise.all([
        User.count(),
        Student.count(),
        Faculty.count(),
        Subject.count(),
        Student.count({ where: { graduation_status: 'active' } }),
        Student.count({ where: { graduation_status: 'graduated' } })
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalStudents,
          totalFaculty,
          totalSubjects,
          activeStudents,
          graduatedStudents
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to fetch dashboard data'
        }
      });
    }
  }

  // User management
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, search } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (role) whereClause.role = role;
      if (search) {
        whereClause[Op.or] = [
          { unique_id: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Student,
            as: 'student',
            required: false
          },
          {
            model: Faculty,
            as: 'faculty',
            required: false
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          users: users.rows,
          total: users.count,
          page: parseInt(page),
          totalPages: Math.ceil(users.count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_USERS_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }
  }

  async createUser(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { error } = validateUser(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { email, phone, password, role, ...additionalData } = req.body;

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
            message: 'User with this email or phone already exists'
          }
        });
      }

      // Generate unique ID and hash password
      const uniqueId = await generateUniqueId(role);
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await User.create({
        unique_id: uniqueId,
        email,
        phone,
        password_hash: passwordHash,
        role
      }, { transaction });

      // Create role-specific record
      if (role === 'student') {
        const student = await Student.create({
          user_id: user.id,
          student_name: additionalData.name,
          semester: additionalData.semester || 1,
          batch_year: additionalData.batch_year || new Date().getFullYear()
        }, { transaction });

        // Auto-enroll student in semester subjects
        await StudentSubject.enrollStudentInSemesterSubjects(student.id, student.semester);
      } else if (role === 'faculty' || role === 'tutor') {
        await Faculty.create({
          user_id: user.id,
          faculty_name: additionalData.name,
          department: additionalData.department,
          is_tutor: role === 'tutor',
          tutor_semester: role === 'tutor' ? additionalData.tutor_semester : null
        }, { transaction });
      }

      await transaction.commit();

      // Fetch created user with associations
      const createdUser = await User.findByPk(user.id, {
        include: [
          { model: Student, as: 'student' },
          { model: Faculty, as: 'faculty' }
        ]
      });

      res.status(201).json({
        success: true,
        data: createdUser
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_USER_ERROR',
          message: 'Failed to create user'
        }
      });
    }
  }

  async updateUser(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await User.findByPk(id, {
        include: [
          { model: Student, as: 'student' },
          { model: Faculty, as: 'faculty' }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Update user basic info
      if (updateData.email) user.email = updateData.email;
      if (updateData.phone) user.phone = updateData.phone;
      if (updateData.password) {
        user.password_hash = await hashPassword(updateData.password);
      }

      await user.save({ transaction });

      // Update role-specific data
      if (user.role === 'student' && user.student && updateData.studentData) {
        await user.student.update(updateData.studentData, { transaction });
      } else if ((user.role === 'faculty' || user.role === 'tutor') && user.faculty && updateData.facultyData) {
        await user.faculty.update(updateData.facultyData, { transaction });
      }

      await transaction.commit();

      // Fetch updated user
      const updatedUser = await User.findByPk(id, {
        include: [
          { model: Student, as: 'student' },
          { model: Faculty, as: 'faculty' }
        ]
      });

      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_USER_ERROR',
          message: 'Failed to update user'
        }
      });
    }
  }

  async deleteUser(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Check if user has academic data that prevents deletion
      if (user.role === 'student') {
        const student = await Student.findOne({ where: { user_id: id } });
        if (student) {
          const hasMarks = await sequelize.models.Mark.count({ where: { student_id: student.id } });
          if (hasMarks > 0) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'CANNOT_DELETE_USER',
                message: 'Cannot delete student with existing academic records'
              }
            });
          }
        }
      }

      // Delete user and associated records
      await User.destroy({ where: { id }, transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_USER_ERROR',
          message: 'Failed to delete user'
        }
      });
    }
  } 
 // Tutor management
  async getTutors(req, res) {
    try {
      const tutors = await Faculty.findAll({
        where: { is_tutor: true },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['unique_id', 'email', 'phone']
          }
        ]
      });

      res.json({
        success: true,
        data: tutors
      });
    } catch (error) {
      console.error('Error fetching tutors:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_TUTORS_ERROR',
          message: 'Failed to fetch tutors'
        }
      });
    }
  }

  async assignTutor(req, res) {
    try {
      const { facultyId, semester } = req.body;

      if (!facultyId || !semester) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Faculty ID and semester are required'
          }
        });
      }

      const faculty = await Faculty.findByPk(facultyId);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FACULTY_NOT_FOUND',
            message: 'Faculty member not found'
          }
        });
      }

      // Check if another tutor is already assigned to this semester
      const existingTutor = await Faculty.findOne({
        where: {
          is_tutor: true,
          tutor_semester: semester,
          id: { [Op.ne]: facultyId }
        }
      });

      if (existingTutor) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'TUTOR_EXISTS',
            message: 'Another tutor is already assigned to this semester'
          }
        });
      }

      await faculty.update({
        is_tutor: true,
        tutor_semester: semester
      });

      const updatedFaculty = await Faculty.findByPk(facultyId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['unique_id', 'email', 'phone']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedFaculty
      });
    } catch (error) {
      console.error('Error assigning tutor:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGN_TUTOR_ERROR',
          message: 'Failed to assign tutor'
        }
      });
    }
  }

  async unassignTutor(req, res) {
    try {
      const { facultyId } = req.params;

      const faculty = await Faculty.findByPk(facultyId);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FACULTY_NOT_FOUND',
            message: 'Faculty member not found'
          }
        });
      }

      await faculty.update({
        is_tutor: false,
        tutor_semester: null
      });

      res.json({
        success: true,
        message: 'Tutor unassigned successfully'
      });
    } catch (error) {
      console.error('Error unassigning tutor:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UNASSIGN_TUTOR_ERROR',
          message: 'Failed to unassign tutor'
        }
      });
    }
  }

  // Subject management
  async getAllSubjects(req, res) {
    try {
      const { semester } = req.query;
      
      const whereClause = {};
      if (semester) whereClause.semester = semester;

      const subjects = await Subject.findAll({
        where: whereClause,
        order: [['semester', 'ASC'], ['subject_code', 'ASC']]
      });

      res.json({
        success: true,
        data: subjects
      });
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_SUBJECTS_ERROR',
          message: 'Failed to fetch subjects'
        }
      });
    }
  }

  async createSubject(req, res) {
    try {
      const { error } = validateSubject(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { subject_code, subject_name, subject_type, semester, credits } = req.body;

      // Check if subject code already exists
      const existingSubject = await Subject.findOne({ where: { subject_code } });
      if (existingSubject) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SUBJECT_EXISTS',
            message: 'Subject with this code already exists'
          }
        });
      }

      const subject = await Subject.create({
        subject_code,
        subject_name,
        subject_type,
        semester,
        credits: credits || 3
      });

      res.status(201).json({
        success: true,
        data: subject
      });
    } catch (error) {
      console.error('Error creating subject:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_SUBJECT_ERROR',
          message: 'Failed to create subject'
        }
      });
    }
  }

  async updateSubject(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const subject = await Subject.findByPk(id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBJECT_NOT_FOUND',
            message: 'Subject not found'
          }
        });
      }

      // Check if subject code is being changed and if it conflicts
      if (updateData.subject_code && updateData.subject_code !== subject.subject_code) {
        const existingSubject = await Subject.findOne({ 
          where: { 
            subject_code: updateData.subject_code,
            id: { [Op.ne]: id }
          } 
        });
        if (existingSubject) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'SUBJECT_CODE_EXISTS',
              message: 'Subject with this code already exists'
            }
          });
        }
      }

      await subject.update(updateData);

      res.json({
        success: true,
        data: subject
      });
    } catch (error) {
      console.error('Error updating subject:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_SUBJECT_ERROR',
          message: 'Failed to update subject'
        }
      });
    }
  }

  async deleteSubject(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;

      const subject = await Subject.findByPk(id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBJECT_NOT_FOUND',
            message: 'Subject not found'
          }
        });
      }

      // Check if subject has associated data
      const hasMarks = await sequelize.models.Mark.count({ where: { subject_id: id } });
      if (hasMarks > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE_SUBJECT',
            message: 'Cannot delete subject with existing academic records'
          }
        });
      }

      await Subject.destroy({ where: { id }, transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Subject deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting subject:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_SUBJECT_ERROR',
          message: 'Failed to delete subject'
        }
      });
    }
  }

  // System announcements
  async createSystemAnnouncement(req, res) {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title and message are required'
          }
        });
      }

      // Get all users to send system-wide announcement
      const users = await User.findAll({
        attributes: ['id']
      });

      const notifications = users.map(user => ({
        recipient_id: user.id,
        sender_id: req.user.id,
        notification_type: 'system',
        title,
        message,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await Notification.bulkCreate(notifications);

      res.status(201).json({
        success: true,
        message: `System announcement sent to ${users.length} users`
      });
    } catch (error) {
      console.error('Error creating system announcement:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANNOUNCEMENT_ERROR',
          message: 'Failed to create system announcement'
        }
      });
    }
  }

  // Faculty-Subject Assignment Management
  async getFacultyAssignments(req, res) {
    try {
      const { academic_year } = req.query;
      const currentYear = academic_year || new Date().getFullYear();

      const facultyAssignments = await Faculty.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['unique_id', 'email']
          },
          {
            model: FacultySubject,
            as: 'subjectAssignments',
            where: { academic_year: currentYear },
            required: false,
            include: [{
              model: Subject,
              as: 'subject'
            }]
          }
        ],
        order: [['faculty_name', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          faculty_assignments: facultyAssignments,
          academic_year: currentYear
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get faculty assignments error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FACULTY_ASSIGNMENTS_ERROR',
          message: 'Failed to fetch faculty assignments',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async assignSubjectsToFaculty(req, res) {
    try {
      const { faculty_id, subject_ids, academic_year } = req.body;
      const currentYear = academic_year || new Date().getFullYear();

      // Validate faculty exists
      const faculty = await Faculty.findByPk(faculty_id);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FACULTY_NOT_FOUND',
            message: 'Faculty member not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate subjects exist
      const subjects = await Subject.findAll({
        where: { id: subject_ids }
      });

      if (subjects.length !== subject_ids.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SUBJECTS',
            message: 'One or more subjects not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Remove existing assignments for this academic year
      await FacultySubject.destroy({
        where: {
          faculty_id: faculty_id,
          academic_year: currentYear
        }
      });

      // Create new assignments
      const assignments = subject_ids.map(subject_id => ({
        faculty_id: faculty_id,
        subject_id: subject_id,
        academic_year: currentYear
      }));

      await FacultySubject.bulkCreate(assignments);

      res.json({
        success: true,
        message: 'Subjects assigned to faculty successfully',
        data: {
          faculty_id: faculty_id,
          assigned_subjects: subject_ids.length,
          academic_year: currentYear
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Assign subjects to faculty error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_ERROR',
          message: 'Failed to assign subjects to faculty',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async removeSubjectAssignment(req, res) {
    try {
      const { facultyId, subjectId } = req.params;
      const { academic_year } = req.query;
      const currentYear = academic_year || new Date().getFullYear();

      const deleted = await FacultySubject.destroy({
        where: {
          faculty_id: facultyId,
          subject_id: subjectId,
          academic_year: currentYear
        }
      });

      if (deleted === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ASSIGNMENT_NOT_FOUND',
            message: 'Subject assignment not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        message: 'Subject assignment removed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Remove subject assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REMOVAL_ERROR',
          message: 'Failed to remove subject assignment',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async autoAssignFacultyToSubjects(req, res) {
    try {
      const { faculty_id, semester, subject_ids, academic_year } = req.body;
      const currentYear = academic_year || new Date().getFullYear();

      if (!faculty_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Faculty ID is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (!semester && !subject_ids) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either semester or subject_ids must be provided',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Verify faculty exists
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
            message: 'Faculty member not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get subjects to assign
      let subjects;
      if (subject_ids) {
        subjects = await Subject.findAll({
          where: { id: subject_ids }
        });
      } else {
        subjects = await Subject.findAll({
          where: { semester: semester },
          order: [['subject_code', 'ASC']]
        });
      }

      if (subjects.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_SUBJECTS_FOUND',
            message: 'No subjects found matching criteria',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check existing assignments
      const existingAssignments = await FacultySubject.findAll({
        where: {
          faculty_id: faculty_id,
          subject_id: subjects.map(s => s.id),
          academic_year: currentYear
        }
      });

      // Create new assignments
      let newAssignments = 0;
      const assignmentResults = [];

      for (const subject of subjects) {
        const exists = existingAssignments.find(a => a.subject_id === subject.id);
        if (!exists) {
          await FacultySubject.create({
            faculty_id: faculty_id,
            subject_id: subject.id,
            academic_year: currentYear
          });
          newAssignments++;
          assignmentResults.push({
            subject_id: subject.id,
            subject_code: subject.subject_code,
            subject_name: subject.subject_name,
            status: 'assigned'
          });
        } else {
          assignmentResults.push({
            subject_id: subject.id,
            subject_code: subject.subject_code,
            subject_name: subject.subject_name,
            status: 'already_assigned'
          });
        }
      }

      res.json({
        success: true,
        message: `Faculty assignment completed: ${newAssignments} new assignments`,
        data: {
          faculty: {
            id: faculty.id,
            name: faculty.faculty_name,
            unique_id: faculty.user.unique_id
          },
          total_subjects: subjects.length,
          new_assignments: newAssignments,
          existing_assignments: existingAssignments.length,
          academic_year: currentYear,
          assignment_results: assignmentResults
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Auto assign faculty to subjects error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTO_ASSIGNMENT_ERROR',
          message: 'Failed to auto-assign faculty to subjects',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Fix student enrollments
  async fixStudentEnrollments(req, res) {
    try {
      const { studentIds, semester } = req.body;
      const currentYear = new Date().getFullYear();
      
      let whereClause = { graduation_status: 'active' };
      
      if (studentIds && studentIds.length > 0) {
        whereClause.id = { [Op.in]: studentIds };
      }
      
      if (semester) {
        whereClause.semester = semester;
      }

      const students = await Student.findAll({ where: whereClause });
      
      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_STUDENTS_FOUND',
            message: 'No students found matching criteria'
          }
        });
      }

      let fixedCount = 0;
      const results = [];

      for (const student of students) {
        // Check if student is already enrolled in subjects for their semester
        const existingEnrollments = await StudentSubject.count({
          where: {
            student_id: student.id,
            academic_year: currentYear
          },
          include: [{
            model: Subject,
            as: 'subject',
            where: {
              semester: student.semester
            }
          }]
        });

        if (existingEnrollments === 0) {
          try {
            await StudentSubject.enrollStudentInSemesterSubjects(student.id, student.semester, currentYear);
            fixedCount++;
            results.push({
              student_id: student.id,
              student_name: student.student_name,
              semester: student.semester,
              status: 'enrolled'
            });
          } catch (error) {
            results.push({
              student_id: student.id,
              student_name: student.student_name,
              semester: student.semester,
              status: 'failed',
              error: error.message
            });
          }
        } else {
          results.push({
            student_id: student.id,
            student_name: student.student_name,
            semester: student.semester,
            status: 'already_enrolled',
            existing_enrollments: existingEnrollments
          });
        }
      }

      res.json({
        success: true,
        message: `Processed ${students.length} students, enrolled ${fixedCount} students`,
        data: {
          total_processed: students.length,
          newly_enrolled: fixedCount,
          already_enrolled: students.length - fixedCount,
          results: results
        }
      });

    } catch (error) {
      console.error('Error fixing student enrollments:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ENROLLMENT_FIX_ERROR',
          message: 'Failed to fix student enrollments'
        }
      });
    }
  }

  // Student promotion and graduation
  async promoteStudents(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { fromSemester, toSemester, studentIds } = req.body;

      if (!fromSemester || !toSemester) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'From semester and to semester are required'
          }
        });
      }

      let whereClause = { semester: fromSemester, graduation_status: 'active' };
      if (studentIds && studentIds.length > 0) {
        whereClause.id = { [Op.in]: studentIds };
      }

      const studentsToPromote = await Student.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'unique_id', 'email']
          }
        ]
      });

      if (studentsToPromote.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_STUDENTS_FOUND',
            message: 'No students found for promotion'
          }
        });
      }

      // Update student semesters
      await Student.update(
        { semester: toSemester },
        { 
          where: { id: { [Op.in]: studentsToPromote.map(s => s.id) } },
          transaction 
        }
      );

      // Create promotion notifications
      const notifications = studentsToPromote.map(student => ({
        recipient_id: student.user.id,
        sender_id: req.user.id,
        notification_type: 'system',
        title: 'Semester Promotion',
        message: `Congratulations! You have been promoted to Semester ${toSemester}`,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await Notification.bulkCreate(notifications, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: `${studentsToPromote.length} students promoted successfully`,
        data: {
          promotedCount: studentsToPromote.length,
          fromSemester,
          toSemester
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error promoting students:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PROMOTION_ERROR',
          message: 'Failed to promote students'
        }
      });
    }
  }

  async graduateStudents(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { semester, studentIds } = req.body;

      if (!semester) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Semester is required'
          }
        });
      }

      let whereClause = { semester, graduation_status: 'active' };
      if (studentIds && studentIds.length > 0) {
        whereClause.id = { [Op.in]: studentIds };
      }

      const studentsToGraduate = await Student.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'unique_id', 'email']
          }
        ]
      });

      if (studentsToGraduate.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_STUDENTS_FOUND',
            message: 'No students found for graduation'
          }
        });
      }

      // Update graduation status
      await Student.update(
        { graduation_status: 'graduated' },
        { 
          where: { id: { [Op.in]: studentsToGraduate.map(s => s.id) } },
          transaction 
        }
      );

      // Create graduation notifications
      const notifications = studentsToGraduate.map(student => ({
        recipient_id: student.user.id,
        sender_id: req.user.id,
        notification_type: 'system',
        title: 'Graduation Completed',
        message: `Congratulations on your graduation! Your academic journey has been completed successfully.`,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await Notification.bulkCreate(notifications, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: `${studentsToGraduate.length} students graduated successfully`,
        data: {
          graduatedCount: studentsToGraduate.length,
          semester
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error graduating students:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GRADUATION_ERROR',
          message: 'Failed to graduate students'
        }
      });
    }
  }
}

module.exports = new AdminController();