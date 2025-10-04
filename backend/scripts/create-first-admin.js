#!/usr/bin/env node

/**
 * Create First Administrator Script
 * 
 * This script creates the initial administrator account for VisionGrade.
 * It should only be run once during initial system setup.
 * 
 * Usage: node scripts/create-first-admin.js
 */

const readline = require('readline');
const { User, Faculty } = require('../models');
const { hashPassword } = require('../utils/password');
const { generateUniqueId } = require('../utils/idGenerator');
const emailService = require('../services/emailService');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Hide password input
const hiddenQuestion = (prompt) => {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
};

async function createFirstAdmin() {
  try {
    console.log('🔐 VisionGrade - First Administrator Setup');
    console.log('==========================================\n');

    // Check if any admin already exists
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('❌ An administrator account already exists.');
      console.log('   Use the admin panel to create additional administrators.');
      process.exit(1);
    }

    console.log('This script will create the first administrator account for VisionGrade.');
    console.log('Please provide the following information:\n');

    // Collect admin details
    const email = await question('📧 Administrator Email: ');
    const phone = await question('📱 Phone Number (optional): ');
    const facultyName = await question('👤 Full Name: ');
    const department = await question('🏢 Department (optional): ');
    
    console.log('🔒 Password Requirements:');
    console.log('   - At least 8 characters');
    console.log('   - Must contain uppercase, lowercase, number, and special character\n');
    
    const password = await hiddenQuestion('🔑 Password: ');
    const confirmPassword = await hiddenQuestion('🔑 Confirm Password: ');

    // Validate inputs
    if (!email || !facultyName || !password) {
      console.log('\n❌ Email, name, and password are required.');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match.');
      process.exit(1);
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (password.length < 8 || !passwordRegex.test(password)) {
      console.log('\n❌ Password does not meet requirements.');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      console.log('\n❌ Invalid email format.');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      console.log('\n❌ A user with this email already exists.');
      process.exit(1);
    }

    console.log('\n⏳ Creating administrator account...');

    // Generate unique ID
    const uniqueId = await generateUniqueId('admin', { 
      departmentCode: department?.substring(0, 3) 
    });

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

    // Create faculty record
    await Faculty.create({
      user_id: user.id,
      faculty_name: facultyName,
      department: department || null,
      is_tutor: false,
      tutor_semester: null
    });

    console.log('\n✅ Administrator account created successfully!');
    console.log('==========================================');
    console.log(`📧 Email: ${email}`);
    console.log(`🆔 Admin ID: ${uniqueId}`);
    console.log(`👤 Name: ${facultyName}`);
    if (department) console.log(`🏢 Department: ${department}`);
    console.log('==========================================\n');

    // Try to send welcome email
    try {
      await emailService.sendWelcomeEmail(email, facultyName, uniqueId, 'admin');
      console.log('📧 Welcome email sent successfully.');
    } catch (emailError) {
      console.log('⚠️  Welcome email could not be sent (email service may not be configured).');
    }

    console.log('\n🎉 Setup complete! You can now log in to VisionGrade with your administrator account.');
    console.log('   Use either your email or admin ID to log in.');

  } catch (error) {
    console.error('\n❌ Error creating administrator account:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n❌ Setup cancelled by user.');
  rl.close();
  process.exit(1);
});

// Run the script
createFirstAdmin();