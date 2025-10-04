# Administrator Setup Guide

## 🔐 Security Notice

**Administrator accounts cannot be created through public registration for security reasons.**

This document explains how to properly create and manage administrator accounts in VisionGrade.

## Initial Setup

### Creating the First Administrator

For initial system setup, use the provided script to create the first administrator account:

```bash
# Navigate to backend directory
cd backend

# Run the first admin creation script
node scripts/create-first-admin.js
```

The script will prompt you for:
- Administrator email
- Phone number (optional)
- Full name
- Department (optional)
- Secure password

**Password Requirements:**
- At least 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character (@$!%*?&)

### Security Features

1. **Role Validation**: Public signup endpoints reject admin role creation
2. **Backend Validation**: Server-side validation prevents admin role bypass
3. **Audit Logging**: All admin creation attempts are logged
4. **Rate Limiting**: Admin creation is rate-limited
5. **Authentication Required**: Only existing admins can create new admins

## Creating Additional Administrators

Once you have the first administrator account, additional admin accounts can be created through:

### Method 1: Admin Dashboard (Recommended)

1. Log in as an administrator
2. Navigate to Admin Dashboard → User Management
3. Click "Create Administrator"
4. Fill in the required information
5. The new admin will receive a welcome email

### Method 2: API Endpoint

**Endpoint:** `POST /api/auth/create-admin`

**Headers:**
```
Authorization: Bearer <admin_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "phone": "1234567890",
  "password": "SecurePass123!",
  "facultyName": "John Doe",
  "department": "Computer Science"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Administrator account created successfully",
  "data": {
    "user": {
      "id": 1,
      "unique_id": "ADM001",
      "email": "admin@example.com",
      "phone": "1234567890",
      "role": "admin",
      "created_at": "2024-10-03T10:00:00.000Z"
    }
  }
}
```

## Security Best Practices

### 1. Admin Account Management

- **Principle of Least Privilege**: Only create admin accounts when necessary
- **Regular Audits**: Review admin accounts periodically
- **Strong Passwords**: Enforce strong password policies
- **Two-Factor Authentication**: Enable 2FA for admin accounts (when available)

### 2. Access Control

- **Role Separation**: Don't use admin accounts for daily tasks
- **Session Management**: Admin sessions should have shorter timeouts
- **IP Restrictions**: Consider restricting admin access to specific IP ranges

### 3. Monitoring

- **Audit Logs**: Monitor all admin activities
- **Failed Login Attempts**: Track and alert on failed admin logins
- **Privilege Escalation**: Monitor for unauthorized privilege changes

## Troubleshooting

### Common Issues

1. **"Administrator account already exists" Error**
   - This occurs when trying to run the first-admin script after an admin already exists
   - Use the admin dashboard or API to create additional admins

2. **"Insufficient Permissions" Error**
   - Only existing administrators can create new admin accounts
   - Verify you're logged in with an admin account

3. **Password Validation Errors**
   - Ensure password meets all requirements
   - Check for special characters and mixed case

### Recovery Scenarios

1. **Lost Admin Access**
   - If all admin access is lost, you may need to:
   - Reset the database and run the first-admin script again
   - Or manually update the database to grant admin role to an existing user

2. **Forgotten Admin Credentials**
   - Use the password reset functionality
   - Admin password resets are logged for security

## API Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `FORBIDDEN_ROLE` | Admin role in public signup | Use proper admin creation method |
| `INSUFFICIENT_PERMISSIONS` | Non-admin trying to create admin | Log in with admin account |
| `USER_EXISTS` | Email/phone already registered | Use different email/phone |
| `INVALID_ROLE` | Invalid role specified | Use valid role values |
| `VALIDATION_ERROR` | Input validation failed | Check input format and requirements |

## Audit Trail

All administrator-related activities are logged with:
- Timestamp
- User ID performing the action
- IP address
- Action type (ADMIN_CREATE, etc.)
- Success/failure status
- Additional context

These logs are essential for security monitoring and compliance.

## Related Documentation

- [Authentication API](./AUTHENTICATION.md)
- [Security Implementation](./SECURITY_IMPLEMENTATION.md)
- [User Management API](./USER_MANAGEMENT_API.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)