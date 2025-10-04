# Admin Dashboard API Documentation

## Overview

The Admin Dashboard API provides comprehensive administrative functionality for the VisionGrade system, including user management, subject management, tutor assignments, system announcements, and student promotion/graduation workflows.

## Authentication

All admin endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- User role must be 'admin'

## Endpoints

### Dashboard Data

#### GET /api/admin/dashboard
Get overview statistics for the admin dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalStudents": 120,
    "totalFaculty": 25,
    "totalSubjects": 48,
    "activeStudents": 115,
    "graduatedStudents": 30
  }
}
```

### User Management

#### GET /api/admin/users
Get paginated list of all users with filtering options.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by user role
- `search` (optional): Search by ID or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 150,
    "page": 1,
    "totalPages": 15
  }
}
```

#### POST /api/admin/users
Create a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "securepassword",
  "role": "student|faculty|tutor|admin",
  "name": "User Name",
  "semester": 1,           // For students
  "batch_year": 2024,      // For students
  "department": "CS"       // For faculty/tutors
}
```

#### PUT /api/admin/users/:id
Update an existing user.

#### DELETE /api/admin/users/:id
Delete a user (with validation for existing academic data).

### Tutor Management

#### GET /api/admin/tutors
Get all assigned tutors.

#### POST /api/admin/tutors/assign
Assign a faculty member as tutor for a specific semester.

**Request Body:**
```json
{
  "facultyId": 123,
  "semester": 1
}
```

#### DELETE /api/admin/tutors/unassign/:facultyId
Remove tutor assignment from a faculty member.

### Subject Management

#### GET /api/admin/subjects
Get all subjects with optional semester filtering.

**Query Parameters:**
- `semester` (optional): Filter by semester

#### POST /api/admin/subjects
Create a new subject.

**Request Body:**
```json
{
  "subject_code": "CS101",
  "subject_name": "Introduction to Computer Science",
  "subject_type": "theory|lab",
  "semester": 1,
  "credits": 3
}
```

#### PUT /api/admin/subjects/:id
Update an existing subject.

#### DELETE /api/admin/subjects/:id
Delete a subject (with validation for existing academic data).

### System Announcements

#### POST /api/admin/announcements
Send system-wide announcement to all users.

**Request Body:**
```json
{
  "title": "System Maintenance",
  "message": "The system will be under maintenance tomorrow from 2 AM to 4 AM."
}
```

### Student Promotion & Graduation

#### POST /api/admin/promote-students
Promote students from one semester to another.

**Request Body:**
```json
{
  "fromSemester": 1,
  "toSemester": 2,
  "studentIds": [1, 2, 3]  // Optional: specific students, omit for all
}
```

#### POST /api/admin/graduate-students
Mark students as graduated.

**Request Body:**
```json
{
  "semester": 8,
  "studentIds": [1, 2, 3]  // Optional: specific students, omit for all
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `USER_NOT_FOUND`: User does not exist
- `USER_EXISTS`: User with email/phone already exists
- `SUBJECT_EXISTS`: Subject code already exists
- `CANNOT_DELETE_USER`: User has academic data preventing deletion
- `CANNOT_DELETE_SUBJECT`: Subject has academic data preventing deletion
- `TUTOR_EXISTS`: Another tutor already assigned to semester
- `NO_STUDENTS_FOUND`: No students found for promotion/graduation

## Frontend Components

### AdminDashboard
Main dashboard component with tabbed interface:
- Overview with statistics and quick actions
- User Management with CRUD operations
- Tutor Assignment with semester coverage
- Subject Management with filtering
- System Announcements with templates
- Student Promotion & Graduation workflows

### Key Features
- Real-time data updates
- Comprehensive error handling
- Responsive design
- Form validation
- Confirmation dialogs for destructive actions
- Pagination for large datasets
- Search and filtering capabilities

## Security Considerations

- All endpoints require admin role authentication
- Input validation on all user data
- Prevention of deletion when academic data exists
- Secure password handling
- Rate limiting applied
- Audit logging for sensitive operations

## Testing

Comprehensive test coverage includes:
- Unit tests for all controller methods
- Integration tests for API endpoints
- Frontend component tests
- Error handling validation
- Authentication and authorization tests