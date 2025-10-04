const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { User, Faculty, Subject, Student, MLPrediction, FacultySubject } = require('../models');
const jwt = require('../utils/jwt');

describe('ML Prediction Controls API', () => {
  let tutorToken, facultyToken, adminToken, studentToken;
  let tutorUser, facultyUser, adminUser, studentUser;
  let subject1, subject2, student1, student2;

  before(async () => {
    // Create test users
    tutorUser = await User.create({
      unique_id: 'TUT001',
      email: 'tutor@test.com',
      phone: '1234567890',
      password_hash: 'hashedpassword',
      role: 'tutor'
    });

    facultyUser = await User.create({
      unique_id: 'FAC001',
      email: 'faculty@test.com',
      phone: '1234567891',
      password_hash: 'hashedpassword',
      role: 'faculty'
    });

    adminUser = await User.create({
      unique_id: 'ADM001',
      email: 'admin@test.com',
      phone: '1234567892',
      password_hash: 'hashedpassword',
      role: 'admin'
    });

    studentUser = await User.create({
      unique_id: 'STU001',
      email: 'student@test.com',
      phone: '1234567893',
      password_hash: 'hashedpassword',
      role: 'student'
    });

    // Create faculty profiles
    const tutorFaculty = await Faculty.create({
      user_id: tutorUser.id,
      faculty_name: 'Test Tutor',
      department: 'Computer Science',
      is_tutor: true,
      tutor_semester: 1
    });

    const regularFaculty = await Faculty.create({
      user_id: facultyUser.id,
      faculty_name: 'Test Faculty',
      department: 'Computer Science',
      is_tutor: false
    });

    // Create student profile
    const studentProfile = await Student.create({
      user_id: studentUser.id,
      student_name: 'Test Student',
      semester: 1,
      batch_year: 2024
    });

    // Create subjects
    subject1 = await Subject.create({
      subject_code: 'CS101',
      subject_name: 'Computer Science Fundamentals',
      subject_type: 'theory',
      semester: 1,
      credits: 3
    });

    subject2 = await Subject.create({
      subject_code: 'CS102',
      subject_name: 'Programming Lab',
      subject_type: 'lab',
      semester: 1,
      credits: 2
    });

    // Assign subjects to tutor
    await FacultySubject.create({
      faculty_id: tutorFaculty.id,
      subject_id: subject1.id,
      academic_year: 2024
    });

    // Assign different subject to regular faculty
    await FacultySubject.create({
      faculty_id: regularFaculty.id,
      subject_id: subject2.id,
      academic_year: 2024
    });

    // Create some test predictions
    await MLPrediction.create({
      student_id: studentProfile.id,
      subject_id: subject1.id,
      predicted_marks: 75.5,
      confidence_score: 0.85,
      input_features: { series_test_1: 40, series_test_2: 38, lab_internal: 45 },
      model_version: 'v1.0',
      is_visible_to_student: false
    });

    await MLPrediction.create({
      student_id: studentProfile.id,
      subject_id: subject2.id,
      predicted_marks: 82.3,
      confidence_score: 0.92,
      input_features: { series_test_1: 42, series_test_2: 40, lab_internal: 48 },
      model_version: 'v1.0',
      is_visible_to_student: true
    });

    // Generate tokens
    tutorToken = jwt.generateToken({ 
      id: tutorUser.id, 
      role: 'tutor',
      faculty: { id: tutorFaculty.id }
    });
    facultyToken = jwt.generateToken({ 
      id: facultyUser.id, 
      role: 'faculty',
      faculty: { id: regularFaculty.id }
    });
    adminToken = jwt.generateToken({ 
      id: adminUser.id, 
      role: 'admin'
    });
    studentToken = jwt.generateToken({ 
      id: studentUser.id, 
      role: 'student',
      student: { id: studentProfile.id }
    });

    student1 = studentProfile;
  });

  after(async () => {
    // Clean up test data
    await MLPrediction.destroy({ where: {} });
    await FacultySubject.destroy({ where: {} });
    await Subject.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('GET /api/ml/predictions/subject/:subject_id', () => {
    it('should allow tutor to get predictions for assigned subject', async () => {
      const response = await request(app)
        .get(`/api/ml/predictions/subject/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.predictions).to.be.an('array');
      expect(response.body.predictions).to.have.length(1);
      expect(response.body.subject.id).to.equal(subject1.id);
    });

    it('should deny tutor access to non-assigned subject', async () => {
      const response = await request(app)
        .get(`/api/ml/predictions/subject/${subject2.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access denied');
    });

    it('should allow admin to access any subject predictions', async () => {
      const response = await request(app)
        .get(`/api/ml/predictions/subject/${subject1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.predictions).to.be.an('array');
    });

    it('should deny student access to subject predictions', async () => {
      const response = await request(app)
        .get(`/api/ml/predictions/subject/${subject1.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
    });
  });

  describe('POST /api/ml/predictions/toggle/:subject_id', () => {
    it('should allow tutor to toggle prediction visibility for assigned subject', async () => {
      const response = await request(app)
        .post(`/api/ml/predictions/toggle/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ is_visible: true })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.is_visible).to.be.true;
      expect(response.body.data.updated_predictions).to.be.a('number');

      // Verify the prediction was actually updated
      const prediction = await MLPrediction.findOne({
        where: { subject_id: subject1.id }
      });
      expect(prediction.is_visible_to_student).to.be.true;
    });

    it('should deny tutor access to toggle non-assigned subject', async () => {
      const response = await request(app)
        .post(`/api/ml/predictions/toggle/${subject2.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ is_visible: false })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access denied');
    });

    it('should validate is_visible parameter', async () => {
      const response = await request(app)
        .post(`/api/ml/predictions/toggle/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ is_visible: 'invalid' })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Validation failed');
    });

    it('should deny faculty (non-tutor) access to toggle predictions', async () => {
      const response = await request(app)
        .post(`/api/ml/predictions/toggle/${subject2.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ is_visible: true })
        .expect(403);

      expect(response.body.success).to.be.false;
    });
  });

  describe('GET /api/ml/predictions/stats', () => {
    it('should allow tutor to get prediction statistics', async () => {
      const response = await request(app)
        .get('/api/ml/predictions/stats')
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.stats).to.be.an('object');
      expect(response.body.stats.total_predictions).to.be.a('number');
      expect(response.body.stats.visible_predictions).to.be.a('number');
    });

    it('should allow filtering by subject_id', async () => {
      const response = await request(app)
        .get('/api/ml/predictions/stats')
        .query({ subject_id: subject1.id })
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.filters.subject_id).to.equal(subject1.id);
    });

    it('should deny student access to prediction statistics', async () => {
      const response = await request(app)
        .get('/api/ml/predictions/stats')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
    });
  });

  describe('GET /api/ml/accuracy', () => {
    it('should allow tutor to get accuracy statistics', async () => {
      const response = await request(app)
        .get('/api/ml/accuracy')
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.database_stats).to.be.an('object');
    });

    it('should allow filtering by subject_id', async () => {
      const response = await request(app)
        .get('/api/ml/accuracy')
        .query({ subject_id: subject1.id })
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it('should deny student access to accuracy statistics', async () => {
      const response = await request(app)
        .get('/api/ml/accuracy')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
    });
  });

  describe('POST /api/ml/predict/batch', () => {
    it('should allow tutor to generate batch predictions for assigned subject', async () => {
      // Mock ML service response since we don't have actual ML service in tests
      const response = await request(app)
        .post('/api/ml/predict/batch')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ subject_id: subject1.id })
        .expect(500); // Expected to fail without ML service, but should pass authorization

      // The error should be ML service related, not authorization
      expect(response.body.error).to.not.include('Access denied');
    });

    it('should deny tutor access to generate predictions for non-assigned subject', async () => {
      const response = await request(app)
        .post('/api/ml/predict/batch')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ subject_id: subject2.id })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access denied');
    });

    it('should validate subject_id parameter', async () => {
      const response = await request(app)
        .post('/api/ml/predict/batch')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ subject_id: 'invalid' })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Validation failed');
    });
  });

  describe('Real-time updates', () => {
    it('should update prediction visibility in real-time', async () => {
      // First, set predictions to hidden
      await request(app)
        .post(`/api/ml/predictions/toggle/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ is_visible: false })
        .expect(200);

      // Verify they are hidden
      let prediction = await MLPrediction.findOne({
        where: { subject_id: subject1.id }
      });
      expect(prediction.is_visible_to_student).to.be.false;

      // Now toggle to visible
      await request(app)
        .post(`/api/ml/predictions/toggle/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ is_visible: true })
        .expect(200);

      // Verify they are now visible
      prediction = await MLPrediction.findOne({
        where: { subject_id: subject1.id }
      });
      expect(prediction.is_visible_to_student).to.be.true;
    });

    it('should reflect visibility changes in student predictions endpoint', async () => {
      // Set predictions to visible
      await request(app)
        .post(`/api/ml/predictions/toggle/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ is_visible: true })
        .expect(200);

      // Check student can see predictions
      let response = await request(app)
        .get(`/api/ml/predictions/student/${student1.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const visiblePredictions = response.body.predictions.filter(p => p.subject.id === subject1.id);
      expect(visiblePredictions).to.have.length(1);

      // Set predictions to hidden
      await request(app)
        .post(`/api/ml/predictions/toggle/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ is_visible: false })
        .expect(200);

      // Check student cannot see predictions
      response = await request(app)
        .get(`/api/ml/predictions/student/${student1.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const hiddenPredictions = response.body.predictions.filter(p => p.subject.id === subject1.id);
      expect(hiddenPredictions).to.have.length(0);
    });
  });

  describe('Prediction accuracy display', () => {
    it('should calculate and display prediction accuracy correctly', async () => {
      const response = await request(app)
        .get('/api/ml/accuracy')
        .query({ subject_id: subject1.id })
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.database_stats).to.have.property('totalPredictions');
      expect(response.body.database_stats).to.have.property('averageAccuracy');
      expect(response.body.database_stats).to.have.property('modelVersions');
    });

    it('should show confidence scores in prediction data', async () => {
      const response = await request(app)
        .get(`/api/ml/predictions/subject/${subject1.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.predictions[0]).to.have.property('confidence_score');
      expect(response.body.predictions[0].confidence_score).to.be.a('number');
    });
  });
});