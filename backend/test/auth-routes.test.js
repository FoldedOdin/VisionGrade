const request = require('supertest');
const { expect } = require('chai');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Create a test app without database dependencies
function createTestApp() {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Import routes
  const authRoutes = require('../routes/auth');
  app.use('/api/auth', authRoutes);
  
  // Error handling
  app.use((err, req, res, next) => {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong!',
        timestamp: new Date().toISOString()
      }
    });
  });
  
  return app;
}

describe('Authentication Routes', () => {
  let app;

  before(() => {
    // Set up test environment variables
    process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing_purposes_only';
    process.env.JWT_RESET_SECRET = 'test_reset_secret_key_for_testing_purposes_only';
    
    app = createTestApp();
  });

  describe('Route Validation', () => {
    it('should reject registration with invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      expect(response.body.error.details).to.be.an('array');
    });

    it('should reject login with missing data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should reject forgot password with invalid data', async () => {
      const invalidData = {
        identifier: 'test@test.com',
        resetMethod: 'invalid-method'
      };

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should reject profile access without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('NO_TOKEN');
    });

    it('should reject profile access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('INVALID_TOKEN');
    });
  });

  describe('Validation Schema Tests', () => {
    it('should validate correct student registration data structure', async () => {
      const validData = {
        email: 'student@test.com',
        phone: '+1234567890',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      // This will fail at database level, but validation should pass
      const response = await request(app)
        .post('/api/auth/register')
        .send(validData);

      // Should not be a validation error (400), but likely a 500 due to DB
      expect(response.status).to.not.equal(400);
    });

    it('should validate correct faculty registration data structure', async () => {
      const validData = {
        email: 'faculty@test.com',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        role: 'faculty',
        facultyName: 'Dr. Jane Smith',
        department: 'Computer Science'
      };

      // This will fail at database level, but validation should pass
      const response = await request(app)
        .post('/api/auth/register')
        .send(validData);

      // Should not be a validation error (400), but likely a 500 due to DB
      expect(response.status).to.not.equal(400);
    });

    it('should validate correct login data structure', async () => {
      const validData = {
        identifier: 'test@test.com',
        password: 'TestPass123!'
      };

      // This will fail at database level, but validation should pass
      const response = await request(app)
        .post('/api/auth/login')
        .send(validData);

      // Should not be a validation error (400), but likely a 500 due to DB
      expect(response.status).to.not.equal(400);
    });
  });
});