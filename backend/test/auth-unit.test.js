const { expect } = require('chai');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password');
const { generateUniqueId, validateUniqueIdFormat } = require('../utils/idGenerator');
const { generateAccessToken, verifyToken } = require('../utils/jwt');

describe('Authentication Utilities', () => {
  describe('Password Utils', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).to.be.a('string');
      expect(hashedPassword).to.not.equal(password);
      expect(hashedPassword.length).to.be.greaterThan(50);
    });

    it('should compare password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isMatch = await comparePassword(password, hashedPassword);
      expect(isMatch).to.be.true;
      
      const isWrongMatch = await comparePassword('WrongPassword', hashedPassword);
      expect(isWrongMatch).to.be.false;
    });

    it('should validate password strength', () => {
      const strongPassword = 'TestPassword123!';
      const weakPassword = '123';
      
      const strongResult = validatePasswordStrength(strongPassword);
      expect(strongResult.isValid).to.be.true;
      expect(strongResult.errors).to.be.empty;
      
      const weakResult = validatePasswordStrength(weakPassword);
      expect(weakResult.isValid).to.be.false;
      expect(weakResult.errors).to.not.be.empty;
    });
  });

  describe('ID Generator Utils', () => {
    it('should generate student ID with correct prefix', async () => {
      const studentId = await generateUniqueId('student', { batchYear: 2023 });
      
      expect(studentId).to.be.a('string');
      expect(studentId).to.match(/^STU/);
      expect(studentId.length).to.equal(10);
    });

    it('should generate faculty ID with correct prefix', async () => {
      const facultyId = await generateUniqueId('faculty', { departmentCode: 'CSE' });
      
      expect(facultyId).to.be.a('string');
      expect(facultyId).to.match(/^FAC/);
      expect(facultyId.length).to.equal(10);
    });

    it('should validate ID format correctly', () => {
      const validStudentId = 'STU2312345';
      const invalidId = 'INVALID123';
      
      const validResult = validateUniqueIdFormat(validStudentId, 'student');
      expect(validResult.isValid).to.be.true;
      expect(validResult.role).to.equal('student');
      
      const invalidResult = validateUniqueIdFormat(invalidId);
      expect(invalidResult.isValid).to.be.false;
      expect(invalidResult.errors).to.not.be.empty;
    });
  });

  describe('JWT Utils', () => {
    // Set up test environment variables
    before(() => {
      process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only';
      process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing_purposes_only';
    });

    it('should generate access token correctly', () => {
      const payload = { userId: 1, role: 'student' };
      const token = generateAccessToken(payload, '1h');
      
      expect(token).to.be.a('string');
      expect(token.split('.')).to.have.length(3); // JWT has 3 parts
    });

    it('should verify token correctly', () => {
      const payload = { userId: 1, role: 'student' };
      const token = generateAccessToken(payload, '1h');
      
      const decoded = verifyToken(token);
      expect(decoded.userId).to.equal(payload.userId);
      expect(decoded.role).to.equal(payload.role);
      expect(decoded.iss).to.equal('visiongrade');
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyToken(invalidToken)).to.throw();
    });
  });
});

describe('Validation Schemas', () => {
  const { 
    registerSchema, 
    loginSchema, 
    forgotPasswordSchema 
  } = require('../utils/validation');

  describe('Registration Schema', () => {
    it('should validate correct student registration data', () => {
      const validData = {
        email: 'student@test.com',
        phone: '+1234567890',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      const { error } = registerSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).to.not.be.undefined;
      expect(error.details[0].path).to.include('email');
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@test.com',
        password: 'TestPass123!',
        confirmPassword: 'DifferentPass123!',
        role: 'student',
        studentName: 'John Doe',
        semester: 3,
        batchYear: 2023
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).to.not.be.undefined;
      expect(error.details[0].path).to.include('confirmPassword');
    });
  });

  describe('Login Schema', () => {
    it('should validate correct login data', () => {
      const validData = {
        identifier: 'test@test.com',
        password: 'TestPass123!'
      };

      const { error } = loginSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should reject missing identifier', () => {
      const invalidData = {
        password: 'TestPass123!'
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).to.not.be.undefined;
      expect(error.details[0].path).to.include('identifier');
    });
  });

  describe('Forgot Password Schema', () => {
    it('should validate correct forgot password data', () => {
      const validData = {
        identifier: 'test@test.com',
        resetMethod: 'email'
      };

      const { error } = forgotPasswordSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should reject invalid reset method', () => {
      const invalidData = {
        identifier: 'test@test.com',
        resetMethod: 'invalid'
      };

      const { error } = forgotPasswordSchema.validate(invalidData);
      expect(error).to.not.be.undefined;
      expect(error.details[0].path).to.include('resetMethod');
    });
  });
});