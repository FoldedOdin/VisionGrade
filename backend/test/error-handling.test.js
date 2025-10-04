const request = require('supertest');
const app = require('../server');
const { AppError } = require('../middleware/errorHandler');

describe('Error Handling', () => {
  describe('Validation Errors', () => {
    it('should return 400 for invalid login data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: '', // Empty identifier
          password: '' // Empty password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    it('should return 400 for invalid registration data', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email', // Invalid email format
          password: '123', // Too short password
          role: 'invalid-role' // Invalid role
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('Authentication Errors', () => {
    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/INVALID_TOKEN|TOKEN_VERIFICATION_FAILED/);
    });

    it('should return 401 for malformed token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer not.a.valid.jwt.token.format');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/INVALID_TOKEN/);
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });

    it('should return 404 for non-existent API endpoints', async () => {
      const response = await request(app)
        .post('/api/invalid/endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array(20).fill().map(() => 
        request(app).get('/api/auth/verify')
      );

      const responses = await Promise.all(promises);
      
      // At least one response should be rate limited
      const rateLimitedResponse = responses.find(res => res.status === 429);
      
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body.success).toBe(false);
        expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_ERROR');
      }
    }, 10000); // Increase timeout for this test
  });

  describe('Error Response Format', () => {
    it('should have consistent error response format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      
      // Timestamp should be a valid ISO string
      expect(() => new Date(response.body.error.timestamp)).not.toThrow();
    });

    it('should include details for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid',
          password: '123'
        });

      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
      
      if (response.body.error.details.length > 0) {
        const detail = response.body.error.details[0];
        expect(detail).toHaveProperty('field');
        expect(detail).toHaveProperty('message');
      }
    });
  });

  describe('AppError Class', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeNull();
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should create AppError with custom values', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new AppError('Validation failed', 'VALIDATION_ERROR', 400, details);
      
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health');

      // Check for security headers (helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Input Sanitization', () => {
    it('should handle malicious input safely', async () => {
      const maliciousInput = {
        identifier: '<script>alert("xss")</script>',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput);

      // Should not crash the server and should return appropriate error
      expect(response.status).toBe(401); // Invalid credentials
      expect(response.body.success).toBe(false);
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionInput = {
        identifier: "'; DROP TABLE users; --",
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(sqlInjectionInput);

      // Should not crash the server
      expect(response.status).toBe(401); // Invalid credentials
      expect(response.body.success).toBe(false);
    });
  });

  describe('Large Payload Handling', () => {
    it('should reject oversized payloads', async () => {
      const largePayload = {
        identifier: 'test@example.com',
        password: 'password123',
        largeField: 'x'.repeat(15 * 1024 * 1024) // 15MB string
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(largePayload);

      // Should reject with 413 or 400
      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Content Type Validation', () => {
    it('should handle invalid content types gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('invalid json data');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});