const jwt = require('jsonwebtoken');

/**
 * JWT token utilities
 */

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload (usually user data)
 * @param {string} expiresIn - Token expiration time (default: 24h)
 * @returns {string} JWT token
 */
const generateAccessToken = (payload, expiresIn = '24h') => {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn,
      issuer: 'visiongrade',
      audience: 'visiongrade-users'
    });
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time (default: 7d)
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload, expiresIn = '7d') => {
  try {
    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn,
      issuer: 'visiongrade',
      audience: 'visiongrade-users'
    });
    return token;
  } catch (error) {
    console.error('Refresh token generation error:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {boolean} isRefreshToken - Whether this is a refresh token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token, isRefreshToken = false) => {
  try {
    const secret = isRefreshToken ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret, {
      issuer: 'visiongrade',
      audience: 'visiongrade-users'
    });
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    throw error; // Re-throw to handle specific JWT errors in middleware
  }
};

/**
 * Generate password reset token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time (default: 1h)
 * @returns {string} Password reset token
 */
const generatePasswordResetToken = (payload, expiresIn = '1h') => {
  try {
    const token = jwt.sign(payload, process.env.JWT_RESET_SECRET, {
      expiresIn,
      issuer: 'visiongrade',
      audience: 'visiongrade-password-reset'
    });
    return token;
  } catch (error) {
    console.error('Password reset token generation error:', error);
    throw new Error('Failed to generate password reset token');
  }
};

/**
 * Verify password reset token
 * @param {string} token - Password reset token
 * @returns {Object} Decoded token payload
 */
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET, {
      issuer: 'visiongrade',
      audience: 'visiongrade-password-reset'
    });
    return decoded;
  } catch (error) {
    console.error('Password reset token verification error:', error);
    throw error;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generatePasswordResetToken,
  verifyPasswordResetToken
};