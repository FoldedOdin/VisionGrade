const { expect } = require('chai');
const { validateUserInput, validateProfileUpdate } = require('../utils/validation');

describe('User Management API Validation', () => {
  describe('User Creation Validation', () => {
    it('should validate complete student creation data', () => {
      const studentData = {
        email: 'student@example.com',
        phone: '+1234567890',
        password: 'SecurePass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2024
      };

      const { error, value } = validateUserInput(studentData);
      expect(error).to.be.undefined;
      expect(value).to.deep.include({
        email: studentData.email,
        phone: studentData.phone,
        role: studentData.role,
        studentName: studentData.studentName,
        semester: studentData.semester,
        batchYear: studentData.batchYear
      });
    });

    it('should validate complete faculty creation data', () => {
      const facultyData = {
        email: 'faculty@example.com',
        password: 'SecurePass123!',
        role: 'faculty',
        facultyName: 'Dr. Jane Smith',
        department: 'Computer Science',
        isTutor: true,
        tutorSemester: 2
      };

      const { error, value } = validateUserInput(facultyData);
      expect(error).to.be.undefined;
      expect(value).to.deep.include({
        email: facultyData.email,
        role: facultyData.role,
        facultyName: facultyData.facultyName,
        department: facultyData.department,
        isTutor: facultyData.isTutor,
        tutorSemester: facultyData.tutorSemester
      });
    });

    it('should validate tutor creation data', () => {
      const tutorData = {
        email: 'tutor@example.com',
        password: 'SecurePass123!',
        role: 'tutor',
        facultyName: 'Prof. Bob Wilson',
        department: 'Mathematics'
      };

      const { error, value } = validateUserInput(tutorData);
      expect(error).to.be.undefined;
      expect(value.role).to.equal('tutor');
      expect(value.facultyName).to.equal(tutorData.facultyName);
    });

    it('should validate admin creation data', () => {
      const adminData = {
        email: 'admin@example.com',
        password: 'SecurePass123!',
        role: 'admin'
      };

      const { error, value } = validateUserInput(adminData);
      expect(error).to.be.undefined;
      expect(value.role).to.equal('admin');
    });

    it('should set default values for optional student fields', () => {
      const studentData = {
        email: 'student@example.com',
        password: 'SecurePass123!',
        role: 'student',
        studentName: 'John Doe'
        // semester and batchYear should get defaults
      };

      const { error, value } = validateUserInput(studentData);
      expect(error).to.be.undefined;
      expect(value.semester).to.equal(1);
      expect(value.batchYear).to.equal(new Date().getFullYear());
    });

    it('should reject missing required fields for students', () => {
      const incompleteData = {
        email: 'student@example.com',
        password: 'SecurePass123!',
        role: 'student'
        // Missing studentName
      };

      const { error } = validateUserInput(incompleteData);
      expect(error).to.exist;
      expect(error.details.some(d => d.path.includes('studentName'))).to.be.true;
    });

    it('should reject missing required fields for faculty', () => {
      const incompleteData = {
        email: 'faculty@example.com',
        password: 'SecurePass123!',
        role: 'faculty'
        // Missing facultyName
      };

      const { error } = validateUserInput(incompleteData);
      expect(error).to.exist;
      expect(error.details.some(d => d.path.includes('facultyName'))).to.be.true;
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user name@example.com'
      ];

      invalidEmails.forEach(email => {
        const data = {
          email,
          password: 'SecurePass123!',
          role: 'student',
          studentName: 'Test User'
        };

        const { error } = validateUserInput(data);
        expect(error).to.exist;
        expect(error.details.some(d => d.path.includes('email'))).to.be.true;
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        'Password',
        'Password123',
        'password123!',
        'PASSWORD123!'
      ];

      weakPasswords.forEach(password => {
        const data = {
          email: 'test@example.com',
          password,
          role: 'student',
          studentName: 'Test User'
        };

        const { error } = validateUserInput(data);
        expect(error).to.exist;
        expect(error.details.some(d => d.path.includes('password'))).to.be.true;
      });
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'C0mpl3x!Pass',
        'Str0ng#P@ssw0rd'
      ];

      strongPasswords.forEach(password => {
        const data = {
          email: 'test@example.com',
          password,
          role: 'student',
          studentName: 'Test User'
        };

        const { error } = validateUserInput(data);
        expect(error).to.be.undefined;
      });
    });

    it('should validate phone number formats', () => {
      const validPhones = [
        '+1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '123 456 7890'
      ];

      validPhones.forEach(phone => {
        const data = {
          email: 'test@example.com',
          phone,
          password: 'SecurePass123!',
          role: 'student',
          studentName: 'Test User'
        };

        const { error } = validateUserInput(data);
        if (error) {
          console.log(`Phone validation failed for: ${phone}`, error.details[0].message);
        }
        expect(error).to.be.undefined;
      });
    });

    it('should reject invalid phone number formats', () => {
      const invalidPhones = [
        'abc123',
        '123',
        '123-456-789a',
        'phone-number'
      ];

      invalidPhones.forEach(phone => {
        const data = {
          email: 'test@example.com',
          phone,
          password: 'SecurePass123!',
          role: 'student',
          studentName: 'Test User'
        };

        const { error } = validateUserInput(data);
        expect(error).to.exist;
        expect(error.details.some(d => d.path.includes('phone'))).to.be.true;
      });
    });

    it('should validate semester ranges', () => {
      const invalidSemesters = [0, 9, -1, 10];
      const validSemesters = [1, 2, 3, 4, 5, 6, 7, 8];

      invalidSemesters.forEach(semester => {
        const data = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'student',
          studentName: 'Test User',
          semester
        };

        const { error } = validateUserInput(data);
        expect(error).to.exist;
        expect(error.details.some(d => d.path.includes('semester'))).to.be.true;
      });

      validSemesters.forEach(semester => {
        const data = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'student',
          studentName: 'Test User',
          semester
        };

        const { error } = validateUserInput(data);
        expect(error).to.be.undefined;
      });
    });

    it('should validate batch year ranges', () => {
      const currentYear = new Date().getFullYear();
      const invalidYears = [2019, currentYear + 6, 1999];
      const validYears = [2020, currentYear, currentYear + 4];

      invalidYears.forEach(batchYear => {
        const data = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'student',
          studentName: 'Test User',
          batchYear
        };

        const { error } = validateUserInput(data);
        expect(error).to.exist;
        expect(error.details.some(d => d.path.includes('batchYear'))).to.be.true;
      });

      validYears.forEach(batchYear => {
        const data = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'student',
          studentName: 'Test User',
          batchYear
        };

        const { error } = validateUserInput(data);
        expect(error).to.be.undefined;
      });
    });
  });

  describe('Profile Update Validation', () => {
    it('should validate complete profile update', () => {
      const updateData = {
        email: 'updated@example.com',
        phone: '+9876543210',
        password: 'NewSecurePass123!',
        studentName: 'Updated Name',
        semester: 5,
        batchYear: 2023
      };

      const { error, value } = validateProfileUpdate(updateData);
      expect(error).to.be.undefined;
      expect(value).to.deep.include(updateData);
    });

    it('should allow partial updates', () => {
      const partialUpdates = [
        { email: 'new@example.com' },
        { phone: '+1111111111' },
        { studentName: 'New Name' },
        { semester: 6 },
        { password: 'NewPass123!' }
      ];

      partialUpdates.forEach(update => {
        const { error } = validateProfileUpdate(update);
        expect(error).to.be.undefined;
      });
    });

    it('should allow empty phone number', () => {
      const updateData = { phone: '' };
      const { error } = validateProfileUpdate(updateData);
      expect(error).to.be.undefined;
    });

    it('should validate email format in updates', () => {
      const updateData = { email: 'invalid-email' };
      const { error } = validateProfileUpdate(updateData);
      expect(error).to.exist;
      expect(error.details[0].path).to.include('email');
    });

    it('should validate password strength in updates', () => {
      const updateData = { password: 'weak' };
      const { error } = validateProfileUpdate(updateData);
      expect(error).to.exist;
      expect(error.details.some(d => d.path.includes('password'))).to.be.true;
    });

    it('should validate faculty profile updates', () => {
      const facultyUpdate = {
        facultyName: 'Dr. Updated Name',
        department: 'Updated Department',
        isTutor: false
      };

      const { error, value } = validateProfileUpdate(facultyUpdate);
      expect(error).to.be.undefined;
      expect(value).to.deep.include(facultyUpdate);
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate faculty assignment data structure', () => {
      const validAssignment = {
        facultyId: 1,
        subjectId: 1,
        academicYear: 2024
      };

      // Simulate controller validation
      const validateAssignment = (data) => {
        if (!data.facultyId || !data.subjectId) {
          return { error: 'Faculty ID and Subject ID are required' };
        }
        if (data.academicYear && (data.academicYear < 2020 || data.academicYear > new Date().getFullYear() + 5)) {
          return { error: 'Invalid academic year' };
        }
        return { valid: true };
      };

      const result = validateAssignment(validAssignment);
      expect(result.valid).to.be.true;
    });

    it('should validate student enrollment data structure', () => {
      const validEnrollment = {
        studentId: 1,
        subjectId: 1,
        academicYear: 2024
      };

      const validateEnrollment = (data) => {
        if (!data.studentId || !data.subjectId) {
          return { error: 'Student ID and Subject ID are required' };
        }
        return { valid: true };
      };

      const result = validateEnrollment(validEnrollment);
      expect(result.valid).to.be.true;
    });

    it('should validate promotion data structure', () => {
      const validPromotion = {
        studentIds: [1, 2, 3],
        fromSemester: 2,
        toSemester: 3,
        academicYear: 2024
      };

      const validatePromotion = (data) => {
        if (!data.studentIds || !Array.isArray(data.studentIds) || data.studentIds.length === 0) {
          return { error: 'Student IDs array is required' };
        }
        if (!data.fromSemester || !data.toSemester) {
          return { error: 'From and to semesters are required' };
        }
        if (data.toSemester <= data.fromSemester) {
          return { error: 'To semester must be greater than from semester' };
        }
        if (data.fromSemester < 1 || data.fromSemester > 8 || data.toSemester < 1 || data.toSemester > 8) {
          return { error: 'Semesters must be between 1 and 8' };
        }
        return { valid: true };
      };

      const result = validatePromotion(validPromotion);
      expect(result.valid).to.be.true;

      // Test invalid promotion
      const invalidPromotion = {
        studentIds: [1, 2, 3],
        fromSemester: 3,
        toSemester: 2 // Invalid: should be greater
      };

      const invalidResult = validatePromotion(invalidPromotion);
      expect(invalidResult.error).to.include('greater than');
    });
  });

  describe('Error Message Formatting', () => {
    it('should format validation errors consistently', () => {
      const mockError = {
        details: [
          { path: ['email'], message: 'Invalid email format' },
          { path: ['password'], message: 'Password too weak' }
        ]
      };

      const formatError = (error) => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          timestamp: new Date().toISOString()
        }
      });

      const formatted = formatError(mockError);
      expect(formatted.success).to.be.false;
      expect(formatted.error.code).to.equal('VALIDATION_ERROR');
      expect(formatted.error.details).to.have.length(2);
      expect(formatted.error.details[0].field).to.equal('email');
      expect(formatted.error.details[1].field).to.equal('password');
      expect(formatted.error.timestamp).to.exist;
    });

    it('should format standard errors consistently', () => {
      const formatStandardError = (code, message) => ({
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString()
        }
      });

      const errors = [
        { code: 'USER_NOT_FOUND', message: 'User not found' },
        { code: 'USER_EXISTS', message: 'User already exists' },
        { code: 'FORBIDDEN', message: 'Access denied' }
      ];

      errors.forEach(({ code, message }) => {
        const formatted = formatStandardError(code, message);
        expect(formatted.success).to.be.false;
        expect(formatted.error.code).to.equal(code);
        expect(formatted.error.message).to.equal(message);
        expect(formatted.error.timestamp).to.exist;
      });
    });
  });
});