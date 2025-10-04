const { expect } = require('chai');
const { 
  User, 
  Student, 
  Faculty, 
  Subject, 
  Mark, 
  Attendance, 
  Notification, 
  MLPrediction,
  FacultySubject,
  StudentSubject
} = require('../../models');

describe('Database Models Tests', () => {
  let testData = {};

  beforeEach(async () => {
    // Clean up test data before each test
    await MLPrediction.destroy({ where: {}, force: true });
    await Notification.destroy({ where: {}, force: true });
    await Attendance.destroy({ where: {}, force: true });
    await Mark.destroy({ where: {}, force: true });
    await StudentSubject.destroy({ where: {}, force: true });
    await FacultySubject.destroy({ where: {}, force: true });
    await Subject.destroy({ where: {}, force: true });
    await Student.destroy({ where: {}, force: true });
    await Faculty.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('User Model', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        uniqueId: 'TEST001',
        email: 'test@example.com',
        phone: '1234567890',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      };

      const user = await User.create(userData);
      testData.user = user;

      expect(user.id).to.exist;
      expect(user.uniqueId).to.equal(userData.uniqueId);
      expect(user.email).to.equal(userData.email);
      expect(user.phone).to.equal(userData.phone);
      expect(user.role).to.equal(userData.role);
      expect(user.createdAt).to.exist;
      expect(user.updatedAt).to.exist;
    });

    it('should enforce unique constraints', async () => {
      const userData = {
        uniqueId: 'UNIQUE001',
        email: 'unique@example.com',
        phone: '1111111111',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      };

      await User.create(userData);

      // Duplicate unique ID should fail
      try {
        await User.create({ ...userData, email: 'different@example.com', phone: '2222222222' });
        expect.fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.name).to.equal('SequelizeUniqueConstraintError');
      }

      // Duplicate email should fail
      try {
        await User.create({ ...userData, uniqueId: 'UNIQUE002', phone: '3333333333' });
        expect.fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.name).to.equal('SequelizeUniqueConstraintError');
      }

      // Duplicate phone should fail
      try {
        await User.create({ ...userData, uniqueId: 'UNIQUE003', email: 'another@example.com' });
        expect.fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.name).to.equal('SequelizeUniqueConstraintError');
      }
    });

    it('should validate required fields', async () => {
      const requiredFields = ['uniqueId', 'email', 'passwordHash', 'role'];

      for (const field of requiredFields) {
        const userData = {
          uniqueId: 'TEST002',
          email: 'test2@example.com',
          passwordHash: '$2a$10$test.hash.here',
          role: 'student'
        };
        delete userData[field];

        try {
          await User.create(userData);
          expect.fail(`Should have thrown validation error for missing ${field}`);
        } catch (error) {
          expect(error.name).to.equal('SequelizeValidationError');
        }
      }
    });

    it('should validate role enum values', async () => {
      const userData = {
        uniqueId: 'TEST003',
        email: 'test3@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'invalid_role'
      };

      try {
        await User.create(userData);
        expect.fail('Should have thrown validation error for invalid role');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });
  });

  describe('Student Model', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        uniqueId: 'STU001',
        email: 'student@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });
    });

    it('should create a student with valid data', async () => {
      const studentData = {
        userId: testUser.id,
        studentName: 'Test Student',
        semester: 1,
        batchYear: 2024
      };

      const student = await Student.create(studentData);
      testData.student = student;

      expect(student.id).to.exist;
      expect(student.userId).to.equal(testUser.id);
      expect(student.studentName).to.equal(studentData.studentName);
      expect(student.semester).to.equal(studentData.semester);
      expect(student.batchYear).to.equal(studentData.batchYear);
      expect(student.graduationStatus).to.equal('active'); // Default value
    });

    it('should establish association with User', async () => {
      const student = await Student.create({
        userId: testUser.id,
        studentName: 'Associated Student',
        semester: 2,
        batchYear: 2024
      });

      const studentWithUser = await Student.findByPk(student.id, {
        include: [User]
      });

      expect(studentWithUser.User).to.exist;
      expect(studentWithUser.User.id).to.equal(testUser.id);
      expect(studentWithUser.User.email).to.equal(testUser.email);
    });

    it('should validate required fields', async () => {
      const requiredFields = ['userId', 'studentName', 'semester', 'batchYear'];

      for (const field of requiredFields) {
        const studentData = {
          userId: testUser.id,
          studentName: 'Test Student',
          semester: 1,
          batchYear: 2024
        };
        delete studentData[field];

        try {
          await Student.create(studentData);
          expect.fail(`Should have thrown validation error for missing ${field}`);
        } catch (error) {
          expect(error.name).to.equal('SequelizeValidationError');
        }
      }
    });

    it('should validate graduation status enum', async () => {
      const studentData = {
        userId: testUser.id,
        studentName: 'Test Student',
        semester: 1,
        batchYear: 2024,
        graduationStatus: 'invalid_status'
      };

      try {
        await Student.create(studentData);
        expect.fail('Should have thrown validation error for invalid graduation status');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });
  });

  describe('Faculty Model', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        uniqueId: 'FAC001',
        email: 'faculty@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'faculty'
      });
    });

    it('should create a faculty with valid data', async () => {
      const facultyData = {
        userId: testUser.id,
        facultyName: 'Dr. Test Faculty',
        department: 'Computer Science',
        isTutor: true,
        tutorSemester: 1
      };

      const faculty = await Faculty.create(facultyData);
      testData.faculty = faculty;

      expect(faculty.id).to.exist;
      expect(faculty.userId).to.equal(testUser.id);
      expect(faculty.facultyName).to.equal(facultyData.facultyName);
      expect(faculty.department).to.equal(facultyData.department);
      expect(faculty.isTutor).to.equal(facultyData.isTutor);
      expect(faculty.tutorSemester).to.equal(facultyData.tutorSemester);
    });

    it('should establish association with User', async () => {
      const faculty = await Faculty.create({
        userId: testUser.id,
        facultyName: 'Associated Faculty',
        department: 'Mathematics'
      });

      const facultyWithUser = await Faculty.findByPk(faculty.id, {
        include: [User]
      });

      expect(facultyWithUser.User).to.exist;
      expect(facultyWithUser.User.id).to.equal(testUser.id);
    });
  });

  describe('Subject Model', () => {
    it('should create a subject with valid data', async () => {
      const subjectData = {
        subjectCode: 'CS101',
        subjectName: 'Computer Science Fundamentals',
        subjectType: 'theory',
        semester: 1,
        credits: 4
      };

      const subject = await Subject.create(subjectData);
      testData.subject = subject;

      expect(subject.id).to.exist;
      expect(subject.subjectCode).to.equal(subjectData.subjectCode);
      expect(subject.subjectName).to.equal(subjectData.subjectName);
      expect(subject.subjectType).to.equal(subjectData.subjectType);
      expect(subject.semester).to.equal(subjectData.semester);
      expect(subject.credits).to.equal(subjectData.credits);
    });

    it('should enforce unique subject code', async () => {
      await Subject.create({
        subjectCode: 'UNIQUE101',
        subjectName: 'Unique Subject',
        subjectType: 'theory',
        semester: 1
      });

      try {
        await Subject.create({
          subjectCode: 'UNIQUE101',
          subjectName: 'Another Subject',
          subjectType: 'lab',
          semester: 2
        });
        expect.fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.name).to.equal('SequelizeUniqueConstraintError');
      }
    });

    it('should validate subject type enum', async () => {
      const subjectData = {
        subjectCode: 'INVALID101',
        subjectName: 'Invalid Subject',
        subjectType: 'invalid_type',
        semester: 1
      };

      try {
        await Subject.create(subjectData);
        expect.fail('Should have thrown validation error for invalid subject type');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });
  });

  describe('Mark Model', () => {
    let testStudent, testSubject, testFaculty;

    beforeEach(async () => {
      const studentUser = await User.create({
        uniqueId: 'STU002',
        email: 'student2@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });

      testStudent = await Student.create({
        userId: studentUser.id,
        studentName: 'Mark Test Student',
        semester: 1,
        batchYear: 2024
      });

      const facultyUser = await User.create({
        uniqueId: 'FAC002',
        email: 'faculty2@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'faculty'
      });

      testFaculty = await Faculty.create({
        userId: facultyUser.id,
        facultyName: 'Mark Test Faculty',
        department: 'Computer Science'
      });

      testSubject = await Subject.create({
        subjectCode: 'MARK101',
        subjectName: 'Mark Test Subject',
        subjectType: 'theory',
        semester: 1
      });
    });

    it('should create a mark with valid data', async () => {
      const markData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'series_test_1',
        marksObtained: 45,
        maxMarks: 50,
        facultyId: testFaculty.id
      };

      const mark = await Mark.create(markData);
      testData.mark = mark;

      expect(mark.id).to.exist;
      expect(mark.studentId).to.equal(testStudent.id);
      expect(mark.subjectId).to.equal(testSubject.id);
      expect(mark.examType).to.equal(markData.examType);
      expect(mark.marksObtained).to.equal(markData.marksObtained);
      expect(mark.maxMarks).to.equal(markData.maxMarks);
      expect(mark.facultyId).to.equal(testFaculty.id);
      expect(mark.createdAt).to.exist;
    });

    it('should establish associations', async () => {
      const mark = await Mark.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'university',
        marksObtained: 85,
        maxMarks: 100,
        facultyId: testFaculty.id
      });

      const markWithAssociations = await Mark.findByPk(mark.id, {
        include: [Student, Subject, Faculty]
      });

      expect(markWithAssociations.Student).to.exist;
      expect(markWithAssociations.Subject).to.exist;
      expect(markWithAssociations.Faculty).to.exist;
      expect(markWithAssociations.Student.id).to.equal(testStudent.id);
      expect(markWithAssociations.Subject.id).to.equal(testSubject.id);
      expect(markWithAssociations.Faculty.id).to.equal(testFaculty.id);
    });

    it('should validate exam type enum', async () => {
      const markData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'invalid_exam_type',
        marksObtained: 45,
        maxMarks: 50,
        facultyId: testFaculty.id
      };

      try {
        await Mark.create(markData);
        expect.fail('Should have thrown validation error for invalid exam type');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });

    it('should validate marks obtained is not greater than max marks', async () => {
      const markData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        examType: 'series_test_1',
        marksObtained: 55, // Greater than max marks
        maxMarks: 50,
        facultyId: testFaculty.id
      };

      try {
        await Mark.create(markData);
        expect.fail('Should have thrown validation error for marks obtained > max marks');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });
  });

  describe('Attendance Model', () => {
    let testStudent, testSubject, testFaculty;

    beforeEach(async () => {
      const studentUser = await User.create({
        uniqueId: 'STU003',
        email: 'student3@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });

      testStudent = await Student.create({
        userId: studentUser.id,
        studentName: 'Attendance Test Student',
        semester: 1,
        batchYear: 2024
      });

      const facultyUser = await User.create({
        uniqueId: 'FAC003',
        email: 'faculty3@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'faculty'
      });

      testFaculty = await Faculty.create({
        userId: facultyUser.id,
        facultyName: 'Attendance Test Faculty',
        department: 'Mathematics'
      });

      testSubject = await Subject.create({
        subjectCode: 'ATT101',
        subjectName: 'Attendance Test Subject',
        subjectType: 'theory',
        semester: 1
      });
    });

    it('should create attendance with valid data', async () => {
      const attendanceData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        totalClasses: 50,
        attendedClasses: 45,
        facultyId: testFaculty.id
      };

      const attendance = await Attendance.create(attendanceData);
      testData.attendance = attendance;

      expect(attendance.id).to.exist;
      expect(attendance.studentId).to.equal(testStudent.id);
      expect(attendance.subjectId).to.equal(testSubject.id);
      expect(attendance.totalClasses).to.equal(attendanceData.totalClasses);
      expect(attendance.attendedClasses).to.equal(attendanceData.attendedClasses);
      expect(attendance.facultyId).to.equal(testFaculty.id);
      expect(attendance.updatedAt).to.exist;
    });

    it('should calculate attendance percentage automatically', async () => {
      const attendance = await Attendance.create({
        studentId: testStudent.id,
        subjectId: testSubject.id,
        totalClasses: 40,
        attendedClasses: 32,
        facultyId: testFaculty.id
      });

      // Refresh to get calculated field
      await attendance.reload();

      const expectedPercentage = (32 / 40) * 100;
      expect(attendance.attendancePercentage).to.equal(expectedPercentage);
    });

    it('should validate attended classes not greater than total classes', async () => {
      const attendanceData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        totalClasses: 30,
        attendedClasses: 35, // Greater than total
        facultyId: testFaculty.id
      };

      try {
        await Attendance.create(attendanceData);
        expect.fail('Should have thrown validation error for attended > total');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });
  });

  describe('Notification Model', () => {
    let testUser, testSender;

    beforeEach(async () => {
      testUser = await User.create({
        uniqueId: 'NOT001',
        email: 'notification@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });

      testSender = await User.create({
        uniqueId: 'SEND001',
        email: 'sender@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'faculty'
      });
    });

    it('should create notification with valid data', async () => {
      const notificationData = {
        recipientId: testUser.id,
        senderId: testSender.id,
        notificationType: 'academic',
        title: 'Test Notification',
        message: 'This is a test notification',
        isRead: false
      };

      const notification = await Notification.create(notificationData);
      testData.notification = notification;

      expect(notification.id).to.exist;
      expect(notification.recipientId).to.equal(testUser.id);
      expect(notification.senderId).to.equal(testSender.id);
      expect(notification.notificationType).to.equal(notificationData.notificationType);
      expect(notification.title).to.equal(notificationData.title);
      expect(notification.message).to.equal(notificationData.message);
      expect(notification.isRead).to.equal(notificationData.isRead);
      expect(notification.createdAt).to.exist;
    });

    it('should validate notification type enum', async () => {
      const notificationData = {
        recipientId: testUser.id,
        senderId: testSender.id,
        notificationType: 'invalid_type',
        title: 'Test Notification',
        message: 'This is a test notification'
      };

      try {
        await Notification.create(notificationData);
        expect.fail('Should have thrown validation error for invalid notification type');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });
  });

  describe('MLPrediction Model', () => {
    let testStudent, testSubject;

    beforeEach(async () => {
      const studentUser = await User.create({
        uniqueId: 'ML001',
        email: 'mlstudent@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });

      testStudent = await Student.create({
        userId: studentUser.id,
        studentName: 'ML Test Student',
        semester: 1,
        batchYear: 2024
      });

      testSubject = await Subject.create({
        subjectCode: 'ML101',
        subjectName: 'ML Test Subject',
        subjectType: 'theory',
        semester: 1
      });
    });

    it('should create ML prediction with valid data', async () => {
      const predictionData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        predictedMarks: 78.5,
        confidenceScore: 0.85,
        inputFeatures: {
          seriesTest1: 45,
          seriesTest2: 42,
          labInternal: 48,
          attendancePercentage: 85.5
        },
        modelVersion: 'v1.0.0',
        isVisibleToStudent: true
      };

      const prediction = await MLPrediction.create(predictionData);
      testData.prediction = prediction;

      expect(prediction.id).to.exist;
      expect(prediction.studentId).to.equal(testStudent.id);
      expect(prediction.subjectId).to.equal(testSubject.id);
      expect(prediction.predictedMarks).to.equal(predictionData.predictedMarks);
      expect(prediction.confidenceScore).to.equal(predictionData.confidenceScore);
      expect(prediction.inputFeatures).to.deep.equal(predictionData.inputFeatures);
      expect(prediction.modelVersion).to.equal(predictionData.modelVersion);
      expect(prediction.isVisibleToStudent).to.equal(predictionData.isVisibleToStudent);
      expect(prediction.createdAt).to.exist;
    });

    it('should validate confidence score range', async () => {
      const predictionData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        predictedMarks: 78.5,
        confidenceScore: 1.5, // Invalid: > 1.0
        inputFeatures: { test: 'data' },
        modelVersion: 'v1.0.0'
      };

      try {
        await MLPrediction.create(predictionData);
        expect.fail('Should have thrown validation error for confidence score > 1.0');
      } catch (error) {
        expect(error.name).to.equal('SequelizeValidationError');
      }
    });
  });

  describe('Association Models', () => {
    let testFaculty, testStudent, testSubject;

    beforeEach(async () => {
      const facultyUser = await User.create({
        uniqueId: 'ASSOC001',
        email: 'assocfaculty@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'faculty'
      });

      testFaculty = await Faculty.create({
        userId: facultyUser.id,
        facultyName: 'Association Test Faculty',
        department: 'Computer Science'
      });

      const studentUser = await User.create({
        uniqueId: 'ASSOC002',
        email: 'assocstudent@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });

      testStudent = await Student.create({
        userId: studentUser.id,
        studentName: 'Association Test Student',
        semester: 1,
        batchYear: 2024
      });

      testSubject = await Subject.create({
        subjectCode: 'ASSOC101',
        subjectName: 'Association Test Subject',
        subjectType: 'theory',
        semester: 1
      });
    });

    it('should create faculty-subject association', async () => {
      const facultySubjectData = {
        facultyId: testFaculty.id,
        subjectId: testSubject.id,
        academicYear: 2024
      };

      const facultySubject = await FacultySubject.create(facultySubjectData);

      expect(facultySubject.id).to.exist;
      expect(facultySubject.facultyId).to.equal(testFaculty.id);
      expect(facultySubject.subjectId).to.equal(testSubject.id);
      expect(facultySubject.academicYear).to.equal(2024);
    });

    it('should create student-subject association', async () => {
      const studentSubjectData = {
        studentId: testStudent.id,
        subjectId: testSubject.id,
        academicYear: 2024
      };

      const studentSubject = await StudentSubject.create(studentSubjectData);

      expect(studentSubject.id).to.exist;
      expect(studentSubject.studentId).to.equal(testStudent.id);
      expect(studentSubject.subjectId).to.equal(testSubject.id);
      expect(studentSubject.academicYear).to.equal(2024);
    });
  });

  describe('Complex Queries and Relationships', () => {
    let testData = {};

    beforeEach(async () => {
      // Create comprehensive test data
      const studentUser = await User.create({
        uniqueId: 'COMPLEX001',
        email: 'complex@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'student'
      });

      testData.student = await Student.create({
        userId: studentUser.id,
        studentName: 'Complex Test Student',
        semester: 1,
        batchYear: 2024
      });

      const facultyUser = await User.create({
        uniqueId: 'COMPLEX002',
        email: 'complexfaculty@example.com',
        passwordHash: '$2a$10$test.hash.here',
        role: 'faculty'
      });

      testData.faculty = await Faculty.create({
        userId: facultyUser.id,
        facultyName: 'Complex Test Faculty',
        department: 'Computer Science'
      });

      testData.subject = await Subject.create({
        subjectCode: 'COMPLEX101',
        subjectName: 'Complex Test Subject',
        subjectType: 'theory',
        semester: 1
      });

      // Create marks
      testData.marks = await Promise.all([
        Mark.create({
          studentId: testData.student.id,
          subjectId: testData.subject.id,
          examType: 'series_test_1',
          marksObtained: 45,
          maxMarks: 50,
          facultyId: testData.faculty.id
        }),
        Mark.create({
          studentId: testData.student.id,
          subjectId: testData.subject.id,
          examType: 'series_test_2',
          marksObtained: 42,
          maxMarks: 50,
          facultyId: testData.faculty.id
        }),
        Mark.create({
          studentId: testData.student.id,
          subjectId: testData.subject.id,
          examType: 'university',
          marksObtained: 85,
          maxMarks: 100,
          facultyId: testData.faculty.id
        })
      ]);

      // Create attendance
      testData.attendance = await Attendance.create({
        studentId: testData.student.id,
        subjectId: testData.subject.id,
        totalClasses: 50,
        attendedClasses: 45,
        facultyId: testData.faculty.id
      });
    });

    it('should fetch student with all related data', async () => {
      const studentWithData = await Student.findByPk(testData.student.id, {
        include: [
          {
            model: User,
            attributes: ['uniqueId', 'email', 'role']
          },
          {
            model: Mark,
            include: [Subject, Faculty]
          },
          {
            model: Attendance,
            include: [Subject]
          }
        ]
      });

      expect(studentWithData).to.exist;
      expect(studentWithData.User).to.exist;
      expect(studentWithData.Marks).to.have.length(3);
      expect(studentWithData.Attendances).to.have.length(1);
      
      // Check marks include subject and faculty data
      studentWithData.Marks.forEach(mark => {
        expect(mark.Subject).to.exist;
        expect(mark.Faculty).to.exist;
      });

      // Check attendance includes subject data
      studentWithData.Attendances.forEach(attendance => {
        expect(attendance.Subject).to.exist;
      });
    });

    it('should calculate aggregate data correctly', async () => {
      const { Op } = require('sequelize');
      
      // Calculate total marks for student
      const totalMarks = await Mark.sum('marksObtained', {
        where: {
          studentId: testData.student.id,
          subjectId: testData.subject.id
        }
      });

      expect(totalMarks).to.equal(45 + 42 + 85); // 172

      // Calculate average attendance
      const avgAttendance = await Attendance.findOne({
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('attendancePercentage')), 'avgAttendance']
        ],
        where: {
          studentId: testData.student.id
        },
        raw: true
      });

      expect(parseFloat(avgAttendance.avgAttendance)).to.equal(90.0); // 45/50 * 100
    });

    it('should handle cascading deletes properly', async () => {
      // Delete student should cascade to marks and attendance
      await Student.destroy({ where: { id: testData.student.id } });

      const remainingMarks = await Mark.findAll({
        where: { studentId: testData.student.id }
      });

      const remainingAttendance = await Attendance.findAll({
        where: { studentId: testData.student.id }
      });

      expect(remainingMarks).to.have.length(0);
      expect(remainingAttendance).to.have.length(0);
    });
  });
});