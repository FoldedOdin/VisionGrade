# VisionGrade Authentication System

## Overview

The VisionGrade authentication system provides comprehensive user management with JWT-based authentication, role-based access control (RBAC), and multi-channel login support. The system is designed with security best practices and includes features like password reset, rate limiting, and input validation.

## Features Implemented

### ✅ Core Authentication Features

1. **JWT-Based Authentication**
   - Access tokens with 24-hour expiration
   - Refresh tokens with 7-day expiration
   - Password reset tokens with 1-hour expiration
   - Secure token verification with proper error handling

2. **User Registration with Auto-ID Generation**
   - Automatic unique ID generation based on role
   - Student IDs: `STU` + batch year + random digits (e.g., `STU2312345`)
   - Faculty IDs: `FAC` + department code + random digits (e.g., `FACCS1234`)
   - Tutor IDs: `TUT` + department code + random digits
   - Admin IDs: `ADM` + year + random digits

3. **Multi-Channel Login Support**
   - Login with unique ID, email, or phone number
   - Single endpoint handles all login methods
   - Secure credential validation

4. **Password Security**
   - bcrypt hashing with 12 salt rounds
   - Strong password validation (8+ chars, uppercase, lowercase, number, special char)
   - Secure password comparison

5. **Role-Based Access Control (RBAC)**
   - Four user roles: `student`, `faculty`, `tutor`, `admin`
   - Middleware for role-specific route protection
   - Flexible role checking with single or multiple roles

6. **Password Reset System**
   - Email-based password reset with secure tokens
   - Beautiful HTML email templates
   - Token expiration and validation
   - SMS support structure (ready for implementation)

### ✅ Security Features

1. **Rate Limiting**
   - General API: 100 requests per 15 minutes
   - Authentication: 5 attempts per 15 minutes
   - Password reset: 3 attempts per hour
   - Registration: 3 attempts per hour

2. **Input Validation**
   - Comprehensive Joi schemas for all endpoints
   - Real-time validation with detailed error messages
   - Sanitization and type checking

3. **Security Headers**
   - Helmet.js for security headers
   - CORS configuration
   - Request size limits

### ✅ API Endpoints

#### Public Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

#### Protected Endpoints
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout (client-side token removal)
- `GET /api/auth/verify` - Verify token validity

## File Structure

```
backend/
├── controllers/
│   └── authController.js          # Authentication logic
├── middleware/
│   ├── auth.js                    # JWT authentication middleware
│   ├── rbac.js                    # Role-based access control
│   └── rateLimiter.js             # Rate limiting configurations
├── routes/
│   └── auth.js                    # Authentication routes
├── services/
│   └── emailService.js            # Email service for password reset
├── utils/
│   ├── password.js                # Password hashing utilities
│   ├── jwt.js                     # JWT token utilities
│   ├── idGenerator.js             # Auto-ID generation
│   └── validation.js              # Input validation schemas
└── test/
    ├── auth-unit.test.js          # Unit tests for utilities
    └── auth-routes.test.js        # Route validation tests
```

## Usage Examples

### Registration

```javascript
// Student Registration
POST /api/auth/register
{
  "email": "student@university.edu",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "student",
  "studentName": "John Doe",
  "semester": 3,
  "batchYear": 2023
}

// Faculty Registration
POST /api/auth/register
{
  "email": "faculty@university.edu",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "faculty",
  "facultyName": "Dr. Jane Smith",
  "department": "Computer Science"
}
```

### Login

```javascript
// Login with any identifier
POST /api/auth/login
{
  "identifier": "STU2312345",  // or email or phone
  "password": "SecurePass123!"
}
```

### Password Reset

```javascript
// Request reset
POST /api/auth/forgot-password
{
  "identifier": "student@university.edu",
  "resetMethod": "email"
}

// Reset password
POST /api/auth/reset-password
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

## Middleware Usage

### Authentication Middleware

```javascript
const { authenticateToken } = require('../middleware/auth');

// Protect route
router.get('/protected', authenticateToken, (req, res) => {
  // req.user contains authenticated user data
  res.json({ user: req.user });
});
```

### RBAC Middleware

```javascript
const { requireAdmin, requireFaculty, requireStudent } = require('../middleware/rbac');

// Admin only
router.get('/admin-only', authenticateToken, requireAdmin, handler);

// Faculty or Tutor
router.get('/faculty-only', authenticateToken, requireFaculty, handler);

// Multiple roles
router.get('/staff-only', authenticateToken, requireRole(['faculty', 'tutor', 'admin']), handler);
```

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_make_it_different
JWT_RESET_SECRET=your_super_secret_reset_key_here_make_it_unique

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM=noreply@visiongrade.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Testing

The authentication system includes comprehensive tests:

- **Unit Tests**: Password hashing, JWT tokens, validation schemas
- **Route Tests**: Input validation, error handling
- **Integration Tests**: Complete authentication flows (requires database)

Run tests:
```bash
npm test test/auth-unit.test.js      # Unit tests only
npm test test/auth-routes.test.js    # Route validation tests
npm test                             # All tests (requires database)
```

## Security Considerations

1. **Password Security**
   - Minimum 8 characters with complexity requirements
   - bcrypt with 12 salt rounds
   - No password storage in logs or responses

2. **Token Security**
   - Short-lived access tokens (24h)
   - Separate secrets for different token types
   - Proper token verification and error handling

3. **Rate Limiting**
   - Progressive rate limiting based on endpoint sensitivity
   - IP-based limiting to prevent abuse

4. **Input Validation**
   - All inputs validated and sanitized
   - Detailed error messages without information leakage

5. **Email Security**
   - Secure password reset tokens with expiration
   - No user enumeration in forgot password responses

## Future Enhancements

1. **SMS Integration**: Complete SMS-based password reset
2. **Two-Factor Authentication**: Add 2FA support
3. **Session Management**: Redis-based session storage
4. **Audit Logging**: Track authentication events
5. **Account Lockout**: Temporary lockout after failed attempts
6. **Social Login**: OAuth integration with Google/Microsoft

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `USER_EXISTS` | User already exists |
| `INVALID_CREDENTIALS` | Login failed |
| `NO_TOKEN` | Authorization token missing |
| `INVALID_TOKEN` | Token invalid or expired |
| `TOKEN_EXPIRED` | Token has expired |
| `FORBIDDEN` | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Status

✅ **COMPLETED** - All authentication and authorization features are fully implemented and tested.

The authentication system is production-ready with proper security measures, comprehensive error handling, and extensive testing coverage.