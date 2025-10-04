const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const { User, Student, Faculty } = require('../../models');
const { generateToken } = require('../../utils/jwt');

describe('Authentication Integration Tests', () => {
  let server;
  let testUser;
  let authToken;

  before(async () => {
    // Start server for testing
    server = app.listen(0);
    
    // Create test user
    testUser = await User.create({
      uniqueId: 'TEST001',
      email: 'test@example.com',
      phone: '1234567890',
      passwordHash: '$2a$10$test.hash.here',
      role: 'student'
    });

    await Student.create({
      userId: testUser.id,
      studentName: 'Test Student',
      semester: 1,
      batchYear: 2024
    });

    authToken = generateToken({ id: testUser.id, role: testUser.role });
  });

  after(async () => {
    // Cleanup
    await Student.destroy({ where: { userId: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
    server.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user account', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        phone: '9876543210',
        password: 'password123',
        role: 'student'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.user).to.have.property('uniqueId');
      expect(response.body.user.email).to.equal(userData.email);
      expect(response.body).to.have.property('token');

      // Cleanup
      const createdUser = await User.findOne({ where: { email: userData.email } });
      if (createdUser) {
        await Student.destroy({ where: { userId: createdUser.id } });
        await User.destroy({ where: { id: createdUser.id } });
      }
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        name: 'Duplicate User',
        email: 'test@example.com', // Same as existing user
        phone: '5555555555',
        password: 'password123',
        role: 'student'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('email');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.user.email).to.equal(testUser.email);
      expect(response.body).to.have.property('token');
    });

    it('should login with phone number', async () => {
      const loginData = {
        identifier: '1234567890',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.user.phone).to.equal(testUser.phone);
    });

    it('should login with unique ID', async () => {
      const loginData = {
        identifier: 'TEST001',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.user.uniqueId).to.equal(testUser.uniqueId);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Invalid');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.user.email).to.equal(testUser.email);
      expect(response.body.user).to.not.have.property('passwordHash');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('token');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '9999999999'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.user.name).to.equal(updateData.name);
      expect(response.body.user.phone).to.equal(updateData.phone);
    });

    it('should validate email format', async () => {
      const updateData = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('email');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset link for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: 'test@example.com' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('sent');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('not found');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.message).to.include('rate limit');
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions', async () => {
      // Login from multiple "devices"
      const loginData = {
        identifier: 'test@example.com',
        password: 'password123'
      };

      const session1 = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const session2 = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Both sessions should be valid
      expect(session1.body.token).to.not.equal(session2.body.token);

      // Both tokens should work for profile access
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${session1.body.token}`)
        .expect(200);

      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${session2.body.token}`)
        .expect(200);
    });
  });
});