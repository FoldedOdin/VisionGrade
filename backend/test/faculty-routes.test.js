const request = require('supertest');
const express = require('express');
const facultyRoutes = require('../routes/faculty');

describe('Faculty Routes Structure', () => {
  let app;

  before(() => {
    app = express();
    app.use(express.json());
    app.use('/api/faculty', facultyRoutes);
  });

  it('should have faculty dashboard route', (done) => {
    request(app)
      .get('/api/faculty/dashboard')
      .expect(401) // Unauthorized without token, but route exists
      .end(done);
  });

  it('should have faculty subjects route', (done) => {
    request(app)
      .get('/api/faculty/subjects')
      .expect(401) // Unauthorized without token, but route exists
      .end(done);
  });

  it('should have subject students route', (done) => {
    request(app)
      .get('/api/faculty/subjects/1/students')
      .expect(401) // Unauthorized without token, but route exists
      .end(done);
  });

  it('should have at-risk students route', (done) => {
    request(app)
      .get('/api/faculty/at-risk-students')
      .expect(401) // Unauthorized without token, but route exists
      .end(done);
  });

  it('should reject invalid routes', (done) => {
    request(app)
      .get('/api/faculty/invalid-route')
      .expect(404)
      .end(done);
  });
});