const { Notification, User, Student, Subject, Attendance, Mark } = require('../models');
const { Op } = require('sequelize');

/**
 * Notification Controller
 * Handles notification management and delivery
 */

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      unread_only = false,
      notification_type = null
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unread_only === 'true',
      notificationType: notification_type
    };

    const result = await Notification.getUserNotifications(userId, options);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_NOTIFICATIONS_ERROR',
        message: 'Failed to fetch notifications',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get notification statistics for the authenticated user
 * GET /api/notifications/stats
 */
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Notification.getUserNotificationStats(userId);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_NOTIFICATION_STATS_ERROR',
        message: 'Failed to fetch notification statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get recent notifications for dashboard
 * GET /api/notifications/recent
 */
const getRecentNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    const notifications = await Notification.getRecentNotifications(userId, parseInt(limit));

    res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get recent notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_RECENT_NOTIFICATIONS_ERROR',
        message: 'Failed to fetch recent notifications',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: {
        id: id,
        recipient_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found or access denied',
          timestamp: new Date().toISOString()
        }
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      data: {
        notification: {
          id: notification.id,
          is_read: notification.is_read,
          updated_at: new Date().toISOString()
        }
      },
      message: 'Notification marked as read',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Failed to mark notification as read',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Mark multiple notifications as read
 * PUT /api/notifications/mark-read
 */
const markMultipleAsRead = async (req, res) => {
  try {
    const { notification_ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'notification_ids must be a non-empty array',
          timestamp: new Date().toISOString()
        }
      });
    }

    const updatedCount = await Notification.markMultipleAsRead(notification_ids, userId);

    res.json({
      success: true,
      data: {
        updated_count: updatedCount,
        notification_ids: notification_ids
      },
      message: `${updatedCount} notifications marked as read`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Mark multiple notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARK_MULTIPLE_READ_ERROR',
        message: 'Failed to mark notifications as read',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Send system announcement (Admin only)
 * POST /api/notifications/system-announcement
 */
const sendSystemAnnouncement = async (req, res) => {
  try {
    const { title, message, recipient_ids } = req.body;
    const senderId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title and message are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    let targetRecipients = recipient_ids;

    // If no specific recipients, send to all users
    if (!recipient_ids || recipient_ids.length === 0) {
      const allUsers = await User.findAll({
        where: {
          id: { [Op.ne]: senderId } // Exclude sender
        },
        attributes: ['id']
      });
      targetRecipients = allUsers.map(user => user.id);
    }

    if (targetRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_RECIPIENTS',
          message: 'No recipients found for the announcement',
          timestamp: new Date().toISOString()
        }
      });
    }

    const notifications = await Notification.sendBulkNotifications(
      targetRecipients,
      title,
      message,
      senderId,
      'system'
    );

    res.json({
      success: true,
      data: {
        notifications_sent: notifications.length,
        recipient_count: targetRecipients.length
      },
      message: 'System announcement sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Send system announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ANNOUNCEMENT_ERROR',
        message: 'Failed to send system announcement',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Send subject announcement (Faculty only)
 * POST /api/notifications/subject-announcement
 */
const sendSubjectAnnouncement = async (req, res) => {
  try {
    const { subject_id, title, message, academic_year } = req.body;
    const senderId = req.user.id;

    if (!subject_id || !title || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Subject ID, title, and message are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const notifications = await Notification.sendSubjectAnnouncement(
      subject_id,
      title,
      message,
      senderId,
      academic_year
    );

    res.json({
      success: true,
      data: {
        notifications_sent: notifications.length,
        subject_id: subject_id
      },
      message: 'Subject announcement sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Send subject announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBJECT_ANNOUNCEMENT_ERROR',
        message: 'Failed to send subject announcement',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Check and send low attendance alerts
 * POST /api/notifications/check-attendance-alerts
 */
const checkAndSendAttendanceAlerts = async (req, res) => {
  try {
    const { threshold = 75, subject_id = null } = req.body;
    
    // Get students with low attendance
    const lowAttendanceRecords = await Attendance.getStudentsWithLowAttendance(
      threshold, 
      subject_id
    );

    const alertsSent = [];
    const errors = [];

    for (const record of lowAttendanceRecords) {
      try {
        // Send alert to student
        const notification = await Notification.createLowAttendanceAlert(
          record.student.user_id,
          record.subject.subject_name,
          record.attendance_percentage
        );

        alertsSent.push({
          student_id: record.student.id,
          student_name: record.student.student_name,
          subject_name: record.subject.subject_name,
          attendance_percentage: record.attendance_percentage,
          notification_id: notification.id
        });

      } catch (error) {
        errors.push({
          student_id: record.student.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        alerts_sent: alertsSent.length,
        errors_count: errors.length,
        alerts: alertsSent,
        errors: errors,
        threshold: threshold
      },
      message: `${alertsSent.length} attendance alerts sent successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Check attendance alerts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ATTENDANCE_ALERTS_ERROR',
        message: 'Failed to check and send attendance alerts',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Check and send at-risk student alerts to faculty
 * POST /api/notifications/check-at-risk-alerts
 */
const checkAndSendAtRiskAlerts = async (req, res) => {
  try {
    const { academic_year = new Date().getFullYear() } = req.body;
    
    // Get students at risk based on multiple criteria
    const atRiskStudents = await getAtRiskStudents(academic_year);
    
    const alertsSent = [];
    const errors = [];

    for (const riskData of atRiskStudents) {
      try {
        // Send alert to faculty
        const notification = await Notification.createAtRiskStudentAlert(
          riskData.faculty_user_id,
          riskData.student_name,
          riskData.subject_name,
          riskData.risk_reason
        );

        alertsSent.push({
          faculty_id: riskData.faculty_id,
          student_id: riskData.student_id,
          student_name: riskData.student_name,
          subject_name: riskData.subject_name,
          risk_reason: riskData.risk_reason,
          notification_id: notification.id
        });

      } catch (error) {
        errors.push({
          faculty_id: riskData.faculty_id,
          student_id: riskData.student_id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        alerts_sent: alertsSent.length,
        errors_count: errors.length,
        alerts: alertsSent,
        errors: errors
      },
      message: `${alertsSent.length} at-risk student alerts sent to faculty`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Check at-risk alerts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AT_RISK_ALERTS_ERROR',
        message: 'Failed to check and send at-risk student alerts',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Helper function to identify at-risk students
 */
const getAtRiskStudents = async (academicYear) => {
  const atRiskStudents = [];

  // Get students with low attendance (< 75%)
  const lowAttendanceRecords = await Attendance.findAll({
    where: {
      attendance_percentage: { [Op.lt]: 75 }
    },
    include: [
      {
        model: Student,
        as: 'student',
        include: [{
          model: User,
          as: 'user'
        }]
      },
      {
        model: Subject,
        as: 'subject',
        include: [{
          model: require('../models').FacultySubject,
          as: 'facultyAssignments',
          where: { academic_year: academicYear },
          include: [{
            model: require('../models').Faculty,
            as: 'faculty',
            include: [{
              model: User,
              as: 'user'
            }]
          }]
        }]
      }
    ]
  });

  // Add low attendance students
  for (const record of lowAttendanceRecords) {
    if (record.subject.facultyAssignments && record.subject.facultyAssignments.length > 0) {
      const faculty = record.subject.facultyAssignments[0].faculty;
      atRiskStudents.push({
        student_id: record.student.id,
        student_name: record.student.student_name,
        faculty_id: faculty.id,
        faculty_user_id: faculty.user_id,
        subject_name: record.subject.subject_name,
        risk_reason: `low attendance (${record.attendance_percentage.toFixed(1)}%)`
      });
    }
  }

  // Get students with consistently low marks
  const lowMarksRecords = await Mark.findAll({
    where: {
      marks_obtained: {
        [Op.lt]: sequelize.literal('max_marks * 0.4') // Less than 40%
      }
    },
    include: [
      {
        model: Student,
        as: 'student',
        include: [{
          model: User,
          as: 'user'
        }]
      },
      {
        model: Subject,
        as: 'subject',
        include: [{
          model: require('../models').FacultySubject,
          as: 'facultyAssignments',
          where: { academic_year: academicYear },
          include: [{
            model: require('../models').Faculty,
            as: 'faculty',
            include: [{
              model: User,
              as: 'user'
            }]
          }]
        }]
      }
    ]
  });

  // Add low marks students
  for (const record of lowMarksRecords) {
    if (record.subject.facultyAssignments && record.subject.facultyAssignments.length > 0) {
      const faculty = record.subject.facultyAssignments[0].faculty;
      const percentage = ((record.marks_obtained / record.max_marks) * 100).toFixed(1);
      
      // Avoid duplicates
      const exists = atRiskStudents.some(student => 
        student.student_id === record.student.id && 
        student.faculty_id === faculty.id &&
        student.subject_name === record.subject.subject_name
      );

      if (!exists) {
        atRiskStudents.push({
          student_id: record.student.id,
          student_name: record.student.student_name,
          faculty_id: faculty.id,
          faculty_user_id: faculty.user_id,
          subject_name: record.subject.subject_name,
          risk_reason: `low marks (${percentage}% in ${record.exam_type.replace('_', ' ')})`
        });
      }
    }
  }

  return atRiskStudents;
};

/**
 * Delete old notifications (cleanup)
 * DELETE /api/notifications/cleanup
 */
const cleanupOldNotifications = async (req, res) => {
  try {
    const { days_old = 90 } = req.body;
    
    const deletedCount = await Notification.deleteOldNotifications(days_old);

    res.json({
      success: true,
      data: {
        deleted_count: deletedCount,
        days_old: days_old
      },
      message: `${deletedCount} old notifications deleted successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup old notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEANUP_ERROR',
        message: 'Failed to cleanup old notifications',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getUserNotifications,
  getNotificationStats,
  getRecentNotifications,
  markNotificationAsRead,
  markMultipleAsRead,
  sendSystemAnnouncement,
  sendSubjectAnnouncement,
  checkAndSendAttendanceAlerts,
  checkAndSendAtRiskAlerts,
  cleanupOldNotifications
};