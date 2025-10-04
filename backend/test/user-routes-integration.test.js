const request = require('supertest');
const { expect } = require('chai');
const express = require('express');
const sinon = require('sinon');

// Mock the middleware modules before requiring routes
const mockAuth = {
  authenticateToken: (req, res, next) => {
    if (req.headers['x-test-user'] === 'admin') {
      req.user = { id: 1, role: 'admin', unique_id: 'ADM240001' };
    } else if (req.headers['x-test-user'] === 'faculty') {
      req.user = { id: 2, role: 'faculty', unique_id: 'FAC240001' };
    } else if (req.headers['x-test-user'] === 'student') {
      req.user = { id: 3, role: 'student', unique_id: 'STU240001' };
    } else {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'NO_TOKEN', message: 'Access token is required' } 
      });
    }
    next();
  }
};

const mockRbac = {
  requireAdmin: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Access denied. Required role(s): admin' } 
      });
    }
    next();
  },
  requireStaff: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }
    if (!['faculty', 'tutor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Access denied. Required role(s): faculty, tutor, admin' } 
      });
    }
    next();
  }
};

// Mock the modules
const authStub = sinon.stub(require.cache[require.resolve('../middleware/auth')], 'exports').value(mockAuth);
const rbacStub = sinon.stub(require.cache[require.resolve('../middleware/rbac')], 'exports').value(mockRbac);

const userRoutes = require('../routes/users');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  
  // Error handler
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_JSON', message: 'Invalid JSON format' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  });
  
  return app;
};

describe('User Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all routes', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    it('should allow admin access to user management', async () => {
      // This will fail with database error, but should pass authorization
      const response = await request(app)
        .get('/api/users')
        .set('x-test-user', 'admin');
      
      // Should not be 403 (forbidden), might be 500 due to no database
      expect(response.status).to.not.equal(403);
    });

    it('should deny non-admin access to user creation', async () => {
      await request(app)
        .post('/api/users')
        .set('x-test-user', 'faculty')
        .send({})
        .expect(403);
    });

    it('should deny non-admin access to user deletion', async () => {
      await request(app)
        .delete('/api/users/1')
        .set('x-test-user', 'student')
        .expect(403);
    });

    it('should allow staff access to user details', async () => {
      const response = await request(app)
        .get('/api/users/1')
        .set('x-test-user', 'faculty');
      
      // Should not be 403 (forbidden)
      expect(response.status).to.not.equal(403);
    });

    it('should deny student access to faculty assignments', async () => {
      await request(app)
        .get('/api/users/faculty/assignments')
        .set('x-test-user', 'student')
        .expect(403);
    });

    it('should deny faculty access to student enrollments', async () => {
      await request(app)
        .post('/api/users/students/enroll')
        .set('x-test-user', 'faculty')
        .send({})
        .expect(403);
    });
  });

  describe('Route Structure Validation', () => {
    it('should have correct route structure for user CRUD', async () => {
      // Test that routes exist and respond (even if with errors due to no DB)
      const routes = [
        { method: 'get', path: '/api/users', user: 'admin' },
        { method: 'post', path: '/api/users', user: 'admin' },
        { method: 'get', path: '/api/users/1', user: 'admin' },
        { method: 'put', path: '/api/users/1', user: 'admin' },
        { method: 'delete', path: '/api/users/1', user: 'admin' }
      ];

      for (const route of routes) {
        const response = await request(app)
          [route.method](route.path)
          .set('x-test-user', route.user)
          .send({});
        
        // Should not be 404 (not found) or 403 (forbidden)
        expect(response.status).to.not.equal(404);
        expect(response.status).to.not.equal(403);
      }
    });

    it('should have correct route structure for faculty assignments', async () => {
      const routes = [
        { method: 'get', path: '/api/users/faculty/assignments', user: 'admin' },
        { method: 'post', path: '/api/users/faculty/assign', user: 'admin' },
        { method: 'delete', path: '/api/users/faculty/1/subjects/1', user: 'admin' }
      ];

      for (const route of routes) {
        const response = await request(app)
          [route.method](route.path)
          .set('x-test-user', route.user)
          .send({});
        
        expect(response.status).to.not.equal(404);
        expect(response.status).to.not.equal(403);
      }
    });

    it('should have correct route structure for student enrollments', async () => {
      const routes = [
        { method: 'get', path: '/api/users/students/enrollments', user: 'admin' },
        { method: 'post', path: '/api/users/students/enroll', user: 'admin' },
        { method: 'post', path: '/api/users/students/enroll-semester', user: 'admin' },
        { method: 'delete', path: '/api/users/students/1/subjects/1', user: 'admin' },
        { method: 'post', path: '/api/users/students/promote', user: 'admin' },
        { method: 'get', path: '/api/users/students/statistics', user: 'admin' }
      ];

      for (const route of routes) {
        const response = await request(app)
          [route.method](route.path)
          .set('x-test-user', route.user)
          .send({});
        
        expect(response.status).to.not.equal(404);
        expect(response.status).to.not.equal(403);
      }
    });
  });

  describe('Input Validation', () => {
    it('should validate user creation input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/api/users')
        .set('x-test-user', 'admin')
        .send(invalidData);

      // Should get validation error (400) not authorization error (403)
      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should validate faculty assignment input', async () => {
      const invalidData = {
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/users/faculty/assign')
        .set('x-test-user', 'admin')
        .send(invalidData);

      // Should get validation error (400)
      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });

    it('should validate student enrollment input', async () => {
      const invalidData = {
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/users/students/enroll')
        .set('x-test-user', 'admin')
        .send(invalidData);

      // Should get validation error (400)
      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });

    it('should validate promotion input', async () => {
      const invalidData = {
        studentIds: [1, 2, 3],
        fromSemester: 3,
        toSemester: 2 // Invalid: should be greater than fromSemester
      };

      const response = await request(app)
        .post('/api/users/students/promote')
        .set('x-test-user', 'admin')
        .send(invalidData);

      // Should get validation error (400)
      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });
  });

  describe('File Upload Routes', () => {
    it('should have profile photo upload route', async () => {
      const response = await request(app)
        .post('/api/users/1/photo')
        .set('x-test-user', 'admin');

      // Should not be 404 (route exists) or 403 (authorized)
      expect(response.status).to.not.equal(404);
      expect(response.status).to.not.equal(403);
      // Will likely be 400 due to missing file, which is expected
    });

    it('should allow users to upload their own profile photo', async () => {
      const response = await request(app)
        .post('/api/users/3/photo') // User ID 3 matches student user
        .set('x-test-user', 'student');

      // Should not be 403 (should be allowed for own profile)
      expect(response.status).to.not.equal(403);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/users/nonexistent/route')
        .set('x-test-user', 'admin')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('x-test-user', 'admin')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).to.equal(400);
    });
  });

  describe('Response Format', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('x-test-user', 'admin')
        .send({ email: 'invalid' });

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code');
      expect(response.body.error).to.have.property('message');
      expect(response.body.error).to.have.property('timestamp');
    });

    it('should return consistent error format for authorization errors', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('x-test-user', 'student')
        .send({});

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'FORBIDDEN');
    });
  });
});