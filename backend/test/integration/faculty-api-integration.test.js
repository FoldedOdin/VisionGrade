const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const { User, Faculty, Student, Subject, Mark, Attendance, FacultySubject } = require('../../models');
const { generateToken } = require('../../utils/jwt');

describe('Faculty API Integration Tests', () => {
  let server;
  let testFaculty;
  let testStudent;
  let testSubject;
  let facultyToken;

  before(async () => {
    server = app.listen(0);
    
    // Create test faculty
    const facultyUser = await User.create({
      uniqueId: 'FAC001',
      email: 'faculty@example.com',
      phone: '2222222222',
      passwordHash: '$2a$10$test.hash.here',
      role: 'faculty'
    });

    testFaculty = await Faculty.create({
      userId: facultyUser.id,
      facultyName: 'Test Faculty',
      department: 'Computer Science',
      isTutor: false
    });

    // Create test student
    const studentUser = await User.create({
      uniqueId: 'STU002',
      email: 'student2@example.com',
      phone: '3333333333',
      passwordHash: '$2a$10$test.hash.here',
      role: 'student'
    });

    testStudent = await Student.create({
      userId: studentUser.id,
      studentName: 'Test Student 2',
      semester: 1,
      batchYear: 2024
    });

    // Create test subject
    testSubject = await Subject.create({
      subjectCode: 'CS101',
      subjectName: 'Computer Science Fundamentals',
      subjectType: 'theory',
      semester: 1,
      credits: 4
    });

    // Assign subject to faculty
    await FacultySubject.create({
      facultyId: testFaculty.id,
      subjectId: testSubject.id,
      academicYear: 2024
    });

    facultyToken = generateToken({ id: facultyUser.id, role: 'faculty' });
  });

  after(async () => {
    // Cleanup
    await Mark.destroy({ where: { subjectId: testSubject.id } });
    await Attendance.destroy({ where: { subjectId: testSubject.id } });
    await FacultySubject.destroy({ where: { facultyId: testFaculty.id } });
    await Subject.destroy({ where: { id: testSubject.id } });
    await Student.destroy({ where: { id: testStudent.id } });
    await Faculty.destroy({ where: { id: testFaculty.id } });
    await User.destroy({ where: { id: testFaculty.userId } });
    await User.destroy({ where: { id: testStudent.userId } });
    server.close();
  });

  describe('GET /api/faculty/subjects', () => {
    it('should get faculty assigned subjects', async () => {
      const response = await request(app)
        .get('/api/faculty/subjects')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);
      expect(response.body.data[0]).to.have.property('subjectName');
      expect(response.body.data[0]).to.have.property('subjectCode');
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get('/api/faculty/subjects')
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });

  describe('POST /api/faculty/marks', () => {
    it('should add marks for assigned subject', async () => {
      const marksData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'series_test_1',
        marksObtained: 42,
        maxMarks: 50
      };

      const response = await request(app)
        .post('/api/faculty/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(marksData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.marksObtained).to.equal(42);
      expect(response.body.data.examType).to.equal('series_test_1');
    });

    it('should validate marks range for series test', async () => {
      const marksData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'series_test_1',
        marksObtained: 55, // Invalid: > 50 for series test
        maxMarks: 50
      };

      const response = await request(app)
        .post('/api/faculty/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(marksData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('range');
    });

    it('should validate marks range for university exam', async () => {
      const marksData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'university',
        marksObtained: 105, // Invalid: > 100 for university
        maxMarks: 100
      };

      const response = await request(app)
        .post('/api/faculty/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(marksData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('range');
    });

    it('should reject marks for unassigned subject', async () => {
      // Create another subject not assigned to faculty
      const unassignedSubject = await Subject.create({
        subjectCode: 'UNASSIGNED',
        subjectName: 'Unassigned Subject',
        subjectType: 'theory',
        semester: 1,
        credits: 3
      });

      const marksData = {
        studentId: testStudent.id,
        subjectId: unassignedSubject.id,
        examType: 'series_test_1',
        marksObtained: 40,
        maxMarks: 50
      };

      const response = await request(app)
        .post('/api/faculty/marks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(marksData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('not assigned');

      // Cleanup
      await Subject.destroy({ where: { id: unassignedSubject.id } });
    });
  });

  describe('PUT /api/faculty/marks/:id', () => {
    let testMark;

    before(async () => {
      testMark = await Mark.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'series_test_2',
        marksObtained: 35,
        maxMarks: 50,
        facultyId: testFaculty.id
      });
    });

    it('should update existing marks', async () => {
      const updateData = {
        marksObtained: 40
      };

      const response = await request(app)
        .put(`/api/faculty/marks/${testMark.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.marksObtained).to.equal(40);
    });

    it('should reject updating marks from other faculty', async () => {
      // Create another faculty's mark
      const otherFacultyUser = await User.create({
        uniqueId: 'FAC002',
        email: 'otherfaculty@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'faculty'
      });

      const otherFaculty = await Faculty.create({
        userId: otherFacultyUser.id,
        facultyName: 'Other Faculty',
        department: 'Mathematics'
      });

      const otherMark = await Mark.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'lab_internal',
        marksObtained: 45,
        maxMarks: 50,
        facultyId: otherFaculty.id
      });

      const response = await request(app)
        .put(`/api/faculty/marks/${otherMark.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ marksObtained: 50 })
        .expect(403);

      expect(response.body.success).to.be.false;

      // Cleanup
      await Mark.destroy({ where: { id: otherMark.id } });
      await Faculty.destroy({ where: { id: otherFaculty.id } });
      await User.destroy({ where: { id: otherFacultyUser.id } });
    });
  });

  describe('POST /api/faculty/attendance', () => {
    it('should add attendance record', async () => {
      const attendanceData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        totalClasses: 30,
        attendedClasses: 25
      };

      const response = await request(app)
        .post('/api/faculty/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(attendanceData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.attendancePercentage).to.equal(83.33);
    });

    it('should validate attendance data', async () => {
      const attendanceData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        totalClasses: 30,
        attendedClasses: 35 // Invalid: attended > total
      };

      const response = await request(app)
        .post('/api/faculty/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(attendanceData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('attended classes cannot exceed total');
    });
  });

  describe('GET /api/faculty/insights', () => {
    before(async () => {
      // Create sample marks for insights
      await Mark.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'university',
        marksObtained: 75,
        maxMarks: 100,
        facultyId: testFaculty.id
      });
    });

    it('should get performance insights for faculty subjects', async () => {
      const response = await request(app)
        .get('/api/faculty/insights')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('passFailRatio');
      expect(response.body.data).to.have.property('averageMarks');
      expect(response.body.data).to.have.property('subjectWiseAnalysis');
    });

    it('should filter insights by subject', async () => {
      const response = await request(app)
        .get(`/api/faculty/insights?subjectId=${testSubject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.subjectWiseAnalysis).to.have.lengthOf(1);
    });
  });

  describe('GET /api/faculty/at-risk-students', () => {
    before(async () => {
      // Create low attendance record
      await Attendance.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        totalClasses: 50,
        attendedClasses: 30, // 60% attendance
        facultyId: testFaculty.id
      });
    });

    it('should get list of at-risk students', async () => {
      const response = await request(app)
        .get('/api/faculty/at-risk-students')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).to.have.property('student');
        expect(response.body.data[0]).to.have.property('riskFactors');
      }
    });

    it('should filter at-risk students by subject', async () => {
      const response = await request(app)
        .get(`/api/faculty/at-risk-students?subjectId=${testSubject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
  });

  describe('POST /api/faculty/announcements', () => {
    it('should create announcement for subject students', async () => {
      const announcementData = {
        subjectId: testSubject.id,
        title: 'Test Announcement',
        message: 'This is a test announcement for the subject'
      };

      const response = await request(app)
        .post('/api/faculty/announcements')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(announcementData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.title).to.equal(announcementData.title);
    });

    it('should validate announcement data', async () => {
      const announcementData = {
        subjectId: testSubject.id,
        title: '', // Empty title
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/faculty/announcements')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(announcementData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('title');
    });
  });

  describe('Bulk Operations', () => {
    it('should support bulk marks entry', async () => {
      const bulkMarksData = {
        subjectId: testSubject.id,
        examType: 'series_test_1',
        marks: [
          { studentId: testStudent.id, marksObtained: 45, maxMarks: 50 }
        ]
      };

      const response = await request(app)
        .post('/api/faculty/marks/bulk')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(bulkMarksData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.equal(1);
    });

    it('should support bulk attendance entry', async () => {
      const bulkAttendanceData = {
        subjectId: testSubject.id,
        attendance: [
          { 
            studentId: testStudent.id, 
            totalClasses: 40, 
            attendedClasses: 35 
          }
        ]
      };

      const response = await request(app)
        .post('/api/faculty/attendance/bulk')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(bulkAttendanceData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.equal(1);
    });
  });

  describe('Export Functionality', () => {
    it('should export student results as CSV', async () => {
      const response = await request(app)
        .get(`/api/faculty/export/results?subjectId=${testSubject.id}&format=csv`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.headers['content-type']).to.include('text/csv');
      expect(response.headers['content-disposition']).to.include('attachment');
    });

    it('should export attendance report as Excel', async () => {
      const response = await request(app)
        .get(`/api/faculty/export/attendance?subjectId=${testSubject.id}&format=xlsx`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.headers['content-type']).to.include('application/vnd.openxmlformats');
      expect(response.headers['content-disposition']).to.include('attachment');
    });
  });
});