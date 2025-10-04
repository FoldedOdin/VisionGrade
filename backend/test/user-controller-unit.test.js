const { expect } = require('chai');
const sinon = require('sinon');
const { validateUserInput, validateProfileUpdate } = require('../utils/validation');

describe('User Controller Unit Tests', () => {
  describe('Validation Functions', () => {
    describe('validateUserInput', () => {
      it('should validate correct student data', () => {
        const studentData = {
          email: 'student@test.com',
          password: 'Password123!',
          role: 'student',
          studentName: 'John Doe',
          semester: 3,
          batchYear: 2024
        };

        const { error, value } = validateUserInput(studentData);
        expect(error).to.be.undefined;
        expect(value.email).to.equal(studentData.email);
        expect(value.role).to.equal(studentData.role);
        expect(value.studentName).to.equal(studentData.studentName);
      });

      it('should validate correct faculty data', () => {
        const facultyData = {
          email: 'faculty@test.com',
          password: 'Password123!',
          role: 'faculty',
          facultyName: 'Dr. Jane Smith',
          department: 'Computer Science',
          isTutor: true,
          tutorSemester: 2
        };

        const { error, value } = validateUserInput(facultyData);
        expect(error).to.be.undefined;
        expect(value.email).to.equal(facultyData.email);
        expect(value.role).to.equal(facultyData.role);
        expect(value.facultyName).to.equal(facultyData.facultyName);
        expect(value.isTutor).to.be.true;
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'Password123!',
          role: 'student',
          studentName: 'John Doe'
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details[0].path).to.include('email');
      });

      it('should reject weak password', () => {
        const invalidData = {
          email: 'test@test.com',
          password: '123',
          role: 'student',
          studentName: 'John Doe'
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('password'))).to.be.true;
      });

      it('should reject invalid role', () => {
        const invalidData = {
          email: 'test@test.com',
          password: 'Password123!',
          role: 'invalid-role',
          studentName: 'John Doe'
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details[0].path).to.include('role');
      });

      it('should require studentName for student role', () => {
        const invalidData = {
          email: 'test@test.com',
          password: 'Password123!',
          role: 'student'
          // Missing studentName
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('studentName'))).to.be.true;
      });

      it('should require facultyName for faculty role', () => {
        const invalidData = {
          email: 'test@test.com',
          password: 'Password123!',
          role: 'faculty'
          // Missing facultyName
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('facultyName'))).to.be.true;
      });

      it('should validate semester range for students', () => {
        const invalidData = {
          email: 'test@test.com',
          password: 'Password123!',
          role: 'student',
          studentName: 'John Doe',
          semester: 10 // Invalid semester
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('semester'))).to.be.true;
      });

      it('should validate batch year range for students', () => {
        const invalidData = {
          email: 'test@test.com',
          password: 'Password123!',
          role: 'student',
          studentName: 'John Doe',
          batchYear: 2010 // Too old
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('batchYear'))).to.be.true;
      });

      it('should validate phone number format', () => {
        const invalidData = {
          email: 'test@test.com',
          phone: 'invalid-phone',
          password: 'Password123!',
          role: 'student',
          studentName: 'John Doe'
        };

        const { error } = validateUserInput(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('phone'))).to.be.true;
      });

      it('should allow valid phone number formats', () => {
        const validPhones = ['+1234567890', '123-456-7890', '(123) 456-7890', '123 456 7890'];
        
        validPhones.forEach(phone => {
          const data = {
            email: 'test@test.com',
            phone: phone,
            password: 'Password123!',
            role: 'student',
            studentName: 'John Doe'
          };

          const { error } = validateUserInput(data);
          expect(error).to.be.undefined;
        });
      });
    });

    describe('validateProfileUpdate', () => {
      it('should validate correct profile update data', () => {
        const updateData = {
          email: 'updated@test.com',
          phone: '+1234567890',
          studentName: 'Updated Name',
          semester: 4
        };

        const { error, value } = validateProfileUpdate(updateData);
        expect(error).to.be.undefined;
        expect(value.email).to.equal(updateData.email);
        expect(value.studentName).to.equal(updateData.studentName);
      });

      it('should allow partial updates', () => {
        const updateData = {
          email: 'updated@test.com'
        };

        const { error, value } = validateProfileUpdate(updateData);
        expect(error).to.be.undefined;
        expect(value.email).to.equal(updateData.email);
      });

      it('should validate email format in updates', () => {
        const invalidData = {
          email: 'invalid-email'
        };

        const { error } = validateProfileUpdate(invalidData);
        expect(error).to.exist;
        expect(error.details[0].path).to.include('email');
      });

      it('should validate password strength in updates', () => {
        const invalidData = {
          password: 'weak'
        };

        const { error } = validateProfileUpdate(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('password'))).to.be.true;
      });

      it('should allow empty phone number', () => {
        const updateData = {
          phone: ''
        };

        const { error } = validateProfileUpdate(updateData);
        expect(error).to.be.undefined;
      });

      it('should validate semester range in updates', () => {
        const invalidData = {
          semester: 0
        };

        const { error } = validateProfileUpdate(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('semester'))).to.be.true;
      });

      it('should validate batch year range in updates', () => {
        const invalidData = {
          batchYear: 2050 // Too far in future
        };

        const { error } = validateProfileUpdate(invalidData);
        expect(error).to.exist;
        expect(error.details.some(detail => detail.path.includes('batchYear'))).to.be.true;
      });
    });
  });

  describe('File Upload Validation', () => {
    it('should validate image file types', () => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4'];

      // Mock file filter function from controller
      const fileFilter = (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
        }
      };

      validTypes.forEach(type => {
        const mockFile = { mimetype: type };
        let error = null;
        let accepted = false;

        fileFilter(null, mockFile, (err, result) => {
          error = err;
          accepted = result;
        });

        expect(error).to.be.null;
        expect(accepted).to.be.true;
      });

      invalidTypes.forEach(type => {
        const mockFile = { mimetype: type };
        let error = null;
        let accepted = false;

        fileFilter(null, mockFile, (err, result) => {
          error = err;
          accepted = result;
        });

        expect(error).to.exist;
        expect(error.message).to.include('Invalid file type');
        expect(accepted).to.be.false;
      });
    });
  });

  describe('Request Validation Helpers', () => {
    it('should validate required fields for faculty assignment', () => {
      const validData = {
        facultyId: 1,
        subjectId: 1,
        academicYear: 2024
      };

      const invalidData = {
        facultyId: 1
        // Missing subjectId
      };

      // Simulate validation logic
      const validateAssignment = (data) => {
        if (!data.facultyId || !data.subjectId) {
          return { error: 'Faculty ID and Subject ID are required' };
        }
        return { valid: true };
      };

      const validResult = validateAssignment(validData);
      expect(validResult.valid).to.be.true;

      const invalidResult = validateAssignment(invalidData);
      expect(invalidResult.error).to.exist;
    });

    it('should validate required fields for student enrollment', () => {
      const validData = {
        studentId: 1,
        subjectId: 1,
        academicYear: 2024
      };

      const invalidData = {
        studentId: 1
        // Missing subjectId
      };

      // Simulate validation logic
      const validateEnrollment = (data) => {
        if (!data.studentId || !data.subjectId) {
          return { error: 'Student ID and Subject ID are required' };
        }
        return { valid: true };
      };

      const validResult = validateEnrollment(validData);
      expect(validResult.valid).to.be.true;

      const invalidResult = validateEnrollment(invalidData);
      expect(invalidResult.error).to.exist;
    });

    it('should validate promotion data', () => {
      const validData = {
        studentIds: [1, 2, 3],
        fromSemester: 2,
        toSemester: 3,
        academicYear: 2024
      };

      const invalidData = {
        studentIds: [1, 2, 3],
        fromSemester: 3,
        toSemester: 2 // Invalid: to semester should be greater
      };

      // Simulate validation logic
      const validatePromotion = (data) => {
        if (!data.studentIds || !Array.isArray(data.studentIds) || !data.fromSemester || !data.toSemester) {
          return { error: 'Student IDs, from semester, and to semester are required' };
        }
        if (data.toSemester <= data.fromSemester) {
          return { error: 'To semester must be greater than from semester' };
        }
        return { valid: true };
      };

      const validResult = validatePromotion(validData);
      expect(validResult.valid).to.be.true;

      const invalidResult = validatePromotion(invalidData);
      expect(invalidResult.error).to.include('greater than');
    });
  });

  describe('Error Response Formatting', () => {
    it('should format validation errors correctly', () => {
      const mockValidationError = {
        details: [
          { path: ['email'], message: 'Invalid email format' },
          { path: ['password'], message: 'Password too weak' }
        ]
      };

      // Simulate error formatting from controller
      const formatValidationError = (error) => {
        return {
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
        };
      };

      const formattedError = formatValidationError(mockValidationError);
      expect(formattedError.success).to.be.false;
      expect(formattedError.error.code).to.equal('VALIDATION_ERROR');
      expect(formattedError.error.details).to.have.length(2);
      expect(formattedError.error.details[0].field).to.equal('email');
      expect(formattedError.error.details[1].field).to.equal('password');
    });

    it('should format standard errors correctly', () => {
      const formatStandardError = (code, message) => {
        return {
          success: false,
          error: {
            code: code,
            message: message,
            timestamp: new Date().toISOString()
          }
        };
      };

      const error = formatStandardError('USER_NOT_FOUND', 'User not found');
      expect(error.success).to.be.false;
      expect(error.error.code).to.equal('USER_NOT_FOUND');
      expect(error.error.message).to.equal('User not found');
      expect(error.error.timestamp).to.exist;
    });
  });
});