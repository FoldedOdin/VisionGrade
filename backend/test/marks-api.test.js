const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { User, Faculty, Subject, Student, Mark, FacultySubject } = require('../models');
const jwt = require('jsonwebtoken');

describe('Marks API', () => {
  let facultyToken;
  let facultyUser;
  let faculty;
  let subject;
  let student;

  before(async () => {
    // Create test faculty user
    facultyUser = await User.create({
      unique_id: 'FAC240001',
      email: 'faculty@test.com',
      password_hash: 'hashedpassword',
      role: 'faculty'
    });

    faculty = await Faculty.create({
      user_id: facultyUser.id,
      faculty_name: 'Test Faculty',
      department: 'Computer Science'
    });

    // Create test subject
    subject = await Subject.create({
      subject_code: 'CS101',
      subject_name: 'Computer Science Fundamentals',
      subject_type: 'theory',
      semester: 1,
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
      unique_id: 'STU240001',
      email: 'student@test.com',
      password_hash: 'hashedpassword',
      role: 'student'
    });

    student = await Student.create({
      user_id: studentUser.id,
      student_name: 'Test Student',
      semester: 1,
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
    await Mark.destroy({ where: {} });
    await FacultySubject.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Subject.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('POST /api/marks', () => {
    it('should add marks for a student', async () => {
      const markData = {
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'series_test_1',
        marks_obtained: 45,
        max_marks: 50
      };

      const response = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(markData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.mark.marks_obtained).to.equal(45);
      expect(response.body.data.mark.max_marks).to.equal(50);
      expect(response.body.data.percentage).to.equal(90);
      expect(response.body.data.grade).to.equal('A+');
      expect(response.body.data.passed).to.be.true;
    });

    it('should update existing marks for a student', async () => {
      const markData = {
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'series_test_1',
        marks_obtained: 40,
        max_marks: 50
      };

      const response = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(markData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.action).to.equal('updated');
      expect(response.body.data.mark.marks_obtained).to.equal(40);
      expect(response.body.data.percentage).to.equal(80);
    });

    it('should validate marks range for series test', async () => {
      const markData = {
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'series_test_1',
        marks_obtained: 60, // Invalid: exceeds max for series test
        max_marks: 50
      };

      const response = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(markData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('MARKS_VALIDATION_ERROR');
    });

    it('should validate marks range for university exam', async () => {
      const markData = {
        student_id: student.id,
        subject_id: subject.id,
        exam_type: 'university',
        marks_obtained: 85,
        max_marks: 100
      };

      const response = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(markData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.mark.marks_obtained).to.equal(85);
      expect(response.body.data.percentage).to.equal(85);
    });

    it('should reject access to unauthorized subject', async () => {
      // Create another subject not assigned to faculty
      const unauthorizedSubject = await Subject.create({
        subject_code: 'CS102',
        subject_name: 'Data Structures',
        subject_type: 'theory',
        semester: 2,
        credits: 3
      });

      const markData = {
        student_id: student.id,
        subject_id: unauthorizedSubject.id,
        exam_type: 'series_test_1',
        marks_obtained: 45,
        max_marks: 50
      };

      const response = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(markData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ACCESS_DENIED');

      // Clean up
      await unauthorizedSubject.destroy();
    });
  });

  describe('GET /api/marks/subject/:subjectId', () => {
    it('should get marks for a subject', async () => {
      const response = await request(app)
        .get(`/api/marks/subject/${subject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.marks).to.be.an('array');
      expect(response.body.data.subject_id).to.equal(subject.id);
    });

    it('should filter marks by exam type', async () => {
      const response = await request(app)
        .get(`/api/marks/subject/${subject.id}?exam_type=university`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.exam_type).to.equal('university');
      
      // All returned marks should be university type
      response.body.data.marks.forEach(mark => {
        expect(mark.exam_type).to.equal('university');
      });
    });
  });

  describe('GET /api/marks/student/:studentId', () => {
    it('should get marks for a student', async () => {
      const response = await request(app)
        .get(`/api/marks/student/${student.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.marks_by_subject).to.be.an('object');
      expect(response.body.data.student).to.not.be.null;
    });
  });

  describe('GET /api/marks/statistics', () => {
    it('should get performance statistics', async () => {
      const response = await request(app)
        .get('/api/marks/statistics')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.statistics).to.be.an('array');
    });
  });
});