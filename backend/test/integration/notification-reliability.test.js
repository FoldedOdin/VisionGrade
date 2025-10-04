const request = require('supertest');
const app = require('../../server');
const { User, Student, Faculty, Subject, Notification, Attendance } = require('../../models');
const jwt = require('../../utils/jwt');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Notification System Reliability Tests', () => {
    let studentToken, facultyToken, adminToken;
    let studentUser, facultyUser, adminUser;
    let testSubject, testStudent, testFaculty;

    before(async () => {
        // Clean up test data
        await Notification.destroy({ where: {} });
        await Attendance.destroy({ where: {} });
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create test users
        adminUser = await User.create({
            unique_id: 'ADMIN001',
            email: 'admin@notify.test',
            phone: '1111111111',
            password_hash: '$2b$10$test.hash.admin',
            role: 'admin'
        });

        facultyUser = await User.create({
            unique_id: 'FAC001',
            email: 'faculty@notify.test',
            phone: '2222222222',
            password_hash: '$2b$10$test.hash.faculty',
            role: 'faculty'
        });

        studentUser = await User.create({
            unique_id: 'STU001',
            email: 'student@notify.test',
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
        studentToken = jwt.generateToken({ id: studentUser.id, role: 'student' });
    });

    describe('Notification Creation and Delivery', () => {
        it('should create system notifications from admin', async () => {
            const response = await request(app)
                .post('/api/admin/system-announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'System Maintenance',
                    message: 'System will be down for maintenance on Sunday',
                    targetRole: 'all'
                });

            expect(response.status).to.equal(201);
            expect(response.body.success).to.be.true;

            // Verify notification was created
            const notifications = await Notification.findAll({
                where: { notification_type: 'system' }
            });

            expect(notifications.length).to.be.greaterThan(0);
            expect(notifications[0].title).to.equal('System Maintenance');
        });

        it('should create academic notifications from faculty', async () => {
            const response = await request(app)
                .post('/api/faculty/announcements')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    subject_id: testSubject.id,
                    title: 'Assignment Due',
                    message: 'Assignment 1 is due next week'
                });

            expect(response.status).to.equal(201);
            expect(response.body.success).to.be.true;

            // Verify notification was created
            const notifications = await Notification.findAll({
                where: { notification_type: 'academic' }
            });

            expect(notifications.length).to.be.greaterThan(0);
            expect(notifications[0].title).to.equal('Assignment Due');
        });

        it('should create automatic attendance alerts', async () => {
            // Create low attendance record
            await Attendance.create({
                student_id: testStudent.id,
                subject_id: testSubject.id,
                total_classes: 100,
                attended_classes: 70, // 70% attendance
                faculty_id: testFaculty.id
            });

            // Trigger attendance check (this would normally be done by a scheduler)
            const response = await request(app)
                .post('/api/admin/check-attendance-alerts')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).to.equal(200);

            // Verify automatic notification was created
            const notifications = await Notification.findAll({
                where: { 
                    notification_type: 'auto',
                    recipient_id: studentUser.id
                }
            });

            expect(notifications.length).to.be.greaterThan(0);
            const attendanceAlert = notifications.find(n => n.message.includes('attendance'));
            expect(attendanceAlert).to.exist;
        });

        it('should deliver notifications to correct recipients', async () => {
            // Create targeted notification
            await request(app)
                .post('/api/faculty/announcements')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    subject_id: testSubject.id,
                    title: 'Subject Specific Announcement',
                    message: 'This is for CS501 students only'
                });

            // Check student receives the notification
            const studentNotifications = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(studentNotifications.status).to.equal(200);
            expect(studentNotifications.body.data.notifications).to.be.an('array');

            const subjectNotification = studentNotifications.body.data.notifications
                .find(n => n.title === 'Subject Specific Announcement');
            expect(subjectNotification).to.exist;
        });
    });

    describe('Notification Categorization', () => {
        it('should properly categorize system notifications', async () => {
            await request(app)
                .post('/api/admin/system-announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'System Update',
                    message: 'New features available',
                    targetRole: 'student'
                });

            const response = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).to.equal(200);
            const systemNotifications = response.body.data.notifications
                .filter(n => n.notification_type === 'system');

            expect(systemNotifications.length).to.be.greaterThan(0);
            expect(systemNotifications[0].title).to.equal('System Update');
        });

        it('should properly categorize academic notifications', async () => {
            await request(app)
                .post('/api/faculty/announcements')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    subject_id: testSubject.id,
                    title: 'Exam Schedule',
                    message: 'Mid-term exam on Friday'
                });

            const response = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).to.equal(200);
            const academicNotifications = response.body.data.notifications
                .filter(n => n.notification_type === 'academic');

            expect(academicNotifications.length).to.be.greaterThan(0);
            const examNotification = academicNotifications
                .find(n => n.title === 'Exam Schedule');
            expect(examNotification).to.exist;
        });

        it('should properly categorize automatic notifications', async () => {
            // Create very low attendance to trigger alert
            await Attendance.destroy({ where: {} }); // Clear previous
            await Attendance.create({
                student_id: testStudent.id,
                subject_id: testSubject.id,
                total_classes: 100,
                attended_classes: 60, // 60% attendance (below 75%)
                faculty_id: testFaculty.id
            });

            // Trigger attendance check
            await request(app)
                .post('/api/admin/check-attendance-alerts')
                .set('Authorization', `Bearer ${adminToken}`);

            const response = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).to.equal(200);
            const autoNotifications = response.body.data.notifications
                .filter(n => n.notification_type === 'auto');

            expect(autoNotifications.length).to.be.greaterThan(0);
        });
    });

    describe('Notification Read/Unread Status', () => {
        it('should mark notifications as unread by default', async () => {
            await request(app)
                .post('/api/admin/system-announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'New Notification',
                    message: 'This should be unread',
                    targetRole: 'student'
                });

            const response = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).to.equal(200);
            const newNotification = response.body.data.notifications
                .find(n => n.title === 'New Notification');

            expect(newNotification).to.exist;
            expect(newNotification.is_read).to.be.false;
        });

        it('should allow marking notifications as read', async () => {
            // Create a notification first
            await request(app)
                .post('/api/admin/system-announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Mark as Read Test',
                    message: 'This will be marked as read',
                    targetRole: 'student'
                });

            // Get the notification
            const getResponse = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            const notification = getResponse.body.data.notifications
                .find(n => n.title === 'Mark as Read Test');

            // Mark as read
            const markReadResponse = await request(app)
                .put(`/api/students/notifications/${notification.id}/read`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(markReadResponse.status).to.equal(200);

            // Verify it's marked as read
            const verifyResponse = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            const updatedNotification = verifyResponse.body.data.notifications
                .find(n => n.id === notification.id);

            expect(updatedNotification.is_read).to.be.true;
        });

        it('should provide unread notification count', async () => {
            // Clear existing notifications
            await Notification.destroy({ where: { recipient_id: studentUser.id } });

            // Create multiple unread notifications
            for (let i = 1; i <= 3; i++) {
                await request(app)
                    .post('/api/admin/system-announcements')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        title: `Unread Notification ${i}`,
                        message: `Message ${i}`,
                        targetRole: 'student'
                    });
            }

            const response = await request(app)
                .get('/api/students/notifications/count')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).to.equal(200);
            expect(response.body.data.unreadCount).to.equal(3);
        });
    });

    describe('Notification Performance and Reliability', () => {
        it('should handle bulk notification creation', async () => {
            const startTime = Date.now();

            // Create multiple notifications simultaneously
            const promises = [];
            for (let i = 1; i <= 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/admin/system-announcements')
                        .set('Authorization', `Bearer ${adminToken}`)
                        .send({
                            title: `Bulk Notification ${i}`,
                            message: `Bulk message ${i}`,
                            targetRole: 'all'
                        })
                );
            }

            const responses = await Promise.all(promises);
            const endTime = Date.now();

            // All should succeed
            responses.forEach(response => {
                expect(response.status).to.equal(201);
            });

            // Should complete within reasonable time (5 seconds)
            expect(endTime - startTime).to.be.lessThan(5000);
        });

        it('should handle notification retrieval under load', async () => {
            // Create many notifications
            for (let i = 1; i <= 50; i++) {
                await Notification.create({
                    recipient_id: studentUser.id,
                    sender_id: adminUser.id,
                    notification_type: 'system',
                    title: `Load Test Notification ${i}`,
                    message: `Load test message ${i}`,
                    is_read: false
                });
            }

            const startTime = Date.now();

            // Multiple concurrent requests
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .get('/api/students/notifications')
                        .set('Authorization', `Bearer ${studentToken}`)
                );
            }

            const responses = await Promise.all(promises);
            const endTime = Date.now();

            // All should succeed
            responses.forEach(response => {
                expect(response.status).to.equal(200);
                expect(response.body.data.notifications).to.be.an('array');
            });

            // Should complete within reasonable time
            expect(endTime - startTime).to.be.lessThan(3000);
        });

        it('should handle database connection failures gracefully', async () => {
            // Mock database error
            const originalFindAll = Notification.findAll;
            Notification.findAll = sinon.stub().rejects(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/students/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            // Should handle error gracefully
            expect(response.status).to.equal(500);
            expect(response.body.success).to.be.false;
            expect(response.body.error.message).to.include('database');

            // Restore original method
            Notification.findAll = originalFindAll;
        });

        it('should validate notification data integrity', async () => {
            // Try to create notification with invalid data
            const response = await request(app)
                .post('/api/admin/system-announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: '', // Empty title
                    message: 'Valid message',
                    targetRole: 'student'
                });

            expect(response.status).to.equal(400);
            expect(response.body.success).to.be.false;
        });
    });

    describe('Notification Filtering and Pagination', () => {
        it('should filter notifications by type', async () => {
            // Create different types of notifications
            await request(app)
                .post('/api/admin/system-announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'System Filter Test',
                    message: 'System message',
                    targetRole: 'student'
                });

            await request(app)
                .post('/api/faculty/announcements')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    subject_id: testSubject.id,
                    title: 'Academic Filter Test',
                    message: 'Academic message'
                });

            // Filter by system notifications
            const systemResponse = await request(app)
                .get('/api/students/notifications?type=system')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(systemResponse.status).to.equal(200);
            const systemNotifications = systemResponse.body.data.notifications;
            systemNotifications.forEach(notification => {
                expect(notification.notification_type).to.equal('system');
            });

            // Filter by academic notifications
            const academicResponse = await request(app)
                .get('/api/students/notifications?type=academic')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(academicResponse.status).to.equal(200);
            const academicNotifications = academicResponse.body.data.notifications;
            academicNotifications.forEach(notification => {
                expect(notification.notification_type).to.equal('academic');
            });
        });

        it('should paginate notifications properly', async () => {
            // Clear existing notifications
            await Notification.destroy({ where: { recipient_id: studentUser.id } });

            // Create many notifications
            for (let i = 1; i <= 25; i++) {
                await Notification.create({
                    recipient_id: studentUser.id,
                    sender_id: adminUser.id,
                    notification_type: 'system',
                    title: `Pagination Test ${i}`,
                    message: `Message ${i}`,
                    is_read: false
                });
            }

            // Get first page
            const page1Response = await request(app)
                .get('/api/students/notifications?page=1&limit=10')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(page1Response.status).to.equal(200);
            expect(page1Response.body.data.notifications.length).to.equal(10);
            expect(page1Response.body.data.pagination.currentPage).to.equal(1);
            expect(page1Response.body.data.pagination.totalPages).to.equal(3);

            // Get second page
            const page2Response = await request(app)
                .get('/api/students/notifications?page=2&limit=10')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(page2Response.status).to.equal(200);
            expect(page2Response.body.data.notifications.length).to.equal(10);
            expect(page2Response.body.data.pagination.currentPage).to.equal(2);
        });
    });

    after(async () => {
        // Clean up test data
        await Notification.destroy({ where: {} });
        await Attendance.destroy({ where: {} });
        await Student.destroy({ where: {} });
        await Faculty.destroy({ where: {} });
        await Subject.destroy({ where: {} });
        await User.destroy({ where: {} });
    });
});