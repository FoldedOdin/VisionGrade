const request = require('supertest');
const app = require('../../server');
const { User, Student, Faculty, Subject, Mark, Attendance, Notification, MLPrediction } = require('../../models');
const jwt = require('../../utils/jwt');
const { expect } = require('chai');

describe('End-to-End User Workflows Integration Tests', () => {
    let studentToken, facultyToken, adminToken, tutorToken;
    let studentUser, facultyUser, adminUser, tutorUser;
    let testSubject, testStudent, testFaculty;

    before(async () => {
        // Clean up test data
        await MLPrediction.destroy({ where: {} });
        await Notification.destroy({ where: {} });
        await Attendance.destroy({ where: {} });
        await Mark.destroy({ where: {} });
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create test users
        adminUser = await User.create({
            unique_id: 'ADMIN001',
            email: 'admin@test.com',
            phone: '1234567890',
            password_hash: '$2b$10$test.hash.admin',
            role: 'admin'
        });

        facultyUser = await User.create({
            unique_id: 'FAC001',
            email: 'faculty@test.com',
            phone: '1234567891',
            password_hash: '$2b$10$test.hash.faculty',
            role: 'faculty'
        });

        tutorUser = await User.create({
            unique_id: 'TUT001',
            email: 'tutor@test.com',
            phone: '1234567892',
            password_hash: '$2b$10$test.hash.tutor',
            role: 'tutor'
        });

        studentUser = await User.create({
            unique_id: 'STU001',
            email: 'student@test.com',
            phone: '1234567893',
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

        await Faculty.create({
            user_id: tutorUser.id,
            faculty_name: 'Test Tutor',
            department: 'Computer Science',
            is_tutor: true,
            tutor_semester: 5
        });

        testStudent = await Student.create({
            user_id: studentUser.id,
            student_name: 'Test Student',
            semester: 5,
            batch_year: 2023,
            graduation_status: 'active'
        });

        testSubject = await Subject.create({
            subject_code: 'CS501',
            subject_name: 'Software Engineering',
            subject_type: 'theory',
            semester: 5,
            credits: 3
        });

        // Generate tokens
        adminToken = jwt.generateToken({ id: adminUser.id, role: 'admin' });
        facultyToken = jwt.generateToken({ id: facultyUser.id, role: 'faculty' });
        tutorToken = jwt.generateToken({ id: tutorUser.id, role: 'tutor' });
        studentToken = jwt.generateToken({ id: studentUser.id, role: 'student' });
    });

    describe('Complete Student Workflow', () => {
        it('should complete full student journey from login to report generation', async () => {
            // 1. Student login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'student@test.com',
                    password: 'password123'
                });

            expect(loginResponse.status).to.equal(200);
            expect(loginResponse.body.success).to.be.true;

            // 2. Access student dashboard
            const dashboardResponse = await request(app)
                .get('/api/students/dashboard')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(dashboardResponse.status).to.equal(200);
            expect(dashboardResponse.body.success).to.be.true;

            // 3. View marks (initially empty)
            const marksResponse = await request(app)
                .get('/api/students/marks')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(marksResponse.status).to.equal(200);
            expect(marksResponse.body.success).to.be.true;

            // 4. View attendance (initially empty)
            const attendanceResponse = await request(app)
                .get('/api/students/attendance')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(attendanceResponse.status).to.equal(200);
            expect(attendanceResponse.body.success).to.be.true;

            // 5. View notifications
            const notificationsResponse = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(notificationsResponse.status).to.equal(200);
            expect(notificationsResponse.body.success).to.be.true;
        });

        it('should handle student report card generation after marks entry', async () => {
            // First, faculty enters marks
            await Mark.create({
                student_id: testStudent.id,
                subject_id: testSubject.id,
                exam_type: 'series_test_1',
                marks_obtained: 40,
                max_marks: 50,
                faculty_id: testFaculty.id
            });

            await Mark.create({
                student_id: testStudent.id,
                subject_id: testSubject.id,
                exam_type: 'university',
                marks_obtained: 75,
                max_marks: 100,
                faculty_id: testFaculty.id
            });

            // Student generates report card
            const reportResponse = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(reportResponse.status).to.equal(200);
            expect(reportResponse.body.success).to.be.true;
            expect(reportResponse.body.data.reportUrl).to.exist;
        });
    });

    describe('Complete Faculty Workflow', () => {
        it('should complete full faculty journey from login to insights', async () => {
            // 1. Faculty login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'faculty@test.com',
                    password: 'password123'
                });

            expect(loginResponse.status).to.equal(200);

            // 2. View assigned subjects
            const subjectsResponse = await request(app)
                .get('/api/faculty/subjects')
                .set('Authorization', `Bearer ${facultyToken}`);

            expect(subjectsResponse.status).to.equal(200);

            // 3. Enter marks for students
            const marksEntryResponse = await request(app)
                .post('/api/faculty/marks')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    student_id: testStudent.id,
                    subject_id: testSubject.id,
                    exam_type: 'series_test_2',
                    marks_obtained: 42,
                    max_marks: 50
                });

            expect(marksEntryResponse.status).to.equal(201);

            // 4. Enter attendance
            const attendanceResponse = await request(app)
                .post('/api/faculty/attendance')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    student_id: testStudent.id,
                    subject_id: testSubject.id,
                    total_classes: 50,
                    attended_classes: 45
                });

            expect(attendanceResponse.status).to.equal(201);

            // 5. View insights
            const insightsResponse = await request(app)
                .get('/api/faculty/insights')
                .set('Authorization', `Bearer ${facultyToken}`);

            expect(insightsResponse.status).to.equal(200);

            // 6. Send announcement
            const announcementResponse = await request(app)
                .post('/api/faculty/announcements')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    subject_id: testSubject.id,
                    title: 'Test Announcement',
                    message: 'This is a test announcement'
                });

            expect(announcementResponse.status).to.equal(201);
        });
    });

    describe('Complete Admin Workflow', () => {
        it('should complete full admin journey including user management', async () => {
            // 1. Admin login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'admin@test.com',
                    password: 'password123'
                });

            expect(loginResponse.status).to.equal(200);

            // 2. View all users
            const usersResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(usersResponse.status).to.equal(200);
            expect(usersResponse.body.data.users).to.be.an('array');

            // 3. Create new user
            const newUserResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'newstudent@test.com',
                    phone: '9876543210',
                    password: 'password123',
                    role: 'student',
                    student_name: 'New Student',
                    semester: 3,
                    batch_year: 2024
                });

            expect(newUserResponse.status).to.equal(201);

            // 4. Manage subjects
            const subjectsResponse = await request(app)
                .get('/api/admin/subjects')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(subjectsResponse.status).to.equal(200);

            // 5. Send system announcement
            const systemAnnouncementResponse = await request(app)
                .post('/api/admin/system-announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'System Maintenance',
                    message: 'System will be down for maintenance'
                });

            expect(systemAnnouncementResponse.status).to.equal(201);
        });
    });

    describe('Complete Tutor Workflow', () => {
        it('should complete tutor ML prediction control workflow', async () => {
            // 1. Tutor login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'tutor@test.com',
                    password: 'password123'
                });

            expect(loginResponse.status).to.equal(200);

            // 2. Toggle ML predictions
            const toggleResponse = await request(app)
                .post(`/api/ml/toggle-predictions/${testSubject.id}`)
                .set('Authorization', `Bearer ${tutorToken}`)
                .send({ visible: true });

            expect(toggleResponse.status).to.equal(200);

            // 3. View prediction controls
            const controlsResponse = await request(app)
                .get('/api/ml/prediction-controls')
                .set('Authorization', `Bearer ${tutorToken}`);

            expect(controlsResponse.status).to.equal(200);
        });
    });

    after(async () => {
        // Clean up test data
        await MLPrediction.destroy({ where: {} });
        await Notification.destroy({ where: {} });
        await Attendance.destroy({ where: {} });
        await Mark.destroy({ where: {} });
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });
    });
});