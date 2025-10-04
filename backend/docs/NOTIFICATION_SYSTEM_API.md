# Notification System API Documentation

## Overview

The VisionGrade notification system provides automated alerts, announcements, and real-time notifications for students, faculty, and administrators. It supports three types of notifications:

- **System**: Administrative announcements and system-wide notifications
- **Academic**: Faculty announcements to students in specific subjects
- **Auto**: Automated alerts based on attendance and performance data

## Authentication

All notification endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Get User Notifications

**GET** `/api/notifications`

Retrieves notifications for the authenticated user with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of notifications per page (default: 20)
- `unread_only` (optional): Filter for unread notifications only (true/false)
- `notification_type` (optional): Filter by type (system/academic/auto)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "title": "Low Attendance Alert",
        "message": "Your attendance in Software Engineering is 65.5%...",
        "notification_type": "auto",
        "is_read": false,
        "created_at": "2024-10-02T10:30:00Z",
        "sender": {
          "id": 2,
          "unique_id": "FAC001",
          "role": "faculty"
        }
      }
    ],
    "totalCount": 25,
    "currentPage": 1,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Get Notification Statistics

**GET** `/api/notifications/stats`

Returns notification statistics for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "unread": 8,
    "byType": {
      "system": {
        "total": 5,
        "read": 3,
        "unread": 2
      },
      "academic": {
        "total": 12,
        "read": 8,
        "unread": 4
      },
      "auto": {
        "total": 8,
        "read": 6,
        "unread": 2
      }
    }
  },
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Get Recent Notifications

**GET** `/api/notifications/recent`

Returns recent notifications for dashboard display.

**Query Parameters:**
- `limit` (optional): Number of notifications to return (default: 5)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "title": "Low Attendance Alert",
        "message": "Your attendance in Software Engineering is 65.5%...",
        "notification_type": "auto",
        "is_read": false,
        "created_at": "2024-10-02T10:30:00Z"
      }
    ],
    "count": 5
  },
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Mark Notification as Read

**PUT** `/api/notifications/:id/read`

Marks a specific notification as read.

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": 1,
      "is_read": true,
      "updated_at": "2024-10-02T10:30:00Z"
    }
  },
  "message": "Notification marked as read",
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Mark Multiple Notifications as Read

**PUT** `/api/notifications/mark-read`

Marks multiple notifications as read.

**Request Body:**
```json
{
  "notification_ids": [1, 2, 3, 4]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_count": 4,
    "notification_ids": [1, 2, 3, 4]
  },
  "message": "4 notifications marked as read",
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Send System Announcement

**POST** `/api/notifications/system-announcement`

**Access:** Admin only

Sends a system-wide announcement to all users or specific recipients.

**Request Body:**
```json
{
  "title": "System Maintenance Notice",
  "message": "The system will be under maintenance from 2:00 AM to 4:00 AM tomorrow.",
  "recipient_ids": [1, 2, 3] // Optional: if not provided, sends to all users
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications_sent": 150,
    "recipient_count": 150
  },
  "message": "System announcement sent successfully",
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Send Subject Announcement

**POST** `/api/notifications/subject-announcement`

**Access:** Faculty and Tutors only

Sends an announcement to all students enrolled in a specific subject.

**Request Body:**
```json
{
  "subject_id": 1,
  "title": "Assignment Deadline Extended",
  "message": "The assignment deadline has been extended to next Friday.",
  "academic_year": 2024 // Optional: defaults to current year
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications_sent": 45,
    "subject_id": 1
  },
  "message": "Subject announcement sent successfully",
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Check and Send Attendance Alerts

**POST** `/api/notifications/check-attendance-alerts`

**Access:** Admin, Faculty, and Tutors

Manually triggers low attendance alert checking and sending.

**Request Body:**
```json
{
  "threshold": 75, // Optional: defaults to 75%
  "subject_id": 1  // Optional: check specific subject only
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts_sent": 12,
    "errors_count": 0,
    "alerts": [
      {
        "student_id": 1,
        "student_name": "John Doe",
        "subject_name": "Software Engineering",
        "attendance_percentage": 65.5,
        "notification_id": 25
      }
    ],
    "errors": [],
    "threshold": 75
  },
  "message": "12 attendance alerts sent successfully",
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Check and Send At-Risk Student Alerts

**POST** `/api/notifications/check-at-risk-alerts`

**Access:** Admin only

Manually triggers at-risk student alert checking and sending to faculty.

**Request Body:**
```json
{
  "academic_year": 2024 // Optional: defaults to current year
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts_sent": 8,
    "errors_count": 0,
    "alerts": [
      {
        "faculty_id": 1,
        "student_id": 1,
        "student_name": "John Doe",
        "subject_name": "Software Engineering",
        "risk_reason": "low attendance (65.5%)",
        "notification_id": 26
      }
    ],
    "errors": []
  },
  "message": "8 at-risk student alerts sent to faculty",
  "timestamp": "2024-10-02T10:30:00Z"
}
```

### Cleanup Old Notifications

**DELETE** `/api/notifications/cleanup`

**Access:** Admin only

Deletes old read notifications to maintain database performance.

**Request Body:**
```json
{
  "days_old": 90 // Optional: defaults to 90 days
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_count": 245,
    "days_old": 90
  },
  "message": "245 old notifications deleted successfully",
  "timestamp": "2024-10-02T10:30:00Z"
}
```

## Automated Notification System

The system automatically sends notifications based on the following triggers:

### Low Attendance Alerts

- **Trigger:** When student attendance falls below 75%
- **Recipient:** Student
- **Frequency:** 
  - Immediate: When attendance is updated and becomes low
  - Daily: Scheduled check at 9:00 AM
  - Duplicate prevention: No alerts within 3 days for immediate, 7 days for scheduled

### At-Risk Student Alerts

- **Triggers:**
  - Attendance below 75%
  - Marks below 40% in any exam
  - Performance decline of more than 15% between tests
  - Test 2 marks below 50%
- **Recipient:** Faculty teaching the subject
- **Frequency:**
  - Immediate: When marks are updated and are low
  - Weekly: Scheduled check on Monday at 10:00 AM
  - Duplicate prevention: No alerts within 7 days for immediate, 14 days for scheduled

### Scheduled Tasks

The system runs the following automated tasks:

1. **Daily Low Attendance Alerts** - 9:00 AM IST
2. **Weekly At-Risk Student Alerts** - Monday 10:00 AM IST
3. **Weekly Notification Cleanup** - Sunday 2:00 AM IST
4. **Daily Delivery Statistics** - 11:59 PM IST

## Rate Limiting

The following rate limits are applied to prevent abuse:

- **System Announcements:** 10 per 15 minutes (Admin)
- **Subject Announcements:** 20 per 15 minutes (Faculty/Tutor)
- **Attendance Alert Checks:** 5 per hour
- **At-Risk Alert Checks:** 3 per hour (Admin)
- **Notification Cleanup:** 2 per day (Admin)

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-10-02T10:30:00Z"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid request data
- `ACCESS_DENIED`: Insufficient permissions
- `NOTIFICATION_NOT_FOUND`: Notification doesn't exist or access denied
- `FETCH_NOTIFICATIONS_ERROR`: Database error while fetching
- `SYSTEM_ANNOUNCEMENT_ERROR`: Error sending system announcement
- `SUBJECT_ANNOUNCEMENT_ERROR`: Error sending subject announcement
- `ATTENDANCE_ALERTS_ERROR`: Error checking/sending attendance alerts
- `AT_RISK_ALERTS_ERROR`: Error checking/sending at-risk alerts
- `CLEANUP_ERROR`: Error during notification cleanup

## Integration with Other Systems

### Attendance System Integration

When attendance is updated via `/api/attendance` endpoints, the system automatically:
1. Checks if attendance percentage is below 75%
2. Sends immediate low attendance alert to student
3. Prevents duplicate alerts within 3-day window

### Marks System Integration

When marks are added/updated via `/api/marks` endpoints, the system automatically:
1. Checks if marks percentage is below 40%
2. Sends immediate at-risk alert to faculty
3. Prevents duplicate alerts within 7-day window

### Real-time Notifications

For real-time notification delivery in the frontend:
1. Poll `/api/notifications/recent` endpoint every 30 seconds
2. Check `/api/notifications/stats` for unread count updates
3. Use WebSocket connection for instant delivery (future enhancement)

## Best Practices

1. **Pagination:** Always use pagination for notification lists
2. **Filtering:** Use appropriate filters to reduce data transfer
3. **Batch Operations:** Use bulk mark-as-read for multiple notifications
4. **Error Handling:** Implement proper error handling for all API calls
5. **Rate Limiting:** Respect rate limits to avoid API blocking
6. **Caching:** Cache notification stats and recent notifications on frontend
7. **User Experience:** Show loading states and success/error messages