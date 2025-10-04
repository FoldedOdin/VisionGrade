#!/usr/bin/env node

/**
 * Create Default Administrator Script
 * 
 * This script creates a default administrator account for VisionGrade with predefined credentials.
 * This is useful for development, testing, and quick setup scenarios.
 * 
 * Default Credentials:
 * - Email: admin@visiongrade.com
 * - Password: Admin@123
 * - Name: System Administrator
 * 
 * Usage: node scripts/create-default-admin.js
 */

require('dotenv').config();
const { User, Faculty } = require('../models');
const { hashPassword } = require('../utils/password');
const { generateUniqueId } = require('../utils/idGenerator');

// Default admin credentials
const DEFAULT_ADMIN = {
  email: 'admin@visiongrade.com',
  password: 'Admin@123',
  facultyName: 'System Administrator',
  department: 'Administration',
  phone: '+1-234-567-8900'
};

async function createDefaultAdmin() {
  try {
    console.log('🔐 VisionGrade - Creating Default Administrator');
    console.log('===============================================\n');

    // Check if any admin already exists
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('ℹ️  An administrator account already exists.');
      console.log('   Checking if default admin exists...\n');
      
      const defaultAdmin = await User.findOne({
        where: { 
          email: DEFAULT_ADMIN.email,
          role: 'admin' 
        }
      });

      if (defaultAdmin) {
        console.log('✅ Default administrator already exists!');
        console.log('===============================================');
        console.log(`📧 Email: ${DEFAULT_ADMIN.email}`);
        console.log(`🔑 Password: ${DEFAULT_ADMIN.password}`);
        console.log(`🆔 Admin ID: ${defaultAdmin.unique_id}`);
        console.log('===============================================\n');
        console.log('🎉 You can log in using these credentials.');
        return;
      } else {
        console.log('⚠️  Default admin does not exist, but other admins do.');
        console.log('   Use the existing admin account or admin dashboard to create new admins.');
        return;
      }
    }

    // Check if user with default email already exists (but not admin)
    const existingUser = await User.findOne({
      where: { email: DEFAULT_ADMIN.email }
    });

    if (existingUser) {
      console.log('❌ A user with the default admin email already exists but is not an admin.');
      console.log('   Please use the interactive script: node scripts/create-first-admin.js');
      return;
    }

    console.log('⏳ Creating default administrator account...');

    // Generate unique ID
    const uniqueId = await generateUniqueId('admin', { 
      departmentCode: 'ADM' 
    });

    // Hash password
    const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);

    // Create admin user
    const user = await User.create({
      unique_id: uniqueId,
      email: DEFAULT_ADMIN.email,
      phone: DEFAULT_ADMIN.phone,
      password_hash: hashedPassword,
      role: 'admin'
    });

    // Create faculty record
    await Faculty.create({
      user_id: user.id,
      faculty_name: DEFAULT_ADMIN.facultyName,
      department: DEFAULT_ADMIN.department,
      is_tutor: false,
      tutor_semester: null
    });

    console.log('\n✅ Default administrator account created successfully!');
    console.log('===============================================');
    console.log(`📧 Email: ${DEFAULT_ADMIN.email}`);
    console.log(`🔑 Password: ${DEFAULT_ADMIN.password}`);
    console.log(`🆔 Admin ID: ${uniqueId}`);
    console.log(`👤 Name: ${DEFAULT_ADMIN.facultyName}`);
    console.log(`🏢 Department: ${DEFAULT_ADMIN.department}`);
    console.log('===============================================\n');

    console.log('🔒 SECURITY NOTICE:');
    console.log('   - These are default credentials for initial setup');
    console.log('   - Please change the password after first login');
    console.log('   - Consider creating additional admin accounts');
    console.log('   - Delete this default account in production environments\n');

    console.log('🎉 Setup complete! You can now log in to VisionGrade.');
    console.log('   Use either the email or admin ID to log in.');

  } catch (error) {
    console.error('\n❌ Error creating default administrator account:');
    console.error('   ', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.error('\n💡 Database connection failed. Please ensure:');
      console.error('   - PostgreSQL is running');
      console.error('   - Database credentials in .env are correct');
      console.error('   - Database exists and is accessible');
    } else if (error.name === 'SequelizeValidationError') {
      console.error('\n💡 Validation error details:');
      if (error.errors) {
        error.errors.forEach(err => {
          console.error(`   - ${err.path}: ${err.message}`);
        });
      }
      console.error('\n   Please check:');
      console.error('   - Database schema is up to date');
      console.error('   - All required fields are provided');
      console.error('   - Field formats match validation rules');
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('\n💡 Unique constraint violation:');
      if (error.errors) {
        error.errors.forEach(err => {
          console.error(`   - ${err.path}: ${err.message}`);
        });
      }
    }
    
    console.error('\nFull error details:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n❌ Setup cancelled by user.');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
createDefaultAdmin();