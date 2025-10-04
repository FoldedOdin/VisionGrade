const { Notification, Attendance, Mark, Student, Subject, Faculty, User, FacultySubject } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

/**
 * Notification Service
 * Handles automated notification generation and delivery
 */

class NotificationService {
  
  /**
   * Check and send low attendance alerts automatically
   * This should be called periodically (e.g., daily via cron job)
   */
  static async checkAndSendLowAttendanceAlerts(threshold = 75) {
    try {
      console.log(`Checking for low attendance alerts (threshold: ${threshold}%)`);
      
      // Get all students with low attendance
      const lowAttendanceRecords = await Attendance.findAll({
        where: {
          [Op.and]: [
            require('sequelize').literal(`(attended_classes * 100.0 / total_classes) < ${threshold}`)
          ]
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
            as: 'subject'
          }
        ]
      });

      const alertsSent = [];
      const errors = [];

      for (const record of lowAttendanceRecords) {
        try {
          // Check if alert was already sent recently (within last 7 days)
          const recentAlert = await Notification.findOne({
            where: {
              recipient_id: record.student.user_id,
              notification_type: 'auto',
              title: 'Low Attendance Alert',
              message: {
                [Op.like]: `%${record.subject.subject_name}%`
              },
              created_at: {
                [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            }
          });

          if (!recentAlert) {
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

            console.log(`Low attendance alert sent to ${record.student.student_name} for ${record.subject.subject_name}`);
          }

        } catch (error) {
          console.error(`Error sending low attendance alert for student ${record.student.id}:`, error);
          errors.push({
            student_id: record.student.id,
            error: error.message
          });
        }
      }

      console.log(`Low attendance alerts completed: ${alertsSent.length} sent, ${errors.length} errors`);
      
      return {
        success: true,
        alerts_sent: alertsSent.length,
        errors_count: errors.length,
        alerts: alertsSent,
        errors: errors
      };

    } catch (error) {
      console.error('Error in checkAndSendLowAttendanceAlerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and send at-risk student alerts to faculty
   * This should be called periodically (e.g., weekly via cron job)
   */
  static async checkAndSendAtRiskStudentAlerts(academicYear = null) {
    try {
      const currentYear = academicYear || new Date().getFullYear();
      console.log(`Checking for at-risk student alerts (academic year: ${currentYear})`);

      const atRiskStudents = await this.identifyAtRiskStudents(currentYear);
      
      const alertsSent = [];
      const errors = [];

      for (const riskData of atRiskStudents) {
        try {
          // Check if alert was already sent recently (within last 14 days)
          const recentAlert = await Notification.findOne({
            where: {
              recipient_id: riskData.faculty_user_id,
              notification_type: 'auto',
              title: 'At-Risk Student Alert',
              message: {
                [Op.like]: `%${riskData.student_name}%${riskData.subject_name}%`
              },
              created_at: {
                [Op.gte]: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 14 days
              }
            }
          });

          if (!recentAlert) {
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

            console.log(`At-risk alert sent to faculty for student ${riskData.student_name} in ${riskData.subject_name}`);
          }

        } catch (error) {
          console.error(`Error sending at-risk alert for student ${riskData.student_id}:`, error);
          errors.push({
            faculty_id: riskData.faculty_id,
            student_id: riskData.student_id,
            error: error.message
          });
        }
      }

      console.log(`At-risk student alerts completed: ${alertsSent.length} sent, ${errors.length} errors`);
      
      return {
        success: true,
        alerts_sent: alertsSent.length,
        errors_count: errors.length,
        alerts: alertsSent,
        errors: errors
      };

    } catch (error) {
      console.error('Error in checkAndSendAtRiskStudentAlerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Identify at-risk students based on multiple criteria
   */
  static async identifyAtRiskStudents(academicYear) {
    const atRiskStudents = [];

    try {
      // Criteria 1: Students with low attendance (< 75%)
      const lowAttendanceStudents = await this.getStudentsWithLowAttendance(academicYear);
      atRiskStudents.push(...lowAttendanceStudents);

      // Criteria 2: Students with consistently low marks (< 40%)
      const lowMarksStudents = await this.getStudentsWithLowMarks(academicYear);
      atRiskStudents.push(...lowMarksStudents);

      // Criteria 3: Students with declining performance trend
      const decliningStudents = await this.getStudentsWithDecliningPerformance(academicYear);
      atRiskStudents.push(...decliningStudents);

      // Remove duplicates based on student_id, faculty_id, and subject combination
      const uniqueAtRiskStudents = this.removeDuplicateAlerts(atRiskStudents);

      return uniqueAtRiskStudents;

    } catch (error) {
      console.error('Error identifying at-risk students:', error);
      return [];
    }
  }

  /**
   * Get students with low attendance
   */
  static async getStudentsWithLowAttendance(academicYear) {
    const students = [];

    try {
      const lowAttendanceRecords = await Attendance.findAll({
        where: {
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
              as: 'user'
            }]
          },
          {
            model: Subject,
            as: 'subject',
            include: [{
              model: FacultySubject,
              as: 'facultyAssignments',
              where: { academic_year: academicYear },
              include: [{
                model: Faculty,
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

      for (const record of lowAttendanceRecords) {
        if (record.subject.facultyAssignments && record.subject.facultyAssignments.length > 0) {
          const faculty = record.subject.facultyAssignments[0].faculty;
          students.push({
            student_id: record.student.id,
            student_name: record.student.student_name,
            faculty_id: faculty.id,
            faculty_user_id: faculty.user_id,
            subject_name: record.subject.subject_name,
            risk_reason: `low attendance (${record.attendance_percentage.toFixed(1)}%)`,
            risk_type: 'attendance'
          });
        }
      }

    } catch (error) {
      console.error('Error getting students with low attendance:', error);
    }

    return students;
  }

  /**
   * Get students with low marks
   */
  static async getStudentsWithLowMarks(academicYear) {
    const students = [];

    try {
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
              model: FacultySubject,
              as: 'facultyAssignments',
              where: { academic_year: academicYear },
              include: [{
                model: Faculty,
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

      for (const record of lowMarksRecords) {
        if (record.subject.facultyAssignments && record.subject.facultyAssignments.length > 0) {
          const faculty = record.subject.facultyAssignments[0].faculty;
          const percentage = ((record.marks_obtained / record.max_marks) * 100).toFixed(1);
          
          students.push({
            student_id: record.student.id,
            student_name: record.student.student_name,
            faculty_id: faculty.id,
            faculty_user_id: faculty.user_id,
            subject_name: record.subject.subject_name,
            risk_reason: `low marks (${percentage}% in ${record.exam_type.replace('_', ' ')})`,
            risk_type: 'marks'
          });
        }
      }

    } catch (error) {
      console.error('Error getting students with low marks:', error);
    }

    return students;
  }

  /**
   * Get students with declining performance trend
   */
  static async getStudentsWithDecliningPerformance(academicYear) {
    const students = [];

    try {
      // Get students who have both Series Test I and II marks
      const studentsWithBothTests = await Mark.findAll({
        where: {
          exam_type: { [Op.in]: ['series_test_1', 'series_test_2'] }
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
              model: FacultySubject,
              as: 'facultyAssignments',
              where: { academic_year: academicYear },
              include: [{
                model: Faculty,
                as: 'faculty',
                include: [{
                  model: User,
                  as: 'user'
                }]
              }]
            }]
          }
        ],
        order: [['student_id'], ['subject_id'], ['exam_type']]
      });

      // Group by student and subject to compare test scores
      const groupedMarks = {};
      
      for (const record of studentsWithBothTests) {
        const key = `${record.student_id}_${record.subject_id}`;
        if (!groupedMarks[key]) {
          groupedMarks[key] = {
            student: record.student,
            subject: record.subject,
            faculty: record.subject.facultyAssignments[0]?.faculty,
            marks: {}
          };
        }
        
        const percentage = (record.marks_obtained / record.max_marks) * 100;
        groupedMarks[key].marks[record.exam_type] = percentage;
      }

      // Check for declining performance
      for (const key in groupedMarks) {
        const data = groupedMarks[key];
        const test1 = data.marks.series_test_1;
        const test2 = data.marks.series_test_2;

        if (test1 && test2 && data.faculty) {
          const decline = test1 - test2;
          
          // Alert if performance declined by more than 15% or if Test 2 is below 50%
          if (decline > 15 || test2 < 50) {
            students.push({
              student_id: data.student.id,
              student_name: data.student.student_name,
              faculty_id: data.faculty.id,
              faculty_user_id: data.faculty.user_id,
              subject_name: data.subject.subject_name,
              risk_reason: decline > 15 
                ? `declining performance (${decline.toFixed(1)}% drop from Test I to Test II)`
                : `poor performance in Test II (${test2.toFixed(1)}%)`,
              risk_type: 'performance'
            });
          }
        }
      }

    } catch (error) {
      console.error('Error getting students with declining performance:', error);
    }

    return students;
  }

  /**
   * Remove duplicate alerts for the same student-faculty-subject combination
   */
  static removeDuplicateAlerts(atRiskStudents) {
    const seen = new Set();
    const unique = [];

    for (const student of atRiskStudents) {
      const key = `${student.student_id}_${student.faculty_id}_${student.subject_name}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(student);
      } else {
        // If duplicate, combine risk reasons
        const existing = unique.find(s => 
          s.student_id === student.student_id && 
          s.faculty_id === student.faculty_id && 
          s.subject_name === student.subject_name
        );
        
        if (existing && !existing.risk_reason.includes(student.risk_reason)) {
          existing.risk_reason += ` and ${student.risk_reason}`;
        }
      }
    }

    return unique;
  }

  /**
   * Send notification when attendance is updated and becomes low
   */
  static async handleAttendanceUpdate(attendanceRecord) {
    try {
      if (attendanceRecord.attendance_percentage < 75) {
        // Get student and subject information
        const attendance = await Attendance.findByPk(attendanceRecord.id, {
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
              as: 'subject'
            }
          ]
        });

        if (attendance) {
          // Check if alert was sent recently (within last 3 days)
          const recentAlert = await Notification.findOne({
            where: {
              recipient_id: attendance.student.user_id,
              notification_type: 'auto',
              title: 'Low Attendance Alert',
              message: {
                [Op.like]: `%${attendance.subject.subject_name}%`
              },
              created_at: {
                [Op.gte]: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
              }
            }
          });

          if (!recentAlert) {
            await Notification.createLowAttendanceAlert(
              attendance.student.user_id,
              attendance.subject.subject_name,
              attendance.attendance_percentage
            );

            console.log(`Immediate low attendance alert sent to ${attendance.student.student_name} for ${attendance.subject.subject_name}`);
          }
        }
      }

    } catch (error) {
      console.error('Error handling attendance update notification:', error);
    }
  }

  /**
   * Send notification when marks are added and student is at risk
   */
  static async handleMarksUpdate(markRecord) {
    try {
      const percentage = (markRecord.marks_obtained / markRecord.max_marks) * 100;
      
      if (percentage < 40) { // Below 40% is considered at risk
        // Get mark with student and subject information
        const mark = await Mark.findByPk(markRecord.id, {
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
                model: FacultySubject,
                as: 'facultyAssignments',
                where: { academic_year: new Date().getFullYear() },
                include: [{
                  model: Faculty,
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

        if (mark && mark.subject.facultyAssignments && mark.subject.facultyAssignments.length > 0) {
          const faculty = mark.subject.facultyAssignments[0].faculty;
          
          // Check if alert was sent recently (within last 7 days)
          const recentAlert = await Notification.findOne({
            where: {
              recipient_id: faculty.user_id,
              notification_type: 'auto',
              title: 'At-Risk Student Alert',
              message: {
                [Op.like]: `%${mark.student.student_name}%${mark.subject.subject_name}%`
              },
              created_at: {
                [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            }
          });

          if (!recentAlert) {
            await Notification.createAtRiskStudentAlert(
              faculty.user_id,
              mark.student.student_name,
              mark.subject.subject_name,
              `low marks (${percentage.toFixed(1)}% in ${markRecord.exam_type.replace('_', ' ')})`
            );

            console.log(`Immediate at-risk alert sent to faculty for student ${mark.student.student_name} in ${mark.subject.subject_name}`);
          }
        }
      }

    } catch (error) {
      console.error('Error handling marks update notification:', error);
    }
  }

  /**
   * Clean up old notifications periodically
   */
  static async cleanupOldNotifications(daysOld = 90) {
    try {
      console.log(`Cleaning up notifications older than ${daysOld} days`);
      
      const deletedCount = await Notification.deleteOldNotifications(daysOld);
      
      console.log(`Cleanup completed: ${deletedCount} old notifications deleted`);
      
      return {
        success: true,
        deleted_count: deletedCount
      };

    } catch (error) {
      console.error('Error in notification cleanup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get notification delivery statistics
   */
  static async getDeliveryStats(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const stats = await Notification.findAll({
        where: {
          created_at: { [Op.gte]: startDate }
        },
        attributes: [
          'notification_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.cast(sequelize.col('is_read'), 'integer')), 'read_count']
        ],
        group: ['notification_type'],
        raw: true
      });

      const result = {
        period_days: days,
        total_sent: 0,
        total_read: 0,
        by_type: {}
      };

      for (const stat of stats) {
        const count = parseInt(stat.count);
        const readCount = parseInt(stat.read_count) || 0;
        
        result.total_sent += count;
        result.total_read += readCount;
        
        result.by_type[stat.notification_type] = {
          sent: count,
          read: readCount,
          read_percentage: count > 0 ? ((readCount / count) * 100).toFixed(1) : 0
        };
      }

      result.overall_read_percentage = result.total_sent > 0 
        ? ((result.total_read / result.total_sent) * 100).toFixed(1) 
        : 0;

      return result;

    } catch (error) {
      console.error('Error getting notification delivery stats:', error);
      return null;
    }
  }
}

module.exports = NotificationService;