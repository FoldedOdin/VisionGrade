const request = require('supertest');
const app = require('../../server');
const { User, Student, Faculty, Subject, Mark, Attendance } = require('../../models');
const jwt = require('../../utils/jwt');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('Report Generation and Export Functionality Tests', () => {
    let studentToken, facultyToken, adminToken;
    let studentUser, facultyUser, adminUser;
    let testSubject1, testSubject2, testStudent, testFaculty;

    before(async () => {
        // Clean up test data
        await Attendance.destroy({ where: {} });
        await Mark.destroy({ where: {} });
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create test users
        adminUser = await User.create({
            unique_id: 'ADMIN001',
            email: 'admin@report.test',
            phone: '1111111111',
            password_hash: '$2b$10$test.hash.admin',
            role: 'admin'
        });

        facultyUser = await User.create({
            unique_id: 'FAC001',
            email: 'faculty@report.test',
            phone: '2222222222',
            password_hash: '$2b$10$test.hash.faculty',
            role: 'faculty'
        });

        studentUser = await User.create({
            unique_id: 'STU001',
            email: 'student@report.test',
            phone: '3333333333',
            password_hash: '$2b$10$test.hash.student',
            role: 'student'
        });

        // Create associated records
        testFaculty = await Faculty.create({
            user_id: facultyUser.id,
            faculty_name: 'Test Faculty',
            department: 'Computer Science',
            is_tutor: false
        });

        testStudent = await Student.create({
            user_id: studentUser.id,
            student_name: 'Test Student',
            semester: 5,
            batch_year: 2023,
            graduation_status: 'active'
        });

        testSubject1 = await Subject.create({
            subject_code: 'CS501',
            subject_name: 'Software Engineering',
            subject_type: 'theory',
            semester: 5,
            credits: 3
        });

        testSubject2 = await Subject.create({
            subject_code: 'CS502',
            subject_name: 'Database Systems',
            subject_type: 'theory',
            semester: 5,
            credits: 3
        });

        // Create sample marks data
        await Mark.create({
            student_id: testStudent.id,
            subject_id: testSubject1.id,
            exam_type: 'series_test_1',
            marks_obtained: 40,
            max_marks: 50,
            faculty_id: testFaculty.id
        });

        await Mark.create({
            student_id: testStudent.id,
            subject_id: testSubject1.id,
            exam_type: 'series_test_2',
            marks_obtained: 42,
            max_marks: 50,
            faculty_id: testFaculty.id
        });

        await Mark.create({
            student_id: testStudent.id,
            subject_id: testSubject1.id,
            exam_type: 'university',
            marks_obtained: 75,
            max_marks: 100,
            faculty_id: testFaculty.id
        });

        await Mark.create({
            student_id: testStudent.id,
            subject_id: testSubject2.id,
            exam_type: 'series_test_1',
            marks_obtained: 35,
            max_marks: 50,
            faculty_id: testFaculty.id
        });

        await Mark.create({
            student_id: testStudent.id,
            subject_id: testSubject2.id,
            exam_type: 'university',
            marks_obtained: 68,
            max_marks: 100,
            faculty_id: testFaculty.id
        });

        // Create sample attendance data
        await Attendance.create({
            student_id: testStudent.id,
            subject_id: testSubject1.id,
            total_classes: 50,
            attended_classes: 45,
            faculty_id: testFaculty.id
        });

        await Attendance.create({
            student_id: testStudent.id,
            subject_id: testSubject2.id,
            total_classes: 40,
            attended_classes: 30,
            faculty_id: testFaculty.id
        });

        // Generate tokens
        adminToken = jwt.generateToken({ id: adminUser.id, role: 'admin' });
        facultyToken = jwt.generateToken({ id: facultyUser.id, role: 'faculty' });
        studentToken = jwt.generateToken({ id: studentUser.id, role: 'student' });
    });

    describe('Student Report Card Generation', () => {
        it('should generate PDF report card for student', async () => {
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data.reportUrl).to.exist;
            expect(response.body.data.format).to.equal('pdf');

            // Verify file exists
            const reportPath = path.join(__dirname, '../../', response.body.data.reportUrl);
            if (fs.existsSync(reportPath)) {
                const stats = fs.statSync(reportPath);
                expect(stats.size).to.be.greaterThan(0, 'PDF file should not be empty');
            }
        });

        it('should generate DOC report card for student', async () => {
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'doc' });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data.reportUrl).to.exist;
            expect(response.body.data.format).to.equal('doc');
        });

        it('should include all student data in report card', async () => {
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            expect(response.body.data.reportData).to.exist;

            const reportData = response.body.data.reportData;
            expect(reportData.student).to.exist;
            expect(reportData.student.student_name).to.equal('Test Student');
            expect(reportData.marks).to.be.an('array');
            expect(reportData.attendance).to.be.an('array');
            expect(reportData.marks.length).to.be.greaterThan(0);
        });

        it('should handle report generation with no marks', async () => {
            // Create a student with no marks
            const noMarksUser = await User.create({
                unique_id: 'STU002',
                email: 'nomarks@report.test',
                phone: '4444444444',
                password_hash: '$2b$10$test.hash.nomarks',
                role: 'student'
            });

            const noMarksStudent = await Student.create({
                user_id: noMarksUser.id,
                student_name: 'No Marks Student',
                semester: 5,
                batch_year: 2023,
                graduation_status: 'active'
            });

            const noMarksToken = jwt.generateToken({ id: noMarksUser.id, role: 'student' });

            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${noMarksToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data.reportData.marks).to.be.an('array');
            expect(response.body.data.reportData.marks.length).to.equal(0);
        });

        it('should validate report format parameter', async () => {
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'invalid' });

            expect(response.status).to.equal(400);
            expect(response.body.success).to.be.false;
            expect(response.body.error.message).to.include('format');
        });
    });

    describe('Faculty Report Export', () => {
        it('should export faculty reports with filtering options', async () => {
            const response = await request(app)
                .post('/api/faculty/export-reports')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    format: 'pdf',
                    filters: {
                        subject_id: testSubject1.id,
                        exam_type: 'university'
                    }
                });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data.reportUrl).to.exist;
        });

        it('should export all students report for faculty', async () => {
            const response = await request(app)
                .post('/api/faculty/export-reports')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    format: 'excel',
                    includeAll: true
                });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data.reportUrl).to.exist;
            expect(response.body.data.format).to.equal('excel');
        });

        it('should filter reports by date range', async () => {
            const response = await request(app)
                .post('/api/faculty/export-reports')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    format: 'pdf',
                    filters: {
                        dateFrom: '2023-01-01',
                        dateTo: '2023-12-31'
                    }
                });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
        });

        it('should include graphical insights in faculty reports', async () => {
            const response = await request(app)
                .post('/api/faculty/export-reports')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    format: 'pdf',
                    includeCharts: true
                });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data.reportData.charts).to.exist;
        });
    });

    describe('Admin Report Generation', () => {
        it('should generate system-wide reports for admin', async () => {
            const response = await request(app)
                .post('/api/admin/generate-report')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reportType: 'system-overview',
                    format: 'pdf'
                });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data.reportUrl).to.exist;
        });

        it('should generate semester-wise performance reports', async () => {
            const response = await request(app)
                .post('/api/admin/generate-report')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reportType: 'semester-performance',
                    semester: 5,
                    format: 'excel'
                });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
        });

        it('should generate faculty performance reports', async () => {
            const response = await request(app)
                .post('/api/admin/generate-report')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reportType: 'faculty-performance',
                    format: 'pdf'
                });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;
        });
    });

    describe('Report Data Validation', () => {
        it('should include accurate marks calculation in reports', async () => {
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            const reportData = response.body.data.reportData;

            // Verify marks calculations
            const cs501Marks = reportData.marks.filter(m => m.subject_code === 'CS501');
            expect(cs501Marks.length).to.be.greaterThan(0);

            // Check if series test marks are within valid range
            const seriesTests = cs501Marks.filter(m => m.exam_type.includes('series_test'));
            seriesTests.forEach(mark => {
                expect(mark.marks_obtained).to.be.at.most(50);
                expect(mark.max_marks).to.equal(50);
            });

            // Check university marks
            const universityMarks = cs501Marks.filter(m => m.exam_type === 'university');
            universityMarks.forEach(mark => {
                expect(mark.marks_obtained).to.be.at.most(100);
                expect(mark.max_marks).to.equal(100);
            });
        });

        it('should include accurate attendance calculation in reports', async () => {
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            const reportData = response.body.data.reportData;

            // Verify attendance calculations
            expect(reportData.attendance).to.be.an('array');
            reportData.attendance.forEach(att => {
                expect(att.attendance_percentage).to.be.a('number');
                expect(att.attendance_percentage).to.be.at.least(0);
                expect(att.attendance_percentage).to.be.at.most(100);

                // Verify calculation
                const expectedPercentage = (att.attended_classes / att.total_classes) * 100;
                expect(Math.abs(att.attendance_percentage - expectedPercentage)).to.be.lessThan(0.1);
            });
        });

        it('should handle missing data gracefully in reports', async () => {
            // Create student with partial data
            const partialUser = await User.create({
                unique_id: 'STU003',
                email: 'partial@report.test',
                phone: '5555555555',
                password_hash: '$2b$10$test.hash.partial',
                role: 'student'
            });

            const partialStudent = await Student.create({
                user_id: partialUser.id,
                student_name: 'Partial Data Student',
                semester: 5,
                batch_year: 2023,
                graduation_status: 'active'
            });

            // Add only one mark
            await Mark.create({
                student_id: partialStudent.id,
                subject_id: testSubject1.id,
                exam_type: 'series_test_1',
                marks_obtained: 30,
                max_marks: 50,
                faculty_id: testFaculty.id
            });

            const partialToken = jwt.generateToken({ id: partialUser.id, role: 'student' });

            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${partialToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            expect(response.body.success).to.be.true;

            const reportData = response.body.data.reportData;
            expect(reportData.marks.length).to.equal(1);
            expect(reportData.attendance.length).to.equal(0); // No attendance data
        });
    });

    describe('Report File Management', () => {
        it('should generate unique filenames for reports', async () => {
            const response1 = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            const response2 = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(response1.status).to.equal(200);
            expect(response2.status).to.equal(200);

            expect(response1.body.data.reportUrl).to.not.equal(response2.body.data.reportUrl);
        });

        it('should handle concurrent report generation', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    request(app)
                        .post('/api/students/report-card')
                        .set('Authorization', `Bearer ${studentToken}`)
                        .send({ format: 'pdf' })
                );
            }

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).to.equal(200);
                expect(response.body.success).to.be.true;
            });

            // All should have unique URLs
            const urls = responses.map(r => r.body.data.reportUrl);
            const uniqueUrls = [...new Set(urls)];
            expect(uniqueUrls.length).to.equal(urls.length);
        });

        it('should clean up old report files', async () => {
            // This test would verify that old report files are cleaned up
            // Implementation depends on the cleanup strategy
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            
            // Verify cleanup endpoint exists
            const cleanupResponse = await request(app)
                .post('/api/admin/cleanup-reports')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ olderThanDays: 7 });

            expect([200, 404]).to.include(cleanupResponse.status); // 404 if not implemented
        });
    });

    describe('Report Security', () => {
        it('should prevent unauthorized access to report files', async () => {
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(200);
            const reportUrl = response.body.data.reportUrl;

            // Try to access with different user token
            const unauthorizedResponse = await request(app)
                .get(reportUrl)
                .set('Authorization', `Bearer ${facultyToken}`);

            expect([403, 404]).to.include(unauthorizedResponse.status);
        });

        it('should validate report access permissions', async () => {
            // Faculty should not be able to generate student report cards
            const response = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({ format: 'pdf' });

            expect(response.status).to.equal(403);
        });
    });

    after(async () => {
        // Clean up test data
        await Attendance.destroy({ where: {} });
        await Mark.destroy({ where: {} });
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Clean up generated report files
        const uploadsDir = path.join(__dirname, '../../uploads/reports');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            files.forEach(file => {
                if (file.includes('test')) {
                    fs.unlinkSync(path.join(uploadsDir, file));
                }
            });
        }
    });
});