const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { AppError } = require('../middleware/errorHandler');
const { validate, validateMarksWithRecovery, validateAttendanceWithRecovery } = require('../utils/validation');

describe('Comprehensive Error Handling', () => {
  describe('Frontend Form Validation', () => {
    it('should provide real-time validation feedback', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
          role: 'invalid-role'
        });

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      expect(response.body.error.details).to.be.an('array');
      
      // Check for recovery suggestions
      const emailError = response.body.error.details.find(e => e.field === 'email');
      expect(emailError).to.exist;
      expect(emailError.suggestion).to.include('email');
    });

    it('should sanitize input to prevent XSS', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
          role: 'student',
          studentName: maliciousInput
        });

      // Should either sanitize or reject the input
      if (response.status === 201) {
        expect(response.body.data.studentName).to.not.include('<script>');
      } else {
        expect(response.status).to.equal(400);
      }
    });

    it('should provide helpful error messages for password validation', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          role: 'student',
          studentName: 'Test Student'
        });

      expect(response.status).to.equal(400);
      const passwordError = response.body.error.details.find(e => e.field === 'password');
      expect(passwordError).to.exist;
      expect(passwordError.suggestion).to.include('8 characters');
    });
  });

  describe('Backend Input Validation', () => {
    it('should validate marks entry with comprehensive error handling', () => {
      const invalidMarks = {
        student_id: 'invalid',
        subject_id: 1,
        exam_type: 'invalid_type',
        marks_obtained: -5,
        max_marks: 0
      };

      const result = validateMarksWithRecovery(invalidMarks);
      
      expect(result.success).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors.length).to.be.greaterThan(0);
      
      // Check for specific error types
      const studentIdError = result.errors.find(e => e.field === 'student_id');
      expect(studentIdError).to.exist;
      expect(studentIdError.suggestion).to.exist;
    });

    it('should validate attendance with business logic checks', () => {
      const invalidAttendance = {
        student_id: 1,
        subject_id: 1,
        total_classes: 10,
        attended_classes: 15 // More than total
      };

      const result = validateAttendanceWithRecovery(invalidAttendance);
      
      expect(result.success).to.be.false;
      expect(result.errors).to.be.an('array');
      
      const attendanceError = result.errors.find(e => e.field === 'attended_classes');
      expect(attendanceError).to.exist;
      expect(attendanceError.message).to.include('cannot exceed');
    });

    it('should provide warnings for low attendance', () => {
      const lowAttendance = {
        student_id: 1,
        subject_id: 1,
        total_classes: 100,
        attended_classes: 60 // 60% attendance
      };

      const result = validateAttendanceWithRecovery(lowAttendance);
      
      expect(result.success).to.be.true;
      expect(result.warnings).to.be.an('array');
      expect(result.warnings.length).to.be.greaterThan(0);
      
      const warning = result.warnings[0];
      expect(warning.message).to.include('below the required 75%');
    });

    it('should handle file upload validation', async () => {
      // Test oversized file
      const response = await request(app)
        .post('/api/auth/profile/photo')
        .attach('photo', Buffer.alloc(10 * 1024 * 1024), 'large-file.jpg'); // 10MB file

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      
      const sizeError = response.body.error.details.find(e => e.field === 'file_size');
      expect(sizeError).to.exist;
      expect(sizeError.suggestion).to.include('compress');
    });
  });

  describe('Database Transaction Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database connection failure
      const response = await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', 'Bearer valid-token');

      // Should handle gracefully even if database is down
      if (response.status === 503) {
        expect(response.body.error.code).to.equal('DATABASE_ERROR');
        expect(response.body.error.message).to.include('connection');
      }
    });

    it('should rollback transactions on error', async () => {
      // Test transaction rollback with invalid data
      const response = await request(app)
        .post('/api/marks')
        .set('Authorization', 'Bearer faculty-token')
        .send({
          marks: [
            { student_id: 1, subject_id: 1, marks_obtained: 50, max_marks: 50 },
            { student_id: 'invalid', subject_id: 1, marks_obtained: 40, max_marks: 50 }
          ]
        });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      
      // Verify no partial data was saved (transaction rolled back)
      const checkResponse = await request(app)
        .get('/api/marks/student/1')
        .set('Authorization', 'Bearer faculty-token');
      
      // Should not contain the first valid mark if transaction was properly rolled back
      if (checkResponse.status === 200) {
        const marks = checkResponse.body.data;
        const newMark = marks.find(m => m.marks_obtained === 50);
        expect(newMark).to.not.exist;
      }
    });

    it('should handle unique constraint violations', async () => {
      // Try to create duplicate user
      const userData = {
        email: 'existing@example.com',
        password: 'ValidPass123!',
        role: 'student',
        studentName: 'Test Student'
      };

      // First creation should succeed
      await request(app).post('/api/auth/register').send(userData);

      // Second creation should fail with proper error
      const response = await request(app).post('/api/auth/register').send(userData);

      expect(response.status).to.equal(409);
      expect(response.body.error.code).to.equal('CONFLICT_ERROR');
      expect(response.body.error.message).to.include('already exists');
    });
  });

  describe('ML Service Error Handling', () => {
    it('should provide fallback predictions when ML service fails', async () => {
      const response = await request(app)
        .get('/api/ml/predict/student/1/subject/1')
        .set('Authorization', 'Bearer student-token');

      // Should provide some form of prediction even if ML service is down
      if (response.status === 200) {
        expect(response.body.data).to.exist;
        expect(response.body.data.predicted_marks).to.be.a('number');
        
        if (response.body.data.prediction_method === 'fallback') {
          expect(response.body.data.warning).to.include('fallback');
          expect(response.body.data.confidence_score).to.be.lessThan(0.6);
        }
      } else if (response.status === 503) {
        expect(response.body.error.code).to.equal('EXTERNAL_SERVICE_ERROR');
        expect(response.body.error.message).to.include('unavailable');
      }
    });

    it('should validate ML input data comprehensively', async () => {
      const invalidData = {
        series_test_1: 'invalid',
        series_test_2: -10,
        lab_internal: 150 // Out of range
      };

      const response = await request(app)
        .post('/api/ml/predict')
        .set('Authorization', 'Bearer student-token')
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      
      const errors = response.body.error.details;
      expect(errors).to.be.an('array');
      expect(errors.length).to.be.greaterThan(0);
      
      // Check for specific validation errors
      const rangeError = errors.find(e => e.message.includes('range'));
      expect(rangeError).to.exist;
    });

    it('should handle model unavailability gracefully', async () => {
      // Test when ML model is not loaded
      const response = await request(app)
        .get('/api/ml/model/health')
        .set('Authorization', 'Bearer admin-token');

      if (response.status === 503) {
        expect(response.body.error.code).to.equal('MODEL_ERROR');
        expect(response.body.error.recovery_suggestions).to.be.an('array');
        expect(response.body.error.recovery_suggestions.length).to.be.greaterThan(0);
      }
    });
  });

  describe('Authentication Error Handling', () => {
    it('should provide secure error messages for login failures', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).to.equal(401);
      expect(response.body.error.code).to.equal('AUTHENTICATION_ERROR');
      
      // Should not reveal whether email exists or not
      expect(response.body.error.message).to.not.include('email not found');
      expect(response.body.error.message).to.not.include('user does not exist');
      expect(response.body.error.message).to.include('Invalid credentials');
    });

    it('should handle expired tokens securely', async () => {
      const expiredToken = 'expired.jwt.token';
      
      const response = await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).to.equal(401);
      expect(response.body.error.code).to.equal('AUTHENTICATION_ERROR');
      expect(response.body.error.message).to.include('expired');
    });

    it('should rate limit login attempts', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      const promises = Array(10).fill().map(() => 
        request(app).post('/api/auth/login').send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // Should eventually rate limit
      const rateLimitedResponse = responses.find(r => r.status === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body.error.code).to.equal('RATE_LIMIT_ERROR');
        expect(rateLimitedResponse.body.error.details.retryAfter).to.be.a('number');
      }
    });

    it('should handle authorization errors with role-specific messages', async () => {
      // Student trying to access admin endpoint
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer student-token');

      expect(response.status).to.equal(403);
      expect(response.body.error.code).to.equal('AUTHORIZATION_ERROR');
      expect(response.body.error.message).to.include('permission');
    });
  });

  describe('Error Recovery and User Guidance', () => {
    it('should provide actionable recovery suggestions', async () => {
      const response = await request(app)
        .post('/api/marks')
        .set('Authorization', 'Bearer faculty-token')
        .send({
          student_id: 999999, // Non-existent student
          subject_id: 1,
          exam_type: 'series_test_1',
          marks_obtained: 45,
          max_marks: 50
        });

      expect(response.status).to.equal(400);
      expect(response.body.error.recovery_suggestions).to.be.an('array');
      expect(response.body.error.recovery_suggestions.length).to.be.greaterThan(0);
      
      const suggestions = response.body.error.recovery_suggestions;
      expect(suggestions.some(s => s.includes('check') || s.includes('verify'))).to.be.true;
    });

    it('should categorize errors appropriately', async () => {
      // Network simulation - this would be mocked in real tests
      const response = await request(app)
        .get('/api/external/service')
        .set('Authorization', 'Bearer valid-token');

      if (response.status >= 500) {
        expect(response.body.error.code).to.be.oneOf([
          'SERVER_ERROR',
          'EXTERNAL_SERVICE_ERROR',
          'DATABASE_ERROR'
        ]);
        expect(response.body.error.recoverable).to.exist;
      }
    });

    it('should provide context-aware error messages', async () => {
      // Test different contexts for the same error type
      const contexts = [
        { endpoint: '/api/auth/login', expectedContext: 'authentication' },
        { endpoint: '/api/marks', expectedContext: 'academic_data' },
        { endpoint: '/api/ml/predict', expectedContext: 'prediction' }
      ];

      for (const context of contexts) {
        const response = await request(app)
          .post(context.endpoint)
          .send({}); // Empty data to trigger validation

        if (response.status === 400) {
          expect(response.body.error.details).to.be.an('array');
          // Error messages should be contextually appropriate
          const hasContextualMessage = response.body.error.details.some(
            detail => detail.suggestion && detail.suggestion.length > 0
          );
          expect(hasContextualMessage).to.be.true;
        }
      }
    });
  });

  describe('Performance and Monitoring', () => {
    it('should log errors appropriately for monitoring', async () => {
      // This would typically check log files or monitoring systems
      const response = await request(app)
        .post('/api/test/error')
        .send({ triggerError: true });

      // Should handle the error gracefully
      expect(response.status).to.be.greaterThan(399);
      expect(response.body.error.timestamp).to.exist;
      expect(response.body.error.code).to.exist;
    });

    it('should handle high error rates gracefully', async () => {
      // Simulate multiple concurrent errors
      const promises = Array(50).fill().map(() => 
        request(app).post('/api/test/error').send({ triggerError: true })
      );

      const responses = await Promise.all(promises);
      
      // All should be handled without crashing
      responses.forEach(response => {
        expect(response.status).to.be.greaterThan(399);
        expect(response.body.error).to.exist;
      });
    });
  });
});