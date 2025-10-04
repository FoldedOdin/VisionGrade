# User Management API Documentation

## Overview

The User Management API provides comprehensive CRUD operations for managing users, profile management with photo uploads, faculty-subject assignments, and student enrollment management. This API is designed for admin users to manage the entire user ecosystem of the VisionGrade system.

## Authentication & Authorization

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Role-Based Access Control

- **Admin Only**: User CRUD operations, faculty assignments, student enrollments
- **Staff (Faculty/Tutor/Admin)**: View user details
- **Self or Admin**: Profile photo upload

## API Endpoints

### User CRUD Operations

#### GET /api/users
Get all users with pagination and filtering.

**Access**: Admin only

**Query Parameters**:
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Number of users per page
- `role` (string) - Filter by user role (student, faculty, tutor, admin)
- `search` (string) - Search by unique_id, email, or phone
- `sortBy` (string, default: created_at) - Sort field
- `sortOrder` (string, default: DESC) - Sort order (ASC/DESC)

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "unique_id": "STU240001",
        "email": "student@example.com",
        "phone": "+1234567890",
        "role": "student",
        "profile_photo": "profile-123456.jpg",
        "created_at": "2024-10-02T10:00:00Z",
        "studentProfile": {
          "id": 1,
          "student_name": "John Doe",
          "semester": 3,
          "batch_year": 2024,
          "graduation_status": "active"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/users/:id
Get user by ID with full profile information.

**Access**: Staff (Faculty/Tutor/Admin)

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "unique_id": "STU240001",
      "email": "student@example.com",
      "role": "student",
      "studentProfile": {
        "student_name": "John Doe",
        "semester": 3,
        "batch_year": 2024
      }
    }
  }
}
```

#### POST /api/users
Create a new user with role-specific profile.

**Access**: Admin only

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "role": "student",
  "studentName": "Jane Smith",
  "semester": 1,
  "batchYear": 2024
}
```

**Faculty/Tutor Fields**:
```json
{
  "email": "faculty@example.com",
  "password": "SecurePass123!",
  "role": "faculty",
  "facultyName": "Dr. John Smith",
  "department": "Computer Science",
  "isTutor": true,
  "tutorSemester": 3
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "unique_id": "STU240002",
      "email": "newuser@example.com",
      "role": "student",
      "studentProfile": {
        "student_name": "Jane Smith",
        "semester": 1,
        "batch_year": 2024
      }
    }
  },
  "message": "User created successfully"
}
```

#### PUT /api/users/:id
Update user information and role-specific profile.

**Access**: Admin only

**Request Body**:
```json
{
  "email": "updated@example.com",
  "studentName": "Updated Name",
  "semester": 4
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "updated@example.com",
      "studentProfile": {
        "student_name": "Updated Name",
        "semester": 4
      }
    }
  },
  "message": "User updated successfully"
}
```

#### DELETE /api/users/:id
Delete a user (prevents deletion if academic data exists).

**Access**: Admin only

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Response** (if academic data exists):
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_DELETE_USER",
    "message": "Cannot delete user with existing academic data"
  }
}
```

### Profile Management

#### POST /api/users/:id/photo
Upload profile photo for a user.

**Access**: Self or Admin

**Request**: Multipart form data with `profilePhoto` file field

**Supported Formats**: JPEG, PNG, GIF (max 5MB)

**Response**:
```json
{
  "success": true,
  "data": {
    "profile_photo": "profile-1696248000123.jpg",
    "photo_url": "/uploads/profiles/profile-1696248000123.jpg"
  },
  "message": "Profile photo uploaded successfully"
}
```

### Faculty-Subject Assignment Management

#### GET /api/users/faculty/assignments
Get all faculty-subject assignments.

**Access**: Admin only

**Query Parameters**:
- `academicYear` (number) - Filter by academic year (default: current year)

**Response**:
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": 1,
        "faculty_id": 1,
        "subject_id": 1,
        "academic_year": 2024,
        "faculty": {
          "faculty_name": "Dr. John Smith",
          "user": {
            "email": "faculty@example.com"
          }
        },
        "subject": {
          "subject_code": "CS101",
          "subject_name": "Introduction to Programming"
        }
      }
    ],
    "academicYear": 2024
  }
}
```

#### POST /api/users/faculty/assign
Assign faculty to a subject.

**Access**: Admin only

**Request Body**:
```json
{
  "facultyId": 1,
  "subjectId": 1,
  "academicYear": 2024
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": 1,
      "faculty_id": 1,
      "subject_id": 1,
      "academic_year": 2024
    }
  },
  "message": "Faculty assigned to subject successfully"
}
```

#### DELETE /api/users/faculty/:facultyId/subjects/:subjectId
Remove faculty assignment from a subject.

**Access**: Admin only

**Query Parameters**:
- `academicYear` (number) - Academic year for the assignment

**Response**:
```json
{
  "success": true,
  "message": "Faculty assignment removed successfully"
}
```

### Student Enrollment Management

#### GET /api/users/students/enrollments
Get all student enrollments.

**Access**: Admin only

**Query Parameters**:
- `academicYear` (number) - Filter by academic year

**Response**:
```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": 1,
        "student_id": 1,
        "subject_id": 1,
        "academic_year": 2024,
        "student": {
          "student_name": "John Doe",
          "user": {
            "email": "student@example.com"
          }
        },
        "subject": {
          "subject_code": "CS101",
          "subject_name": "Introduction to Programming"
        }
      }
    ]
  }
}
```

#### POST /api/users/students/enroll
Enroll a student in a specific subject.

**Access**: Admin only

**Request Body**:
```json
{
  "studentId": 1,
  "subjectId": 1,
  "academicYear": 2024
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": 1,
      "student_id": 1,
      "subject_id": 1,
      "academic_year": 2024
    }
  },
  "message": "Student enrolled in subject successfully"
}
```

#### POST /api/users/students/enroll-semester
Bulk enroll student in all subjects for a semester.

**Access**: Admin only

**Request Body**:
```json
{
  "studentId": 1,
  "semester": 3,
  "academicYear": 2024
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "enrollment": {
          "student_id": 1,
          "subject_id": 1,
          "academic_year": 2024
        },
        "created": true,
        "subject": {
          "subject_name": "Data Structures"
        }
      }
    ]
  },
  "message": "Student enrolled in semester 3 subjects successfully"
}
```

#### DELETE /api/users/students/:studentId/subjects/:subjectId
Remove student enrollment from a subject.

**Access**: Admin only

**Query Parameters**:
- `academicYear` (number) - Academic year for the enrollment

**Response**:
```json
{
  "success": true,
  "message": "Student enrollment removed successfully"
}
```

#### POST /api/users/students/promote
Promote students to the next semester.

**Access**: Admin only

**Request Body**:
```json
{
  "studentIds": [1, 2, 3],
  "fromSemester": 3,
  "toSemester": 4,
  "academicYear": 2024
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "promotionResults": [
      {
        "studentId": 1,
        "enrollments": [
          {
            "enrollment": {
              "student_id": 1,
              "subject_id": 5,
              "academic_year": 2024
            },
            "created": true
          }
        ]
      }
    ]
  },
  "message": "3 students promoted from semester 3 to 4"
}
```

#### GET /api/users/students/statistics
Get enrollment statistics by semester.

**Access**: Admin only

**Query Parameters**:
- `academicYear` (number) - Academic year for statistics

**Response**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "1": {
        "semester": 1,
        "totalEnrollments": 120,
        "uniqueStudents": 20,
        "subjects": 6
      },
      "2": {
        "semester": 2,
        "totalEnrollments": 96,
        "uniqueStudents": 16,
        "subjects": 6
      }
    },
    "academicYear": 2024
  }
}
```

## Error Responses

### Validation Errors
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address"
      }
    ],
    "timestamp": "2024-10-02T10:00:00Z"
  }
}
```

### Authorization Errors
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required role(s): admin",
    "timestamp": "2024-10-02T10:00:00Z"
  }
}
```

### Not Found Errors
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "timestamp": "2024-10-02T10:00:00Z"
  }
}
```

### Conflict Errors
```json
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "User with this email or phone already exists",
    "timestamp": "2024-10-02T10:00:00Z"
  }
}
```

## Usage Examples

### Create a New Student
```javascript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newstudent@example.com',
    password: 'SecurePass123!',
    role: 'student',
    studentName: 'Alice Johnson',
    semester: 1,
    batchYear: 2024
  })
});
```

### Upload Profile Photo
```javascript
const formData = new FormData();
formData.append('profilePhoto', fileInput.files[0]);

const response = await fetch(`/api/users/${userId}/photo`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### Assign Faculty to Subject
```javascript
const response = await fetch('/api/users/faculty/assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    facultyId: 1,
    subjectId: 5,
    academicYear: 2024
  })
});
```

### Promote Students
```javascript
const response = await fetch('/api/users/students/promote', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studentIds: [1, 2, 3, 4],
    fromSemester: 2,
    toSemester: 3,
    academicYear: 2024
  })
});
```

## Implementation Notes

### Auto-Enrollment
- When creating a student, they are automatically enrolled in default subjects for their semester
- Default subjects include 6 theory subjects and 2 lab subjects per semester

### File Upload Security
- Profile photos are validated for file type (JPEG, PNG, GIF only)
- File size limit: 5MB
- Files are stored with unique names to prevent conflicts
- Old profile photos are automatically deleted when new ones are uploaded

### Academic Data Protection
- Users with existing academic data (marks, attendance) cannot be deleted
- This prevents data integrity issues and maintains academic records

### Performance Considerations
- User listing includes pagination to handle large datasets
- Indexes are used for efficient searching and filtering
- Bulk operations are optimized for better performance

### Validation Rules
- Email addresses must be unique across all users
- Phone numbers must be unique (if provided)
- Passwords must meet security requirements (8+ chars, mixed case, numbers, symbols)
- Role-specific fields are validated based on the user's role
- Academic years are validated within reasonable ranges (2020 to current year + 5)
- Semesters are validated within 1-8 range

This API provides comprehensive user management capabilities while maintaining security, data integrity, and performance standards required for an educational management system.