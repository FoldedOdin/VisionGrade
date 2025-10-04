const nodemailer = require('nodemailer');

/**
 * Email service for sending notifications and password reset emails
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      // Skip initialization if email credentials are not provided
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('📧 Email service disabled - SMTP credentials not provided');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration only if transporter is created
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email service configuration error:', error);
        } else {
          console.log('📧 Email service is ready to send messages');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's name
   * @returns {Promise<boolean>} Success status
   */
  async sendPasswordResetEmail(email, resetToken, userName) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: {
          name: 'VisionGrade SPAS',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Password Reset Request - VisionGrade',
        html: this.getPasswordResetTemplate(userName, resetUrl, resetToken)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new users
   * @param {string} email - Recipient email
   * @param {string} userName - User's name
   * @param {string} uniqueId - Generated unique ID
   * @param {string} role - User role
   * @returns {Promise<boolean>} Success status
   */
  async sendWelcomeEmail(email, userName, uniqueId, role) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: {
          name: 'VisionGrade SPAS',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Welcome to VisionGrade - Your Account Details',
        html: this.getWelcomeTemplate(userName, uniqueId, role)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Get password reset email template
   * @param {string} userName - User's name
   * @param {string} resetUrl - Password reset URL
   * @param {string} resetToken - Reset token for fallback
   * @returns {string} HTML email template
   */
  getPasswordResetTemplate(userName, resetUrl, resetToken) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - VisionGrade</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 VisionGrade</h1>
            <p>Student Performance Analysis System</p>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password for your VisionGrade account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <p>If you continue to have problems, please contact your system administrator.</p>
            
            <p>Best regards,<br>The VisionGrade Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} VisionGrade SPAS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get welcome email template
   * @param {string} userName - User's name
   * @param {string} uniqueId - Generated unique ID
   * @param {string} role - User role
   * @returns {string} HTML email template
   */
  getWelcomeTemplate(userName, uniqueId, role) {
    const roleDisplayName = {
      'student': 'Student',
      'faculty': 'Faculty Member',
      'tutor': 'Tutor',
      'admin': 'Administrator'
    }[role] || 'User';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to VisionGrade</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .id-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .id-number { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to VisionGrade!</h1>
            <p>Student Performance Analysis System</p>
          </div>
          <div class="content">
            <h2>Account Created Successfully</h2>
            <p>Hello ${userName},</p>
            <p>Welcome to VisionGrade! Your account has been successfully created as a <strong>${roleDisplayName}</strong>.</p>
            
            <div class="id-box">
              <p>Your Unique ID:</p>
              <div class="id-number">${uniqueId}</div>
              <p style="margin-top: 10px; font-size: 14px; color: #666;">
                Save this ID - you can use it to log in along with your email or phone number
              </p>
            </div>
            
            <div class="info-box">
              <h3>🚀 Getting Started</h3>
              <ul>
                <li>You can log in using your email, phone number, or unique ID</li>
                <li>Complete your profile information after logging in</li>
                <li>Explore your dashboard to access all features</li>
                ${role === 'student' ? '<li>View your marks, attendance, and predicted performance</li>' : ''}
                ${role === 'faculty' || role === 'tutor' ? '<li>Manage your assigned subjects and student data</li>' : ''}
                ${role === 'admin' ? '<li>Access administrative tools and user management</li>' : ''}
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
            
            <p>Best regards,<br>The VisionGrade Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} VisionGrade SPAS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
module.exports = new EmailService();