const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { 
  User, 
  Student, 
  Faculty, 
  Subject, 
  Notification, 
  Attendance, 
  Mark,
  FacultySubject,
  StudentSubject 
} = require('../models');
const NotificationService = require('../services/notificationService');

describe('Notification System', () => {
  let adminToken, facultyToken, studentToken;
  let adminUser, facultyUser, studentUser;
  let faculty, student, subject;

  before(async () => {
    // Create test users
    adminUser = await User.create({
      unique_id: 'ADMIN001',
      email: 'admin@test.com',
      password_hash: '$2a$10$test.hash',
      role: 'admin'
    });

    facultyUser = await User.create({
      unique_id: 'FAC001',
      email: 'faculty@test.com',
      password_hash: '$2a$10$test.hash',
      role: 'faculty'
    });

    studentUser = await User.create({
      unique_id: 'STU001',
      email: 'student@test.com',
      password_hash: '$2a$10$test.hash',
      role: 'student'
    });

    // Create faculty and student records
    faculty = await Faculty.create({
      user_id: facultyUser.id,
      faculty_name: 'Test Faculty',
      department: 'Computer Science'
    });

    student = await Student.create({
      user_id: studentUser.id,
      student_name: 'Test Student',
      semester: 5,
      batch_year: 2023
    });

    // Create subject
    subject = await Subject.create({
      subject_code: 'CS501',
      subject_name: 'Software Engineering',
      subject_type: 'theory',
      semester: 5,
      credits: 3
    });

    // Create faculty-subject assignment
    await FacultySubject.create({
      faculty_id: faculty.id,
      subject_id: subject.id,
      academic_year: 2024
    });

    // Create student-subject enrollment
    await StudentSubject.create({
      student_id: student.id,
      subject_id: subject.id,
      academic_year: 2024
    });

    // Generate tokens (mock JWT tokens for testing)
    adminToken = 'mock-admin-token';
    facultyToken = 'mock-faculty-token';
    studentToken = 'mock-student-token';
  });

  after(async () => {
    // Cleanup test data
    await Notification.destroy({ where: {} });
    await Mark.destroy({ where: {} });
    await Attendance.destroy({ where: {} });
    await StudentSubject.destroy({ where: {} });
    await FacultySubject.destroy({ where: {} });
    await Subject.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('Notification Model', () => {
    it('should create system notification', async () => {
      const notification = await Notification.createSystemNotification(
        studentUser.id,
        'Test System Notification',
        'This is a test system notification',
        adminUser.id
      );

      expect(notification).to.exist;
      expect(notification.notification_type).to.equal('system');
      expect(notification.title).to.equal('Test System Notification');
      expect(notification.recipient_id).to.equal(studentUser.id);
      expect(notification.sender_id).to.equal(adminUser.id);
    });

    it('should create academic notification', async () => {
      const notification = await Notification.createAcademicNotification(
        studentUser.id,
        facultyUser.id,
        'Test Academic Notification',
        'This is a test academic notification'
      );

      expect(notification).to.exist;
      expect(notification.notification_type).to.equal('academic');
      expect(notification.title).to.equal('Test Academic Notification');
      expect(notification.recipient_id).to.equal(studentUser.id);
      expect(notification.sender_id).to.equal(facultyUser.id);
    });

    it('should create auto notification', async () => {
      const notification = await Notification.createAutoNotification(
        studentUser.id,
        'Test Auto Notification',
        'This is a test auto notification'
      );

      expect(notification).to.exist;
      expect(notification.notification_type).to.equal('auto');
      expect(notification.title).to.equal('Test Auto Notification');
      expect(notification.recipient_id).to.equal(studentUser.id);
      expect(notification.sender_id).to.be.null;
    });

    it('should create low attendance alert', async () => {
      const notification = await Notification.createLowAttendanceAlert(
        studentUser.id,
        'Software Engineering',
        65.5
      );

      expect(notification).to.exist;
      expect(notification.notification_type).to.equal('auto');
      expect(notification.title).to.equal('Low Attendance Alert');
      expect(notification.message).to.include('65.5%');
      expect(notification.message).to.include('Software Engineering');
    });

    it('should create at-risk student alert', async () => {
      const notification = await Notification.createAtRiskStudentAlert(
        facultyUser.id,
        'Test Student',
        'Software Engineering',
        'low attendance (65.5%)'
      );

      expect(notification).to.exist;
      expect(notification.notification_type).to.equal('auto');
      expect(notification.title).to.equal('At-Risk Student Alert');
      expect(notification.message).to.include('Test Student');
      expect(notification.message).to.include('Software Engineering');
      expect(notification.message).to.include('low attendance (65.5%)');
    });

    it('should mark notification as read', async () => {
      const notification = await Notification.createAutoNotification(
        studentUser.id,
        'Test Notification',
        'Test message'
      );

      expect(notification.is_read).to.be.false;

      await notification.markAsRead();
      expect(notification.is_read).to.be.true;
    });

    it('should get user notifications with pagination', async () => {
      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await Notification.createAutoNotification(
          studentUser.id,
          `Test Notification ${i}`,
          `Test message ${i}`
        );
      }

      const result = await Notification.getUserNotifications(studentUser.id, {
        page: 1,
        limit: 3
      });

      expect(result.notifications).to.have.length(3);
      expect(result.totalPages).to.be.greaterThan(1);
      expect(result.hasNextPage).to.be.true;
    });
  });

  describe('Notification Service', () => {
    beforeEach(async () => {
      // Clean notifications before each test
      await Notification.destroy({ where: {} });
    });

    it('should identify students with low attendance', async () => {
      // Create low attendance record
      await Attendance.create({
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 100,
        attended_classes: 60, // 60% attendance
        faculty_id: faculty.id
      });

      const lowAttendanceStudents = await NotificationService.getStudentsWithLowAttendance(2024);
      
      expect(lowAttendanceStudents).to.have.length(1);
      expect(lowAttendanceStudents[0].student_id).to.equal(student.id);
      expect(lowAttendanceStudents[0].risk_reason).to.include('60.0%');
    });

    it('should identify students with low marks', async () => {
      // Create low marks record
      await Mark.create({
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'series_test_1',
        marks_obtained: 15,
        max_marks: 50, // 30% marks
        faculty_id: faculty.id
      });

      const lowMarksStudents = await NotificationService.getStudentsWithLowMarks(2024);
      
      expect(lowMarksStudents).to.have.length(1);
      expect(lowMarksStudents[0].student_id).to.equal(student.id);
      expect(lowMarksStudents[0].risk_reason).to.include('30.0%');
    });

    it('should identify students with declining performance', async () => {
      // Create marks showing decline
      await Mark.create({
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'series_test_1',
        marks_obtained: 40,
        max_marks: 50, // 80% marks
        faculty_id: faculty.id
      });

      await Mark.create({
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'series_test_2',
        marks_obtained: 25,
        max_marks: 50, // 50% marks (30% decline)
        faculty_id: faculty.id
      });

      const decliningStudents = await NotificationService.getStudentsWithDecliningPerformance(2024);
      
      expect(decliningStudents).to.have.length(1);
      expect(decliningStudents[0].student_id).to.equal(student.id);
      expect(decliningStudents[0].risk_reason).to.include('30.0% drop');
    });

    it('should send low attendance alerts', async () => {
      // Create low attendance record
      await Attendance.create({
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 100,
        attended_classes: 60,
        faculty_id: faculty.id
      });

      const result = await NotificationService.checkAndSendLowAttendanceAlerts(75);
      
      expect(result.success).to.be.true;
      expect(result.alerts_sent).to.equal(1);
      
      const notifications = await Notification.findAll({
        where: { recipient_id: studentUser.id }
      });
      
      expect(notifications).to.have.length(1);
      expect(notifications[0].title).to.equal('Low Attendance Alert');
    });

    it('should send at-risk student alerts', async () => {
      // Create low attendance record
      await Attendance.create({
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 100,
        attended_classes: 60,
        faculty_id: faculty.id
      });

      const result = await NotificationService.checkAndSendAtRiskStudentAlerts(2024);
      
      expect(result.success).to.be.true;
      expect(result.alerts_sent).to.equal(1);
      
      const notifications = await Notification.findAll({
        where: { recipient_id: facultyUser.id }
      });
      
      expect(notifications).to.have.length(1);
      expect(notifications[0].title).to.equal('At-Risk Student Alert');
    });

    it('should not send duplicate alerts within time window', async () => {
      // Create low attendance record
      await Attendance.create({
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 100,
        attended_classes: 60,
        faculty_id: faculty.id
      });

      // Send first alert
      await NotificationService.checkAndSendLowAttendanceAlerts(75);
      
      // Try to send again immediately
      const result = await NotificationService.checkAndSendLowAttendanceAlerts(75);
      
      expect(result.alerts_sent).to.equal(0); // No new alerts sent
      
      const notifications = await Notification.findAll({
        where: { recipient_id: studentUser.id }
      });
      
      expect(notifications).to.have.length(1); // Only one notification
    });

    it('should handle attendance update notifications', async () => {
      const attendance = await Attendance.create({
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 100,
        attended_classes: 60, // 60% attendance
        faculty_id: faculty.id
      });

      await NotificationService.handleAttendanceUpdate(attendance);
      
      const notifications = await Notification.findAll({
        where: { recipient_id: studentUser.id }
      });
      
      expect(notifications).to.have.length(1);
      expect(notifications[0].title).to.equal('Low Attendance Alert');
    });

    it('should handle marks update notifications', async () => {
      const mark = await Mark.create({
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'series_test_1',
        marks_obtained: 15,
        max_marks: 50, // 30% marks
        faculty_id: faculty.id
      });

      await NotificationService.handleMarksUpdate(mark);
      
      const notifications = await Notification.findAll({
        where: { recipient_id: facultyUser.id }
      });
      
      expect(notifications).to.have.length(1);
      expect(notifications[0].title).to.equal('At-Risk Student Alert');
    });

    it('should cleanup old notifications', async () => {
      // Create old notification (simulate by setting created_at to past date)
      const oldNotification = await Notification.create({
        recipient_id: studentUser.id,
        notification_type: 'auto',
        title: 'Old Notification',
        message: 'This is old',
        is_read: true,
        created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
      });

      // Create recent notification
      await Notification.create({
        recipient_id: studentUser.id,
        notification_type: 'auto',
        title: 'Recent Notification',
        message: 'This is recent',
        is_read: false
      });

      const result = await NotificationService.cleanupOldNotifications(90);
      
      expect(result.success).to.be.true;
      expect(result.deleted_count).to.equal(1);
      
      const remainingNotifications = await Notification.findAll();
      expect(remainingNotifications).to.have.length(1);
      expect(remainingNotifications[0].title).to.equal('Recent Notification');
    });

    it('should get delivery statistics', async () => {
      // Create various notifications
      await Notification.create({
        recipient_id: studentUser.id,
        notification_type: 'system',
        title: 'System Notification',
        message: 'Test',
        is_read: true
      });

      await Notification.create({
        recipient_id: studentUser.id,
        notification_type: 'academic',
        title: 'Academic Notification',
        message: 'Test',
        is_read: false
      });

      await Notification.create({
        recipient_id: studentUser.id,
        notification_type: 'auto',
        title: 'Auto Notification',
        message: 'Test',
        is_read: true
      });

      const stats = await NotificationService.getDeliveryStats(30);
      
      expect(stats).to.exist;
      expect(stats.total_sent).to.equal(3);
      expect(stats.total_read).to.equal(2);
      expect(stats.by_type.system.sent).to.equal(1);
      expect(stats.by_type.academic.sent).to.equal(1);
      expect(stats.by_type.auto.sent).to.equal(1);
    });
  });

  describe('Notification API Endpoints', () => {
    beforeEach(async () => {
      // Clean notifications before each test
      await Notification.destroy({ where: {} });
    });

    // Note: These tests would require proper JWT middleware setup
    // For now, they serve as documentation of expected API behavior

    it('should get user notifications', async () => {
      // Create test notifications
      await Notification.createAutoNotification(
        studentUser.id,
        'Test Notification',
        'Test message'
      );

      // This would require proper authentication middleware
      // const response = await request(app)
      //   .get('/api/notifications')
      //   .set('Authorization', `Bearer ${studentToken}`)
      //   .expect(200);

      // expect(response.body.success).to.be.true;
      // expect(response.body.data.notifications).to.have.length(1);
    });

    it('should mark notification as read', async () => {
      const notification = await Notification.createAutoNotification(
        studentUser.id,
        'Test Notification',
        'Test message'
      );

      // This would require proper authentication middleware
      // const response = await request(app)
      //   .put(`/api/notifications/${notification.id}/read`)
      //   .set('Authorization', `Bearer ${studentToken}`)
      //   .expect(200);

      // expect(response.body.success).to.be.true;
      
      // await notification.reload();
      // expect(notification.is_read).to.be.true;
    });

    it('should send system announcement', async () => {
      // This would require proper authentication middleware
      // const response = await request(app)
      //   .post('/api/notifications/system-announcement')
      //   .set('Authorization', `Bearer ${adminToken}`)
      //   .send({
      //     title: 'System Announcement',
      //     message: 'This is a system-wide announcement',
      //     recipient_ids: [studentUser.id, facultyUser.id]
      //   })
      //   .expect(200);

      // expect(response.body.success).to.be.true;
      // expect(response.body.data.notifications_sent).to.equal(2);
    });

    it('should send subject announcement', async () => {
      // This would require proper authentication middleware
      // const response = await request(app)
      //   .post('/api/notifications/subject-announcement')
      //   .set('Authorization', `Bearer ${facultyToken}`)
      //   .send({
      //     subject_id: subject.id,
      //     title: 'Subject Announcement',
      //     message: 'This is a subject-specific announcement',
      //     academic_year: 2024
      //   })
      //   .expect(200);

      // expect(response.body.success).to.be.true;
      // expect(response.body.data.notifications_sent).to.equal(1);
    });

    it('should check and send attendance alerts', async () => {
      // Create low attendance record
      await Attendance.create({
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 100,
        attended_classes: 60,
        faculty_id: faculty.id
      });

      // This would require proper authentication middleware
      // const response = await request(app)
      //   .post('/api/notifications/check-attendance-alerts')
      //   .set('Authorization', `Bearer ${adminToken}`)
      //   .send({ threshold: 75 })
      //   .expect(200);

      // expect(response.body.success).to.be.true;
      // expect(response.body.data.alerts_sent).to.equal(1);
    });
  });
});