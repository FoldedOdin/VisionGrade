# VisionGrade API Documentation

## Overview

VisionGrade provides a comprehensive REST API for managing student performance data, authentication, and machine learning predictions. This documentation covers all available endpoints, request/response formats, and authentication requirements.

## Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. **Login**: POST `/auth/login` - Get JWT token
2. **Use Token**: Include in Authorization header for protected endpoints
3. **Refresh**: Token expires in 24 hours, login again to get new token

## API Endpoints

### Authentication Endpoints

#### POST /auth/login
Login with credentials (ID, email, or phone)

**Request Body:**
```json
{
  "identifier": "student123", // ID, email, or phone
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "unique_id": "STU001",
      "email": "student@example.com",
      "role": "student",
      "profile_photo": "/uploads/profiles/user1.jpg"
    }
  }
}
```

#### POST /auth/signup
Register a new user

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "phone": "+1234567890",
  "password": "securepassword",
  "role": "student",
  "name": "John Doe",
  "semester": 1,
  "batch_year": 2024
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User registered successfully",
    "unique_id": "STU002"
  }
}
```

#### POST /auth/forgot-password
Request password reset

**Request Body:**
```json
{
  "identifier": "student@example.com" // email or phone
}
```

#### POST /auth/reset-password
Reset password with token

**Request Body:**
```json
{
  "token": "reset-token-here",
  "new_password": "newpassword123"
}
```

#### GET /auth/profile
Get current user profile (requires authentication)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "unique_id": "STU001",
    "email": "student@example.com",
    "phone": "+1234567890",
    "role": "student",
    "profile_photo": "/uploads/profiles/user1.jpg",
    "student": {
      "student_name": "John Doe",
      "semester": 3,
      "batch_year": 2023
    }
  }
}
```

#### PUT /auth/profile
Update user profile (requires authentication)

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "phone": "+0987654321",
  "student_name": "John Smith"
}
```

### Student Endpoints

#### GET /students/dashboard
Get student dashboard data (requires student authentication)

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "name": "John Doe",
      "semester": 3,
      "batch_year": 2023
    },
    "subjects": [
      {
        "id": 1,
        "subject_code": "CS301",
        "subject_name": "Data Structures",
        "subject_type": "theory",
        "credits": 3
      }
    ],
    "recent_marks": [...],
    "attendance_summary": {...},
    "notifications_count": 5
  }
}
```

#### GET /students/marks
Get all marks for the student

**Query Parameters:**
- `semester` (optional): Filter by semester
- `subject_id` (optional): Filter by subject

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subject": {
        "subject_code": "CS301",
        "subject_name": "Data Structures"
      },
      "exam_type": "series_test_1",
      "marks_obtained": 42,
      "max_marks": 50,
      "percentage": 84.0,
      "created_at": "2024-10-01T10:00:00Z"
    }
  ]
}
```

#### GET /students/attendance
Get attendance data for the student

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "subject": {
        "subject_code": "CS301",
        "subject_name": "Data Structures"
      },
      "total_classes": 45,
      "attended_classes": 38,
      "attendance_percentage": 84.44,
      "status": "good" // good, warning, critical
    }
  ]
}
```

#### GET /students/predictions
Get ML predictions for the student (if enabled)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "subject": {
        "subject_code": "CS301",
        "subject_name": "Data Structures"
      },
      "predicted_marks": 78.5,
      "confidence_score": 0.85,
      "is_visible": true,
      "created_at": "2024-10-01T10:00:00Z"
    }
  ]
}
```

#### GET /students/notifications
Get notifications for the student

**Query Parameters:**
- `type` (optional): Filter by type (system, academic, auto)
- `unread` (optional): Filter unread notifications (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Low Attendance Alert",
      "message": "Your attendance in CS301 has dropped below 75%",
      "type": "auto",
      "is_read": false,
      "created_at": "2024-10-01T10:00:00Z"
    }
  ]
}
```

#### POST /students/report-card
Generate and download report card

**Request Body:**
```json
{
  "format": "pdf", // pdf or doc
  "semester": 3,
  "include_predictions": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "download_url": "/api/reports/download/report-card-STU001-2024.pdf",
    "expires_at": "2024-10-02T10:00:00Z"
  }
}
```

### Faculty Endpoints

#### GET /faculty/subjects
Get subjects assigned to the faculty member

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subject_code": "CS301",
      "subject_name": "Data Structures",
      "subject_type": "theory",
      "semester": 3,
      "student_count": 45
    }
  ]
}
```

#### POST /faculty/marks
Add marks for students

**Request Body:**
```json
{
  "subject_id": 1,
  "exam_type": "series_test_1",
  "marks": [
    {
      "student_id": 1,
      "marks_obtained": 42,
      "max_marks": 50
    },
    {
      "student_id": 2,
      "marks_obtained": 38,
      "max_marks": 50
    }
  ]
}
```

#### PUT /faculty/marks/:id
Update specific mark entry

**Request Body:**
```json
{
  "marks_obtained": 45,
  "max_marks": 50
}
```

#### POST /faculty/attendance
Update attendance for students

**Request Body:**
```json
{
  "subject_id": 1,
  "attendance_data": [
    {
      "student_id": 1,
      "total_classes": 45,
      "attended_classes": 38
    }
  ]
}
```

#### GET /faculty/insights
Get performance insights for assigned subjects

**Query Parameters:**
- `subject_id` (optional): Filter by subject

**Response:**
```json
{
  "success": true,
  "data": {
    "subject_performance": [
      {
        "subject_code": "CS301",
        "total_students": 45,
        "pass_count": 38,
        "fail_count": 7,
        "pass_percentage": 84.44,
        "average_marks": 76.2
      }
    ],
    "attendance_insights": {...},
    "at_risk_students": [...]
  }
}
```

#### POST /faculty/announcements
Send announcements to students

**Request Body:**
```json
{
  "subject_id": 1,
  "title": "Assignment Deadline",
  "message": "Please submit your assignment by Friday",
  "priority": "normal" // low, normal, high
}
```

#### GET /faculty/at-risk-students
Get list of at-risk students

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "student": {
        "unique_id": "STU001",
        "name": "John Doe"
      },
      "subject": {
        "subject_code": "CS301",
        "subject_name": "Data Structures"
      },
      "risk_factors": [
        "Low attendance (65%)",
        "Poor performance in Series Test 1 (30%)"
      ],
      "risk_level": "high" // low, medium, high
    }
  ]
}
```

### Admin Endpoints

#### GET /admin/users
Get all users with pagination

**Query Parameters:**
- `role` (optional): Filter by role
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name or ID

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 100,
      "items_per_page": 20
    }
  }
}
```

#### POST /admin/users
Create new user

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "phone": "+1234567890",
  "password": "temppassword",
  "role": "faculty",
  "name": "Dr. Jane Smith",
  "department": "Computer Science"
}
```

#### PUT /admin/users/:id
Update user information

#### DELETE /admin/users/:id
Delete user (soft delete if has academic data)

#### GET /admin/subjects
Get all subjects

#### POST /admin/subjects
Create new subject

**Request Body:**
```json
{
  "subject_code": "CS401",
  "subject_name": "Machine Learning",
  "subject_type": "theory",
  "semester": 4,
  "credits": 3
}
```

#### POST /admin/promote-students
Promote students to next semester

**Request Body:**
```json
{
  "student_ids": [1, 2, 3],
  "from_semester": 3,
  "to_semester": 4
}
```

#### POST /admin/system-announcements
Send system-wide announcements

**Request Body:**
```json
{
  "title": "System Maintenance",
  "message": "System will be down for maintenance on Sunday",
  "target_roles": ["student", "faculty"],
  "priority": "high"
}
```

### ML Prediction Endpoints

#### POST /ml/predict
Generate predictions for students

**Request Body:**
```json
{
  "student_ids": [1, 2, 3],
  "subject_id": 1
}
```

#### GET /ml/toggle-predictions/:subject
Toggle prediction visibility for a subject

**Response:**
```json
{
  "success": true,
  "data": {
    "subject_id": 1,
    "predictions_enabled": true,
    "affected_students": 45
  }
}
```

#### POST /ml/retrain-model
Retrain ML model with latest data

#### GET /ml/model-accuracy
Get current model accuracy metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_accuracy": 0.87,
    "subject_accuracy": [
      {
        "subject_code": "CS301",
        "accuracy": 0.89,
        "sample_size": 150
      }
    ],
    "last_trained": "2024-10-01T10:00:00Z"
  }
}
```

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ERROR`: Resource already exists
- `SERVER_ERROR`: Internal server error
- `RATE_LIMIT_ERROR`: Too many requests

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General API endpoints**: 100 requests per 15 minutes
- **File upload endpoints**: 10 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## File Upload

File uploads (profile photos, documents) use multipart/form-data:

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('type', 'profile_photo');

fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

**Limits:**
- Maximum file size: 10MB
- Allowed formats: JPG, PNG, PDF, DOC, DOCX
- Profile photos: JPG, PNG only (max 5MB)

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (starts from 1)
- `limit`: Items per page (max 100)
- `sort`: Sort field
- `order`: Sort order (asc/desc)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 100,
      "items_per_page": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## WebSocket Events (Real-time Updates)

VisionGrade supports real-time updates via WebSocket:

**Connection:** `ws://localhost:5000/ws`

**Events:**
- `notification`: New notification received
- `marks_updated`: Marks have been updated
- `attendance_updated`: Attendance has been updated
- `prediction_toggled`: Prediction visibility changed

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data.type, data.payload);
};
```

## SDK and Libraries

### JavaScript/Node.js
```javascript
const VisionGradeAPI = require('visiongrade-api-client');
const client = new VisionGradeAPI({
  baseURL: 'http://localhost:5000/api',
  token: 'your-jwt-token'
});

// Get student dashboard
const dashboard = await client.students.getDashboard();
```

### Python
```python
from visiongrade_client import VisionGradeClient

client = VisionGradeClient(
    base_url='http://localhost:5000/api',
    token='your-jwt-token'
)

# Get student marks
marks = client.students.get_marks()
```

## Testing

Use the provided Postman collection or test scripts:

```bash
# Run API tests
npm run test:api

# Test specific endpoint
curl -X GET "http://localhost:5000/api/students/dashboard" \
  -H "Authorization: Bearer your-token"
```

## Support

For API support and questions:
- Documentation: `/docs`
- Health Check: `/health`
- API Status: `/status`
- Contact: support@visiongrade.com