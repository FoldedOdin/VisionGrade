const { Student, User, Subject, Mark, Attendance, Notification, MLPrediction } = require('../models');
const { Op } = require('sequelize');
const reportService = require('../services/reportService');
const { validationResult } = require('express-validator');

/**
 * Student Controller
 * Handles all student-related operations
 */

class StudentController {
    /**
     * Get student dashboard data
     */
    async getDashboard(req, res) {
        try {
            const userId = req.user.id;
            
            const student = await Student.findOne({
                where: { user_id: userId },
                include: [{
                    model: User,
                    attributes: ['unique_id', 'email', 'profile_photo']
                }]
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Student not found' }
                });
            }

            // Get recent marks
            const recentMarks = await Mark.findAll({
                where: { student_id: student.id },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name']
                }],
                order: [['created_at', 'DESC']],
                limit: 5
            });

            // Get attendance summary
            const attendanceData = await Attendance.findAll({
                where: { student_id: student.id },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name']
                }]
            });

            // Get unread notifications count
            const unreadNotifications = await Notification.count({
                where: {
                    recipient_id: userId,
                    is_read: false
                }
            });

            // Get ML predictions if available
            const predictions = await MLPrediction.findAll({
                where: {
                    student_id: student.id,
                    is_visible_to_student: true
                },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name']
                }]
            });

            res.json({
                success: true,
                data: {
                    student,
                    recentMarks,
                    attendanceData,
                    unreadNotifications,
                    predictions
                }
            });

        } catch (error) {
            console.error('Error fetching student dashboard:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch dashboard data' }
            });
        }
    }

    /**
     * Get all marks for the student
     */
    async getMarks(req, res) {
        try {
            const userId = req.user.id;
            
            const student = await Student.findOne({
                where: { user_id: userId }
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Student not found' }
                });
            }

            const marks = await Mark.findAll({
                where: { student_id: student.id },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name', 'subject_type', 'credits']
                }],
                order: [['created_at', 'DESC']]
            });

            // Group marks by subject
            const marksBySubject = marks.reduce((acc, mark) => {
                const subjectCode = mark.Subject.subject_code;
                if (!acc[subjectCode]) {
                    acc[subjectCode] = {
                        subject: mark.Subject,
                        marks: []
                    };
                }
                acc[subjectCode].marks.push({
                    id: mark.id,
                    exam_type: mark.exam_type,
                    marks_obtained: mark.marks_obtained,
                    max_marks: mark.max_marks,
                    percentage: ((mark.marks_obtained / mark.max_marks) * 100).toFixed(2),
                    created_at: mark.created_at
                });
                return acc;
            }, {});

            res.json({
                success: true,
                data: {
                    marksBySubject,
                    totalSubjects: Object.keys(marksBySubject).length
                }
            });

        } catch (error) {
            console.error('Error fetching student marks:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch marks data' }
            });
        }
    }

    /**
     * Get attendance data for the student
     */
    async getAttendance(req, res) {
        try {
            const userId = req.user.id;
            
            const student = await Student.findOne({
                where: { user_id: userId }
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Student not found' }
                });
            }

            const attendance = await Attendance.findAll({
                where: { student_id: student.id },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name', 'subject_type']
                }],
                order: [['updated_at', 'DESC']]
            });

            // Calculate overall attendance
            const totalClasses = attendance.reduce((sum, att) => sum + att.total_classes, 0);
            const totalAttended = attendance.reduce((sum, att) => sum + att.attended_classes, 0);
            const overallPercentage = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(2) : 0;

            // Identify subjects with low attendance
            const lowAttendanceSubjects = attendance.filter(att => att.attendance_percentage < 75);

            res.json({
                success: true,
                data: {
                    attendance,
                    overallPercentage,
                    totalClasses,
                    totalAttended,
                    lowAttendanceSubjects
                }
            });

        } catch (error) {
            console.error('Error fetching student attendance:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch attendance data' }
            });
        }
    }

    /**
     * Get ML predictions for the student
     */
    async getPredictions(req, res) {
        try {
            const userId = req.user.id;
            
            const student = await Student.findOne({
                where: { user_id: userId }
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Student not found' }
                });
            }

            const predictions = await MLPrediction.findAll({
                where: {
                    student_id: student.id,
                    is_visible_to_student: true
                },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name', 'subject_type']
                }],
                order: [['created_at', 'DESC']]
            });

            res.json({
                success: true,
                data: {
                    predictions,
                    totalPredictions: predictions.length
                }
            });

        } catch (error) {
            console.error('Error fetching student predictions:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch predictions data' }
            });
        }
    }

    /**
     * Get notifications for the student
     */
    async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, type } = req.query;
            
            const offset = (page - 1) * limit;
            const whereClause = { recipient_id: userId };
            
            if (type) {
                whereClause.notification_type = type;
            }

            const { count, rows: notifications } = await Notification.findAndCountAll({
                where: whereClause,
                include: [{
                    model: User,
                    as: 'Sender',
                    attributes: ['unique_id', 'role']
                }],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            const totalPages = Math.ceil(count / limit);

            res.json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalNotifications: count,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching student notifications:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch notifications' }
            });
        }
    }

    /**
     * Get unread notifications count
     */
    async getNotificationCount(req, res) {
        try {
            const userId = req.user.id;
            
            const unreadCount = await Notification.count({
                where: {
                    recipient_id: userId,
                    is_read: false
                }
            });

            res.json({
                success: true,
                data: { unreadCount }
            });

        } catch (error) {
            console.error('Error fetching notification count:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch notification count' }
            });
        }
    }

    /**
     * Mark notification as read
     */
    async markNotificationRead(req, res) {
        try {
            const userId = req.user.id;
            const { notificationId } = req.params;

            const notification = await Notification.findOne({
                where: {
                    id: notificationId,
                    recipient_id: userId
                }
            });

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Notification not found' }
                });
            }

            await notification.update({ is_read: true });

            res.json({
                success: true,
                data: { message: 'Notification marked as read' }
            });

        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to mark notification as read' }
            });
        }
    }

    /**
     * Generate and download report card
     */
    async generateReportCard(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        details: errors.array()
                    }
                });
            }

            const userId = req.user.id;
            const { format = 'pdf' } = req.body;

            const student = await Student.findOne({
                where: { user_id: userId },
                include: [{
                    model: User,
                    attributes: ['unique_id', 'email']
                }]
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Student not found' }
                });
            }

            // Get all student data for report
            const marks = await Mark.findAll({
                where: { student_id: student.id },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name', 'subject_type', 'credits']
                }],
                order: [['created_at', 'ASC']]
            });

            const attendance = await Attendance.findAll({
                where: { student_id: student.id },
                include: [{
                    model: Subject,
                    attributes: ['subject_code', 'subject_name']
                }]
            });

            // Generate report using report service
            const reportData = {
                student,
                marks,
                attendance,
                generatedAt: new Date()
            };

            const reportResult = await reportService.generateStudentReportCard(reportData, format);

            res.json({
                success: true,
                data: {
                    reportUrl: reportResult.filePath,
                    format: format,
                    reportData: reportData
                }
            });

        } catch (error) {
            console.error('Error generating report card:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to generate report card' }
            });
        }
    }

    /**
     * Get student profile
     */
    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            
            const student = await Student.findOne({
                where: { user_id: userId },
                include: [{
                    model: User,
                    attributes: ['unique_id', 'email', 'phone', 'profile_photo', 'created_at']
                }]
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Student not found' }
                });
            }

            res.json({
                success: true,
                data: { student }
            });

        } catch (error) {
            console.error('Error fetching student profile:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch profile' }
            });
        }
    }
}

const studentController = new StudentController();

module.exports = {
    getDashboard: studentController.getDashboard.bind(studentController),
    getMarks: studentController.getMarks.bind(studentController),
    getAttendance: studentController.getAttendance.bind(studentController),
    getPredictions: studentController.getPredictions.bind(studentController),
    getNotifications: studentController.getNotifications.bind(studentController),
    getNotificationCount: studentController.getNotificationCount.bind(studentController),
    markNotificationRead: studentController.markNotificationRead.bind(studentController),
    generateReportCard: studentController.generateReportCard.bind(studentController),
    getProfile: studentController.getProfile.bind(studentController)
};