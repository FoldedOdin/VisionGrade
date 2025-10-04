const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const { User, Student, Subject, Mark, Attendance, Notification } = require('../../models');
const { generateToken } = require('../../utils/jwt');

describe('Student API Integration Tests', () => {
  let server;
  let testStudent;
  let testSubject;
  let studentToken;

  before(async () => {
    server = app.listen(0);
    
    // Create test student
    const user = await User.create({
      uniqueId: 'STU001',
      email: 'student@example.com',
      phone: '1111111111',
      passwordHash: '$2a$10$test.hash.here',
      role: 'student'
    });

    testStudent = await Student.create({
      userId: user.id,
      studentName: 'Test Student',
      semester: 1,
      batchYear: 2024
    });

    testSubject = await Subject.create({
      subjectCode: 'MATH101',
      subjectName: 'Mathematics',
      subjectType: 'theory',
      semester: 1,
      credits: 4
    });

    studentToken = generateToken({ id: user.id, role: 'student' });
  });

  after(async () => {
    // Cleanup
    await Mark.destroy({ where: { studentId: testStudent.id } });
    await Attendance.destroy({ where: { studentId: testStudent.id } });
    await Notification.destroy({ where: { recipientId: testStudent.userId } });
    await Subject.destroy({ where: { id: testSubject.id } });
    await Student.destroy({ where: { id: testStudent.id } });
    await User.destroy({ where: { id: testStudent.userId } });
    server.close();
  });

  describe('GET /api/students/dashboard', () => {
    it('should get student dashboard data', async () => {
      const response = await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('student');
      expect(response.body.data).to.have.property('subjects');
      expect(response.body.data).to.have.property('recentMarks');
      expect(response.body.data).to.have.property('attendanceSummary');
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get('/api/students/dashboard')
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });

  describe('GET /api/students/marks', () => {
    before(async () => {
      // Create test marks
      await Mark.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'series_test_1',
        marksObtained: 45,
        maxMarks: 50
      });

      await Mark.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'university',
        marksObtained: 85,
        maxMarks: 100
      });
    });

    it('should get student marks for all subjects', async () => {
      const response = await request(app)
        .get('/api/students/marks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data[0]).to.have.property('subject');
      expect(response.body.data[0]).to.have.property('marks');
    });

    it('should filter marks by subject', async () => {
      const response = await request(app)
        .get(`/api/students/marks?subjectId=${testSubject.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);
    });

    it('should filter marks by exam type', async () => {
      const response = await request(app)
        .get('/api/students/marks?examType=series_test_1')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
  });

  describe('GET /api/students/attendance', () => {
    before(async () => {
      // Create test attendance
      await Attendance.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        totalClasses: 50,
        attendedClasses: 45
      });
    });

    it('should get student attendance for all subjects', async () => {
      const response = await request(app)
        .get('/api/students/attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data[0]).to.have.property('subject');
      expect(response.body.data[0]).to.have.property('attendancePercentage');
    });

    it('should calculate attendance percentage correctly', async () => {
      const response = await request(app)
        .get('/api/students/attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const attendance = response.body.data.find(a => a.subjectId === testSubject.id);
      expect(attendance.attendancePercentage).to.equal(90.0); // 45/50 * 100
    });

    it('should filter attendance by subject', async () => {
      const response = await request(app)
        .get(`/api/students/attendance?subjectId=${testSubject.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.equal(1);
    });
  });

  describe('GET /api/students/notifications', () => {
    before(async () => {
      // Create test notifications
      await Notification.create({
        recipientId: testStudent.userId,
        title: 'Test Notification',
        message: 'This is a test notification',
        notificationType: 'academic',
        isRead: false
      });

      await Notification.create({
        recipientId: testStudent.userId,
        title: 'System Alert',
        message: 'System maintenance scheduled',
        notificationType: 'system',
        isRead: true
      });
    });

    it('should get student notifications', async () => {
      const response = await request(app)
        .get('/api/students/notifications')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);
    });

    it('should filter notifications by read status', async () => {
      const response = await request(app)
        .get('/api/students/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      const unreadNotifications = response.body.data.filter(n => !n.isRead);
      expect(unreadNotifications.length).to.equal(response.body.data.length);
    });

    it('should filter notifications by type', async () => {
      const response = await request(app)
        .get('/api/students/notifications?type=academic')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      response.body.data.forEach(notification => {
        expect(notification.notificationType).to.equal('academic');
      });
    });
  });

  describe('PUT /api/students/notifications/:id/read', () => {
    let testNotification;

    before(async () => {
      testNotification = await Notification.create({
        recipientId: testStudent.userId,
        title: 'Unread Notification',
        message: 'This notification will be marked as read',
        notificationType: 'academic',
        isRead: false
      });
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/students/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;

      // Verify notification is marked as read
      const updatedNotification = await Notification.findByPk(testNotification.id);
      expect(updatedNotification.isRead).to.be.true;
    });

    it('should reject marking other student\'s notification', async () => {
      // Create another user's notification
      const otherUser = await User.create({
        uniqueId: 'OTHER001',
        email: 'other@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });

      const otherNotification = await Notification.create({
        recipientId: otherUser.id,
        title: 'Other User Notification',
        message: 'This belongs to another user',
        notificationType: 'academic',
        isRead: false
      });

      const response = await request(app)
        .put(`/api/students/notifications/${otherNotification.id}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;

      // Cleanup
      await Notification.destroy({ where: { id: otherNotification.id } });
      await User.destroy({ where: { id: otherUser.id } });
    });
  });

  describe('POST /api/students/report-card', () => {
    it('should generate PDF report card', async () => {
      const response = await request(app)
        .post('/api/students/report-card')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).to.include('application/pdf');
      expect(response.headers['content-disposition']).to.include('attachment');
    });

    it('should generate DOC report card', async () => {
      const response = await request(app)
        .post('/api/students/report-card')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ format: 'doc' })
        .expect(200);

      expect(response.headers['content-type']).to.include('application/vnd.openxmlformats');
      expect(response.headers['content-disposition']).to.include('attachment');
    });

    it('should validate format parameter', async () => {
      const response = await request(app)
        .post('/api/students/report-card')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ format: 'invalid' })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('format');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database error by using invalid query
      const response = await request(app)
        .get('/api/students/marks?invalidParam=true')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('error');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/students/marks?subjectId=invalid')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('invalid');
    });
  });

  describe('Pagination', () => {
    it('should support pagination for marks', async () => {
      const response = await request(app)
        .get('/api/students/marks?page=1&limit=10')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body).to.have.property('pagination');
      expect(response.body.pagination).to.have.property('page');
      expect(response.body.pagination).to.have.property('limit');
      expect(response.body.pagination).to.have.property('total');
    });

    it('should support pagination for notifications', async () => {
      const response = await request(app)
        .get('/api/students/notifications?page=1&limit=5')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body).to.have.property('pagination');
    });
  });
});