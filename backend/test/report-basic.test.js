const { expect } = require('chai');
const reportService = require('../services/reportService');
const db = require('../models');

describe('Report Service Basic Tests', () => {
  let student, faculty, subject;

  before(async () => {
    // Sync database
    await db.sequelize.sync({ force: true });

    // Create test data
    const studentUser = await db.User.create({
      unique_id: 'STU001',
      email: 'student@test.com',
      phone: '1234567890',
      password_hash: 'hashedpassword',
      role: 'student'
    });

    const facultyUser = await db.User.create({
      unique_id: 'FAC001',
      email: 'faculty@test.com',
      phone: '1234567891',
      password_hash: 'hashedpassword',
      role: 'faculty'
    });

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

    // Create enrollments
    await db.StudentSubject.create({
      student_id: student.id,
      subject_id: subject.id,
      academic_year: 2024
    });

    await db.FacultySubject.create({
      faculty_id: faculty.id,
      subject_id: subject.id,
      academic_year: 2024
    });
  });

  after(async () => {
    await db.sequelize.close();
  });

  describe('Report Service Methods', () => {
    it('should have all required methods', () => {
      expect(reportService.generateStudentReportCardPDF).to.be.a('function');
      expect(reportService.generateStudentReportCardDOC).to.be.a('function');
      expect(reportService.generateFacultyReport).to.be.a('function');
      expect(reportService.generateGraphicalInsights).to.be.a('function');
    });

    it('should generate student report card PDF', async () => {
      const report = await reportService.generateStudentReportCardPDF(student.id);
      
      expect(report).to.be.an('object');
      expect(report.filename).to.include('.pdf');
      expect(report.filepath).to.be.a('string');
      expect(report.url).to.include('/api/reports/download/');
    });

    it('should generate student report card DOC', async () => {
      const report = await reportService.generateStudentReportCardDOC(student.id);
      
      expect(report).to.be.an('object');
      expect(report.filename).to.include('.docx');
      expect(report.filepath).to.be.a('string');
      expect(report.url).to.include('/api/reports/download/');
    });

    it('should generate graphical insights', async () => {
      const insights = await reportService.generateGraphicalInsights(subject.id);
      
      expect(insights).to.be.an('object');
      expect(insights.subject).to.exist;
      expect(insights.passFailChart).to.exist;
      expect(insights.attendanceChart).to.exist;
      expect(insights.gradeDistribution).to.exist;
      
      expect(insights.passFailChart.data).to.be.an('array');
      expect(insights.attendanceChart.data).to.be.an('array');
      expect(insights.gradeDistribution.data).to.be.an('array');
    });

    it('should generate faculty report', async () => {
      const report = await reportService.generateFacultyReport(faculty.id, {}, 'pdf');
      
      expect(report).to.be.an('object');
      expect(report.filename).to.include('.pdf');
      expect(report.filepath).to.be.a('string');
      expect(report.url).to.include('/api/reports/download/');
    });

    it('should handle non-existent student gracefully', async () => {
      try {
        await reportService.generateStudentReportCardPDF(99999);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Student not found');
      }
    });

    it('should handle non-existent subject gracefully', async () => {
      try {
        await reportService.generateGraphicalInsights(99999);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Subject not found');
      }
    });
  });

  describe('Helper Methods', () => {
    it('should calculate grades correctly', () => {
      expect(reportService.calculateGrade(95)).to.equal('A+');
      expect(reportService.calculateGrade(85)).to.equal('A');
      expect(reportService.calculateGrade(75)).to.equal('B+');
      expect(reportService.calculateGrade(65)).to.equal('B');
      expect(reportService.calculateGrade(55)).to.equal('C+');
      expect(reportService.calculateGrade(45)).to.equal('C');
      expect(reportService.calculateGrade(35)).to.equal('F');
    });

    it('should get correct grade colors', () => {
      expect(reportService.getGradeColor('A+')).to.equal('#4CAF50');
      expect(reportService.getGradeColor('A')).to.equal('#8BC34A');
      expect(reportService.getGradeColor('F')).to.equal('#F44336');
    });
  });
});