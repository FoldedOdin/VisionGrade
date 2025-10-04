const { Mark, Student, Subject, Faculty, FacultySubject, User } = require('../models');
const { validateMarksEntry, validateMarksUpdate } = require('../utils/validation');
const NotificationService = require('../services/notificationService');

/**
 * Marks Controller
 * Handles marks entry and retrieval for faculty
 */

/**
 * Get marks for a specific subject (faculty only) with pagination
 * GET /api/marks/subject/:subjectId
 */
const getMarksBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { 
      exam_type, 
      academic_year, 
      page = 1, 
      limit = 50,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    const facultyId = req.user.facultyId;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    // Check if faculty can access this subject
    const currentYear = academic_year || new Date().getFullYear();
    const canAccess = await FacultySubject.findOne({
      where: {
        faculty_id: facultyId,
        subject_id: subjectId,
        academic_year: currentYear
      }
    });

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this subject',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build where clause
    const whereClause = { subject_id: subjectId };
    if (exam_type) {
      whereClause.exam_type = exam_type;
    }

    // Build search condition
    const searchCondition = search ? {
      [require('sequelize').Op.or]: [
        { '$student.student_name$': { [require('sequelize').Op.iLike]: `%${search}%` } },
        { '$student.user.unique_id$': { [require('sequelize').Op.iLike]: `%${search}%` } }
      ]
    } : {};

    const { count, rows: marks } = await Mark.findAndCountAll({
      where: { ...whereClause, ...searchCondition },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['unique_id', 'email']
          }]
        },
        {
          model: Subject,
          as: 'subject'
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: {
        marks,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: count,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        subject_id: subjectId,
        exam_type: exam_type || 'all',
        filters: {
          search,
          sortBy,
          sortOrder
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get marks by subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_MARKS_ERROR',
        message: 'Failed to fetch marks',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Add or update marks for a student
 * POST /api/marks
 */
const addOrUpdateMarks = async (req, res) => {
  try {
    const { error, value } = validateMarksEntry(req.body);
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

    const { student_id, subject_id, exam_type, marks_obtained, max_marks } = value;
    const facultyId = req.user.facultyId;

    // Check if faculty can access this subject
    const currentYear = new Date().getFullYear();
    const canAccess = await FacultySubject.findOne({
      where: {
        faculty_id: facultyId,
        subject_id: subject_id,
        academic_year: currentYear
      }
    });

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this subject',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate marks range based on exam type
    try {
      Mark.validateMarks(exam_type, marks_obtained, max_marks);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MARKS_VALIDATION_ERROR',
          message: validationError.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if marks already exist for this student-subject-exam combination
    const existingMark = await Mark.findOne({
      where: {
        student_id,
        subject_id,
        exam_type
      }
    });

    let mark;
    if (existingMark) {
      // Update existing marks
      await existingMark.update({
        marks_obtained,
        max_marks,
        faculty_id: facultyId
      });
      mark = existingMark;
    } else {
      // Create new marks entry
      mark = await Mark.create({
        student_id,
        subject_id,
        exam_type,
        marks_obtained,
        max_marks,
        faculty_id: facultyId
      });
    }

    // Fetch the complete mark with associations
    const completeMark = await Mark.findByPk(mark.id, {
      include: [
        {
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['unique_id', 'email']
          }]
        },
        {
          model: Subject,
          as: 'subject'
        }
      ]
    });

    // Trigger automatic notification if marks are low (below 40%)
    const percentage = (marks_obtained / max_marks) * 100;
    if (percentage < 40) {
      // Handle marks update notification asynchronously
      NotificationService.handleMarksUpdate(completeMark).catch(error => {
        console.error('Error sending marks notification:', error);
      });
    }

    res.status(existingMark ? 200 : 201).json({
      success: true,
      data: {
        mark: completeMark,
        action: existingMark ? 'updated' : 'created',
        percentage: completeMark.getPercentage(),
        grade: completeMark.getGrade(),
        passed: completeMark.isPassed()
      },
      message: `Marks ${existingMark ? 'updated' : 'added'} successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Add/Update marks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARKS_OPERATION_ERROR',
        message: 'Failed to add/update marks',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Bulk add/update marks for multiple students
 * POST /api/marks/bulk
 */
const bulkAddOrUpdateMarks = async (req, res) => {
  try {
    const { marks_data } = req.body;
    
    if (!Array.isArray(marks_data) || marks_data.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'marks_data must be a non-empty array',
          timestamp: new Date().toISOString()
        }
      });
    }

    const facultyId = req.user.facultyId;
    const results = [];
    const errors = [];

    for (let i = 0; i < marks_data.length; i++) {
      const markData = marks_data[i];
      
      try {
        // Validate each mark entry
        const { error, value } = validateMarksEntry(markData);
        if (error) {
          errors.push({
            index: i,
            data: markData,
            error: error.details[0].message
          });
          continue;
        }

        const { student_id, subject_id, exam_type, marks_obtained, max_marks } = value;

        // Check faculty access for each subject
        const currentYear = new Date().getFullYear();
        const canAccess = await FacultySubject.findOne({
          where: {
            faculty_id: facultyId,
            subject_id: subject_id,
            academic_year: currentYear
          }
        });

        if (!canAccess) {
          errors.push({
            index: i,
            data: markData,
            error: 'Access denied to this subject'
          });
          continue;
        }

        // Validate marks range
        Mark.validateMarks(exam_type, marks_obtained, max_marks);

        // Add or update marks
        const [mark, created] = await Mark.findOrCreate({
          where: {
            student_id,
            subject_id,
            exam_type
          },
          defaults: {
            student_id,
            subject_id,
            exam_type,
            marks_obtained,
            max_marks,
            faculty_id: facultyId
          }
        });

        if (!created) {
          await mark.update({
            marks_obtained,
            max_marks,
            faculty_id: facultyId
          });
        }

        // Trigger automatic notification if marks are low (below 40%)
        const percentage = (marks_obtained / max_marks) * 100;
        if (percentage < 40) {
          // Handle marks update notification asynchronously
          NotificationService.handleMarksUpdate(mark).catch(error => {
            console.error('Error sending marks notification:', error);
          });
        }

        results.push({
          index: i,
          mark_id: mark.id,
          action: created ? 'created' : 'updated',
          data: markData
        });

      } catch (error) {
        errors.push({
          index: i,
          data: markData,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        successful_operations: results.length,
        failed_operations: errors.length,
        results,
        errors
      },
      message: `Bulk operation completed: ${results.length} successful, ${errors.length} failed`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk marks operation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_MARKS_ERROR',
        message: 'Failed to process bulk marks operation',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get marks summary for a student (accessible by faculty for their subjects)
 * GET /api/marks/student/:studentId
 */
const getStudentMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academic_year } = req.query;
    const facultyId = req.user.facultyId;

    // Get subjects accessible by this faculty
    const currentYear = academic_year || new Date().getFullYear();
    const facultySubjects = await FacultySubject.findAll({
      where: {
        faculty_id: facultyId,
        academic_year: currentYear
      },
      attributes: ['subject_id']
    });

    const subjectIds = facultySubjects.map(fs => fs.subject_id);

    if (subjectIds.length === 0) {
      return res.json({
        success: true,
        data: {
          student_id: studentId,
          marks: [],
          message: 'No subjects assigned to faculty'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get marks for student in faculty's subjects only
    const marks = await Mark.findAll({
      where: {
        student_id: studentId,
        subject_id: subjectIds
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['unique_id', 'email']
          }]
        },
        {
          model: Subject,
          as: 'subject'
        }
      ],
      order: [
        [{ model: Subject, as: 'subject' }, 'semester', 'ASC'],
        [{ model: Subject, as: 'subject' }, 'subject_name', 'ASC'],
        ['exam_type', 'ASC']
      ]
    });

    // Group marks by subject
    const marksBySubject = {};
    marks.forEach(mark => {
      const subjectId = mark.subject_id;
      if (!marksBySubject[subjectId]) {
        marksBySubject[subjectId] = {
          subject: mark.subject,
          marks: []
        };
      }
      marksBySubject[subjectId].marks.push({
        exam_type: mark.exam_type,
        marks_obtained: mark.marks_obtained,
        max_marks: mark.max_marks,
        percentage: mark.getPercentage(),
        grade: mark.getGrade(),
        passed: mark.isPassed(),
        created_at: mark.created_at
      });
    });

    res.json({
      success: true,
      data: {
        student: marks.length > 0 ? marks[0].student : null,
        marks_by_subject: marksBySubject,
        total_subjects: Object.keys(marksBySubject).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get student marks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_STUDENT_MARKS_ERROR',
        message: 'Failed to fetch student marks',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Delete marks entry
 * DELETE /api/marks/:markId
 */
const deleteMarks = async (req, res) => {
  try {
    const { markId } = req.params;
    const facultyId = req.user.facultyId;

    // Find the mark and check if faculty can access it
    const mark = await Mark.findByPk(markId, {
      include: [{
        model: Subject,
        as: 'subject'
      }]
    });

    if (!mark) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MARK_NOT_FOUND',
          message: 'Mark entry not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if faculty can access this subject
    const currentYear = new Date().getFullYear();
    const canAccess = await FacultySubject.findOne({
      where: {
        faculty_id: facultyId,
        subject_id: mark.subject_id,
        academic_year: currentYear
      }
    });

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to delete this mark',
          timestamp: new Date().toISOString()
        }
      });
    }

    await mark.destroy();

    res.json({
      success: true,
      message: 'Mark entry deleted successfully',
      data: {
        deleted_mark_id: markId,
        subject: mark.subject.subject_name,
        exam_type: mark.exam_type
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete marks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_MARKS_ERROR',
        message: 'Failed to delete marks',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get performance statistics for faculty's subjects
 * GET /api/marks/statistics
 */
const getPerformanceStatistics = async (req, res) => {
  try {
    const { subject_id, academic_year } = req.query;
    const facultyId = req.user.facultyId;
    const currentYear = academic_year || new Date().getFullYear();

    // Get subjects accessible by this faculty
    const whereClause = {
      faculty_id: facultyId,
      academic_year: currentYear
    };

    if (subject_id) {
      whereClause.subject_id = subject_id;
    }

    const facultySubjects = await FacultySubject.findAll({
      where: whereClause,
      include: [{
        model: Subject,
        as: 'subject'
      }]
    });

    if (facultySubjects.length === 0) {
      return res.json({
        success: true,
        data: {
          statistics: [],
          message: 'No subjects assigned to faculty'
        },
        timestamp: new Date().toISOString()
      });
    }

    const statistics = [];

    for (const facultySubject of facultySubjects) {
      const subjectStats = await Mark.getSubjectPerformanceStats(
        facultySubject.subject_id, 
        currentYear
      );

      statistics.push({
        subject: facultySubject.subject,
        statistics: subjectStats
      });
    }

    res.json({
      success: true,
      data: {
        statistics,
        academic_year: currentYear,
        total_subjects: statistics.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get performance statistics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATISTICS_ERROR',
        message: 'Failed to fetch performance statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getMarksBySubject,
  addOrUpdateMarks,
  bulkAddOrUpdateMarks,
  getStudentMarks,
  deleteMarks,
  getPerformanceStatistics
};