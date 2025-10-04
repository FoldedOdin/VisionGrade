const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { User, Student, Faculty } = require('../models');

describe('Authentication System', () => {
  // Clean up database before each test
  beforeEach(async () => {
    await User.destroy({ where: {}, force: true });
    await Student.destroy({ where: {}, force: true });
    await Faculty.destroy({ where: {}, force: true });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student successfully', async () => {
      const studentData = {
        email: 'student@test.com',
        phone: '+1234567890',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(studentData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal(studentData.email);
      expect(response.body.data.user.role).to.equal('student');
      expect(response.body.data.user.unique_id).to.match(/^STU/);
      expect(response.body.data.tokens.access_token).to.exist;
    });

    it('should register a new faculty successfully', async () => {
      const facultyData = {
        email: 'faculty@test.com',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        role: 'faculty',
        facultyName: 'Dr. Jane Smith',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(facultyData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal(facultyData.email);
      expect(response.body.data.user.role).to.equal('faculty');
      expect(response.body.data.user.unique_id).to.match(/^FAC/);
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordData = {
        email: 'test@test.com',
        password: '123',
        confirmPassword: '123',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should reject registration with mismatched passwords', async () => {
      const mismatchedData = {
        email: 'test@test.com',
        password: 'TestPass123!',
        confirmPassword: 'DifferentPass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(mismatchedData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'TestPass123!',
          confirmPassword: 'TestPass123!',
          role: 'student',
          studentName: 'Test User',
          semester: 3,
          batchYear: 2023
        });
      
      testUser = response.body.data.user;
    });

    it('should login with email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@test.com',
          password: 'TestPass123!'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal('test@test.com');
      expect(response.body.data.tokens.access_token).to.exist;
    });

    it('should login with unique ID successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.unique_id,
          password: 'TestPass123!'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.unique_id).to.equal(testUser.unique_id);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@test.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@test.com',
          password: 'TestPass123!'
        })
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login to get auth token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'TestPass123!',
          confirmPassword: 'TestPass123!',
          role: 'student',
          studentName: 'Test User',
          semester: 3,
          batchYear: 2023
        });
      
      authToken = registerResponse.body.data.tokens.access_token;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal('test@test.com');
      expect(response.body.data.user.student).to.exist;
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('NO_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'TestPass123!',
          confirmPassword: 'TestPass123!',
          role: 'student',
          studentName: 'Test User',
          semester: 3,
          batchYear: 2023
        });
      
      authToken = registerResponse.body.data.tokens.access_token;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'TestPass123!',
          newPassword: 'NewTestPass123!',
          confirmPassword: 'NewTestPass123!'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Password changed successfully');
    });

    it('should reject with wrong current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewTestPass123!',
          confirmPassword: 'NewTestPass123!'
        })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('INVALID_CURRENT_PASSWORD');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'TestPass123!',
          confirmPassword: 'TestPass123!',
          role: 'student',
          studentName: 'Test User',
          semester: 3,
          batchYear: 2023
        });
    });

    it('should accept forgot password request for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          identifier: 'test@test.com',
          resetMethod: 'email'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('reset instructions');
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          identifier: 'nonexistent@test.com',
          resetMethod: 'email'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('If an account');
    });
  });
});

// Helper function to create test server
function createTestServer() {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  
  const testApp = express();
  
  testApp.use(helmet());
  testApp.use(cors());
  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: true }));
  
  // Import routes
  const authRoutes = require('../routes/auth');
  testApp.use('/api/auth', authRoutes);
  
  return testApp;
}

module.exports = createTestServer;