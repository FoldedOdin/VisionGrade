# Default Administrator Setup

## 🔐 Default Admin Credentials

For quick setup and testing, VisionGrade includes a script to create a default administrator account with predefined credentials.

### Default Credentials

```
📧 Email: admin@visiongrade.com
🔑 Password: Admin@123
👤 Name: System Administrator
🏢 Department: Administration
📱 Phone: +1-234-567-8900
```

## 🚀 Quick Setup

### Step 1: Create Default Admin

Run the following command from the project root:

```bash
# Navigate to backend directory
cd backend

# Create default admin user
node scripts/create-default-admin.js
```

### Step 2: Login

You can now login using either:
- **Email**: `admin@visiongrade.com`
- **Admin ID**: Will be displayed after creation (e.g., `ADM2524636`)
- **Password**: `Admin@123`

### Step 3: Access Admin Dashboard

1. Login to the application
2. Navigate to the Admin Dashboard
3. Access all admin features:
   - User Management
   - Faculty Assignments
   - Subject Management
   - Tutor Assignment
   - System Announcements
   - Student Promotion

## 🔒 Security Considerations

### ⚠️ Important Security Notes

1. **Change Default Password**: Immediately change the password after first login
2. **Production Use**: Delete this default account in production environments
3. **Additional Admins**: Create additional admin accounts with unique credentials
4. **Access Control**: Monitor admin account usage and access logs

### Password Requirements

When changing the default password, ensure it meets these requirements:
- At least 8 characters
- Contains uppercase letter (A-Z)
- Contains lowercase letter (a-z)
- Contains number (0-9)
- Contains special character (@$!%*?&)

## 📋 Admin Features

### User Management
- Create, edit, and delete users
- Manage student and faculty accounts
- View user statistics and activity

### Faculty Assignments
- Assign subjects to faculty members
- Manage academic year assignments
- View faculty workload distribution

### Subject Management
- Create and manage subjects
- Set semester and credit information
- Organize subjects by type (theory/lab)

### System Administration
- Send system-wide announcements
- Promote students between semesters
- Graduate students
- Monitor system statistics

## 🛠️ Troubleshooting

### Common Issues

1. **Script Fails with Database Error**
   ```bash
   # Ensure PostgreSQL is running
   # Check database credentials in backend/.env
   # Verify database exists
   ```

2. **Admin Already Exists**
   ```
   If an admin already exists, the script will inform you.
   Use existing admin credentials or the interactive script.
   ```

3. **Login Issues**
   ```
   - Verify backend server is running on port 5000
   - Check network connectivity
   - Ensure credentials are typed correctly
   ```

### Alternative Setup Methods

If the default admin script doesn't work, you can use:

1. **Interactive Admin Creation**:
   ```bash
   node scripts/create-first-admin.js
   ```

2. **Manual Database Setup**:
   - Connect to PostgreSQL directly
   - Insert admin user manually
   - Hash password using bcrypt

## 📚 Related Documentation

- [Admin Setup Guide](backend/docs/ADMIN_SETUP.md)
- [Security Implementation](backend/docs/SECURITY_IMPLEMENTATION.md)
- [Authentication API](backend/docs/AUTHENTICATION.md)
- [User Management API](backend/docs/USER_MANAGEMENT_API.md)

## 🔄 Script Behavior

The `create-default-admin.js` script:

1. **Checks for existing admins** - Won't create if admin already exists
2. **Validates email uniqueness** - Prevents duplicate accounts
3. **Generates unique admin ID** - Creates sequential admin IDs
4. **Hashes password securely** - Uses bcrypt for password security
5. **Creates faculty profile** - Links admin to faculty table
6. **Provides clear feedback** - Shows success/error messages

## 🎯 Next Steps

After creating the default admin:

1. **Login and explore** the admin dashboard
2. **Change the default password** for security
3. **Create additional users** (students, faculty, admins)
4. **Set up subjects** and assign them to faculty
5. **Configure system settings** as needed

---

**Note**: This default admin setup is designed for development and testing. Always follow security best practices in production environments.