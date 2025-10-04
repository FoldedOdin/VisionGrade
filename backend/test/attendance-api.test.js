const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { User, Faculty, Subject, Student, Attendance, FacultySubject } = require('../models');
const jwt = require('jsonwebtoken');

describe('Attendance API', () => {
  let facultyToken;
  let facultyUser;
  let faculty;
  let subject;
  let student;

  before(async () => {
    // Create test faculty user
    facultyUser = await User.create({
      unique_id: 'FAC240002',
      email: 'faculty2@test.com',
      password_hash: 'hashedpassword',
      role: 'faculty'
    });

    faculty = await Faculty.create({
      user_id: facultyUser.id,
      faculty_name: 'Test Faculty 2',
      department: 'Computer Science'
    });

    // Create test subject
    subject = await Subject.create({
      subject_code: 'CS201',
      subject_name: 'Database Systems',
      subject_type: 'theory',
      semester: 3,
      credits: 3
    });

    // Assign faculty to subject
    await FacultySubject.create({
      faculty_id: faculty.id,
      subject_id: subject.id,
      academic_year: new Date().getFullYear()
    });

    // Create test student
    const studentUser = await User.create({
      unique_id: 'STU240002',
      email: 'student2@test.com',
      password_hash: 'hashedpassword',
      role: 'student'
    });

    student = await Student.create({
      user_id: studentUser.id,
      student_name: 'Test Student 2',
      semester: 3,
      batch_year: new Date().getFullYear()
    });

    // Generate JWT token for faculty
    facultyToken = jwt.sign(
      { userId: facultyUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    // Clean up test data
    await Attendance.destroy({ where: {} });
    await FacultySubject.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Subject.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('POST /api/attendance', () => {
    it('should add attendance for a student', async () => {
      const attendanceData = {
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 20,
        attended_classes: 18
      };

      const response = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(attendanceData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.attendance.total_classes).to.equal(20);
      expect(response.body.data.attendance.attended_classes).to.equal(18);
      expect(response.body.data.attendance.attendance_percentage).to.equal(90);
      expect(response.body.data.attendance.is_below_threshold).to.be.false;
    });

    it('should update existing attendance for a student', async () => {
      const attendanceData = {
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 25,
        attended_classes: 20
      };

      const response = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(attendanceData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.attendance.total_classes).to.equal(25);
      expect(response.body.data.attendance.attended_classes).to.equal(20);
      expect(response.body.data.attendance.attendance_percentage).to.equal(80);
    });

    it('should validate attendance data', async () => {
      const attendanceData = {
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 20,
        attended_classes: 25 // Invalid: more than total
      };

      const response = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(attendanceData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ATTENDANCE_VALIDATION_ERROR');
    });

    it('should reject negative values', async () => {
      const attendanceData = {
        student_id: student.id,
        subject_id: subject.id,
        total_classes: -5, // Invalid: negative
        attended_classes: 10
      };

      const response = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(attendanceData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('GET /api/attendance/subject/:subjectId', () => {
    it('should get attendance for a subject', async () => {
      const response = await request(app)
        .get(`/api/attendance/subject/${subject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.attendance_records).to.be.an('array');
      expect(response.body.data.statistics).to.be.an('object');
      expect(response.body.data.statistics.total_students).to.be.a('number');
    });
  });

  describe('GET /api/attendance/student/:studentId', () => {
    it('should get attendance for a student', async () => {
      const response = await request(app)
        .get(`/api/attendance/student/${student.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.attendance_records).to.be.an('array');
      expect(response.body.data.overall_attendance).to.be.an('object');
      expect(response.body.data.overall_attendance.overall_percentage).to.be.a('number');
    });
  });

  describe('GET /api/attendance/low-attendance', () => {
    before(async () => {
      // Create a student with low attendance
      const lowAttendanceData = {
        student_id: student.id,
        subject_id: subject.id,
        total_classes: 20,
        attended_classes: 10 // 50% attendance
      };

      await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(lowAttendanceData);
    });

    it('should get students with low attendance', async () => {
      const response = await request(app)
        .get('/api/attendance/low-attendance?threshold=75')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.low_attendance_students).to.be.an('array');
      expect(response.body.data.threshold).to.equal(75);
    });

    it('should filter by custom threshold', async () => {
      const response = await request(app)
        .get('/api/attendance/low-attendance?threshold=60')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.threshold).to.equal(60);
    });
  });

  describe('GET /api/attendance/statistics', () => {
    it('should get attendance statistics', async () => {
      const response = await request(app)
        .get('/api/attendance/statistics')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.statistics).to.be.an('array');
    });
  });
});