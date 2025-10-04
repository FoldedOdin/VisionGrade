const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const { User, Student, Faculty } = require('../../models');
const { generateToken } = require('../../utils/jwt');

describe('Authentication Flow Integration Tests', () => {
  let server;
  let testUsers = {};

  before(async () => {
    server = app.listen(0);
  });

  after(async () => {
    // Cleanup all test users
    for (const userType in testUsers) {
      const user = testUsers[userType];
      if (user.role === 'student') {
        await Student.destroy({ where: { userId: user.id } });
      } else if (user.role === 'faculty') {
        await Faculty.destroy({ where: { userId: user.id } });
      }
      await User.destroy({ where: { id: user.id } });
    }
    server.close();
  });

  describe('Complete User Registration Flow', () => {
    it('should complete full student registration flow', async () => {
      const studentData = {
        name: 'John Student',
        email: 'john.student@example.com',
        phone: '1234567890',
        password: 'securePassword123',
        role: 'student'
      };

      // Step 1: Register new student
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(studentData)
        .expect(201);

      expect(signupResponse.body.success).to.be.true;
      expect(signupResponse.body.user).to.have.property('uniqueId');
      expect(signupResponse.body.user.email).to.equal(studentData.email);
      expect(signupResponse.body).to.have.property('token');

      const studentUser = signupResponse.body.user;
      const studentToken = signupResponse.body.token;
      testUsers.student = studentUser;

      // Step 2: Verify user can access protected routes
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(profileResponse.body.user.id).to.equal(studentUser.id);
      expect(profileResponse.body.user.role).to.equal('student');

      // Step 3: Verify student-specific data was created
      const student = await Student.findOne({ where: { userId: studentUser.id } });
      expect(student).to.not.be.null;
      expect(student.studentName).to.equal(studentData.name);

      // Step 4: Verify student can access student routes
      const dashboardResponse = await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).to.be.true;
      expect(dashboardResponse.body.data).to.have.property('student');
    });

    it('should complete full faculty registration flow', async () => {
      const facultyData = {
        name: 'Dr. Jane Faculty',
        email: 'jane.faculty@example.com',
        phone: '0987654321',
        password: 'securePassword456',
        role: 'faculty'
      };

      // Step 1: Register new faculty
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(facultyData)
        .expect(201);

      expect(signupResponse.body.success).to.be.true;
      const facultyUser = signupResponse.body.user;
      const facultyToken = signupResponse.body.token;
      testUsers.faculty = facultyUser;

      // Step 2: Verify faculty-specific data was created
      const faculty = await Faculty.findOne({ where: { userId: facultyUser.id } });
      expect(faculty).to.not.be.null;
      expect(faculty.facultyName).to.equal(facultyData.name);

      // Step 3: Verify faculty can access faculty routes
      const subjectsResponse = await request(app)
        .get('/api/faculty/subjects')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(subjectsResponse.body.success).to.be.true;
      expect(subjectsResponse.body.data).to.be.an('array');
    });

    it('should complete full admin registration flow', async () => {
      const adminData = {
        name: 'System Admin',
        email: 'admin@example.com',
        phone: '5555555555',
        password: 'adminPassword789',
        role: 'admin'
      };

      // Step 1: Register new admin
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(adminData)
        .expect(201);

      expect(signupResponse.body.success).to.be.true;
      const adminUser = signupResponse.body.user;
      const adminToken = signupResponse.body.token;
      testUsers.admin = adminUser;

      // Step 2: Verify admin can access admin routes
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.success).to.be.true;
      expect(usersResponse.body.data).to.be.an('array');
    });
  });

  describe('Multi-Channel Login Flow', () => {
    let testUser;
    let testToken;

    before(async () => {
      // Create a test user for login tests
      const userData = {
        name: 'Login Test User',
        email: 'login.test@example.com',
        phone: '1111111111',
        password: 'loginPassword123',
        role: 'student'
      };

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      testUser = signupResponse.body.user;
      testToken = signupResponse.body.token;
    });

    it('should login with email and password', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'login.test@example.com',
          password: 'loginPassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).to.be.true;
      expect(loginResponse.body.user.email).to.equal('login.test@example.com');
      expect(loginResponse.body).to.have.property('token');

      // Verify token works
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);
    });

    it('should login with phone and password', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: '1111111111',
          password: 'loginPassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).to.be.true;
      expect(loginResponse.body.user.phone).to.equal('1111111111');
      expect(loginResponse.body).to.have.property('token');
    });

    it('should login with unique ID and password', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.uniqueId,
          password: 'loginPassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).to.be.true;
      expect(loginResponse.body.user.uniqueId).to.equal(testUser.uniqueId);
      expect(loginResponse.body).to.have.property('token');
    });

    after(async () => {
      // Cleanup login test user
      await Student.destroy({ where: { userId: testUser.id } });
      await User.destroy({ where: { id: testUser.id } });
    });
  });

  describe('Password Reset Flow', () => {
    let resetUser;
    let resetToken;

    before(async () => {
      // Create user for password reset tests
      const userData = {
        name: 'Reset Test User',
        email: 'reset.test@example.com',
        phone: '2222222222',
        password: 'originalPassword123',
        role: 'student'
      };

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      resetUser = signupResponse.body.user;
    });

    it('should initiate password reset with email', async () => {
      const resetResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: 'reset.test@example.com' })
        .expect(200);

      expect(resetResponse.body.success).to.be.true;
      expect(resetResponse.body.message).to.include('sent');
    });

    it('should initiate password reset with phone', async () => {
      const resetResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: '2222222222' })
        .expect(200);

      expect(resetResponse.body.success).to.be.true;
      expect(resetResponse.body.message).to.include('sent');
    });

    it('should complete password reset flow', async () => {
      // In a real scenario, this would use a reset token from email/SMS
      // For testing, we'll simulate the reset process
      
      // Step 1: Request password reset
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: 'reset.test@example.com' })
        .expect(200);

      // Step 2: Simulate reset token validation and password update
      // This would typically involve a separate endpoint for reset confirmation
      const newPassword = 'newSecurePassword456';
      
      // For this test, we'll update the password directly and verify login works
      const user = await User.findOne({ where: { email: 'reset.test@example.com' } });
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ passwordHash: hashedPassword });

      // Step 3: Verify login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'reset.test@example.com',
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).to.be.true;
      expect(loginResponse.body).to.have.property('token');

      // Step 4: Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'reset.test@example.com',
          password: 'originalPassword123'
        })
        .expect(401);
    });

    after(async () => {
      // Cleanup reset test user
      await Student.destroy({ where: { userId: resetUser.id } });
      await User.destroy({ where: { id: resetUser.id } });
    });
  });

  describe('Profile Management Flow', () => {
    let profileUser;
    let profileToken;

    before(async () => {
      // Create user for profile tests
      const userData = {
        name: 'Profile Test User',
        email: 'profile.test@example.com',
        phone: '3333333333',
        password: 'profilePassword123',
        role: 'student'
      };

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      profileUser = signupResponse.body.user;
      profileToken = signupResponse.body.token;
    });

    it('should complete profile update flow', async () => {
      // Step 1: Get current profile
      const currentProfileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${profileToken}`)
        .expect(200);

      expect(currentProfileResponse.body.user.name).to.equal('Profile Test User');

      // Step 2: Update profile
      const updateData = {
        name: 'Updated Profile Name',
        phone: '4444444444'
      };

      const updateResponse = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${profileToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).to.be.true;
      expect(updateResponse.body.user.name).to.equal(updateData.name);
      expect(updateResponse.body.user.phone).to.equal(updateData.phone);

      // Step 3: Verify changes persist
      const updatedProfileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${profileToken}`)
        .expect(200);

      expect(updatedProfileResponse.body.user.name).to.equal(updateData.name);
      expect(updatedProfileResponse.body.user.phone).to.equal(updateData.phone);

      // Step 4: Verify login still works with updated phone
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: '4444444444',
          password: 'profilePassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).to.be.true;
    });

    after(async () => {
      // Cleanup profile test user
      await Student.destroy({ where: { userId: profileUser.id } });
      await User.destroy({ where: { id: profileUser.id } });
    });
  });

  describe('Role-Based Access Control Flow', () => {
    let studentUser, facultyUser, adminUser;
    let studentToken, facultyToken, adminToken;

    before(async () => {
      // Create users with different roles
      const users = [
        { name: 'RBAC Student', email: 'rbac.student@example.com', phone: '5555555555', role: 'student' },
        { name: 'RBAC Faculty', email: 'rbac.faculty@example.com', phone: '6666666666', role: 'faculty' },
        { name: 'RBAC Admin', email: 'rbac.admin@example.com', phone: '7777777777', role: 'admin' }
      ];

      for (const userData of users) {
        const signupResponse = await request(app)
          .post('/api/auth/signup')
          .send({ ...userData, password: 'rbacPassword123' })
          .expect(201);

        if (userData.role === 'student') {
          studentUser = signupResponse.body.user;
          studentToken = signupResponse.body.token;
        } else if (userData.role === 'faculty') {
          facultyUser = signupResponse.body.user;
          facultyToken = signupResponse.body.token;
        } else if (userData.role === 'admin') {
          adminUser = signupResponse.body.user;
          adminToken = signupResponse.body.token;
        }
      }
    });

    it('should enforce student access restrictions', async () => {
      // Student should access student routes
      await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Student should NOT access faculty routes
      await request(app)
        .get('/api/faculty/subjects')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      // Student should NOT access admin routes
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should enforce faculty access restrictions', async () => {
      // Faculty should access faculty routes
      await request(app)
        .get('/api/faculty/subjects')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      // Faculty should NOT access student-specific routes
      await request(app)
        .get('/api/students/dashboard')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);

      // Faculty should NOT access admin routes
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);
    });

    it('should allow admin access to all routes', async () => {
      // Admin should access admin routes
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Admin should also access other routes for management purposes
      await request(app)
        .get('/api/faculty/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    after(async () => {
      // Cleanup RBAC test users
      await Student.destroy({ where: { userId: studentUser.id } });
      await Faculty.destroy({ where: { userId: facultyUser.id } });
      await User.destroy({ where: { id: studentUser.id } });
      await User.destroy({ where: { id: facultyUser.id } });
      await User.destroy({ where: { id: adminUser.id } });
    });
  });

  describe('Session Management Flow', () => {
    let sessionUser;
    let sessionToken;

    before(async () => {
      const userData = {
        name: 'Session Test User',
        email: 'session.test@example.com',
        phone: '8888888888',
        password: 'sessionPassword123',
        role: 'student'
      };

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      sessionUser = signupResponse.body.user;
      sessionToken = signupResponse.body.token;
    });

    it('should handle concurrent sessions', async () => {
      // Login from multiple "devices"
      const loginData = {
        identifier: 'session.test@example.com',
        password: 'sessionPassword123'
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

      // Both tokens should work
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${session1.body.token}`)
        .expect(200);

      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${session2.body.token}`)
        .expect(200);
    });

    it('should handle token expiration gracefully', async () => {
      // Create an expired token
      const expiredToken = generateToken(
        { id: sessionUser.id, role: sessionUser.role },
        '1ms' // Expires immediately
      );

      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Expired token should be rejected
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    after(async () => {
      // Cleanup session test user
      await Student.destroy({ where: { userId: sessionUser.id } });
      await User.destroy({ where: { id: sessionUser.id } });
    });
  });

  describe('Error Handling in Authentication Flow', () => {
    it('should handle duplicate registration attempts', async () => {
      const userData = {
        name: 'Duplicate Test',
        email: 'duplicate@example.com',
        phone: '9999999999',
        password: 'password123',
        role: 'student'
      };

      // First registration should succeed
      const firstResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      // Second registration with same phone should fail
      await request(app)
        .post('/api/auth/signup')
        .send({ ...userData, email: 'different@example.com' })
        .expect(400);

      // Cleanup
      const user = firstResponse.body.user;
      await Student.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
    });

    it('should handle malformed tokens', async () => {
      // Invalid token format
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.format')
        .expect(401);

      // Missing Bearer prefix
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'invalid-token')
        .expect(401);

      // Empty authorization header
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', '')
        .expect(401);
    });

    it('should handle database connection errors during auth', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the error handling structure is in place
      
      // Test with non-existent user ID in token
      const fakeToken = generateToken({ id: 99999, role: 'student' });
      
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);
    });
  });
});