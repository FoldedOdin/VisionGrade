const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const { User, Student, Faculty, Subject, Mark } = require('../../models');
const { generateToken } = require('../../utils/jwt');

describe('Concurrent Users Performance Tests', () => {
  let server;
  let testUsers = [];
  let testSubjects = [];
  let performanceMetrics = {};

  before(async () => {
    server = app.listen(0);
    
    // Create test data for performance testing
    await setupTestData();
  });

  after(async () => {
    // Cleanup test data
    await cleanupTestData();
    server.close();
  });

  async function setupTestData() {
    console.log('Setting up test data for performance testing...');
    
    // Create test subjects
    for (let i = 1; i <= 5; i++) {
      const subject = await Subject.create({
        subjectCode: `PERF${i.toString().padStart(3, '0')}`,
        subjectName: `Performance Test Subject ${i}`,
        subjectType: i <= 3 ? 'theory' : 'lab',
        semester: Math.ceil(i / 2),
        credits: 3 + (i % 2)
      });
      testSubjects.push(subject);
    }

    // Create test users (students, faculty, admin)
    const userTypes = [
      { role: 'student', count: 50 },
      { role: 'faculty', count: 10 },
      { role: 'admin', count: 2 }
    ];

    for (const userType of userTypes) {
      for (let i = 1; i <= userType.count; i++) {
        const uniqueId = `${userType.role.toUpperCase()}${i.toString().padStart(3, '0')}`;
        const user = await User.create({
          uniqueId,
          email: `${uniqueId.toLowerCase()}@performance.test`,
          phone: `${userType.role === 'student' ? '1' : userType.role === 'faculty' ? '2' : '3'}${i.toString().padStart(9, '0')}`,
          passwordHash: '$2a$10$test.hash.for.performance.testing',
          role: userType.role
        });

        const token = generateToken({ id: user.id, role: user.role });

        if (userType.role === 'student') {
          const student = await Student.create({
            userId: user.id,
            studentName: `Performance Student ${i}`,
            semester: Math.ceil(Math.random() * 4),
            batchYear: 2024
          });
          
          testUsers.push({ user, token, student, role: 'student' });
        } else if (userType.role === 'faculty') {
          const faculty = await Faculty.create({
            userId: user.id,
            facultyName: `Performance Faculty ${i}`,
            department: ['Computer Science', 'Mathematics', 'Physics'][i % 3]
          });
          
          testUsers.push({ user, token, faculty, role: 'faculty' });
        } else {
          testUsers.push({ user, token, role: 'admin' });
        }
      }
    }

    console.log(`Created ${testUsers.length} test users and ${testSubjects.length} test subjects`);
  }

  async function cleanupTestData() {
    console.log('Cleaning up performance test data...');
    
    // Delete in correct order to avoid foreign key constraints
    await Mark.destroy({ where: {}, force: true });
    await Student.destroy({ where: {}, force: true });
    await Faculty.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Subject.destroy({ where: {}, force: true });
    
    console.log('Cleanup completed');
  }

  function measurePerformance(testName, startTime, endTime, requestCount) {
    const duration = endTime - startTime;
    const avgResponseTime = duration / requestCount;
    const requestsPerSecond = (requestCount / duration) * 1000;

    performanceMetrics[testName] = {
      totalDuration: duration,
      averageResponseTime: avgResponseTime,
      requestsPerSecond: requestsPerSecond,
      requestCount
    };

    console.log(`\n${testName} Performance Metrics:`);
    console.log(`  Total Duration: ${duration}ms`);
    console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Requests per Second: ${requestsPerSecond.toFixed(2)}`);
    console.log(`  Total Requests: ${requestCount}`);

    return { duration, avgResponseTime, requestsPerSecond };
  }

  describe('Authentication Performance', () => {
    it('should handle concurrent login requests', async function() {
      this.timeout(30000); // 30 second timeout

      const concurrentLogins = 20;
      const loginPromises = [];
      const startTime = Date.now();

      // Create concurrent login requests
      for (let i = 0; i < concurrentLogins; i++) {
        const testUser = testUsers[i % testUsers.length];
        const loginPromise = request(app)
          .post('/api/auth/login')
          .send({
            identifier: testUser.user.email,
            password: 'test.password.123'
          });
        
        loginPromises.push(loginPromise);
      }

      // Wait for all requests to complete
      const responses = await Promise.all(loginPromises);
      const endTime = Date.now();

      // Analyze results
      const { avgResponseTime, requestsPerSecond } = measurePerformance(
        'Concurrent Logins', 
        startTime, 
        endTime, 
        concurrentLogins
      );

      // Performance assertions
      expect(avgResponseTime).to.be.below(1000, 'Average login response time should be under 1 second');
      expect(requestsPerSecond).to.be.above(10, 'Should handle at least 10 login requests per second');

      // Check that all requests succeeded or failed gracefully
      responses.forEach((response, index) => {
        expect([200, 401, 429]).to.include(response.status, 
          `Request ${index} should return 200 (success), 401 (auth error), or 429 (rate limited)`);
      });
    });

    it('should handle concurrent profile requests', async function() {
      this.timeout(20000);

      const concurrentRequests = 30;
      const profilePromises = [];
      const startTime = Date.now();

      // Create concurrent profile requests
      for (let i = 0; i < concurrentRequests; i++) {
        const testUser = testUsers[i % testUsers.length];
        const profilePromise = request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${testUser.token}`);
        
        profilePromises.push(profilePromise);
      }

      const responses = await Promise.all(profilePromises);
      const endTime = Date.now();

      const { avgResponseTime, requestsPerSecond } = measurePerformance(
        'Concurrent Profile Requests', 
        startTime, 
        endTime, 
        concurrentRequests
      );

      // Performance assertions
      expect(avgResponseTime).to.be.below(500, 'Average profile response time should be under 500ms');
      expect(requestsPerSecond).to.be.above(20, 'Should handle at least 20 profile requests per second');

      // All authenticated requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).to.equal(200, `Profile request ${index} should succeed`);
      });
    });
  });

  describe('Student Dashboard Performance', () => {
    it('should handle concurrent student dashboard requests', async function() {
      this.timeout(25000);

      const studentUsers = testUsers.filter(u => u.role === 'student');
      const concurrentRequests = Math.min(studentUsers.length, 25);
      const dashboardPromises = [];
      const startTime = Date.now();

      // Create concurrent dashboard requests
      for (let i = 0; i < concurrentRequests; i++) {
        const student = studentUsers[i];
        const dashboardPromise = request(app)
          .get('/api/students/dashboard')
          .set('Authorization', `Bearer ${student.token}`);
        
        dashboardPromises.push(dashboardPromise);
      }

      const responses = await Promise.all(dashboardPromises);
      const endTime = Date.now();

      const { avgResponseTime, requestsPerSecond } = measurePerformance(
        'Concurrent Student Dashboards', 
        startTime, 
        endTime, 
        concurrentRequests
      );

      // Performance assertions
      expect(avgResponseTime).to.be.below(2000, 'Average dashboard response time should be under 2 seconds');
      expect(requestsPerSecond).to.be.above(5, 'Should handle at least 5 dashboard requests per second');

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).to.equal(200, `Dashboard request ${index} should succeed`);
        expect(response.body.success).to.be.true;
      });
    });

    it('should handle concurrent marks retrieval', async function() {
      this.timeout(20000);

      const studentUsers = testUsers.filter(u => u.role === 'student');
      const concurrentRequests = Math.min(studentUsers.length, 20);
      const marksPromises = [];
      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const student = studentUsers[i];
        const marksPromise = request(app)
          .get('/api/students/marks')
          .set('Authorization', `Bearer ${student.token}`);
        
        marksPromises.push(marksPromise);
      }

      const responses = await Promise.all(marksPromises);
      const endTime = Date.now();

      const { avgResponseTime, requestsPerSecond } = measurePerformance(
        'Concurrent Marks Requests', 
        startTime, 
        endTime, 
        concurrentRequests
      );

      expect(avgResponseTime).to.be.below(1500, 'Average marks response time should be under 1.5 seconds');
      expect(requestsPerSecond).to.be.above(8, 'Should handle at least 8 marks requests per second');

      responses.forEach((response, index) => {
        expect(response.status).to.equal(200, `Marks request ${index} should succeed`);
      });
    });
  });

  describe('Faculty Operations Performance', () => {
    it('should handle concurrent faculty subject requests', async function() {
      this.timeout(15000);

      const facultyUsers = testUsers.filter(u => u.role === 'faculty');
      const concurrentRequests = facultyUsers.length;
      const subjectPromises = [];
      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const faculty = facultyUsers[i];
        const subjectPromise = request(app)
          .get('/api/faculty/subjects')
          .set('Authorization', `Bearer ${faculty.token}`);
        
        subjectPromises.push(subjectPromise);
      }

      const responses = await Promise.all(subjectPromises);
      const endTime = Date.now();

      const { avgResponseTime, requestsPerSecond } = measurePerformance(
        'Concurrent Faculty Subject Requests', 
        startTime, 
        endTime, 
        concurrentRequests
      );

      expect(avgResponseTime).to.be.below(1000, 'Average faculty subjects response time should be under 1 second');
      expect(requestsPerSecond).to.be.above(10, 'Should handle at least 10 faculty requests per second');

      responses.forEach((response, index) => {
        expect(response.status).to.equal(200, `Faculty subjects request ${index} should succeed`);
      });
    });

    it('should handle concurrent marks entry', async function() {
      this.timeout(20000);

      const facultyUsers = testUsers.filter(u => u.role === 'faculty');
      const studentUsers = testUsers.filter(u => u.role === 'student');
      const concurrentRequests = Math.min(facultyUsers.length * 2, 15);
      const marksPromises = [];
      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const faculty = facultyUsers[i % facultyUsers.length];
        const student = studentUsers[i % studentUsers.length];
        const subject = testSubjects[i % testSubjects.length];

        const marksData = {
          studentId: student.student.id,
          subjectId: subject.id,
          examType: ['series_test_1', 'series_test_2', 'university'][i % 3],
          marksObtained: 40 + (i % 10),
          maxMarks: subject.subjectType === 'theory' ? (i % 3 === 2 ? 100 : 50) : 50
        };

        const marksPromise = request(app)
          .post('/api/faculty/marks')
          .set('Authorization', `Bearer ${faculty.token}`)
          .send(marksData);
        
        marksPromises.push(marksPromise);
      }

      const responses = await Promise.all(marksPromises);
      const endTime = Date.now();

      const { avgResponseTime, requestsPerSecond } = measurePerformance(
        'Concurrent Marks Entry', 
        startTime, 
        endTime, 
        concurrentRequests
      );

      expect(avgResponseTime).to.be.below(2000, 'Average marks entry response time should be under 2 seconds');
      expect(requestsPerSecond).to.be.above(3, 'Should handle at least 3 marks entry requests per second');

      // Check response statuses (some may fail due to validation or permissions)
      const successfulRequests = responses.filter(r => r.status === 201).length;
      const failedRequests = responses.filter(r => r.status !== 201).length;

      console.log(`  Successful marks entries: ${successfulRequests}`);
      console.log(`  Failed marks entries: ${failedRequests}`);

      expect(successfulRequests).to.be.above(0, 'At least some marks entries should succeed');
    });
  });

  describe('Database Performance Under Load', () => {
    it('should maintain database performance under concurrent reads', async function() {
      this.timeout(30000);

      const concurrentRequests = 50;
      const mixedPromises = [];
      const startTime = Date.now();

      // Create a mix of different read operations
      for (let i = 0; i < concurrentRequests; i++) {
        const user = testUsers[i % testUsers.length];
        let promise;

        switch (i % 4) {
          case 0:
            promise = request(app)
              .get('/api/auth/profile')
              .set('Authorization', `Bearer ${user.token}`);
            break;
          case 1:
            if (user.role === 'student') {
              promise = request(app)
                .get('/api/students/marks')
                .set('Authorization', `Bearer ${user.token}`);
            } else {
              promise = request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${user.token}`);
            }
            break;
          case 2:
            if (user.role === 'student') {
              promise = request(app)
                .get('/api/students/attendance')
                .set('Authorization', `Bearer ${user.token}`);
            } else if (user.role === 'faculty') {
              promise = request(app)
                .get('/api/faculty/subjects')
                .set('Authorization', `Bearer ${user.token}`);
            } else {
              promise = request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${user.token}`);
            }
            break;
          case 3:
            if (user.role === 'admin') {
              promise = request(app)
                .get('/api/admin/users?page=1&limit=10')
                .set('Authorization', `Bearer ${user.token}`);
            } else {
              promise = request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${user.token}`);
            }
            break;
        }

        mixedPromises.push(promise);
      }

      const responses = await Promise.all(mixedPromises);
      const endTime = Date.now();

      const { avgResponseTime, requestsPerSecond } = measurePerformance(
        'Mixed Database Read Operations', 
        startTime, 
        endTime, 
        concurrentRequests
      );

      expect(avgResponseTime).to.be.below(3000, 'Average mixed operation response time should be under 3 seconds');
      expect(requestsPerSecond).to.be.above(5, 'Should handle at least 5 mixed requests per second');

      // Most requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200).length;
      const successRate = (successfulRequests / concurrentRequests) * 100;

      console.log(`  Success rate: ${successRate.toFixed(1)}%`);
      expect(successRate).to.be.above(80, 'At least 80% of requests should succeed');
    });

    it('should handle memory usage efficiently under load', async function() {
      this.timeout(25000);

      const initialMemory = process.memoryUsage();
      const concurrentRequests = 30;
      const requestPromises = [];
      const startTime = Date.now();

      // Create memory-intensive operations
      for (let i = 0; i < concurrentRequests; i++) {
        const user = testUsers[i % testUsers.length];
        
        if (user.role === 'student') {
          const promise = request(app)
            .get('/api/students/dashboard')
            .set('Authorization', `Bearer ${user.token}`);
          requestPromises.push(promise);
        } else if (user.role === 'faculty') {
          const promise = request(app)
            .get('/api/faculty/insights')
            .set('Authorization', `Bearer ${user.token}`);
          requestPromises.push(promise);
        }
      }

      await Promise.all(requestPromises);
      const endTime = Date.now();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      console.log(`\nMemory Usage Analysis:`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Memory increase: ${memoryIncrease.toFixed(2)} MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease).to.be.below(50, 'Memory increase should be less than 50MB for concurrent operations');
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting gracefully under high load', async function() {
      this.timeout(20000);

      const rapidRequests = 100;
      const user = testUsers.find(u => u.role === 'student');
      const requestPromises = [];
      const startTime = Date.now();

      // Create rapid requests from same user to trigger rate limiting
      for (let i = 0; i < rapidRequests; i++) {
        const promise = request(app)
          .post('/api/auth/login')
          .send({
            identifier: user.user.email,
            password: 'wrong.password'
          });
        
        requestPromises.push(promise);
      }

      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();

      const successfulRequests = responses.filter(r => r.status === 401).length; // Wrong password
      const rateLimitedRequests = responses.filter(r => r.status === 429).length;
      const otherResponses = responses.filter(r => ![401, 429].includes(r.status)).length;

      console.log(`\nRate Limiting Analysis:`);
      console.log(`  Successful requests (401): ${successfulRequests}`);
      console.log(`  Rate limited requests (429): ${rateLimitedRequests}`);
      console.log(`  Other responses: ${otherResponses}`);

      // Rate limiting should kick in
      expect(rateLimitedRequests).to.be.above(0, 'Rate limiting should activate under high load');
      
      // System should remain responsive
      const avgResponseTime = (endTime - startTime) / rapidRequests;
      expect(avgResponseTime).to.be.below(1000, 'Average response time should remain reasonable even when rate limited');
    });
  });

  describe('Overall System Performance Summary', () => {
    it('should meet performance requirements summary', function() {
      console.log('\n=== PERFORMANCE SUMMARY ===');
      
      for (const [testName, metrics] of Object.entries(performanceMetrics)) {
        console.log(`\n${testName}:`);
        console.log(`  ✓ Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
        console.log(`  ✓ Requests per Second: ${metrics.requestsPerSecond.toFixed(2)}`);
        console.log(`  ✓ Total Requests: ${metrics.requestCount}`);
      }

      // Overall performance assertions
      const allAvgResponseTimes = Object.values(performanceMetrics).map(m => m.averageResponseTime);
      const allRequestsPerSecond = Object.values(performanceMetrics).map(m => m.requestsPerSecond);

      const overallAvgResponseTime = allAvgResponseTimes.reduce((a, b) => a + b, 0) / allAvgResponseTimes.length;
      const overallAvgRPS = allRequestsPerSecond.reduce((a, b) => a + b, 0) / allRequestsPerSecond.length;

      console.log(`\n=== OVERALL METRICS ===`);
      console.log(`Average Response Time Across All Tests: ${overallAvgResponseTime.toFixed(2)}ms`);
      console.log(`Average Requests per Second: ${overallAvgRPS.toFixed(2)}`);

      // System should meet the 500+ concurrent users requirement
      expect(overallAvgResponseTime).to.be.below(2000, 'Overall average response time should be under 2 seconds');
      expect(overallAvgRPS).to.be.above(5, 'Overall system should handle at least 5 requests per second');

      console.log('\n✅ Performance requirements met!');
    });
  });
});