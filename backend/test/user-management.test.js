const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { User, Student, Faculty, Subject, FacultySubject, StudentSubject } = require('../models');
const { generateToken } = require('../utils/jwt');
const path = require('path');

describe('User Management API', () => {
  let adminToken, facultyToken, studentToken;
  let adminUser, facultyUser, studentUser;
  let testSubject, testStudent, testFaculty;

  before(async () => {
    // Create test users
    adminUser = await User.create({
      unique_id: 'ADM240001',
      email: 'admin@test.com',
      password_hash: 'hashedpassword',
      role: 'admin'
    });

    facultyUser = await User.create({
      unique_id: 'FAC240001',
      email: 'faculty@test.com',
      password_hash: 'hashedpassword',
      role: 'faculty'
    });

    studentUser = await User.create({
      unique_id: 'STU240001',
      email: 'student@test.com',
      password_hash: 'hashedpassword',
      role: 'student'
    });

    // Create faculty and student profiles
    testFaculty = await Faculty.create({
      user_id: facultyUser.id,
      faculty_name: 'Test Faculty',
      department: 'Computer Science'
    });

    testStudent = await Student.create({
      user_id: studentUser.id,
      student_name: 'Test Student',
      semester: 1,
      batch_year: 2024
    });

    // Create test subject
    testSubject = await Subject.create({
      subject_code: 'CS101',
      subject_name: 'Introduction to Programming',
      subject_type: 'theory',
      semester: 1,
      credits: 3
    });

    // Generate tokens
    adminToken = generateToken(adminUser.id);
    facultyToken = generateToken(facultyUser.id);
    studentToken = generateToken(studentUser.id);
  });

  after(async () => {
    // Clean up test data
    await StudentSubject.destroy({ where: {} });
    await FacultySubject.destroy({ where: {} });
    await Subject.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('GET /api/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.users).to.be.an('array');
      expect(response.body.data.pagination).to.exist;
    });

    it('should deny access for non-admin users', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);
    });

    it('should support pagination and filtering', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2&role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.pagination.currentPage).to.equal(1);
      expect(response.body.data.users.length).to.be.at.most(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/users/${studentUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.id).to.equal(studentUser.id);
      expect(response.body.data.user.studentProfile).to.exist;
    });

    it('should allow faculty to view user details', async () => {
      const response = await request(app)
        .get(`/api/users/${studentUser.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new student user', async () => {
      const userData = {
        email: 'newstudent@test.com',
        password: 'Password123!',
        role: 'student',
        studentName: 'New Student',
        semester: 2,
        batchYear: 2024
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal(userData.email);
      expect(response.body.data.user.studentProfile).to.exist;
      expect(response.body.data.user.studentProfile.student_name).to.equal(userData.studentName);
    });

    it('should create a new faculty user', async () => {
      const userData = {
        email: 'newfaculty@test.com',
        password: 'Password123!',
        role: 'faculty',
        facultyName: 'New Faculty',
        department: 'Mathematics',
        isTutor: true,
        tutorSemester: 3
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.facultyProfile).to.exist;
      expect(response.body.data.user.facultyProfile.is_tutor).to.be.true;
    });

    it('should reject invalid user data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        role: 'invalid-role'
      };

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should prevent duplicate email', async () => {
      const userData = {
        email: 'admin@test.com', // Already exists
        password: 'Password123!',
        role: 'student',
        studentName: 'Duplicate Student'
      };

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(409);
    });

    it('should deny access for non-admin users', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'Password123!',
        role: 'student',
        studentName: 'Test Student'
      };

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(userData)
        .expect(403);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user information', async () => {
      const updateData = {
        email: 'updated@test.com',
        studentName: 'Updated Student Name',
        semester: 3
      };

      const response = await request(app)
        .put(`/api/users/${studentUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal(updateData.email);
      expect(response.body.data.user.studentProfile.student_name).to.equal(updateData.studentName);
    });

    it('should prevent email conflicts during update', async () => {
      const updateData = {
        email: 'faculty@test.com' // Already exists
      };

      await request(app)
        .put(`/api/users/${studentUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .put('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@test.com' })
        .expect(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    let userToDelete;

    beforeEach(async () => {
      userToDelete = await User.create({
        unique_id: 'STU240999',
        email: 'todelete@test.com',
        password_hash: 'hashedpassword',
        role: 'student'
      });

      await Student.create({
        user_id: userToDelete.id,
        student_name: 'To Delete',
        semester: 1,
        batch_year: 2024
      });
    });

    it('should delete user without academic data', async () => {
      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('deleted successfully');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .delete('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/users/:id/photo', () => {
    it('should upload profile photo for own profile', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
      
      // Create a simple test image file if it doesn't exist
      const fs = require('fs');
      const testDir = path.join(__dirname, 'fixtures');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      if (!fs.existsSync(testImagePath)) {
        // Create a minimal JPEG file for testing
        const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
        fs.writeFileSync(testImagePath, jpegHeader);
      }

      const response = await request(app)
        .post(`/api/users/${studentUser.id}/photo`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('profilePhoto', testImagePath)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.profile_photo).to.exist;
      expect(response.body.data.photo_url).to.include('/uploads/profiles/');
    });

    it('should allow admin to upload photo for any user', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

      const response = await request(app)
        .post(`/api/users/${facultyUser.id}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('profilePhoto', testImagePath)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it('should reject non-image files', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test-file.txt');
      
      // Create test text file
      const fs = require('fs');
      fs.writeFileSync(testFilePath, 'This is a test file');

      await request(app)
        .post(`/api/users/${studentUser.id}/photo`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('profilePhoto', testFilePath)
        .expect(400);
    });

    it('should prevent users from uploading photos for other users', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

      await request(app)
        .post(`/api/users/${facultyUser.id}/photo`)
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('profilePhoto', testImagePath)
        .expect(403);
    });
  });  describe
('Faculty-Subject Assignment Management', () => {
    describe('GET /api/users/faculty/assignments', () => {
      it('should get all faculty assignments', async () => {
        // Create a test assignment
        await FacultySubject.create({
          faculty_id: testFaculty.id,
          subject_id: testSubject.id,
          academic_year: 2024
        });

        const response = await request(app)
          .get('/api/users/faculty/assignments')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data.assignments).to.be.an('array');
        expect(response.body.data.academicYear).to.equal(2024);
      });

      it('should filter by academic year', async () => {
        const response = await request(app)
          .get('/api/users/faculty/assignments?academicYear=2023')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data.academicYear).to.equal(2023);
      });
    });

    describe('POST /api/users/faculty/assign', () => {
      it('should assign faculty to subject', async () => {
        const assignmentData = {
          facultyId: testFaculty.id,
          subjectId: testSubject.id,
          academicYear: 2024
        };

        const response = await request(app)
          .post('/api/users/faculty/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(assignmentData)
          .expect(201);

        expect(response.body.success).to.be.true;
        expect(response.body.data.assignment).to.exist;
      });

      it('should handle duplicate assignments gracefully', async () => {
        const assignmentData = {
          facultyId: testFaculty.id,
          subjectId: testSubject.id,
          academicYear: 2024
        };

        // First assignment
        await request(app)
          .post('/api/users/faculty/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(assignmentData)
          .expect(201);

        // Duplicate assignment
        const response = await request(app)
          .post('/api/users/faculty/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(assignmentData)
          .expect(200);

        expect(response.body.message).to.include('already exists');
      });

      it('should validate faculty and subject existence', async () => {
        const invalidData = {
          facultyId: 99999,
          subjectId: testSubject.id
        };

        await request(app)
          .post('/api/users/faculty/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(404);
      });

      it('should require facultyId and subjectId', async () => {
        await request(app)
          .post('/api/users/faculty/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);
      });
    });

    describe('DELETE /api/users/faculty/:facultyId/subjects/:subjectId', () => {
      beforeEach(async () => {
        await FacultySubject.create({
          faculty_id: testFaculty.id,
          subject_id: testSubject.id,
          academic_year: 2024
        });
      });

      it('should remove faculty assignment', async () => {
        const response = await request(app)
          .delete(`/api/users/faculty/${testFaculty.id}/subjects/${testSubject.id}?academicYear=2024`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.message).to.include('removed successfully');
      });

      it('should return 404 for non-existent assignment', async () => {
        await request(app)
          .delete(`/api/users/faculty/99999/subjects/${testSubject.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });
  });

  describe('Student Enrollment Management', () => {
    describe('GET /api/users/students/enrollments', () => {
      it('should get all student enrollments', async () => {
        // Create a test enrollment
        await StudentSubject.create({
          student_id: testStudent.id,
          subject_id: testSubject.id,
          academic_year: 2024
        });

        const response = await request(app)
          .get('/api/users/students/enrollments')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data.enrollments).to.be.an('array');
      });
    });

    describe('POST /api/users/students/enroll', () => {
      it('should enroll student in subject', async () => {
        const enrollmentData = {
          studentId: testStudent.id,
          subjectId: testSubject.id,
          academicYear: 2024
        };

        const response = await request(app)
          .post('/api/users/students/enroll')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(enrollmentData)
          .expect(201);

        expect(response.body.success).to.be.true;
        expect(response.body.data.enrollment).to.exist;
      });

      it('should validate student and subject existence', async () => {
        const invalidData = {
          studentId: 99999,
          subjectId: testSubject.id
        };

        await request(app)
          .post('/api/users/students/enroll')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(404);
      });
    });

    describe('POST /api/users/students/enroll-semester', () => {
      it('should enroll student in semester subjects', async () => {
        const enrollmentData = {
          studentId: testStudent.id,
          semester: 1,
          academicYear: 2024
        };

        const response = await request(app)
          .post('/api/users/students/enroll-semester')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(enrollmentData)
          .expect(201);

        expect(response.body.success).to.be.true;
        expect(response.body.data.enrollments).to.be.an('array');
      });

      it('should require studentId and semester', async () => {
        await request(app)
          .post('/api/users/students/enroll-semester')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);
      });
    });

    describe('DELETE /api/users/students/:studentId/subjects/:subjectId', () => {
      beforeEach(async () => {
        await StudentSubject.create({
          student_id: testStudent.id,
          subject_id: testSubject.id,
          academic_year: 2024
        });
      });

      it('should remove student enrollment', async () => {
        const response = await request(app)
          .delete(`/api/users/students/${testStudent.id}/subjects/${testSubject.id}?academicYear=2024`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.message).to.include('removed successfully');
      });
    });

    describe('POST /api/users/students/promote', () => {
      it('should promote students to next semester', async () => {
        const promotionData = {
          studentIds: [testStudent.id],
          fromSemester: 1,
          toSemester: 2,
          academicYear: 2024
        };

        const response = await request(app)
          .post('/api/users/students/promote')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(promotionData)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data.promotionResults).to.be.an('array');
      });

      it('should validate promotion data', async () => {
        const invalidData = {
          studentIds: [testStudent.id],
          fromSemester: 2,
          toSemester: 1 // Invalid: to semester should be greater
        };

        await request(app)
          .post('/api/users/students/promote')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);
      });

      it('should require all fields', async () => {
        await request(app)
          .post('/api/users/students/promote')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);
      });
    });

    describe('GET /api/users/students/statistics', () => {
      it('should get enrollment statistics', async () => {
        const response = await request(app)
          .get('/api/users/students/statistics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data.statistics).to.exist;
      });
    });
  });

  describe('Authorization Tests', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    it('should enforce admin-only access for user management', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(403);
    });

    it('should enforce admin-only access for assignments', async () => {
      await request(app)
        .post('/api/users/faculty/assign')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({})
        .expect(403);
    });

    it('should enforce admin-only access for enrollments', async () => {
      await request(app)
        .post('/api/users/students/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(403);
    });
  });
});