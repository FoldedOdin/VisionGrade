const { Attendance, Student, Subject, Faculty, FacultySubject, User } = require('../models');
const { validateAttendanceEntry, validateAttendanceUpdate } = require('../utils/validation');
const NotificationService = require('../services/notificationService');

/**
 * Attendance Controller
 * Handles attendance tracking and calculation for faculty
 */

/**
 * Get attendance for a specific subject (faculty only)
 * GET /api/attendance/subject/:subjectId
 */
const getAttendanceBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { academic_year } = req.query;
    const facultyId = req.user.facultyId;

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

    const attendanceRecords = await Attendance.findAll({
      where: { subject_id: subjectId },
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
        [{ model: Student, as: 'student' }, 'student_name', 'ASC']
      ]
    });

    // Calculate statistics
    const totalStudents = attendanceRecords.length;
    const studentsAboveThreshold = attendanceRecords.filter(record => 
      record.attendance_percentage >= 75
    ).length;
    const studentsBelowThreshold = totalStudents - studentsAboveThreshold;

    const averageAttendance = totalStudents > 0 
      ? attendanceRecords.reduce((sum, record) => sum + record.attendance_percentage, 0) / totalStudents
      : 0;

    res.json({
      success: true,
      data: {
        attendance_records: attendanceRecords.map(record => ({
          id: record.id,
          student: record.student,
          total_classes: record.total_classes,
          attended_classes: record.attended_classes,
          attendance_percentage: record.attendance_percentage,
          is_below_threshold: record.isBelowThreshold(),
          required_classes_to_reach_threshold: record.getRequiredClassesToReachThreshold(),
          max_classes_to_miss: record.getMaxClassesToMiss(),
          updated_at: record.updated_at
        })),
        statistics: {
          total_students: totalStudents,
          students_above_threshold: studentsAboveThreshold,
          students_below_threshold: studentsBelowThreshold,
          threshold_pass_percentage: totalStudents > 0 ? (studentsAboveThreshold / totalStudents) * 100 : 0,
          average_attendance: Math.round(averageAttendance * 100) / 100
        },
        subject_id: subjectId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get attendance by subject error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ATTENDANCE_ERROR',
        message: 'Failed to fetch attendance records',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Add or update attendance for a student
 * POST /api/attendance
 */
const addOrUpdateAttendance = async (req, res) => {
  try {
    const { error, value } = validateAttendanceEntry(req.body);
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

    const { student_id, subject_id, total_classes, attended_classes } = value;
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

    // Validate attendance data
    if (attended_classes > total_classes) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ATTENDANCE_VALIDATION_ERROR',
          message: 'Attended classes cannot be more than total classes',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (total_classes < 0 || attended_classes < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ATTENDANCE_VALIDATION_ERROR',
          message: 'Classes count cannot be negative',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update attendance using model method
    const attendance = await Attendance.updateAttendance(
      student_id,
      subject_id,
      total_classes,
      attended_classes,
      facultyId
    );

    // Fetch the complete attendance record with associations
    const completeAttendance = await Attendance.findByPk(attendance.id, {
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

    // Trigger automatic notification if attendance is low
    if (completeAttendance.attendance_percentage < 75) {
      // Handle attendance update notification asynchronously
      NotificationService.handleAttendanceUpdate(completeAttendance).catch(error => {
        console.error('Error sending attendance notification:', error);
      });
    }

    res.json({
      success: true,
      data: {
        attendance: {
          id: completeAttendance.id,
          student: completeAttendance.student,
          subject: completeAttendance.subject,
          total_classes: completeAttendance.total_classes,
          attended_classes: completeAttendance.attended_classes,
          attendance_percentage: completeAttendance.attendance_percentage,
          is_below_threshold: completeAttendance.isBelowThreshold(),
          required_classes_to_reach_threshold: completeAttendance.getRequiredClassesToReachThreshold(),
          max_classes_to_miss: completeAttendance.getMaxClassesToMiss(),
          updated_at: completeAttendance.updated_at
        }
      },
      message: 'Attendance updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Add/Update attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ATTENDANCE_OPERATION_ERROR',
        message: 'Failed to add/update attendance',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Bulk update attendance for multiple students
 * POST /api/attendance/bulk
 */
const bulkUpdateAttendance = async (req, res) => {
  try {
    const { attendance_data } = req.body;
    
    if (!Array.isArray(attendance_data) || attendance_data.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'attendance_data must be a non-empty array',
          timestamp: new Date().toISOString()
        }
      });
    }

    const facultyId = req.user.facultyId;
    const results = [];
    const errors = [];

    for (let i = 0; i < attendance_data.length; i++) {
      const attendanceData = attendance_data[i];
      
      try {
        // Validate each attendance entry
        const { error, value } = validateAttendanceEntry(attendanceData);
        if (error) {
          errors.push({
            index: i,
            data: attendanceData,
            error: error.details[0].message
          });
          continue;
        }

        const { student_id, subject_id, total_classes, attended_classes } = value;

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
            data: attendanceData,
            error: 'Access denied to this subject'
          });
          continue;
        }

        // Update attendance
        const attendance = await Attendance.updateAttendance(
          student_id,
          subject_id,
          total_classes,
          attended_classes,
          facultyId
        );

        results.push({
          index: i,
          attendance_id: attendance.id,
          attendance_percentage: attendance.attendance_percentage,
          data: attendanceData
        });

      } catch (error) {
        errors.push({
          index: i,
          data: attendanceData,
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
      message: `Bulk attendance operation completed: ${results.length} successful, ${errors.length} failed`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk attendance operation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_ATTENDANCE_ERROR',
        message: 'Failed to process bulk attendance operation',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get attendance for a student (accessible by faculty for their subjects)
 * GET /api/attendance/student/:studentId
 */
const getStudentAttendance = async (req, res) => {
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
          attendance_records: [],
          overall_attendance: {
            overall_percentage: 0,
            total_classes: 0,
            attended_classes: 0
          },
          message: 'No subjects assigned to faculty'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get attendance for student in faculty's subjects only
    const attendanceRecords = await Attendance.findAll({
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
        [{ model: Subject, as: 'subject' }, 'subject_name', 'ASC']
      ]
    });

    // Calculate overall attendance
    const totalClasses = attendanceRecords.reduce((sum, record) => sum + record.total_classes, 0);
    const attendedClasses = attendanceRecords.reduce((sum, record) => sum + record.attended_classes, 0);
    const overallPercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

    res.json({
      success: true,
      data: {
        student: attendanceRecords.length > 0 ? attendanceRecords[0].student : null,
        attendance_records: attendanceRecords.map(record => ({
          id: record.id,
          subject: record.subject,
          total_classes: record.total_classes,
          attended_classes: record.attended_classes,
          attendance_percentage: record.attendance_percentage,
          is_below_threshold: record.isBelowThreshold(),
          required_classes_to_reach_threshold: record.getRequiredClassesToReachThreshold(),
          max_classes_to_miss: record.getMaxClassesToMiss(),
          updated_at: record.updated_at
        })),
        overall_attendance: {
          overall_percentage: Math.round(overallPercentage * 100) / 100,
          total_classes: totalClasses,
          attended_classes: attendedClasses
        },
        total_subjects: attendanceRecords.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_STUDENT_ATTENDANCE_ERROR',
        message: 'Failed to fetch student attendance',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get students with low attendance (below threshold)
 * GET /api/attendance/low-attendance
 */
const getStudentsWithLowAttendance = async (req, res) => {
  try {
    const { threshold = 75, subject_id, academic_year } = req.query;
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
      attributes: ['subject_id']
    });

    const subjectIds = facultySubjects.map(fs => fs.subject_id);

    if (subjectIds.length === 0) {
      return res.json({
        success: true,
        data: {
          low_attendance_students: [],
          threshold: parseFloat(threshold),
          message: 'No subjects assigned to faculty'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get students with low attendance in faculty's subjects
    const lowAttendanceRecords = await Attendance.findAll({
      where: {
        subject_id: subjectIds,
        attendance_percentage: {
          [require('sequelize').Op.lt]: parseFloat(threshold)
        }
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
      order: [['attendance_percentage', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        low_attendance_students: lowAttendanceRecords.map(record => ({
          student: record.student,
          subject: record.subject,
          attendance_percentage: record.attendance_percentage,
          total_classes: record.total_classes,
          attended_classes: record.attended_classes,
          required_classes_to_reach_threshold: record.getRequiredClassesToReachThreshold(parseFloat(threshold)),
          updated_at: record.updated_at
        })),
        threshold: parseFloat(threshold),
        total_records: lowAttendanceRecords.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get low attendance students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOW_ATTENDANCE_ERROR',
        message: 'Failed to fetch students with low attendance',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get attendance statistics for faculty's subjects
 * GET /api/attendance/statistics
 */
const getAttendanceStatistics = async (req, res) => {
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
      const subjectStats = await Attendance.getSubjectAttendanceStats(
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
    console.error('Get attendance statistics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ATTENDANCE_STATISTICS_ERROR',
        message: 'Failed to fetch attendance statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getAttendanceBySubject,
  addOrUpdateAttendance,
  bulkUpdateAttendance,
  getStudentAttendance,
  getStudentsWithLowAttendance,
  getAttendanceStatistics
};