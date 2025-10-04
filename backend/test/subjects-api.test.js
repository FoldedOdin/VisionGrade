const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { User, Faculty, Subject, FacultySubject } = require('../models');
const jwt = require('jsonwebtoken');

describe('Subjects API', () => {
  let adminToken;
  let facultyToken;
  let adminUser;
  let facultyUser;
  let faculty;
  let subject;

  before(async () => {
    // Create test admin user
    adminUser = await User.create({
      unique_id: 'ADM240001',
      email: 'admin@test.com',
      password_hash: 'hashedpassword',
      role: 'admin'
    });

    // Create test faculty user
    facultyUser = await User.create({
      unique_id: 'FAC240003',
      email: 'faculty3@test.com',
      password_hash: 'hashedpassword',
      role: 'faculty'
    });

    faculty = await Faculty.create({
      user_id: facultyUser.id,
      faculty_name: 'Test Faculty 3',
      department: 'Computer Science'
    });

    // Generate JWT tokens
    adminToken = jwt.sign(
      { userId: adminUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    facultyToken = jwt.sign(
      { userId: facultyUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    // Clean up test data
    await FacultySubject.destroy({ where: {} });
    await Subject.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('POST /api/subjects', () => {
    it('should create a new subject (admin only)', async () => {
      const subjectData = {
        subject_code: 'CS301',
        subject_name: 'Software Engineering',
        subject_type: 'theory',
        semester: 5,
        credits: 4
      };

      const response = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subjectData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.subject.subject_code).to.equal('CS301');
      expect(response.body.data.subject.subject_name).to.equal('Software Engineering');
      expect(response.body.data.subject.credits).to.equal(4);

      subject = response.body.data.subject;
    });

    it('should reject duplicate subject code', async () => {
      const subjectData = {
        subject_code: 'CS301', // Duplicate
        subject_name: 'Another Subject',
        subject_type: 'theory',
        semester: 6,
        credits: 3
      };

      const response = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subjectData)
        .expect(409);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('SUBJECT_CODE_EXISTS');
    });

    it('should reject faculty access to create subject', async () => {
      const subjectData = {
        subject_code: 'CS302',
        subject_name: 'Database Systems',
        subject_type: 'theory',
        semester: 4,
        credits: 3
      };

      const response = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(subjectData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('FORBIDDEN');
    });

    it('should validate subject data', async () => {
      const subjectData = {
        subject_code: 'cs301', // Invalid: should be uppercase
        subject_name: 'Test Subject',
        subject_type: 'invalid_type', // Invalid type
        semester: 10, // Invalid: exceeds max
        credits: 3
      };

      const response = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subjectData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('GET /api/subjects', () => {
    it('should get all subjects (staff access)', async () => {
      const response = await request(app)
        .get('/api/subjects')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.subjects).to.be.an('array');
      expect(response.body.data.total_subjects).to.be.a('number');
    });

    it('should filter subjects by semester', async () => {
      const response = await request(app)
        .get('/api/subjects?semester=5')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.filters.semester).to.equal('5');
    });

    it('should filter subjects by type', async () => {
      const response = await request(app)
        .get('/api/subjects?subject_type=theory')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.filters.subject_type).to.equal('theory');
    });
  });

  describe('GET /api/subjects/:subjectId', () => {
    it('should get subject by ID', async () => {
      const response = await request(app)
        .get(`/api/subjects/${subject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.subject.id).to.equal(subject.id);
      expect(response.body.data.subject.subject_code).to.equal('CS301');
    });

    it('should return 404 for non-existent subject', async () => {
      const response = await request(app)
        .get('/api/subjects/99999')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('SUBJECT_NOT_FOUND');
    });
  });

  describe('PUT /api/subjects/:subjectId', () => {
    it('should update subject (admin only)', async () => {
      const updateData = {
        subject_name: 'Advanced Software Engineering',
        credits: 5
      };

      const response = await request(app)
        .put(`/api/subjects/${subject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.subject.subject_name).to.equal('Advanced Software Engineering');
      expect(response.body.data.subject.credits).to.equal(5);
    });

    it('should reject faculty access to update subject', async () => {
      const updateData = {
        subject_name: 'Updated Name'
      };

      const response = await request(app)
        .put(`/api/subjects/${subject.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('FORBIDDEN');
    });
  });

  describe('POST /api/subjects/:subjectId/assign-faculty', () => {
    it('should assign faculty to subject (admin only)', async () => {
      const assignmentData = {
        faculty_id: faculty.id,
        academic_year: new Date().getFullYear()
      };

      const response = await request(app)
        .post(`/api/subjects/${subject.id}/assign-faculty`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.assignment.faculty.id).to.equal(faculty.id);
      expect(response.body.data.assignment.subject.id).to.equal(subject.id);
    });

    it('should handle existing assignment', async () => {
      const assignmentData = {
        faculty_id: faculty.id,
        academic_year: new Date().getFullYear()
      };

      const response = await request(app)
        .post(`/api/subjects/${subject.id}/assign-faculty`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('already exists');
    });

    it('should reject faculty access to assign faculty', async () => {
      const assignmentData = {
        faculty_id: faculty.id
      };

      const response = await request(app)
        .post(`/api/subjects/${subject.id}/assign-faculty`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(assignmentData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('FORBIDDEN');
    });
  });

  describe('DELETE /api/subjects/:subjectId/faculty/:facultyId', () => {
    it('should remove faculty assignment (admin only)', async () => {
      const response = await request(app)
        .delete(`/api/subjects/${subject.id}/faculty/${faculty.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('removed successfully');
    });

    it('should return 404 for non-existent assignment', async () => {
      const response = await request(app)
        .delete(`/api/subjects/${subject.id}/faculty/${faculty.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('ASSIGNMENT_NOT_FOUND');
    });
  });

  describe('GET /api/subjects/semester/:semester', () => {
    it('should get subjects by semester', async () => {
      const response = await request(app)
        .get('/api/subjects/semester/5')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.semester).to.equal(5);
      expect(response.body.data.default_subjects).to.be.an('array');
      expect(response.body.data.all_subjects).to.be.an('array');
    });

    it('should validate semester range', async () => {
      const response = await request(app)
        .get('/api/subjects/semester/10')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('INVALID_SEMESTER');
    });
  });

  describe('DELETE /api/subjects/:subjectId', () => {
    it('should delete subject (admin only)', async () => {
      const response = await request(app)
        .delete(`/api/subjects/${subject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('deleted successfully');
    });

    it('should return 404 for non-existent subject', async () => {
      const response = await request(app)
        .delete(`/api/subjects/${subject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('SUBJECT_NOT_FOUND');
    });
  });
});