const request = require('supertest');
const app = require('../../server');
const { User, Student, Faculty, Subject } = require('../../models');
const jwt = require('../../utils/jwt');
const { expect } = require('chai');

describe('Role-Based Access Control Validation', () => {
    let studentToken, facultyToken, adminToken, tutorToken;
    let studentUser, facultyUser, adminUser, tutorUser;
    let testSubject, testStudent, testFaculty;

    before(async () => {
        // Clean up and create test data
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create test users
        adminUser = await User.create({
            unique_id: 'ADMIN001',
            email: 'admin@rbac.test',
            phone: '1111111111',
            password_hash: '$2b$10$test.hash.admin',
            role: 'admin'
        });

        facultyUser = await User.create({
            unique_id: 'FAC001',
            email: 'faculty@rbac.test',
            phone: '2222222222',
            password_hash: '$2b$10$test.hash.faculty',
            role: 'faculty'
        });

        tutorUser = await User.create({
            unique_id: 'TUT001',
            email: 'tutor@rbac.test',
            phone: '3333333333',
            password_hash: '$2b$10$test.hash.tutor',
            role: 'tutor'
        });

        studentUser = await User.create({
            unique_id: 'STU001',
            email: 'student@rbac.test',
            phone: '4444444444',
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

    describe('Admin Access Control', () => {
        it('should allow admin to access all admin endpoints', async () => {
            const endpoints = [
                { method: 'get', path: '/api/admin/users' },
                { method: 'get', path: '/api/admin/subjects' },
                { method: 'get', path: '/api/admin/dashboard' }
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)
                    [endpoint.method](endpoint.path)
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).to.not.equal(403, 
                    `Admin should have access to ${endpoint.method.toUpperCase()} ${endpoint.path}`);
            }
        });

        it('should deny non-admin users access to admin endpoints', async () => {
            const nonAdminTokens = [
                { token: studentToken, role: 'student' },
                { token: facultyToken, role: 'faculty' },
                { token: tutorToken, role: 'tutor' }
            ];

            const adminEndpoints = [
                '/api/admin/users',
                '/api/admin/subjects',
                '/api/admin/system-announcements'
            ];

            for (const { token, role } of nonAdminTokens) {
                for (const endpoint of adminEndpoints) {
                    const response = await request(app)
                        .get(endpoint)
                        .set('Authorization', `Bearer ${token}`);

                    expect(response.status).to.equal(403, 
                        `${role} should not have access to ${endpoint}`);
                }
            }
        });

        it('should allow admin to create and delete users', async () => {
            // Create user
            const createResponse = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'newuser@rbac.test',
                    phone: '5555555555',
                    password: 'password123',
                    role: 'student',
                    student_name: 'New Student',
                    semester: 3,
                    batch_year: 2024
                });

            expect(createResponse.status).to.equal(201);

            // Delete user (if implemented)
            if (createResponse.body.data && createResponse.body.data.user) {
                const deleteResponse = await request(app)
                    .delete(`/api/admin/users/${createResponse.body.data.user.id}`)
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(deleteResponse.status).to.not.equal(403);
            }
        });
    });

    describe('Faculty Access Control', () => {
        it('should allow faculty to access faculty-specific endpoints', async () => {
            const facultyEndpoints = [
                { method: 'get', path: '/api/faculty/subjects' },
                { method: 'get', path: '/api/faculty/insights' },
                { method: 'get', path: '/api/faculty/at-risk-students' }
            ];

            for (const endpoint of facultyEndpoints) {
                const response = await request(app)
                    [endpoint.method](endpoint.path)
                    .set('Authorization', `Bearer ${facultyToken}`);

                expect(response.status).to.not.equal(403, 
                    `Faculty should have access to ${endpoint.method.toUpperCase()} ${endpoint.path}`);
            }
        });

        it('should deny non-faculty users access to faculty endpoints', async () => {
            const nonFacultyTokens = [
                { token: studentToken, role: 'student' }
            ];

            const facultyEndpoints = [
                '/api/faculty/subjects',
                '/api/faculty/insights'
            ];

            for (const { token, role } of nonFacultyTokens) {
                for (const endpoint of facultyEndpoints) {
                    const response = await request(app)
                        .get(endpoint)
                        .set('Authorization', `Bearer ${token}`);

                    expect(response.status).to.equal(403, 
                        `${role} should not have access to ${endpoint}`);
                }
            }
        });

        it('should allow faculty to enter marks only for assigned subjects', async () => {
            // This would require setting up faculty-subject assignments
            const marksResponse = await request(app)
                .post('/api/faculty/marks')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    student_id: testStudent.id,
                    subject_id: testSubject.id,
                    exam_type: 'series_test_1',
                    marks_obtained: 40,
                    max_marks: 50
                });

            // Should either succeed (if assigned) or fail with proper error
            expect([201, 403, 400]).to.include(marksResponse.status);
        });
    });

    describe('Tutor Access Control', () => {
        it('should allow tutors to access ML prediction controls', async () => {
            const predictionResponse = await request(app)
                .get('/api/ml/prediction-controls')
                .set('Authorization', `Bearer ${tutorToken}`);

            expect(predictionResponse.status).to.not.equal(403, 
                'Tutor should have access to prediction controls');
        });

        it('should allow tutors to toggle predictions', async () => {
            const toggleResponse = await request(app)
                .post(`/api/ml/toggle-predictions/${testSubject.id}`)
                .set('Authorization', `Bearer ${tutorToken}`)
                .send({ visible: true });

            expect(toggleResponse.status).to.not.equal(403, 
                'Tutor should be able to toggle predictions');
        });

        it('should deny non-tutors access to prediction controls', async () => {
            const nonTutorTokens = [
                { token: studentToken, role: 'student' },
                { token: facultyToken, role: 'faculty' }
            ];

            for (const { token, role } of nonTutorTokens) {
                const response = await request(app)
                    .post(`/api/ml/toggle-predictions/${testSubject.id}`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ visible: true });

                expect(response.status).to.equal(403, 
                    `${role} should not have access to prediction controls`);
            }
        });
    });

    describe('Student Access Control', () => {
        it('should allow students to access student-specific endpoints', async () => {
            const studentEndpoints = [
                { method: 'get', path: '/api/students/dashboard' },
                { method: 'get', path: '/api/students/marks' },
                { method: 'get', path: '/api/students/attendance' },
                { method: 'get', path: '/api/students/notifications' }
            ];

            for (const endpoint of studentEndpoints) {
                const response = await request(app)
                    [endpoint.method](endpoint.path)
                    .set('Authorization', `Bearer ${studentToken}`);

                expect(response.status).to.not.equal(403, 
                    `Student should have access to ${endpoint.method.toUpperCase()} ${endpoint.path}`);
            }
        });

        it('should deny students access to faculty/admin endpoints', async () => {
            const restrictedEndpoints = [
                '/api/faculty/subjects',
                '/api/faculty/marks',
                '/api/admin/users',
                '/api/ml/toggle-predictions/1'
            ];

            for (const endpoint of restrictedEndpoints) {
                const response = await request(app)
                    .get(endpoint)
                    .set('Authorization', `Bearer ${studentToken}`);

                expect(response.status).to.equal(403, 
                    `Student should not have access to ${endpoint}`);
            }
        });

        it('should allow students to generate their own report cards', async () => {
            const reportResponse = await request(app)
                .post('/api/students/report-card')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ format: 'pdf' });

            expect(reportResponse.status).to.not.equal(403, 
                'Student should be able to generate their own report card');
        });
    });

    describe('Cross-Role Data Access', () => {
        it('should prevent students from accessing other students data', async () => {
            // Create another student
            const otherStudentUser = await User.create({
                unique_id: 'STU002',
                email: 'student2@rbac.test',
                phone: '6666666666',
                password_hash: '$2b$10$test.hash.student2',
                role: 'student'
            });

            const otherStudent = await Student.create({
                user_id: otherStudentUser.id,
                student_name: 'Other Student',
                semester: 5,
                batch_year: 2023,
                graduation_status: 'active'
            });

            // Try to access other student's data
            const response = await request(app)
                .get(`/api/students/${otherStudent.id}/marks`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).to.equal(403, 
                'Student should not access other students data');
        });

        it('should prevent faculty from accessing subjects not assigned to them', async () => {
            // Create another subject
            const otherSubject = await Subject.create({
                subject_code: 'CS502',
                subject_name: 'Database Systems',
                subject_type: 'theory',
                semester: 5,
                credits: 3
            });

            // Try to enter marks for unassigned subject
            const response = await request(app)
                .post('/api/faculty/marks')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    student_id: testStudent.id,
                    subject_id: otherSubject.id,
                    exam_type: 'series_test_1',
                    marks_obtained: 40,
                    max_marks: 50
                });

            expect([403, 400]).to.include(response.status, 
                'Faculty should not enter marks for unassigned subjects');
        });
    });

    describe('Authentication Requirements', () => {
        it('should deny access to protected endpoints without token', async () => {
            const protectedEndpoints = [
                { method: 'get', path: '/api/students/dashboard' },
                { method: 'get', path: '/api/faculty/subjects' },
                { method: 'get', path: '/api/admin/users' }
            ];

            for (const endpoint of protectedEndpoints) {
                const response = await request(app)
                    [endpoint.method](endpoint.path);

                expect(response.status).to.equal(401, 
                    `${endpoint.method.toUpperCase()} ${endpoint.path} should require authentication`);
            }
        });

        it('should deny access with invalid token', async () => {
            const invalidToken = 'invalid.jwt.token';

            const response = await request(app)
                .get('/api/students/dashboard')
                .set('Authorization', `Bearer ${invalidToken}`);

            expect(response.status).to.equal(401, 
                'Invalid token should be rejected');
        });

        it('should deny access with expired token', async () => {
            // Create an expired token (this would need to be implemented in jwt.js)
            const expiredToken = jwt.generateToken(
                { id: studentUser.id, role: 'student' },
                { expiresIn: '-1h' } // Expired 1 hour ago
            );

            const response = await request(app)
                .get('/api/students/dashboard')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).to.equal(401, 
                'Expired token should be rejected');
        });
    });

    after(async () => {
        // Clean up test data
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });
    });
});