const { expect } = require('chai');
const {
  validateMarksEntry,
  validateMarksUpdate,
  validateAttendanceEntry,
  validateAttendanceUpdate,
  validateSubjectCreation,
  validateSubjectUpdate,
  validateFacultyAssignment
} = require('../utils/validation');

describe('Academic Data Validation', () => {
  describe('Marks Validation', () => {
    describe('validateMarksEntry', () => {
      it('should validate correct marks entry data', () => {
        const validData = {
          student_id: 1,
          subject_id: 1,
          exam_type: 'series_test_1',
          marks_obtained: 45,
          max_marks: 50
        };

        const { error, value } = validateMarksEntry(validData);
        expect(error).to.be.undefined;
        expect(value).to.deep.equal(validData);
      });

      it('should validate university exam marks', () => {
        const validData = {
          student_id: 1,
          subject_id: 1,
          exam_type: 'university',
          marks_obtained: 85,
          max_marks: 100
        };

        const { error, value } = validateMarksEntry(validData);
        expect(error).to.be.undefined;
        expect(value.exam_type).to.equal('university');
        expect(value.max_marks).to.equal(100);
      });

      it('should reject invalid exam type', () => {
        const invalidData = {
          student_id: 1,
          subject_id: 1,
          exam_type: 'invalid_exam',
          marks_obtained: 45,
          max_marks: 50
        };

        const { error } = validateMarksEntry(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('one of');
      });

      it('should reject negative marks', () => {
        const invalidData = {
          student_id: 1,
          subject_id: 1,
          exam_type: 'series_test_1',
          marks_obtained: -5,
          max_marks: 50
        };

        const { error } = validateMarksEntry(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('negative');
      });

      it('should reject missing required fields', () => {
        const invalidData = {
          student_id: 1,
          exam_type: 'series_test_1',
          marks_obtained: 45
          // missing subject_id and max_marks
        };

        const { error } = validateMarksEntry(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details.length).to.be.greaterThan(0);
      });

      it('should reject non-integer values', () => {
        const invalidData = {
          student_id: 1.5, // Should be integer
          subject_id: 1,
          exam_type: 'series_test_1',
          marks_obtained: 45,
          max_marks: 50
        };

        const { error } = validateMarksEntry(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('integer');
      });
    });

    describe('validateMarksUpdate', () => {
      it('should validate partial marks update', () => {
        const validData = {
          marks_obtained: 40
        };

        const { error, value } = validateMarksUpdate(validData);
        expect(error).to.be.undefined;
        expect(value.marks_obtained).to.equal(40);
      });

      it('should allow empty update object', () => {
        const validData = {};

        const { error, value } = validateMarksUpdate(validData);
        expect(error).to.be.undefined;
        expect(value).to.deep.equal({});
      });
    });
  });

  describe('Attendance Validation', () => {
    describe('validateAttendanceEntry', () => {
      it('should validate correct attendance entry data', () => {
        const validData = {
          student_id: 1,
          subject_id: 1,
          total_classes: 20,
          attended_classes: 18
        };

        const { error, value } = validateAttendanceEntry(validData);
        expect(error).to.be.undefined;
        expect(value).to.deep.equal(validData);
      });

      it('should allow zero attendance', () => {
        const validData = {
          student_id: 1,
          subject_id: 1,
          total_classes: 20,
          attended_classes: 0
        };

        const { error, value } = validateAttendanceEntry(validData);
        expect(error).to.be.undefined;
        expect(value.attended_classes).to.equal(0);
      });

      it('should reject negative values', () => {
        const invalidData = {
          student_id: 1,
          subject_id: 1,
          total_classes: -5,
          attended_classes: 10
        };

        const { error } = validateAttendanceEntry(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('negative');
      });

      it('should reject missing required fields', () => {
        const invalidData = {
          student_id: 1,
          total_classes: 20
          // missing subject_id and attended_classes
        };

        const { error } = validateAttendanceEntry(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details.length).to.be.greaterThan(0);
      });

      it('should reject non-integer values', () => {
        const invalidData = {
          student_id: 1,
          subject_id: 1,
          total_classes: 20.5, // Should be integer
          attended_classes: 18
        };

        const { error } = validateAttendanceEntry(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('integer');
      });
    });

    describe('validateAttendanceUpdate', () => {
      it('should validate partial attendance update', () => {
        const validData = {
          total_classes: 25
        };

        const { error, value } = validateAttendanceUpdate(validData);
        expect(error).to.be.undefined;
        expect(value.total_classes).to.equal(25);
      });

      it('should allow empty update object', () => {
        const validData = {};

        const { error, value } = validateAttendanceUpdate(validData);
        expect(error).to.be.undefined;
        expect(value).to.deep.equal({});
      });
    });
  });

  describe('Subject Validation', () => {
    describe('validateSubjectCreation', () => {
      it('should validate correct subject creation data', () => {
        const validData = {
          subject_code: 'CS101',
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'theory',
          semester: 1,
          credits: 3
        };

        const { error, value } = validateSubjectCreation(validData);
        expect(error).to.be.undefined;
        expect(value).to.deep.equal(validData);
      });

      it('should set default credits value', () => {
        const validData = {
          subject_code: 'CS101',
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'theory',
          semester: 1
          // credits not provided
        };

        const { error, value } = validateSubjectCreation(validData);
        expect(error).to.be.undefined;
        expect(value.credits).to.equal(3);
      });

      it('should validate lab subject type', () => {
        const validData = {
          subject_code: 'CS101L',
          subject_name: 'Computer Science Lab',
          subject_type: 'lab',
          semester: 1,
          credits: 2
        };

        const { error, value } = validateSubjectCreation(validData);
        expect(error).to.be.undefined;
        expect(value.subject_type).to.equal('lab');
      });

      it('should reject invalid subject code format', () => {
        const invalidData = {
          subject_code: 'cs101', // Should be uppercase
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'theory',
          semester: 1,
          credits: 3
        };

        const { error } = validateSubjectCreation(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('uppercase');
      });

      it('should reject invalid subject type', () => {
        const invalidData = {
          subject_code: 'CS101',
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'practical', // Invalid type
          semester: 1,
          credits: 3
        };

        const { error } = validateSubjectCreation(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('theory or lab');
      });

      it('should reject invalid semester range', () => {
        const invalidData = {
          subject_code: 'CS101',
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'theory',
          semester: 10, // Invalid: exceeds max
          credits: 3
        };

        const { error } = validateSubjectCreation(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('8');
      });

      it('should reject invalid credits range', () => {
        const invalidData = {
          subject_code: 'CS101',
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'theory',
          semester: 1,
          credits: 10 // Invalid: exceeds max
        };

        const { error } = validateSubjectCreation(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('6');
      });

      it('should reject short subject code', () => {
        const invalidData = {
          subject_code: 'C', // Too short
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'theory',
          semester: 1,
          credits: 3
        };

        const { error } = validateSubjectCreation(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('2 characters');
      });

      it('should reject long subject code', () => {
        const invalidData = {
          subject_code: 'VERYLONGCODE', // Too long
          subject_name: 'Computer Science Fundamentals',
          subject_type: 'theory',
          semester: 1,
          credits: 3
        };

        const { error } = validateSubjectCreation(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('10 characters');
      });
    });

    describe('validateSubjectUpdate', () => {
      it('should validate partial subject update', () => {
        const validData = {
          subject_name: 'Advanced Computer Science',
          credits: 4
        };

        const { error, value } = validateSubjectUpdate(validData);
        expect(error).to.be.undefined;
        expect(value.subject_name).to.equal('Advanced Computer Science');
        expect(value.credits).to.equal(4);
      });

      it('should allow empty update object', () => {
        const validData = {};

        const { error, value } = validateSubjectUpdate(validData);
        expect(error).to.be.undefined;
        expect(value).to.deep.equal({});
      });

      it('should validate subject code format in updates', () => {
        const invalidData = {
          subject_code: 'cs102' // Should be uppercase
        };

        const { error } = validateSubjectUpdate(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('uppercase');
      });
    });
  });

  describe('Faculty Assignment Validation', () => {
    describe('validateFacultyAssignment', () => {
      it('should validate correct faculty assignment data', () => {
        const validData = {
          faculty_id: 1,
          academic_year: 2024
        };

        const { error, value } = validateFacultyAssignment(validData);
        expect(error).to.be.undefined;
        expect(value.faculty_id).to.equal(1);
        expect(value.academic_year).to.equal(2024);
      });

      it('should set default academic year', () => {
        const validData = {
          faculty_id: 1
          // academic_year not provided
        };

        const { error, value } = validateFacultyAssignment(validData);
        expect(error).to.be.undefined;
        expect(value.academic_year).to.equal(new Date().getFullYear());
      });

      it('should reject invalid faculty ID', () => {
        const invalidData = {
          faculty_id: -1, // Should be positive
          academic_year: 2024
        };

        const { error } = validateFacultyAssignment(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('positive');
      });

      it('should reject invalid academic year range', () => {
        const invalidData = {
          faculty_id: 1,
          academic_year: 2010 // Too old
        };

        const { error } = validateFacultyAssignment(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('2020');
      });

      it('should reject future academic year', () => {
        const futureYear = new Date().getFullYear() + 10;
        const invalidData = {
          faculty_id: 1,
          academic_year: futureYear // Too far in future
        };

        const { error } = validateFacultyAssignment(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('exceed');
      });

      it('should reject missing faculty ID', () => {
        const invalidData = {
          academic_year: 2024
          // faculty_id missing
        };

        const { error } = validateFacultyAssignment(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('required');
      });

      it('should reject non-integer faculty ID', () => {
        const invalidData = {
          faculty_id: 1.5, // Should be integer
          academic_year: 2024
        };

        const { error } = validateFacultyAssignment(invalidData);
        expect(error).to.not.be.undefined;
        expect(error.details[0].message).to.include('integer');
      });
    });
  });

  describe('Edge Cases and Data Types', () => {
    it('should handle string numbers correctly', () => {
      const dataWithStringNumbers = {
        student_id: '1',
        subject_id: '2',
        exam_type: 'series_test_1',
        marks_obtained: '45',
        max_marks: '50'
      };

      const { error, value } = validateMarksEntry(dataWithStringNumbers);
      expect(error).to.be.undefined; // Joi converts string numbers to integers
    });

    it('should strip unknown fields', () => {
      const dataWithExtraFields = {
        student_id: 1,
        subject_id: 1,
        exam_type: 'series_test_1',
        marks_obtained: 45,
        max_marks: 50,
        unknown_field: 'should be removed'
      };

      const { error, value } = validateMarksEntry(dataWithExtraFields);
      expect(error).to.be.undefined;
      expect(value).to.not.have.property('unknown_field');
    });

    it('should validate all exam types', () => {
      const examTypes = ['series_test_1', 'series_test_2', 'lab_internal', 'university'];
      
      examTypes.forEach(examType => {
        const validData = {
          student_id: 1,
          subject_id: 1,
          exam_type: examType,
          marks_obtained: 45,
          max_marks: examType === 'university' ? 100 : 50
        };

        const { error } = validateMarksEntry(validData);
        expect(error).to.be.undefined;
      });
    });

    it('should validate both subject types', () => {
      const subjectTypes = ['theory', 'lab'];
      
      subjectTypes.forEach(subjectType => {
        const validData = {
          subject_code: 'CS101',
          subject_name: 'Test Subject',
          subject_type: subjectType,
          semester: 1,
          credits: 3
        };

        const { error } = validateSubjectCreation(validData);
        expect(error).to.be.undefined;
      });
    });

    it('should validate semester range boundaries', () => {
      const validSemesters = [1, 2, 3, 4, 5, 6, 7, 8];
      const invalidSemesters = [0, 9, -1, 10];

      validSemesters.forEach(semester => {
        const validData = {
          subject_code: 'CS101',
          subject_name: 'Test Subject',
          subject_type: 'theory',
          semester: semester,
          credits: 3
        };

        const { error } = validateSubjectCreation(validData);
        expect(error).to.be.undefined;
      });

      invalidSemesters.forEach(semester => {
        const invalidData = {
          subject_code: 'CS101',
          subject_name: 'Test Subject',
          subject_type: 'theory',
          semester: semester,
          credits: 3
        };

        const { error } = validateSubjectCreation(invalidData);
        expect(error).to.not.be.undefined;
      });
    });
  });
});