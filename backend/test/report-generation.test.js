const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;

// Import the app and models
const app = require('../server');
const db = require('../models');
const reportService = require('../services/reportService');
const { generateToken } = require('../utils/jwt');

describe('Report Generation API', () => {
  let studentUser, facultyUser, adminUser;
  let student, faculty, subject;
  let studentToken, facultyToken, adminToken;

  before(async () => {
    // Sync database
    await db.sequelize.sync({ force: true });

    // Create test users
    studentUser = await db.User.create({
      unique_id: 'STU001',
      email: 'student@test.com',
      phone: '1234567890',
      password_hash: 'hashedpassword',
      role: 'student'
    });

    facultyUser = await db.User.create({
      unique_id: 'FAC001',
      email: 'faculty@test.com',
      phone: '1234567891',
      password_hash: 'hashedpassword',
      role: 'faculty'
    });

    adminUser = await db.User.create({
      unique_id: 'ADM001',
      email: 'admin@test.com',
      phone: '1234567892',
      password_hash: 'hashedpassword',
      role: 'admin'
    });

    // Create test student and faculty
    student = await db.Student.create({
      user_id: studentUser.id,
      student_name: 'Test Student',
      semester: 5,
      batch_year: 2023
    });

    faculty = await db.Faculty.create({
      user_id: facultyUser.id,
      faculty_name: 'Test Faculty',
      department: 'Computer Science'
    });

    // Create test subject
    subject = await db.Subject.create({
      subject_code: 'CS501',
      subject_name: 'Software Engineering',
      subject_type: 'theory',
      semester: 5,
      credits: 3
    });

    // Create test marks
    await db.Mark.create({
      student_id: student.id,
      subject_id: subject.id,
      exam_type: 'series_test_1',
      marks_obtained: 40,
      max_marks: 50,
      faculty_id: faculty.id
    });

    await db.Mark.create({
      student_id: student.id,
      subject_id: subject.id,
      exam_type: 'university',
      marks_obtained: 75,
      max_marks: 100,
      faculty_id: faculty.id
    });

    // Create test attendance
    await db.Attendance.create({
      student_id: student.id,
      subject_id: subject.id,
      total_classes: 100,
      attended_classes: 80,
      faculty_id: faculty.id
    });

    // Create faculty-subject assignment
    await db.FacultySubject.create({
      faculty_id: faculty.id,
      subject_id: subject.id,
      academic_year: 2024
    });

    // Create student-subject enrollment
    await db.StudentSubject.create({
      student_id: student.id,
      subject_id: subject.id,
      academic_year: 2024
    });

    // Generate tokens
    studentToken = generateToken({ id: studentUser.id, role: 'student' });
    facultyToken = generateToken({ id: facultyUser.id, role: 'faculty' });
    adminToken = generateToken({ id: adminUser.id, role: 'admin' });
  });

  after(async () => {
    // Clean up test files
    try {
      const reportsDir = path.join(__dirname, '../uploads/reports');
      const files = await fs.readdir(reportsDir);
      for (const file of files) {
        await fs.unlink(path.join(reportsDir, file));
      }
    } catch (error) {
      // Directory might not exist, ignore
    }

    await db.sequelize.close();
  });

  describe('GET /api/reports/templates', () => {
    it('should return available report templates for student', async () => {
      const response = await request(app)
        .get('/api/reports/templates')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.templates).to.be.an('array');
      expect(response.body.data.templates.length).to.be.greaterThan(0);
      
      const studentTemplate = response.body.data.templates.find(t => t.id === 'student_report_card');
      expect(studentTemplate).to.exist;
    });

    it('should return different templates for faculty', async () => {
      const response = await request(app)
        .get('/api/reports/templates')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      const templates = response.body.data.templates;
      const facultyTemplate = templates.find(t => t.id === 'faculty_report');
      expect(facultyTemplate).to.exist;
    });
  });

  describe('POST /api/reports/student/:studentId/report-card', () => {
    it('should generate PDF report card for student', async () => {
      const response = await request(app)
        .post(`/api/reports/student/${student.id}/report-card`)
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ format: 'pdf' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.report).to.exist;
      expect(response.body.data.report.filename).to.include('.pdf');
      expect(response.body.data.report.url).to.include('/api/reports/download/');
    });

    it('should generate DOC report card for student', async () => {
      const response = await request(app)
        .post(`/api/reports/student/${student.id}/report-card`)
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ format: 'docx' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.report).to.exist;
      expect(response.body.data.report.filename).to.include('.docx');
    });

    it('should prevent student from accessing other student reports', async () => {
      // Create another student
      const otherUser = await db.User.create({
        unique_id: 'STU002',
        email: 'other@test.com',
        phone: '1234567893',
        password_hash: 'hashedpassword',
        role: 'student'
      });

      const otherStudent = await db.Student.create({
        user_id: otherUser.id,
        student_name: 'Other Student',
        semester: 5,
        batch_year: 2023
      });

      const response = await request(app)
        .post(`/api/reports/student/${otherStudent.id}/report-card`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ACCESS_DENIED');
    });

    it('should allow admin to generate any student report', async () => {
      const response = await request(app)
        .post(`/api/reports/student/${student.id}/report-card`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .post('/api/reports/student/99999/report-card')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('STUDENT_NOT_FOUND');
    });
  });

  describe('POST /api/reports/faculty/:facultyId/report', () => {
    it('should generate faculty report with default settings', async () => {
      const response = await request(app)
        .post(`/api/reports/faculty/${faculty.id}/report`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.report).to.exist;
      expect(response.body.data.report.filename).to.include('.pdf');
    });

    it('should generate faculty report with filters', async () => {
      const response = await request(app)
        .post(`/api/reports/faculty/${faculty.id}/report`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .query({
          format: 'docx',
          academicYear: 2024,
          semester: 5,
          minAttendance: 75
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.report.filename).to.include('.docx');
    });

    it('should prevent faculty from accessing other faculty reports', async () => {
      // Create another faculty
      const otherFacultyUser = await db.User.create({
        unique_id: 'FAC002',
        email: 'otherfaculty@test.com',
        phone: '1234567894',
        password_hash: 'hashedpassword',
        role: 'faculty'
      });

      const otherFaculty = await db.Faculty.create({
        user_id: otherFacultyUser.id,
        faculty_name: 'Other Faculty',
        department: 'Mathematics'
      });

      const response = await request(app)
        .post(`/api/reports/faculty/${otherFaculty.id}/report`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ACCESS_DENIED');
    });

    it('should return 404 for non-existent faculty', async () => {
      const response = await request(app)
        .post('/api/reports/faculty/99999/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('FACULTY_NOT_FOUND');
    });
  });

  describe('GET /api/reports/insights/subject/:subjectId', () => {
    it('should generate graphical insights for subject', async () => {
      const response = await request(app)
        .get(`/api/reports/insights/subject/${subject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.insights).to.exist;
      expect(response.body.data.insights.passFailChart).to.exist;
      expect(response.body.data.insights.attendanceChart).to.exist;
      expect(response.body.data.insights.gradeDistribution).to.exist;
    });

    it('should prevent faculty from accessing insights for unassigned subjects', async () => {
      // Create another subject not assigned to faculty
      const otherSubject = await db.Subject.create({
        subject_code: 'CS502',
        subject_name: 'Database Systems',
        subject_type: 'theory',
        semester: 5,
        credits: 3
      });

      const response = await request(app)
        .get(`/api/reports/insights/subject/${otherSubject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ACCESS_DENIED');
    });

    it('should return 404 for non-existent subject', async () => {
      const response = await request(app)
        .get('/api/reports/insights/subject/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('SUBJECT_NOT_FOUND');
    });
  });

  describe('GET /api/reports/download/:filename', () => {
    let testFilename;

    before(async () => {
      // Generate a test report to download
      const report = await reportService.generateStudentReportCardPDF(student.id);
      testFilename = report.filename;
    });

    it('should download existing report file', async () => {
      const response = await request(app)
        .get(`/api/reports/download/${testFilename}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.headers['content-type']).to.equal('application/pdf');
      expect(response.headers['content-disposition']).to.include('attachment');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/reports/download/nonexistent.pdf')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('FILE_NOT_FOUND');
    });

    it('should prevent directory traversal attacks', async () => {
      const response = await request(app)
        .get('/api/reports/download/../../../package.json')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('INVALID_FILENAME');
    });
  });

  describe('POST /api/reports/bulk-generate', () => {
    it('should allow admin to bulk generate student reports', async () => {
      const targets = [{ id: student.id }];
      
      const response = await request(app)
        .post('/api/reports/bulk-generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'student_report_card',
          targets,
          format: 'pdf',
          filters: { academicYear: 2024 }
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.results).to.be.an('array');
      expect(response.body.data.summary.total).to.equal(1);
      expect(response.body.data.summary.successful).to.equal(1);
    });

    it('should prevent non-admin from bulk generation', async () => {
      const response = await request(app)
        .post('/api/reports/bulk-generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reportType: 'student_report_card',
          targets: [{ id: student.id }]
        })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ACCESS_DENIED');
    });
  });

  describe('DELETE /api/reports/cleanup', () => {
    it('should allow admin to cleanup old reports', async () => {
      const response = await request(app)
        .delete('/api/reports/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ daysOld: 0 }) // Clean all reports
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.message).to.include('cleaned up');
    });

    it('should prevent non-admin from cleanup', async () => {
      const response = await request(app)
        .delete('/api/reports/cleanup')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ACCESS_DENIED');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to report generation', async () => {
      // Make multiple requests quickly
      const promises = [];
      for (let i = 0; i < 12; i++) {
        promises.push(
          request(app)
            .post(`/api/reports/student/${student.id}/report-card`)
            .set('Authorization', `Bearer ${studentToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).to.be.greaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Stub the service to throw an error
      const stub = sinon.stub(reportService, 'generateStudentReportCardPDF')
        .rejects(new Error('Service error'));

      const response = await request(app)
        .post(`/api/reports/student/${student.id}/report-card`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('REPORT_GENERATION_ERROR');

      stub.restore();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reports/templates')
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });
});