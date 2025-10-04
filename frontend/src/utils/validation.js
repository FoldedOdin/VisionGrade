// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email);
};

// Phone validation (10 digits)
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

// Password strength validation
export const validatePassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  return {
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    checks: {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  };
};

// Name validation (letters and spaces only)
export const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s]+$/;
  return nameRegex.test(name) && name.trim().length >= 2;
};

// ID validation (alphanumeric, minimum 3 characters)
export const validateId = (id) => {
  const idRegex = /^[a-zA-Z0-9]+$/;
  return idRegex.test(id) && id.length >= 3;
};

// File validation for profile photos
export const validateProfilePhoto = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  const errors = [];

  if (!file) {
    return { isValid: true, errors: [] };
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
  }

  if (file.size > maxSize) {
    errors.push('Image size should be less than 5MB');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Form validation rules for react-hook-form
export const validationRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  },

  phone: {
    required: 'Phone number is required',
    pattern: {
      value: /^[0-9]{10}$/,
      message: 'Phone number must be 10 digits'
    }
  },

  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters'
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: 'Password must contain uppercase, lowercase, number and special character'
    }
  },

  fullName: {
    required: 'Full name is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters'
    },
    pattern: {
      value: /^[a-zA-Z\s]+$/,
      message: 'Name can only contain letters and spaces'
    }
  },

  id: {
    required: 'ID is required',
    minLength: {
      value: 3,
      message: 'ID must be at least 3 characters'
    },
    pattern: {
      value: /^[a-zA-Z0-9]+$/,
      message: 'ID can only contain letters and numbers'
    }
  },

  role: {
    required: 'Please select your role'
  }
};

// Dynamic validation rules based on login type
export const getLoginValidationRules = (loginType) => {
  switch (loginType) {
    case 'email':
      return validationRules.email;
    case 'phone':
      return validationRules.phone;
    default:
      return validationRules.id;
  }
};

// Password confirmation validation
export const getPasswordConfirmationRules = (password) => ({
  required: 'Please confirm your password',
  validate: value => value === password || 'Passwords do not match'
});

// Real-time validation helpers with enhanced error handling
export const getFieldError = (fieldName, value, rules) => {
  try {
    // Handle null/undefined rules
    if (!rules || typeof rules !== 'object') {
      return null;
    }

    // Required field validation
    if (rules.required) {
      if (value === null || value === undefined) {
        return typeof rules.required === 'string' ? rules.required : `${fieldName} is required`;
      }
      
      if (typeof value === 'string' && value.trim() === '') {
        return typeof rules.required === 'string' ? rules.required : `${fieldName} is required`;
      }
      
      if (Array.isArray(value) && value.length === 0) {
        return typeof rules.required === 'string' ? rules.required : `${fieldName} is required`;
      }
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Minimum length validation
    if (rules.minLength && value) {
      const length = typeof value === 'string' ? value.length : String(value).length;
      if (length < rules.minLength.value) {
        return rules.minLength.message || `${fieldName} must be at least ${rules.minLength.value} characters`;
      }
    }

    // Maximum length validation
    if (rules.maxLength && value) {
      const length = typeof value === 'string' ? value.length : String(value).length;
      if (length > rules.maxLength.value) {
        return rules.maxLength.message || `${fieldName} cannot exceed ${rules.maxLength.value} characters`;
      }
    }

    // Pattern validation
    if (rules.pattern && value) {
      try {
        const regex = rules.pattern.value instanceof RegExp ? rules.pattern.value : new RegExp(rules.pattern.value);
        if (!regex.test(String(value))) {
          return rules.pattern.message || `${fieldName} format is invalid`;
        }
      } catch (regexError) {
        console.warn(`Invalid regex pattern for field ${fieldName}:`, regexError);
        return `Invalid validation pattern for ${fieldName}`;
      }
    }

    // Minimum value validation (for numbers)
    if (rules.min !== undefined && value !== null && value !== undefined) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue < rules.min.value) {
        return rules.min.message || `${fieldName} must be at least ${rules.min.value}`;
      }
    }

    // Maximum value validation (for numbers)
    if (rules.max !== undefined && value !== null && value !== undefined) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue > rules.max.value) {
        return rules.max.message || `${fieldName} cannot exceed ${rules.max.value}`;
      }
    }

    // Custom validation function
    if (rules.validate && typeof rules.validate === 'function') {
      try {
        const result = rules.validate(value);
        if (result !== true && typeof result === 'string') {
          return result;
        }
      } catch (validateError) {
        console.warn(`Custom validation error for field ${fieldName}:`, validateError);
        return `Validation error for ${fieldName}`;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error validating field ${fieldName}:`, error);
    return `Validation error occurred for ${fieldName}`;
  }
};

// Enhanced input sanitization to prevent XSS and other attacks
export const sanitizeInput = (input) => {
  try {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input !== 'string') {
      // Handle non-string inputs safely
      if (typeof input === 'number' || typeof input === 'boolean') {
        return input;
      }
      return String(input);
    }

    // Basic XSS prevention
    let sanitized = input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;');

    // Remove potentially dangerous patterns
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Limit length to prevent DoS attacks
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  } catch (error) {
    console.warn('Error sanitizing input:', error);
    return typeof input === 'string' ? input.replace(/[<>]/g, '') : input;
  }
};

// Format phone number for display
export const formatPhoneNumber = (phone) => {
  if (!phone || phone.length !== 10) return phone;
  
  return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
};

// Generate password strength indicator
export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: 'No password', color: 'gray' };

  const validation = validatePassword(password);
  const checks = validation.checks;
  const score = Object.values(checks).filter(Boolean).length;

  const strengthMap = {
    0: { strength: 0, label: 'Very Weak', color: 'red' },
    1: { strength: 20, label: 'Very Weak', color: 'red' },
    2: { strength: 40, label: 'Weak', color: 'orange' },
    3: { strength: 60, label: 'Fair', color: 'yellow' },
    4: { strength: 80, label: 'Good', color: 'blue' },
    5: { strength: 100, label: 'Strong', color: 'green' }
  };

  return strengthMap[score] || strengthMap[0];
};

// Enhanced validation for marks with range checking
export const validateMarks = (marks, examType, maxMarks) => {
  const errors = [];
  
  try {
    // Check if marks is a valid number
    const numMarks = Number(marks);
    if (isNaN(numMarks)) {
      errors.push('Marks must be a valid number');
      return { isValid: false, errors };
    }

    // Check for negative marks
    if (numMarks < 0) {
      errors.push('Marks cannot be negative');
    }

    // Check maximum marks based on exam type
    let maxAllowed = maxMarks || 100;
    
    if (examType === 'series_test_1' || examType === 'series_test_2') {
      maxAllowed = Math.min(maxAllowed, 50);
    } else if (examType === 'lab_internal') {
      maxAllowed = Math.min(maxAllowed, 50);
    } else if (examType === 'university') {
      maxAllowed = Math.min(maxAllowed, 100);
    }

    if (numMarks > maxAllowed) {
      errors.push(`Marks cannot exceed ${maxAllowed} for ${examType.replace('_', ' ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: Math.max(0, Math.min(numMarks, maxAllowed))
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Invalid marks format'],
      sanitizedValue: 0
    };
  }
};

// Enhanced attendance validation
export const validateAttendance = (attendedClasses, totalClasses) => {
  const errors = [];
  
  try {
    const attended = Number(attendedClasses);
    const total = Number(totalClasses);

    if (isNaN(attended) || isNaN(total)) {
      errors.push('Attendance values must be valid numbers');
      return { isValid: false, errors };
    }

    if (attended < 0 || total < 0) {
      errors.push('Attendance values cannot be negative');
    }

    if (attended > total) {
      errors.push('Attended classes cannot exceed total classes');
    }

    if (total === 0) {
      errors.push('Total classes must be greater than 0');
    }

    const percentage = total > 0 ? (attended / total) * 100 : 0;

    return {
      isValid: errors.length === 0,
      errors,
      percentage: Math.round(percentage * 100) / 100,
      sanitizedAttended: Math.max(0, Math.min(attended, total)),
      sanitizedTotal: Math.max(1, total)
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Invalid attendance format'],
      percentage: 0
    };
  }
};

// File size and type validation with detailed error messages
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    minWidth = 0,
    minHeight = 0,
    maxWidth = 5000,
    maxHeight = 5000
  } = options;

  const errors = [];

  if (!file) {
    return { isValid: true, errors: [] };
  }

  try {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      errors.push(`File extension is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`);
    }

    // Check for empty file
    if (file.size === 0) {
      errors.push('File appears to be empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Error validating file'],
      fileInfo: null
    };
  }
};

// Comprehensive form validation with recovery suggestions
export const validateFormData = (data, schema) => {
  const errors = {};
  const warnings = {};
  const suggestions = {};

  try {
    Object.keys(schema).forEach(fieldName => {
      const rules = schema[fieldName];
      const value = data[fieldName];
      
      const fieldError = getFieldError(fieldName, value, rules);
      if (fieldError) {
        errors[fieldName] = fieldError;
        
        // Add recovery suggestions
        if (rules.required && (!value || value.trim() === '')) {
          suggestions[fieldName] = `Please provide a value for ${fieldName}`;
        } else if (rules.pattern && value && !rules.pattern.value.test(value)) {
          suggestions[fieldName] = `Please check the format of ${fieldName}`;
        } else if (rules.minLength && value && value.length < rules.minLength.value) {
          suggestions[fieldName] = `Please enter at least ${rules.minLength.value} characters`;
        }
      }

      // Add warnings for potential issues
      if (value && typeof value === 'string') {
        if (value !== value.trim()) {
          warnings[fieldName] = 'Value has leading or trailing spaces';
        }
        
        if (value.length > 1000) {
          warnings[fieldName] = 'Value is unusually long';
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      suggestions,
      summary: {
        totalFields: Object.keys(schema).length,
        validFields: Object.keys(schema).length - Object.keys(errors).length,
        errorCount: Object.keys(errors).length,
        warningCount: Object.keys(warnings).length
      }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: { _form: 'Form validation error occurred' },
      warnings: {},
      suggestions: { _form: 'Please refresh the page and try again' },
      summary: { totalFields: 0, validFields: 0, errorCount: 1, warningCount: 0 }
    };
  }
};