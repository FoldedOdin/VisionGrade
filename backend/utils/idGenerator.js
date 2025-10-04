const { User } = require('../models');

/**
 * Auto-ID generation utilities for different user roles
 */

/**
 * Generate unique ID for different user roles
 * @param {string} role - User role (student, faculty, admin)
 * @param {Object} additionalData - Additional data for ID generation
 * @returns {Promise<string>} Generated unique ID
 */
const generateUniqueId = async (role, additionalData = {}) => {
  let prefix = '';
  let idLength = 8;
  
  switch (role.toLowerCase()) {
    case 'student':
      prefix = 'STU';
      idLength = 10; // STU + 7 digits
      break;
    case 'faculty':
      prefix = 'FAC';
      idLength = 10; // FAC + 7 digits
      break;
    case 'tutor':
      prefix = 'TUT';
      idLength = 10; // TUT + 7 digits
      break;
    case 'admin':
      prefix = 'ADM';
      idLength = 10; // ADM + 7 digits
      break;
    default:
      prefix = 'USR';
      idLength = 10; // USR + 7 digits
  }

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const uniqueId = await generateIdWithPrefix(prefix, idLength - prefix.length, additionalData);
    
    // Check if ID already exists
    const existingUser = await User.findOne({
      where: { unique_id: uniqueId }
    });

    if (!existingUser) {
      return uniqueId;
    }

    attempts++;
  }

  throw new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
};

/**
 * Generate ID with prefix and additional logic
 * @param {string} prefix - ID prefix
 * @param {number} numberLength - Length of numeric part
 * @param {Object} additionalData - Additional data for ID generation
 * @returns {Promise<string>} Generated ID
 */
const generateIdWithPrefix = async (prefix, numberLength, additionalData) => {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2); // Last 2 digits of year
  
  // For students, include batch year if provided
  if (prefix === 'STU' && additionalData.batchYear) {
    const batchSuffix = additionalData.batchYear.toString().slice(-2);
    const randomNum = generateRandomNumber(numberLength - 2); // Subtract 2 for batch year
    return `${prefix}${batchSuffix}${randomNum}`;
  }
  
  // For faculty, include department code if provided
  if ((prefix === 'FAC' || prefix === 'TUT') && additionalData.departmentCode) {
    const deptCode = additionalData.departmentCode.toUpperCase().slice(0, 2);
    const randomNum = generateRandomNumber(numberLength - 2); // Subtract 2 for dept code
    return `${prefix}${deptCode}${randomNum}`;
  }
  
  // Default: prefix + year + random number
  const randomNum = generateRandomNumber(numberLength - 2); // Subtract 2 for year
  return `${prefix}${yearSuffix}${randomNum}`;
};

/**
 * Generate random number string
 * @param {number} length - Length of random number
 * @returns {string} Random number string
 */
const generateRandomNumber = (length) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNum.toString().padStart(length, '0');
};

/**
 * Validate unique ID format
 * @param {string} uniqueId - ID to validate
 * @param {string} expectedRole - Expected role for the ID
 * @returns {Object} Validation result
 */
const validateUniqueIdFormat = (uniqueId, expectedRole = null) => {
  const errors = [];
  
  if (!uniqueId || typeof uniqueId !== 'string') {
    errors.push('Unique ID is required and must be a string');
    return { isValid: false, errors };
  }

  // Check minimum length
  if (uniqueId.length < 6) {
    errors.push('Unique ID must be at least 6 characters long');
  }

  // Check if it starts with valid prefix
  const validPrefixes = ['STU', 'FAC', 'TUT', 'ADM', 'USR'];
  const prefix = uniqueId.substring(0, 3);
  
  if (!validPrefixes.includes(prefix)) {
    errors.push(`Invalid prefix. Must start with one of: ${validPrefixes.join(', ')}`);
  }

  // If expected role is provided, validate prefix matches role
  if (expectedRole) {
    const expectedPrefix = getRolePrefixMap()[expectedRole.toLowerCase()];
    if (expectedPrefix && prefix !== expectedPrefix) {
      errors.push(`ID prefix '${prefix}' does not match expected role '${expectedRole}'`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    prefix,
    role: getPrefixRoleMap()[prefix] || 'unknown'
  };
};

/**
 * Get role to prefix mapping
 * @returns {Object} Role to prefix mapping
 */
const getRolePrefixMap = () => ({
  'student': 'STU',
  'faculty': 'FAC',
  'tutor': 'TUT',
  'admin': 'ADM'
});

/**
 * Get prefix to role mapping
 * @returns {Object} Prefix to role mapping
 */
const getPrefixRoleMap = () => ({
  'STU': 'student',
  'FAC': 'faculty',
  'TUT': 'tutor',
  'ADM': 'admin',
  'USR': 'user'
});

module.exports = {
  generateUniqueId,
  validateUniqueIdFormat,
  getRolePrefixMap,
  getPrefixRoleMap
};