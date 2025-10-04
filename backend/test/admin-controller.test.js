const request = require('supertest');
const app = require('../server');
const { User, Student, Faculty, Subject, Notification } = require('../models');
const jwt = require('../utils/jwt');

describe('Admin Controller', () => {
  let adminToken;
  let adminUser;

  beforeEach(async () => {
    // Create admin user for testing
    adminUser = await User.create({
      unique_id: 'ADMIN001',
      email: 'admin@test.com',
      password_hash: 'hashedpassword',
      role: 'admin'
    });

    adminToken = jwt.generateToken({ 
      id: adminUser.id, 
      role: adminUser.role 
    });
  });

  afterEach(async () => {
    // Clean up test data
    await Notification.destroy({ where: {} });
    await Subject.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard data for admin', async () => {
      // Create test data
      await User.create({
        unique_id: 'STU001',
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        role: 'student'
      });

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalStudents');
      expect(response.body.data).toHaveProperty('totalFaculty');
      expect(response.body.data).toHaveProperty('totalSubjects');
    });

    it('should require admin role', async () => {
      const studentUser = await User.create({
        unique_id: 'STU001',
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        role: 'student'
      });

      const studentToken = jwt.generateToken({ 
        id: studentUser.id, 
        role: studentUser.role 
      });

      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new student user', async () => {
      const userData = {
        email: 'newstudent@test.com',
        password: 'password123',
        role: 'student',
        name: 'New Student',
        semester: 1,
        batch_year: 2024
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data.student).toBeDefined();
      expect(response.body.data.student.student_name).toBe(userData.name);
    });

    it('should create a new faculty user', async () => {
      const userData = {
        email: 'newfaculty@test.com',
        password: 'password123',
        role: 'faculty',
        name: 'New Faculty',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data.faculty).toBeDefined();
      expect(response.body.data.faculty.faculty_name).toBe(userData.name);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: adminUser.email,
        password: 'password123',
        role: 'student',
        name: 'Test Student'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/admin/subjects', () => {
    it('should create a new subject', async () => {
      const subjectData = {
        subject_code: 'CS101',
        subject_name: 'Introduction to Computer Science',
        subject_type: 'theory',
        semester: 1,
        credits: 3
      };

      const response = await request(app)
        .post('/api/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subjectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subject_code).toBe(subjectData.subject_code);
      expect(response.body.data.subject_name).toBe(subjectData.subject_name);
    });

    it('should reject duplicate subject code', async () => {
      await Subject.create({
        subject_code: 'CS101',
        subject_name: 'Test Subject',
        subject_type: 'theory',
        semester: 1,
        credits: 3
      });

      const subjectData = {
        subject_code: 'CS101',
        subject_name: 'Another Subject',
        subject_type: 'theory',
        semester: 1,
        credits: 3
      };

      const response = await request(app)
        .post('/api/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subjectData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBJECT_EXISTS');
    });
  });

  describe('POST /api/admin/announcements', () => {
    it('should create system announcement', async () => {
      // Create additional users to receive announcements
      await User.create({
        unique_id: 'STU001',
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        role: 'student'
      });

      const announcementData = {
        title: 'System Maintenance',
        message: 'The system will be under maintenance tomorrow.'
      };

      const response = await request(app)
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(announcementData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('users');

      // Verify notifications were created
      const notifications = await Notification.findAll();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].title).toBe(announcementData.title);
      expect(notifications[0].message).toBe(announcementData.message);
    });
  });

  describe('POST /api/admin/promote-students', () => {
    it('should promote students from one semester to another', async () => {
      // Create test student
      const studentUser = await User.create({
        unique_id: 'STU001',
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        role: 'student'
      });

      await Student.create({
        user_id: studentUser.id,
        student_name: 'Test Student',
        semester: 1,
        batch_year: 2024,
        graduation_status: 'active'
      });

      const promotionData = {
        fromSemester: 1,
        toSemester: 2
      };

      const response = await request(app)
        .post('/api/admin/promote-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(promotionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.promotedCount).toBe(1);

      // Verify student was promoted
      const updatedStudent = await Student.findOne({ where: { user_id: studentUser.id } });
      expect(updatedStudent.semester).toBe(2);
    });
  });

  describe('POST /api/admin/graduate-students', () => {
    it('should graduate students', async () => {
      // Create test student
      const studentUser = await User.create({
        unique_id: 'STU001',
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        role: 'student'
      });

      await Student.create({
        user_id: studentUser.id,
        student_name: 'Test Student',
        semester: 8,
        batch_year: 2024,
        graduation_status: 'active'
      });

      const graduationData = {
        semester: 8
      };

      const response = await request(app)
        .post('/api/admin/graduate-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(graduationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.graduatedCount).toBe(1);

      // Verify student was graduated
      const updatedStudent = await Student.findOne({ where: { user_id: studentUser.id } });
      expect(updatedStudent.graduation_status).toBe('graduated');
    });
  });
});