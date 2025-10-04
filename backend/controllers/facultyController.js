const { 
  Faculty, 
  FacultySubject, 
  Subject, 
  Student, 
  StudentSubject,
  User, 
  Mark, 
  Attendance,
  MLPrediction 
} = require('../models');
const { Op } = require('sequelize');

/**
 * Faculty Controller
 * Handles faculty-specific dashboard and data operations
 */

/**
 * Get faculty dashboard data
 * GET /api/faculty/dashboard
 */
const getFacultyDashboard = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const currentYear = new Date().getFullYear();

    if (!facultyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FACULTY_ID_MISSING',
          message: 'Faculty profile not found for this user',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get faculty info with user details
    const faculty = await Faculty.findByPk(facultyId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['unique_id', 'email', 'profile_photo']
        }
      ]
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FACULTY_NOT_FOUND',
          message: 'Faculty profile not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get subject assignments separately
    const subjectAssignments = await FacultySubject.findAll({
      where: { 
        faculty_id: facultyId,
        academic_year: currentYear 
      },
      include: [{
        model: Subject,
        as: 'subject'
      }]
    });

    const subjectIds = subjectAssignments.map(fs => fs.subject_id);
    
    // Get dashboard statistics
    const dashboardStats = {
      total_subjects: subjectIds.length,
      total_students: 0,
      students_at_risk: 0,
      low_attendance_alerts: 0,
      recent_activities: []
    };

    if (subjectIds.length > 0) {
      // Count total unique students across all subjects
      const uniqueStudents = await StudentSubject.findAll({
        where: { 
          subject_id: subjectIds,
          academic_year: currentYear 
        },
        attributes: ['student_id'],
        group: ['student_id']
      });
      dashboardStats.total_students = uniqueStudents.length;

      // Count students at risk (low marks or attendance) - simplified for now
      dashboardStats.students_at_risk = 0;

      // Count low attendance alerts - simplified for now
      dashboardStats.low_attendance_alerts = 0;

      // Get recent activities (recent marks entries)
      const recentMarks = await Mark.findAll({
        where: { 
          faculty_id: facultyId,
          created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        },
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['student_name']
          },
          {
            model: Subject,
            as: 'subject',
            attributes: ['subject_name', 'subject_code']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      dashboardStats.recent_activities = recentMarks.map(mark => ({
        type: 'marks_entry',
        description: `Added ${mark.exam_type} marks for ${mark.student.student_name} in ${mark.subject.subject_name}`,
        subject: mark.subject.subject_name,
        student: mark.student.student_name,
        marks: `${mark.marks_obtained}/${mark.max_marks}`,
        created_at: mark.created_at
      }));
    }

    res.json({
      success: true,
      data: {
        faculty_info: {
          id: faculty.id,
          name: faculty.faculty_name,
          department: faculty.department,
          is_tutor: faculty.is_tutor,
          tutor_semester: faculty.tutor_semester,
          user: faculty.user
        },
        assigned_subjects: subjectAssignments.map(fs => ({
          id: fs.subject.id,
          subject_code: fs.subject.subject_code,
          subject_name: fs.subject.subject_name,
          subject_type: fs.subject.subject_type,
          semester: fs.subject.semester,
          credits: fs.subject.credits
        })),
        dashboard_statistics: dashboardStats,
        academic_year: currentYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get faculty dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FACULTY_DASHBOARD_ERROR',
        message: 'Failed to fetch faculty dashboard data',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get subjects assigned to faculty
 * GET /api/faculty/subjects
 */
const getFacultySubjects = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const { academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    if (!facultyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FACULTY_ID_MISSING',
          message: 'Faculty profile not found for this user',
          timestamp: new Date().toISOString()
        }
      });
    }

    const facultySubjects = await FacultySubject.findAll({
      where: {
        faculty_id: facultyId,
        academic_year: currentYear
      },
      include: [{
        model: Subject,
        as: 'subject'
      }],
      order: [
        [{ model: Subject, as: 'subject' }, 'semester', 'ASC'],
        [{ model: Subject, as: 'subject' }, 'subject_name', 'ASC']
      ]
    });

    // Get additional statistics for each subject
    const subjectsWithStats = await Promise.all(
      facultySubjects.map(async (fs) => {
        const subjectId = fs.subject.id;
        
        // Count enrolled students
        const studentCount = await StudentSubject.count({
          where: { 
            subject_id: subjectId,
            academic_year: currentYear 
          }
        });

        // Count students with marks
        const studentsWithMarks = await Mark.count({
          where: { subject_id: subjectId },
          distinct: true,
          col: 'student_id'
        });

        // Count students with attendance records
        const studentsWithAttendance = await Attendance.count({
          where: { subject_id: subjectId }
        });

        // Get average attendance for the subject
        const avgAttendanceResult = await Attendance.findAll({
          where: { subject_id: subjectId },
          attributes: [
            [require('sequelize').fn('AVG', require('sequelize').literal('(attended_classes * 100.0 / total_classes)')), 'avg_attendance']
          ],
          raw: true
        });
        
        const avgAttendance = avgAttendanceResult[0]?.avg_attendance || 0;

        return {
          id: fs.subject.id,
          subject_code: fs.subject.subject_code,
          subject_name: fs.subject.subject_name,
          subject_type: fs.subject.subject_type,
          semester: fs.subject.semester,
          credits: fs.subject.credits,
          statistics: {
            enrolled_students: studentCount,
            students_with_marks: studentsWithMarks,
            students_with_attendance: studentsWithAttendance,
            average_attendance: Math.round(avgAttendance * 100) / 100,
            marks_completion_rate: studentCount > 0 ? Math.round((studentsWithMarks / studentCount) * 100) : 0,
            attendance_completion_rate: studentCount > 0 ? Math.round((studentsWithAttendance / studentCount) * 100) : 0
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        subjects: subjectsWithStats,
        academic_year: currentYear,
        total_subjects: subjectsWithStats.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get faculty subjects error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FACULTY_SUBJECTS_ERROR',
        message: 'Failed to fetch faculty subjects',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get students enrolled in a specific subject
 * GET /api/faculty/subjects/:subjectId/students
 */
const getSubjectStudents = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { academic_year } = req.query;
    const facultyId = req.user.facultyId;
    const currentYear = academic_year || new Date().getFullYear();

    // Verify faculty has access to this subject
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

    // Get subject info
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

    // Get enrolled students with their academic data
    const enrolledStudents = await StudentSubject.findAll({
      where: {
        subject_id: subjectId,
        academic_year: currentYear
      },
      include: [{
        model: Student,
        as: 'student',
        include: [{
          model: User,
          as: 'user',
          attributes: ['unique_id', 'email', 'profile_photo']
        }]
      }],
      order: [
        [{ model: Student, as: 'student' }, 'student_name', 'ASC']
      ]
    });

    // Get marks and attendance data for each student
    const studentsWithData = await Promise.all(
      enrolledStudents.map(async (enrollment) => {
        const studentId = enrollment.student.id;

        // Get marks for this student in this subject
        const marks = await Mark.findAll({
          where: {
            student_id: studentId,
            subject_id: subjectId
          },
          order: [['exam_type', 'ASC']]
        });

        // Get attendance for this student in this subject
        const attendance = await Attendance.findOne({
          where: {
            student_id: studentId,
            subject_id: subjectId
          }
        });

        // Get ML predictions if available
        const prediction = await MLPrediction.findOne({
          where: {
            student_id: studentId,
            subject_id: subjectId
          },
          order: [['created_at', 'DESC']]
        });

        // Calculate performance indicators
        const marksData = {};
        marks.forEach(mark => {
          marksData[mark.exam_type] = {
            marks_obtained: mark.marks_obtained,
            max_marks: mark.max_marks,
            percentage: mark.getPercentage(),
            grade: mark.getGrade(),
            passed: mark.isPassed()
          };
        });

        const isAtRisk = (
          (attendance && attendance.attendance_percentage < 75) ||
          marks.some(mark => mark.getPercentage() < 40)
        );

        return {
          student: {
            id: enrollment.student.id,
            name: enrollment.student.student_name,
            semester: enrollment.student.semester,
            batch_year: enrollment.student.batch_year,
            user: enrollment.student.user
          },
          marks: marksData,
          attendance: attendance ? {
            total_classes: attendance.total_classes,
            attended_classes: attendance.attended_classes,
            attendance_percentage: attendance.attendance_percentage,
            is_below_threshold: attendance.isBelowThreshold()
          } : null,
          prediction: prediction ? {
            predicted_marks: prediction.predicted_marks,
            confidence_score: prediction.confidence_score,
            is_visible: prediction.is_visible_to_student
          } : null,
          performance_indicators: {
            is_at_risk: isAtRisk,
            total_marks_entered: marks.length,
            has_attendance_record: !!attendance,
            has_prediction: !!prediction
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        subject: {
          id: subject.id,
          subject_code: subject.subject_code,
          subject_name: subject.subject_name,
          subject_type: subject.subject_type,
          semester: subject.semester
        },
        students: studentsWithData,
        statistics: {
          total_enrolled: studentsWithData.length,
          students_at_risk: studentsWithData.filter(s => s.performance_indicators.is_at_risk).length,
          students_with_marks: studentsWithData.filter(s => s.performance_indicators.total_marks_entered > 0).length,
          students_with_attendance: studentsWithData.filter(s => s.performance_indicators.has_attendance_record).length
        },
        academic_year: currentYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get subject students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBJECT_STUDENTS_ERROR',
        message: 'Failed to fetch subject students',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get students at risk of failing in faculty's subjects
 * GET /api/faculty/at-risk-students
 */
const getAtRiskStudents = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const { academic_year, subject_id } = req.query;
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
          at_risk_students: [],
          message: 'No subjects assigned to faculty'
        },
        timestamp: new Date().toISOString()
      });
    }

    const atRiskStudents = await getAtRiskStudentsData(subjectIds, currentYear);

    res.json({
      success: true,
      data: {
        at_risk_students: atRiskStudents,
        total_at_risk: atRiskStudents.length,
        academic_year: currentYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get at-risk students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AT_RISK_STUDENTS_ERROR',
        message: 'Failed to fetch at-risk students',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Helper function to get at-risk students data
 */
const getAtRiskStudentsData = async (subjectIds, academicYear) => {
  try {
    // Get students with low attendance (< 75%)
    const lowAttendanceStudents = await Attendance.findAll({
      where: {
        subject_id: subjectIds,
        [Op.and]: [
          require('sequelize').literal('(attended_classes * 100.0 / total_classes) < 75')
        ]
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
      ]
    });

    // Get students with low marks (< 40%)
    const lowMarksStudents = await Mark.findAll({
      where: {
        subject_id: subjectIds,
        marks_obtained: {
          [Op.lt]: require('sequelize').literal('max_marks * 0.4')
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
      ]
    });

    // Combine and deduplicate students
    const atRiskMap = new Map();

    // Add low attendance students
    lowAttendanceStudents.forEach(record => {
      const key = `${record.student.id}-${record.subject.id}`;
      if (!atRiskMap.has(key)) {
        atRiskMap.set(key, {
          student: record.student,
          subject: record.subject,
          risk_factors: [],
          attendance_data: null,
          marks_data: []
        });
      }
      
      const studentData = atRiskMap.get(key);
      studentData.risk_factors.push('low_attendance');
      studentData.attendance_data = {
        attendance_percentage: record.attendance_percentage, // This is a virtual field, so it should work
        total_classes: record.total_classes,
        attended_classes: record.attended_classes
      };
    });

    // Add low marks students
    lowMarksStudents.forEach(record => {
      const key = `${record.student.id}-${record.subject.id}`;
      if (!atRiskMap.has(key)) {
        atRiskMap.set(key, {
          student: record.student,
          subject: record.subject,
          risk_factors: [],
          attendance_data: null,
          marks_data: []
        });
      }
      
      const studentData = atRiskMap.get(key);
      if (!studentData.risk_factors.includes('low_marks')) {
        studentData.risk_factors.push('low_marks');
      }
      studentData.marks_data.push({
        exam_type: record.exam_type,
        marks_obtained: record.marks_obtained,
        max_marks: record.max_marks,
        percentage: record.getPercentage()
      });
    });

    return Array.from(atRiskMap.values()).map(data => ({
      student: data.student,
      subject: data.subject,
      risk_factors: data.risk_factors,
      attendance: data.attendance_data,
      marks: data.marks_data,
      risk_level: data.risk_factors.length > 1 ? 'high' : 'medium'
    }));

  } catch (error) {
    console.error('Error getting at-risk students data:', error);
    return [];
  }
};

module.exports = {
  getFacultyDashboard,
  getFacultySubjects,
  getSubjectStudents,
  getAtRiskStudents
};