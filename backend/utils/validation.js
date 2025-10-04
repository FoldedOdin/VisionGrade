const Joi = require('joi');

/**
 * Validation schemas for authentication endpoints
 */

// User registration validation schema
const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
  
  role: Joi.string()
    .valid('student', 'faculty', 'tutor', 'admin')
    .required()
    .messages({
      'any.only': 'Role must be one of: student, faculty, tutor, admin',
      'any.required': 'Role is required'
    }),
  
  // Additional fields based on role
  studentName: Joi.when('role', {
    is: 'student',
    then: Joi.string().min(2).max(255).required(),
    otherwise: Joi.forbidden()
  }),
  
  facultyName: Joi.when('role', {
    is: Joi.valid('faculty', 'tutor'),
    then: Joi.string().min(2).max(255).required(),
    otherwise: Joi.forbidden()
  }),
  
  semester: Joi.when('role', {
    is: 'student',
    then: Joi.number().integer().min(1).max(8).required(),
    otherwise: Joi.forbidden()
  }),
  
  batchYear: Joi.when('role', {
    is: 'student',
    then: Joi.number().integer().min(2020).max(new Date().getFullYear() + 4).required(),
    otherwise: Joi.forbidden()
  }),
  
  department: Joi.when('role', {
    is: Joi.valid('faculty', 'tutor'),
    then: Joi.string().min(2).max(100).optional(),
    otherwise: Joi.forbidden()
  }),
  
  isTutor: Joi.when('role', {
    is: 'faculty',
    then: Joi.boolean().optional(),
    otherwise: Joi.forbidden()
  }),
  
  tutorSemester: Joi.when('isTutor', {
    is: true,
    then: Joi.number().integer().min(1).max(8).optional(),
    otherwise: Joi.forbidden()
  })
});

// Login validation schema
const loginSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .messages({
      'any.required': 'Email, phone, or ID is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Forgot password validation schema
const forgotPasswordSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .messages({
      'any.required': 'Email or phone number is required'
    }),
  
  resetMethod: Joi.string()
    .valid('email', 'phone')
    .required()
    .messages({
      'any.only': 'Reset method must be either email or phone',
      'any.required': 'Reset method is required'
    })
});

// Reset password validation schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

// Change password validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

// Profile update validation schema
const updateProfileSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{10,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  // Role-specific fields
  studentName: Joi.string().min(2).max(255).optional(),
  facultyName: Joi.string().min(2).max(255).optional(),
  department: Joi.string().min(2).max(100).optional(),
  semester: Joi.number().integer().min(1).max(8).optional(),
  batchYear: Joi.number().integer().min(2020).max(new Date().getFullYear() + 4).optional()
});

/**
 * Enhanced validation middleware factory with comprehensive error handling
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, query, params)
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body', options = {}) => {
  const {
    allowUnknown = false,
    stripUnknown = true,
    abortEarly = false,
    presence = 'optional',
    skipFunctions = true,
    convert = true
  } = options;

  return (req, res, next) => {
    try {
      // Validate the request property
      const { error, value, warning } = schema.validate(req[property], {
        abortEarly,
        stripUnknown,
        allowUnknown,
        presence,
        skipFunctions,
        convert
      });

      if (error) {
        const errors = error.details.map(detail => {
          const field = detail.path.join('.');
          let message = detail.message;
          let suggestion = '';

          // Generate user-friendly messages and recovery suggestions
          switch (detail.type) {
            case 'any.required':
              message = `${field} is required`;
              suggestion = `Please provide a value for ${field}`;
              break;
            case 'string.email':
              message = 'Please provide a valid email address';
              suggestion = 'Enter an email in the format: user@example.com';
              break;
            case 'string.pattern.base':
              if (field.includes('password')) {
                message = 'Password must contain uppercase, lowercase, number and special character';
                suggestion = 'Use at least 8 characters with mixed case, numbers, and symbols';
              } else if (field.includes('phone')) {
                message = 'Please provide a valid phone number';
                suggestion = 'Enter a 10-digit phone number without spaces or dashes';
              } else {
                message = `${field} format is invalid`;
                suggestion = 'Please check the format and try again';
              }
              break;
            case 'string.min':
              message = `${field} must be at least ${detail.context.limit} characters`;
              suggestion = `Please enter at least ${detail.context.limit - (detail.context.value?.length || 0)} more characters`;
              break;
            case 'string.max':
              message = `${field} cannot exceed ${detail.context.limit} characters`;
              suggestion = `Please remove ${(detail.context.value?.length || 0) - detail.context.limit} characters`;
              break;
            case 'number.min':
              message = `${field} must be at least ${detail.context.limit}`;
              suggestion = `Please enter a value of ${detail.context.limit} or higher`;
              break;
            case 'number.max':
              message = `${field} cannot exceed ${detail.context.limit}`;
              suggestion = `Please enter a value of ${detail.context.limit} or lower`;
              break;
            case 'any.only':
              if (detail.context.valids) {
                message = `${field} must be one of: ${detail.context.valids.join(', ')}`;
                suggestion = `Please select from the available options`;
              }
              break;
            case 'number.base':
              message = `${field} must be a valid number`;
              suggestion = 'Please enter only numeric values';
              break;
            case 'boolean.base':
              message = `${field} must be true or false`;
              suggestion = 'Please select a valid option';
              break;
            case 'date.base':
              message = `${field} must be a valid date`;
              suggestion = 'Please enter a date in the correct format';
              break;
            default:
              // Keep original message for unhandled types
              suggestion = 'Please check your input and try again';
          }

          return {
            field,
            message,
            suggestion,
            value: detail.context?.value,
            type: detail.type
          };
        });

        // Log validation errors for monitoring
        console.warn('Validation failed:', {
          property,
          errors: errors.map(e => ({ field: e.field, type: e.type })),
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check your input and try again',
            details: errors,
            timestamp: new Date().toISOString(),
            summary: {
              totalErrors: errors.length,
              fields: errors.map(e => e.field)
            }
          }
        });
      }

      // Log warnings if present
      if (warning) {
        console.info('Validation warnings:', {
          property,
          warnings: warning.details?.map(w => ({ field: w.path.join('.'), message: w.message })),
          timestamp: new Date().toISOString()
        });
      }

      // Replace request property with validated and sanitized value
      req[property] = value;
      
      // Add validation metadata to request
      req.validationMeta = {
        property,
        hasWarnings: Boolean(warning),
        validatedAt: new Date().toISOString()
      };

      next();
    } catch (validationError) {
      console.error('Validation middleware error:', validationError);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_SYSTEM_ERROR',
          message: 'Validation system error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

// Admin creation validation schema
const createAdminSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  facultyName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Faculty name must be at least 2 characters long',
      'string.max': 'Faculty name cannot exceed 100 characters',
      'any.required': 'Faculty name is required'
    }),
  
  department: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Department name cannot exceed 100 characters'
    })
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  createAdminSchema,
  validate
};

// User creation validation schema (for admin)
const userCreationSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  role: Joi.string()
    .valid('student', 'faculty', 'tutor', 'admin')
    .required()
    .messages({
      'any.only': 'Role must be one of: student, faculty, tutor, admin',
      'any.required': 'Role is required'
    }),
  
  // Student-specific fields
  studentName: Joi.when('role', {
    is: 'student',
    then: Joi.string().min(2).max(255).required(),
    otherwise: Joi.forbidden()
  }),
  
  semester: Joi.when('role', {
    is: 'student',
    then: Joi.number().integer().min(1).max(8).optional().default(1),
    otherwise: Joi.forbidden()
  }),
  
  batchYear: Joi.when('role', {
    is: 'student',
    then: Joi.number().integer().min(2020).max(new Date().getFullYear() + 4).optional().default(new Date().getFullYear()),
    otherwise: Joi.forbidden()
  }),
  
  // Faculty-specific fields
  facultyName: Joi.when('role', {
    is: Joi.valid('faculty', 'tutor'),
    then: Joi.string().min(2).max(255).required(),
    otherwise: Joi.forbidden()
  }),
  
  department: Joi.when('role', {
    is: Joi.valid('faculty', 'tutor'),
    then: Joi.string().min(2).max(100).optional(),
    otherwise: Joi.forbidden()
  }),
  
  isTutor: Joi.when('role', {
    is: 'faculty',
    then: Joi.boolean().optional(),
    otherwise: Joi.forbidden()
  }),
  
  tutorSemester: Joi.when('isTutor', {
    is: true,
    then: Joi.number().integer().min(1).max(8).optional(),
    otherwise: Joi.forbidden()
  })
});

// Profile update validation schema (enhanced)
const profileUpdateSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{10,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .optional()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  
  // Role-specific fields
  studentName: Joi.string().min(2).max(255).optional(),
  facultyName: Joi.string().min(2).max(255).optional(),
  department: Joi.string().min(2).max(100).optional(),
  semester: Joi.number().integer().min(1).max(8).optional(),
  batchYear: Joi.number().integer().min(2020).max(new Date().getFullYear() + 4).optional(),
  isTutor: Joi.boolean().optional(),
  tutorSemester: Joi.number().integer().min(1).max(8).optional()
});

/**
 * Validation functions
 */
const validateUserInput = (data) => {
  return userCreationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateProfileUpdate = (data) => {
  return profileUpdateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

/**
 * Academic data validation schemas
 */

// Marks entry validation schema
const marksEntrySchema = Joi.object({
  student_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Student ID must be a number',
      'number.integer': 'Student ID must be an integer',
      'number.positive': 'Student ID must be positive',
      'any.required': 'Student ID is required'
    }),
  
  subject_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Subject ID must be a number',
      'number.integer': 'Subject ID must be an integer',
      'number.positive': 'Subject ID must be positive',
      'any.required': 'Subject ID is required'
    }),
  
  exam_type: Joi.string()
    .valid('series_test_1', 'series_test_2', 'lab_internal', 'university')
    .required()
    .messages({
      'any.only': 'Exam type must be one of: series_test_1, series_test_2, lab_internal, university',
      'any.required': 'Exam type is required'
    }),
  
  marks_obtained: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Marks obtained must be a number',
      'number.integer': 'Marks obtained must be an integer',
      'number.min': 'Marks obtained cannot be negative',
      'any.required': 'Marks obtained is required'
    }),
  
  max_marks: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Max marks must be a number',
      'number.integer': 'Max marks must be an integer',
      'number.positive': 'Max marks must be positive',
      'any.required': 'Max marks is required'
    })
});

// Marks update validation schema
const marksUpdateSchema = Joi.object({
  marks_obtained: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Marks obtained must be a number',
      'number.integer': 'Marks obtained must be an integer',
      'number.min': 'Marks obtained cannot be negative'
    }),
  
  max_marks: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Max marks must be a number',
      'number.integer': 'Max marks must be an integer',
      'number.positive': 'Max marks must be positive'
    })
});

// Attendance entry validation schema
const attendanceEntrySchema = Joi.object({
  student_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Student ID must be a number',
      'number.integer': 'Student ID must be an integer',
      'number.positive': 'Student ID must be positive',
      'any.required': 'Student ID is required'
    }),
  
  subject_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Subject ID must be a number',
      'number.integer': 'Subject ID must be an integer',
      'number.positive': 'Subject ID must be positive',
      'any.required': 'Subject ID is required'
    }),
  
  total_classes: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Total classes must be a number',
      'number.integer': 'Total classes must be an integer',
      'number.min': 'Total classes cannot be negative',
      'any.required': 'Total classes is required'
    }),
  
  attended_classes: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Attended classes must be a number',
      'number.integer': 'Attended classes must be an integer',
      'number.min': 'Attended classes cannot be negative',
      'any.required': 'Attended classes is required'
    })
});

// Attendance update validation schema
const attendanceUpdateSchema = Joi.object({
  total_classes: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Total classes must be a number',
      'number.integer': 'Total classes must be an integer',
      'number.min': 'Total classes cannot be negative'
    }),
  
  attended_classes: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Attended classes must be a number',
      'number.integer': 'Attended classes must be an integer',
      'number.min': 'Attended classes cannot be negative'
    })
});

// Subject creation validation schema
const subjectCreationSchema = Joi.object({
  subject_code: Joi.string()
    .min(2)
    .max(10)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.min': 'Subject code must be at least 2 characters long',
      'string.max': 'Subject code cannot exceed 10 characters',
      'string.pattern.base': 'Subject code must contain only uppercase letters and numbers',
      'any.required': 'Subject code is required'
    }),
  
  subject_name: Joi.string()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.min': 'Subject name must be at least 2 characters long',
      'string.max': 'Subject name cannot exceed 255 characters',
      'any.required': 'Subject name is required'
    }),
  
  subject_type: Joi.string()
    .valid('theory', 'lab')
    .required()
    .messages({
      'any.only': 'Subject type must be either theory or lab',
      'any.required': 'Subject type is required'
    }),
  
  semester: Joi.number()
    .integer()
    .min(1)
    .max(8)
    .required()
    .messages({
      'number.base': 'Semester must be a number',
      'number.integer': 'Semester must be an integer',
      'number.min': 'Semester must be at least 1',
      'number.max': 'Semester cannot exceed 8',
      'any.required': 'Semester is required'
    }),
  
  credits: Joi.number()
    .integer()
    .min(1)
    .max(6)
    .optional()
    .default(3)
    .messages({
      'number.base': 'Credits must be a number',
      'number.integer': 'Credits must be an integer',
      'number.min': 'Credits must be at least 1',
      'number.max': 'Credits cannot exceed 6'
    })
});

// Subject update validation schema
const subjectUpdateSchema = Joi.object({
  subject_code: Joi.string()
    .min(2)
    .max(10)
    .pattern(/^[A-Z0-9]+$/)
    .optional()
    .messages({
      'string.min': 'Subject code must be at least 2 characters long',
      'string.max': 'Subject code cannot exceed 10 characters',
      'string.pattern.base': 'Subject code must contain only uppercase letters and numbers'
    }),
  
  subject_name: Joi.string()
    .min(2)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Subject name must be at least 2 characters long',
      'string.max': 'Subject name cannot exceed 255 characters'
    }),
  
  subject_type: Joi.string()
    .valid('theory', 'lab')
    .optional()
    .messages({
      'any.only': 'Subject type must be either theory or lab'
    }),
  
  semester: Joi.number()
    .integer()
    .min(1)
    .max(8)
    .optional()
    .messages({
      'number.base': 'Semester must be a number',
      'number.integer': 'Semester must be an integer',
      'number.min': 'Semester must be at least 1',
      'number.max': 'Semester cannot exceed 8'
    }),
  
  credits: Joi.number()
    .integer()
    .min(1)
    .max(6)
    .optional()
    .messages({
      'number.base': 'Credits must be a number',
      'number.integer': 'Credits must be an integer',
      'number.min': 'Credits must be at least 1',
      'number.max': 'Credits cannot exceed 6'
    })
});

// Faculty assignment validation schema
const facultyAssignmentSchema = Joi.object({
  faculty_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Faculty ID must be a number',
      'number.integer': 'Faculty ID must be an integer',
      'number.positive': 'Faculty ID must be positive',
      'any.required': 'Faculty ID is required'
    }),
  
  academic_year: Joi.number()
    .integer()
    .min(2020)
    .max(new Date().getFullYear() + 5)
    .optional()
    .default(new Date().getFullYear())
    .messages({
      'number.base': 'Academic year must be a number',
      'number.integer': 'Academic year must be an integer',
      'number.min': 'Academic year must be at least 2020',
      'number.max': `Academic year cannot exceed ${new Date().getFullYear() + 5}`
    })
});

/**
 * Academic data validation functions
 */
const validateMarksEntry = (data) => {
  return marksEntrySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateMarksUpdate = (data) => {
  return marksUpdateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateAttendanceEntry = (data) => {
  return attendanceEntrySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateAttendanceUpdate = (data) => {
  return attendanceUpdateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateSubjectCreation = (data) => {
  return subjectCreationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateSubjectUpdate = (data) => {
  return subjectUpdateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateFacultyAssignment = (data) => {
  return facultyAssignmentSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

/**
 * Enhanced validation functions with comprehensive error handling
 */

/**
 * Validate marks with range checking and error recovery
 */
const validateMarksWithRecovery = (data) => {
  try {
    const result = marksEntrySchema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (result.error) {
      return {
        success: false,
        errors: result.error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          suggestion: getMarksSuggestion(detail)
        }))
      };
    }

    // Additional business logic validation
    const { marks_obtained, max_marks, exam_type } = result.value;
    const businessErrors = [];

    // Check marks range based on exam type
    let maxAllowed = max_marks;
    if (exam_type === 'series_test_1' || exam_type === 'series_test_2') {
      maxAllowed = Math.min(max_marks, 50);
    } else if (exam_type === 'lab_internal') {
      maxAllowed = Math.min(max_marks, 50);
    }

    if (marks_obtained > maxAllowed) {
      businessErrors.push({
        field: 'marks_obtained',
        message: `Marks cannot exceed ${maxAllowed} for ${exam_type.replace('_', ' ')}`,
        suggestion: `Please enter marks between 0 and ${maxAllowed}`,
        maxAllowed
      });
    }

    if (businessErrors.length > 0) {
      return {
        success: false,
        errors: businessErrors
      };
    }

    return {
      success: true,
      data: result.value
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: '_system',
        message: 'Validation system error',
        suggestion: 'Please try again or contact support'
      }]
    };
  }
};

/**
 * Validate attendance with percentage calculation and warnings
 */
const validateAttendanceWithRecovery = (data) => {
  try {
    const result = attendanceEntrySchema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (result.error) {
      return {
        success: false,
        errors: result.error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          suggestion: getAttendanceSuggestion(detail)
        }))
      };
    }

    const { attended_classes, total_classes } = result.value;
    const businessErrors = [];
    const warnings = [];

    // Business logic validation
    if (attended_classes > total_classes) {
      businessErrors.push({
        field: 'attended_classes',
        message: 'Attended classes cannot exceed total classes',
        suggestion: `Please enter a value between 0 and ${total_classes}`
      });
    }

    // Calculate percentage and add warnings
    const percentage = total_classes > 0 ? (attended_classes / total_classes) * 100 : 0;
    
    if (percentage < 75) {
      warnings.push({
        field: 'attendance_percentage',
        message: `Attendance is ${percentage.toFixed(1)}% which is below the required 75%`,
        suggestion: 'Student may need to improve attendance to meet requirements'
      });
    }

    if (businessErrors.length > 0) {
      return {
        success: false,
        errors: businessErrors
      };
    }

    return {
      success: true,
      data: {
        ...result.value,
        attendance_percentage: Math.round(percentage * 100) / 100
      },
      warnings
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: '_system',
        message: 'Validation system error',
        suggestion: 'Please try again or contact support'
      }]
    };
  }
};

/**
 * Helper functions for generating suggestions
 */
const getMarksSuggestion = (detail) => {
  switch (detail.type) {
    case 'number.min':
      return 'Marks cannot be negative';
    case 'number.max':
      return `Please enter marks within the allowed range`;
    case 'number.base':
      return 'Please enter a valid number for marks';
    case 'any.required':
      return 'Please provide the marks obtained';
    default:
      return 'Please check the marks value';
  }
};

const getAttendanceSuggestion = (detail) => {
  switch (detail.type) {
    case 'number.min':
      return 'Attendance values cannot be negative';
    case 'number.base':
      return 'Please enter a valid number for attendance';
    case 'any.required':
      return 'Please provide attendance information';
    default:
      return 'Please check the attendance values';
  }
};

/**
 * Comprehensive input sanitization
 */
const sanitizeAndValidate = (data, schema) => {
  try {
    // First, sanitize string inputs
    const sanitizedData = sanitizeInputData(data);
    
    // Then validate with schema
    const result = schema.validate(sanitizedData, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    return result;
  } catch (error) {
    return {
      error: {
        details: [{
          message: 'Data processing error',
          type: 'system.error',
          path: ['_system']
        }]
      }
    };
  }
};

/**
 * Sanitize input data to prevent injection attacks
 */
const sanitizeInputData = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInputData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Validate file uploads with comprehensive checks
 */
const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  const errors = [];

  try {
    if (!file) {
      return { success: true, errors: [] };
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push({
        field: 'file_type',
        message: `File type ${file.mimetype} is not allowed`,
        suggestion: `Please upload one of: ${allowedTypes.join(', ')}`
      });
    }

    // Check file extension
    const fileName = file.originalname.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      errors.push({
        field: 'file_extension',
        message: 'File extension is not allowed',
        suggestion: `Please use one of: ${allowedExtensions.join(', ')}`
      });
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push({
        field: 'file_size',
        message: `File size ${fileSizeMB}MB exceeds maximum ${maxSizeMB}MB`,
        suggestion: `Please compress the file or choose a smaller one`
      });
    }

    // Check for empty file
    if (file.size === 0) {
      errors.push({
        field: 'file_size',
        message: 'File appears to be empty',
        suggestion: 'Please select a valid file'
      });
    }

    return {
      success: errors.length === 0,
      errors,
      fileInfo: {
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: '_system',
        message: 'File validation error',
        suggestion: 'Please try uploading the file again'
      }]
    };
  }
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  userCreationSchema,
  profileUpdateSchema,
  marksEntrySchema,
  marksUpdateSchema,
  attendanceEntrySchema,
  attendanceUpdateSchema,
  subjectCreationSchema,
  subjectUpdateSchema,
  facultyAssignmentSchema,
  validate,
  validateUserInput,
  validateProfileUpdate,
  validateMarksEntry,
  validateMarksUpdate,
  validateAttendanceEntry,
  validateAttendanceUpdate,
  validateSubjectCreation,
  validateSubjectUpdate,
  validateFacultyAssignment,
  validateMarksWithRecovery,
  validateAttendanceWithRecovery,
  sanitizeAndValidate,
  sanitizeInputData,
  validateFileUpload
};