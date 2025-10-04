# Academic Data Management API Documentation

This document describes the API endpoints for managing academic data including marks, attendance, and subjects in the VisionGrade system.

## Overview

The Academic Data Management APIs provide comprehensive functionality for:
- **Marks Management**: Faculty can enter, update, and retrieve marks for their assigned subjects
- **Attendance Management**: Faculty can track and manage student attendance
- **Subject Management**: Administrators can manage subjects and faculty assignments

## Authentication & Authorization

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Role-Based Access Control

- **Faculty/Tutor**: Can access marks and attendance for their assigned subjects only
- **Admin**: Can manage subjects and faculty assignments
- **Staff (Faculty/Tutor/Admin)**: Can view subject information

## Marks Management API

### Base URL: `/api/marks`

#### Get Marks by Subject
```http
GET /api/marks/subject/:subjectId
```

**Parameters:**
- `subjectId` (path): Subject ID
- `exam_type` (query, optional): Filter by exam type (`series_test_1`, `series_test_2`, `lab_internal`, `university`)
- `academic_year` (query, optional): Academic year (defaults to current year)

**Response:**
```json
{
  "success": true,
  "data": {
    "marks": [
      {
        "id": 1,
        "student_id": 1,
        "subject_id": 1,
        "exam_type": "series_test_1",
        "marks_obtained": 45,
        "max_marks": 50,
        "created_at": "2024-10-02T10:30:00Z",
        "student": {
          "id": 1,
          "student_name": "John Doe",
          "user": {
            "unique_id": "STU240001",
            "email": "john@example.com"
          }
        },
        "subject": {
          "id": 1,
          "subject_name": "Computer Science Fundamentals"
        }
      }
    ],
    "subject_id": 1,
    "exam_type": "series_test_1",
    "total_records": 1
  }
}
```

#### Add or Update Marks
```http
POST /api/marks
```

**Request Body:**
```json
{
  "student_id": 1,
  "subject_id": 1,
  "exam_type": "series_test_1",
  "marks_obtained": 45,
  "max_marks": 50
}
```

**Validation Rules:**
- `series_test_1`, `series_test_2`, `lab_internal`: Max marks = 50
- `university`: Max marks = 100
- Marks obtained must be between 0 and max marks

**Response:**
```json
{
  "success": true,
  "data": {
    "mark": {
      "id": 1,
      "marks_obtained": 45,
      "max_marks": 50,
      "exam_type": "series_test_1",
      "student": { /* student details */ },
      "subject": { /* subject details */ }
    },
    "action": "created", // or "updated"
    "percentage": 90,
    "grade": "A+",
    "passed": true
  },
  "message": "Marks added successfully"
}
```

#### Bulk Add/Update Marks
```http
POST /api/marks/bulk
```

**Request Body:**
```json
{
  "marks_data": [
    {
      "student_id": 1,
      "subject_id": 1,
      "exam_type": "series_test_1",
      "marks_obtained": 45,
      "max_marks": 50
    },
    {
      "student_id": 2,
      "subject_id": 1,
      "exam_type": "series_test_1",
      "marks_obtained": 40,
      "max_marks": 50
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successful_operations": 2,
    "failed_operations": 0,
    "results": [
      {
        "index": 0,
        "mark_id": 1,
        "action": "created",
        "data": { /* original data */ }
      }
    ],
    "errors": []
  }
}
```

#### Get Student Marks
```http
GET /api/marks/student/:studentId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 1,
      "student_name": "John Doe",
      "user": { /* user details */ }
    },
    "marks_by_subject": {
      "1": {
        "subject": { /* subject details */ },
        "marks": [
          {
            "exam_type": "series_test_1",
            "marks_obtained": 45,
            "max_marks": 50,
            "percentage": 90,
            "grade": "A+",
            "passed": true,
            "created_at": "2024-10-02T10:30:00Z"
          }
        ]
      }
    },
    "total_subjects": 1
  }
}
```

#### Delete Marks
```http
DELETE /api/marks/:markId
```

#### Get Performance Statistics
```http
GET /api/marks/statistics
```

**Parameters:**
- `subject_id` (query, optional): Filter by specific subject
- `academic_year` (query, optional): Academic year

## Attendance Management API

### Base URL: `/api/attendance`

#### Get Attendance by Subject
```http
GET /api/attendance/subject/:subjectId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance_records": [
      {
        "id": 1,
        "student": { /* student details */ },
        "total_classes": 20,
        "attended_classes": 18,
        "attendance_percentage": 90,
        "is_below_threshold": false,
        "required_classes_to_reach_threshold": 0,
        "max_classes_to_miss": 2,
        "updated_at": "2024-10-02T10:30:00Z"
      }
    ],
    "statistics": {
      "total_students": 25,
      "students_above_threshold": 20,
      "students_below_threshold": 5,
      "threshold_pass_percentage": 80,
      "average_attendance": 85.5
    }
  }
}
```

#### Add or Update Attendance
```http
POST /api/attendance
```

**Request Body:**
```json
{
  "student_id": 1,
  "subject_id": 1,
  "total_classes": 20,
  "attended_classes": 18
}
```

**Validation Rules:**
- `attended_classes` cannot exceed `total_classes`
- Both values must be non-negative integers

#### Bulk Update Attendance
```http
POST /api/attendance/bulk
```

#### Get Student Attendance
```http
GET /api/attendance/student/:studentId
```

#### Get Students with Low Attendance
```http
GET /api/attendance/low-attendance
```

**Parameters:**
- `threshold` (query, optional): Attendance threshold percentage (default: 75)
- `subject_id` (query, optional): Filter by specific subject

#### Get Attendance Statistics
```http
GET /api/attendance/statistics
```

## Subject Management API

### Base URL: `/api/subjects`

#### Get All Subjects
```http
GET /api/subjects
```

**Parameters:**
- `semester` (query, optional): Filter by semester (1-8)
- `subject_type` (query, optional): Filter by type (`theory`, `lab`)
- `academic_year` (query, optional): Academic year

**Response:**
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "id": 1,
        "subject_code": "CS101",
        "subject_name": "Computer Science Fundamentals",
        "subject_type": "theory",
        "semester": 1,
        "credits": 3,
        "assigned_faculty": [
          {
            "faculty_id": 1,
            "faculty_name": "Dr. Smith",
            "department": "Computer Science",
            "user": { /* user details */ }
          }
        ]
      }
    ],
    "total_subjects": 1,
    "filters": {
      "semester": "all",
      "subject_type": "all",
      "academic_year": 2024
    }
  }
}
```

#### Get Subject by ID
```http
GET /api/subjects/:subjectId
```

#### Create Subject (Admin Only)
```http
POST /api/subjects
```

**Request Body:**
```json
{
  "subject_code": "CS101",
  "subject_name": "Computer Science Fundamentals",
  "subject_type": "theory",
  "semester": 1,
  "credits": 3
}
```

**Validation Rules:**
- `subject_code`: 2-10 characters, uppercase letters and numbers only
- `subject_type`: Must be `theory` or `lab`
- `semester`: Must be between 1 and 8
- `credits`: Must be between 1 and 6 (default: 3)

#### Update Subject (Admin Only)
```http
PUT /api/subjects/:subjectId
```

#### Delete Subject (Admin Only)
```http
DELETE /api/subjects/:subjectId
```

**Note:** Cannot delete subjects with existing academic data (marks, attendance, enrollments)

#### Assign Faculty to Subject (Admin Only)
```http
POST /api/subjects/:subjectId/assign-faculty
```

**Request Body:**
```json
{
  "faculty_id": 1,
  "academic_year": 2024
}
```

#### Remove Faculty Assignment (Admin Only)
```http
DELETE /api/subjects/:subjectId/faculty/:facultyId
```

**Parameters:**
- `academic_year` (query, optional): Academic year

#### Get Subjects by Semester
```http
GET /api/subjects/semester/:semester
```

**Response includes:**
- `default_subjects`: First 6 theory + 2 lab subjects for the semester
- `all_subjects`: All subjects for the semester

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { /* additional error details */ },
    "timestamp": "2024-10-02T10:30:00Z"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `ACCESS_DENIED`: Faculty doesn't have access to the subject
- `MARKS_VALIDATION_ERROR`: Marks range validation failed
- `ATTENDANCE_VALIDATION_ERROR`: Attendance validation failed
- `SUBJECT_NOT_FOUND`: Subject doesn't exist
- `FACULTY_NOT_FOUND`: Faculty doesn't exist
- `SUBJECT_CODE_EXISTS`: Duplicate subject code
- `SUBJECT_HAS_DATA`: Cannot delete subject with existing data

## Faculty Access Control

Faculty can only access subjects assigned to them for the current academic year. The system automatically:

1. Checks faculty-subject assignments before allowing access
2. Filters data to show only assigned subjects
3. Prevents unauthorized access to other faculty's subjects

## Data Validation

### Marks Validation
- Series Test I & II: 0-50 marks
- Lab Internal: 0-50 marks  
- University: 0-100 marks
- Marks obtained cannot exceed maximum marks

### Attendance Validation
- Attended classes cannot exceed total classes
- Both values must be non-negative integers
- Automatic percentage calculation

### Subject Validation
- Subject codes must be unique and follow format rules
- Semester must be between 1-8
- Credits must be between 1-6
- Subject type must be theory or lab

## Performance Features

- Automatic grade calculation (A+, A, B+, B, C+, C, F)
- Pass/fail determination (40% threshold)
- Attendance percentage calculation
- Low attendance alerts (75% threshold)
- Performance statistics and insights
- Bulk operations for efficiency

## Academic Year Handling

- Defaults to current year if not specified
- Faculty assignments are year-specific
- Historical data access through year parameters
- Automatic year validation (2020 to current+5)