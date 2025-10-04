const { expect } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chai = require('chai');
chai.use(sinonChai);

const cacheService = require('../services/cacheService');
const queryOptimizationService = require('../services/queryOptimizationService');
const redisClient = require('../config/redis');

describe('Performance Optimization', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Cache Service', () => {
    it('should set and get values from cache', async () => {
      // Mock Redis client
      const mockClient = {
        setEx: sandbox.stub().resolves('OK'),
        get: sandbox.stub().resolves(JSON.stringify({ test: 'data' })),
        del: sandbox.stub().resolves(1),
        exists: sandbox.stub().resolves(1)
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      // Test set
      const result = await cacheService.set('test-key', { test: 'data' }, 300);
      expect(result).to.be.true;
      expect(mockClient.setEx).to.have.been.calledWith('test-key', 300, JSON.stringify({ test: 'data' }));

      // Test get
      const cachedData = await cacheService.get('test-key');
      expect(cachedData).to.deep.equal({ test: 'data' });
      expect(mockClient.get).to.have.been.calledWith('test-key');
    });

    it('should handle Redis unavailability gracefully', async () => {
      sandbox.stub(redisClient, 'isReady').returns(false);

      const result = await cacheService.set('test-key', { test: 'data' });
      expect(result).to.be.false;

      const cachedData = await cacheService.get('test-key');
      expect(cachedData).to.be.null;
    });

    it('should manage session data', async () => {
      const mockClient = {
        setEx: sandbox.stub().resolves('OK'),
        get: sandbox.stub().resolves(JSON.stringify({ userId: 1, role: 'student' })),
        del: sandbox.stub().resolves(1)
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      const sessionData = { userId: 1, role: 'student' };
      
      // Set session
      const setResult = await cacheService.setSession('session-123', sessionData);
      expect(setResult).to.be.true;
      expect(mockClient.setEx).to.have.been.calledWith('session:session-123', 86400, JSON.stringify(sessionData));

      // Get session
      const retrievedSession = await cacheService.getSession('session-123');
      expect(retrievedSession).to.deep.equal(sessionData);

      // Delete session
      const deleteResult = await cacheService.deleteSession('session-123');
      expect(deleteResult).to.be.true;
      expect(mockClient.del).to.have.been.calledWith('session:session-123');
    });

    it('should cache ML predictions', async () => {
      const mockClient = {
        setEx: sandbox.stub().resolves('OK'),
        get: sandbox.stub().resolves(JSON.stringify({ predicted_marks: 85, confidence: 0.92 }))
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      const prediction = { predicted_marks: 85, confidence: 0.92 };
      
      // Set prediction
      const setResult = await cacheService.setPrediction(1, 2, prediction);
      expect(setResult).to.be.true;
      expect(mockClient.setEx).to.have.been.calledWith('prediction:1:2', 1800, JSON.stringify(prediction));

      // Get prediction
      const retrievedPrediction = await cacheService.getPrediction(1, 2);
      expect(retrievedPrediction).to.deep.equal(prediction);
    });

    it('should invalidate user-related cache', async () => {
      const mockClient = {
        keys: sandbox.stub().resolves(['dashboard:student:1', 'prediction:1:1', 'prediction:1:2']),
        del: sandbox.stub().resolves(3)
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      const result = await cacheService.invalidateUserCache(1);
      expect(result).to.be.true;
      expect(mockClient.keys).to.have.been.called;
      expect(mockClient.del).to.have.been.called;
    });
  });

  describe('Query Optimization Service', () => {
    it('should process student dashboard data correctly', () => {
      const rawData = [
        {
          student_id: 1,
          student_name: 'John Doe',
          semester: 3,
          batch_year: 2023,
          subject_id: 1,
          subject_code: 'CS101',
          subject_name: 'Computer Science',
          subject_type: 'theory',
          credits: 3,
          mark_id: 1,
          exam_type: 'series_test_1',
          marks_obtained: 45,
          max_marks: 50,
          total_classes: 30,
          attended_classes: 28,
          attendance_percentage: 93.33,
          predicted_marks: 85,
          confidence_score: 0.92,
          is_visible_to_student: true
        }
      ];

      const processed = queryOptimizationService.processStudentDashboardData(rawData);
      
      expect(processed).to.have.property('student');
      expect(processed.student).to.deep.equal({
        id: 1,
        name: 'John Doe',
        semester: 3,
        batch_year: 2023
      });

      expect(processed).to.have.property('subjects');
      expect(processed.subjects).to.be.an('array').with.length(1);
      
      const subject = processed.subjects[0];
      expect(subject).to.have.property('id', 1);
      expect(subject).to.have.property('code', 'CS101');
      expect(subject).to.have.property('name', 'Computer Science');
      expect(subject).to.have.property('marks');
      expect(subject.marks).to.have.property('series_test_1');
      expect(subject.marks.series_test_1).to.deep.equal({
        obtained: 45,
        max: 50,
        percentage: '90.00'
      });
      expect(subject).to.have.property('attendance');
      expect(subject.attendance.percentage).to.equal(93.33);
      expect(subject).to.have.property('prediction');
      expect(subject.prediction.predicted_marks).to.equal(85);
    });

    it('should process faculty dashboard data correctly', () => {
      const rawData = [
        {
          faculty_id: 1,
          faculty_name: 'Dr. Smith',
          department: 'Computer Science',
          is_tutor: true,
          subject_id: 1,
          subject_code: 'CS101',
          subject_name: 'Computer Science',
          subject_type: 'theory',
          semester: 3,
          student_count: 25,
          avg_series_1: 42.5,
          avg_series_2: 45.2,
          avg_university: null,
          avg_attendance: 87.5,
          low_attendance_count: 3
        }
      ];

      const processed = queryOptimizationService.processFacultyDashboardData(rawData);
      
      expect(processed).to.have.property('faculty');
      expect(processed.faculty).to.deep.equal({
        id: 1,
        name: 'Dr. Smith',
        department: 'Computer Science',
        isTutor: true
      });

      expect(processed).to.have.property('subjects');
      expect(processed.subjects).to.be.an('array').with.length(1);
      
      const subject = processed.subjects[0];
      expect(subject).to.have.property('id', 1);
      expect(subject).to.have.property('studentCount', 25);
      expect(subject).to.have.property('averageMarks');
      expect(subject.averageMarks.series1).to.equal('42.50');
      expect(subject.averageMarks.series2).to.equal('45.20');
      expect(subject.averageMarks.university).to.be.null;
      expect(subject).to.have.property('attendance');
      expect(subject.attendance.average).to.equal('87.50');
      expect(subject.attendance.lowAttendanceCount).to.equal(3);
    });
  });

  describe('Performance Metrics', () => {
    it('should measure cache hit rates', async () => {
      const mockClient = {
        get: sandbox.stub(),
        setEx: sandbox.stub().resolves('OK')
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      // Simulate cache miss then hit
      mockClient.get.onFirstCall().resolves(null);
      mockClient.get.onSecondCall().resolves(JSON.stringify({ test: 'data' }));

      // First call - cache miss
      const result1 = await cacheService.get('test-key');
      expect(result1).to.be.null;

      // Set data
      await cacheService.set('test-key', { test: 'data' });

      // Second call - cache hit
      const result2 = await cacheService.get('test-key');
      expect(result2).to.deep.equal({ test: 'data' });

      expect(mockClient.get).to.have.been.calledTwice;
      expect(mockClient.setEx).to.have.been.calledOnce;
    });

    it('should handle concurrent cache operations', async () => {
      const mockClient = {
        setEx: sandbox.stub().resolves('OK'),
        get: sandbox.stub().resolves(JSON.stringify({ test: 'data' }))
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      // Simulate concurrent operations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cacheService.set(`key-${i}`, { data: i }));
        promises.push(cacheService.get(`key-${i}`));
      }

      const results = await Promise.all(promises);
      
      // All set operations should succeed
      const setResults = results.filter((_, index) => index % 2 === 0);
      expect(setResults.every(result => result === true)).to.be.true;

      expect(mockClient.setEx).to.have.callCount(10);
      expect(mockClient.get).to.have.callCount(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const mockClient = {
        setEx: sandbox.stub().rejects(new Error('Redis connection failed')),
        get: sandbox.stub().rejects(new Error('Redis connection failed'))
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      // Should not throw errors
      const setResult = await cacheService.set('test-key', { test: 'data' });
      expect(setResult).to.be.false;

      const getResult = await cacheService.get('test-key');
      expect(getResult).to.be.null;
    });

    it('should handle malformed cache data', async () => {
      const mockClient = {
        get: sandbox.stub().resolves('invalid-json-data')
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      const result = await cacheService.get('test-key');
      expect(result).to.be.null;
    });
  });

  describe('Cache Expiration', () => {
    it('should set appropriate TTL for different data types', async () => {
      const mockClient = {
        setEx: sandbox.stub().resolves('OK')
      };

      sandbox.stub(redisClient, 'isReady').returns(true);
      sandbox.stub(redisClient, 'getClient').returns(mockClient);

      // Session data - 24 hours
      await cacheService.setSession('session-123', { userId: 1 });
      expect(mockClient.setEx).to.have.been.calledWith('session:session-123', 86400, sinon.match.string);

      // Prediction data - 30 minutes
      await cacheService.setPrediction(1, 2, { predicted_marks: 85 });
      expect(mockClient.setEx).to.have.been.calledWith('prediction:1:2', 1800, sinon.match.string);

      // Dashboard data - 30 minutes
      await cacheService.setDashboardData(1, 'student', { data: 'test' });
      expect(mockClient.setEx).to.have.been.calledWith('dashboard:student:1', 1800, sinon.match.string);
    });
  });
});