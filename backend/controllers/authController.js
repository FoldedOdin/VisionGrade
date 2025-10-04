const { User, Student, Faculty } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, generatePasswordResetToken, verifyPasswordResetToken } = require('../utils/jwt');
const { generateUniqueId } = require('../utils/idGenerator');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

/**
 * Authentication Controller
 * Handles user registration, login, password reset, and profile management
 */

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      role,
      studentName,
      facultyName,
      semester,
      batchYear,
      department,
      isTutor,
      tutorSemester
    } = req.body;

    // Security: Prevent admin role creation through public signup
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: 'Administrator accounts cannot be created through public registration',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate allowed roles
    const allowedRoles = ['student', 'faculty'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Invalid role specified',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email or phone already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate unique ID
    const additionalData = {};
    if (role === 'student' && batchYear) {
      additionalData.batchYear = batchYear;
    }
    if ((role === 'faculty' || role === 'tutor') && department) {
      additionalData.departmentCode = department.substring(0, 3);
    }

    const uniqueId = await generateUniqueId(role, additionalData);

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      unique_id: uniqueId,
      email,
      phone: phone || null,
      password_hash: hashedPassword,
      role
    });

    // Create role-specific record
    if (role === 'student') {
      await Student.create({
        user_id: user.id,
        student_name: studentName,
        semester,
        batch_year: batchYear
      });
    } else if (role === 'faculty' || role === 'tutor') {
      await Faculty.create({
        user_id: user.id,
        faculty_name: facultyName,
        department: department || null,
        is_tutor: role === 'tutor' || isTutor || false,
        tutor_semester: tutorSemester || null
      });
    }

    // Send welcome email
    const userName = studentName || facultyName || 'User';
    await emailService.sendWelcomeEmail(email, userName, uniqueId, role);

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Return success response (exclude password)
    const userResponse = {
      id: user.id,
      unique_id: user.unique_id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile_photo: user.profile_photo,
      created_at: user.created_at
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: '24h'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Failed to register user',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * User login with multi-channel support (ID, email, phone)
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by ID, email, or phone
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { unique_id: identifier },
          { email: identifier },
          { phone: identifier }
        ]
      },
      include: [
        {
          model: Student,
          as: 'studentProfile',
          required: false
        },
        {
          model: Faculty,
          as: 'facultyProfile',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Prepare user response
    const userResponse = {
      id: user.id,
      unique_id: user.unique_id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile_photo: user.profile_photo,
      created_at: user.created_at
    };

    // Add role-specific data
    if (user.studentProfile) {
      userResponse.student_details = {
        student_name: user.studentProfile.student_name,
        semester: user.studentProfile.semester,
        batch_year: user.studentProfile.batch_year,
        graduation_status: user.studentProfile.graduation_status
      };
    }

    if (user.facultyProfile) {
      userResponse.faculty_details = {
        faculty_name: user.facultyProfile.faculty_name,
        department: user.facultyProfile.department,
        is_tutor: user.facultyProfile.is_tutor,
        tutor_semester: user.facultyProfile.tutor_semester
      };
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: '24h'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'Login failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Forgot password - send reset email/SMS
 */
const forgotPassword = async (req, res) => {
  try {
    const { identifier, resetMethod } = req.body;

    // Find user by email or phone
    const whereClause = resetMethod === 'email' 
      ? { email: identifier }
      : { phone: identifier };

    const user = await User.findOne({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'studentProfile',
          required: false
        },
        {
          model: Faculty,
          as: 'facultyProfile',
          required: false
        }
      ]
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: `If an account with this ${resetMethod} exists, you will receive a password reset link.`,
        timestamp: new Date().toISOString()
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken({ 
      userId: user.id, 
      email: user.email 
    });

    // Get user name
    const userName = user.studentProfile?.student_name || user.facultyProfile?.faculty_name || 'User';

    if (resetMethod === 'email') {
      // Send reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email, 
        resetToken, 
        userName
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'EMAIL_SEND_ERROR',
            message: 'Failed to send reset email',
            timestamp: new Date().toISOString()
          }
        });
      }
    } else {
      // TODO: Implement SMS service for phone reset
      // For now, return error for phone reset
      return res.status(501).json({
        success: false,
        error: {
          code: 'SMS_NOT_IMPLEMENTED',
          message: 'SMS password reset is not yet implemented',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: `Password reset instructions have been sent to your ${resetMethod}.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FORGOT_PASSWORD_ERROR',
        message: 'Failed to process password reset request',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Reset password using token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = verifyPasswordResetToken(token);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await user.update({
      password_hash: hashedPassword
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_PASSWORD_ERROR',
        message: 'Failed to reset password',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Change password (authenticated user)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await user.update({
      password_hash: hashedPassword
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHANGE_PASSWORD_ERROR',
        message: 'Failed to change password',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Student,
          as: 'studentProfile',
          required: false
        },
        {
          model: Faculty,
          as: 'facultyProfile',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: { user },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_ERROR',
        message: 'Failed to get user profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Create admin user (admin-only endpoint)
 */
const createAdmin = async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      facultyName,
      department
    } = req.body;

    // Check if requesting user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only administrators can create admin accounts',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email or phone already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate unique ID for admin
    const uniqueId = await generateUniqueId('admin', { departmentCode: department?.substring(0, 3) });

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const user = await User.create({
      unique_id: uniqueId,
      email,
      phone: phone || null,
      password_hash: hashedPassword,
      role: 'admin'
    });

    // Create faculty record for admin (admins are typically faculty members)
    await Faculty.create({
      user_id: user.id,
      faculty_name: facultyName,
      department: department || null,
      is_tutor: false,
      tutor_semester: null
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(email, facultyName, uniqueId, 'admin');

    // Return success response (exclude password)
    const userResponse = {
      id: user.id,
      unique_id: user.unique_id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile_photo: user.profile_photo,
      created_at: user.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Administrator account created successfully',
      data: { user: userResponse },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ADMIN_ERROR',
        message: 'Failed to create administrator account',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Get user with role-specific data
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Student,
          as: 'studentProfile',
          required: false
        },
        {
          model: Faculty,
          as: 'facultyProfile',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update user table
    const userUpdates = {};
    if (updates.email) userUpdates.email = updates.email;
    if (updates.phone !== undefined) userUpdates.phone = updates.phone;

    if (Object.keys(userUpdates).length > 0) {
      await user.update(userUpdates);
    }

    // Update role-specific data
    if (user.role === 'student' && user.studentProfile) {
      const studentUpdates = {};
      if (updates.studentName) studentUpdates.student_name = updates.studentName;
      if (updates.semester) studentUpdates.semester = updates.semester;
      if (updates.batchYear) studentUpdates.batch_year = updates.batchYear;

      if (Object.keys(studentUpdates).length > 0) {
        await user.studentProfile.update(studentUpdates);
      }
    }

    if ((user.role === 'faculty' || user.role === 'tutor') && user.facultyProfile) {
      const facultyUpdates = {};
      if (updates.facultyName) facultyUpdates.faculty_name = updates.facultyName;
      if (updates.department !== undefined) facultyUpdates.department = updates.department;

      if (Object.keys(facultyUpdates).length > 0) {
        await user.facultyProfile.update(facultyUpdates);
      }
    }

    // Get updated user data
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Student,
          as: 'studentProfile',
          required: false
        },
        {
          model: Faculty,
          as: 'facultyProfile',
          required: false
        }
      ]
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PROFILE_ERROR',
        message: 'Failed to update profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  createAdmin
};