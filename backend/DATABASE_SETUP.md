# VisionGrade Database Setup Guide

## Overview

This document provides instructions for setting up the VisionGrade database models, migrations, and initial data.

## Database Models Created

### Core Models
- **User** - Base user authentication and profile management
- **Student** - Student-specific information and academic tracking
- **Faculty** - Faculty/tutor information and subject assignments
- **Subject** - Course/subject definitions with semester mapping

### Academic Data Models
- **Mark** - Student marks for different exam types (Series Test I/II, Lab Internal, University)
- **Attendance** - Student attendance tracking with percentage calculations
- **FacultySubject** - Junction table for faculty-subject assignments
- **StudentSubject** - Junction table for student-subject enrollments

### ML and System Models
- **MLPrediction** - Machine learning predictions for university exam performance
- **Notification** - System, academic, and automated notifications
- **SystemSetting** - Configurable system settings and parameters

## Database Schema Features

### Relationships
- **One-to-One**: User ↔ Student, User ↔ Faculty
- **One-to-Many**: Faculty → Marks, Student → Marks, Subject → Marks
- **Many-to-Many**: Faculty ↔ Subject (via FacultySubject), Student ↔ Subject (via StudentSubject)

### Key Features
- **Auto-generated IDs**: Unique student/faculty/admin IDs with role prefixes
- **Validation**: Mark ranges, attendance percentages, semester constraints
- **Indexes**: Optimized for common queries and performance
- **Constraints**: Data integrity and business rule enforcement
- **JSON Support**: Flexible storage for ML features and system settings

## Setup Instructions

### 1. Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 16+ with npm
- Environment variables configured

### 2. Environment Configuration
Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visiongrade_db
DB_USER=postgres
DB_PASSWORD=your_password

# Other configurations...
NODE_ENV=development
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Create Database
```sql
-- Connect to PostgreSQL and create database
CREATE DATABASE visiongrade_db;
```

### 5. Run Migrations
```bash
# Run all migrations to create tables
npm run migrate

# To rollback last migration (if needed)
npm run migrate:undo
```

### 6. Seed Initial Data
```bash
# Run seeders to populate subjects
npm run seed
```

## Migration Files

| Order | File | Description |
|-------|------|-------------|
| 001 | create-users.js | Base user table with authentication |
| 002 | create-students.js | Student profiles and academic info |
| 003 | create-faculty.js | Faculty profiles and tutor assignments |
| 004 | create-subjects.js | Subject definitions and semester mapping |
| 005 | create-faculty-subjects.js | Faculty-subject assignment junction |
| 006 | create-student-subjects.js | Student enrollment junction |
| 007 | create-marks.js | Academic marks with exam type validation |
| 008 | create-attendance.js | Attendance tracking with percentages |
| 009 | create-ml-predictions.js | ML prediction storage and visibility |
| 010 | create-notifications.js | Notification system with categorization |
| 011 | create-system-settings.js | Configurable system parameters |

## Model Methods and Features

### User Model
- `generateUniqueId(role)` - Auto-generate role-based IDs
- `getFullProfile()` - Get complete user profile with role-specific data

### Student Model
- `getCurrentSemesterSubjects()` - Get enrolled subjects for current semester
- `getOverallAttendance()` - Calculate overall attendance percentage
- `getPerformanceSummary()` - Academic performance statistics

### Faculty Model
- `getAssignedSubjects(year)` - Get subjects assigned for academic year
- `canAccessSubject(subjectId)` - Check subject access permissions
- `getPerformanceInsights()` - Subject-wise performance analytics

### Mark Model
- `validateMarks(examType, marks, maxMarks)` - Validate mark ranges
- `getStudentMarksSummary(studentId)` - Complete marks summary
- `getSubjectPerformanceStats(subjectId)` - Subject performance analytics

### Attendance Model
- `updateAttendance()` - Update attendance with validation
- `getStudentsWithLowAttendance()` - Find students below threshold
- `getRequiredClassesToReachThreshold()` - Calculate required attendance

### MLPrediction Model
- `createOrUpdatePrediction()` - Store ML predictions
- `togglePredictionVisibility()` - Control student visibility
- `getModelAccuracyStats()` - Track prediction accuracy

### Notification Model
- `createSystemNotification()` - Admin notifications
- `createAcademicNotification()` - Faculty notifications
- `createAutoNotification()` - System-generated alerts
- `sendBulkNotifications()` - Mass notification delivery

## Data Validation Rules

### Mark Validation
- Series Test I/II: 0-50 marks
- Lab Internal: 0-50 marks
- University: 0-100 marks
- Marks obtained ≤ Max marks

### Attendance Validation
- Attended classes ≤ Total classes
- Both values ≥ 0
- Percentage auto-calculated

### Academic Year Validation
- Range: 2020 to current year + 5
- Semester: 1-8 range validation

## Performance Optimizations

### Indexes Created
- Unique constraints on critical fields
- Composite indexes for common queries
- Foreign key indexes for join performance
- Date-based indexes for time-series queries

### Query Optimization
- Eager loading for related data
- Pagination support for large datasets
- Efficient bulk operations
- Cached calculations where appropriate

## Security Features

### Data Protection
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention
- Role-based access control

### Audit Trail
- Created/updated timestamps
- User tracking for modifications
- Notification delivery tracking
- System setting change history

## Troubleshooting

### Common Issues
1. **Connection Refused**: Check PostgreSQL service status
2. **Migration Errors**: Verify database exists and credentials
3. **Validation Errors**: Check data format and constraints
4. **Performance Issues**: Review indexes and query patterns

### Useful Commands
```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Create new seeder
npx sequelize-cli seed:generate --name seeder-name

# Reset database (caution!)
npx sequelize-cli db:migrate:undo:all
```

## Next Steps

After successful database setup:
1. Test model associations and methods
2. Implement API endpoints using these models
3. Set up authentication middleware
4. Configure ML service integration
5. Implement notification system
6. Add comprehensive testing

## Support

For issues with database setup:
1. Check PostgreSQL logs
2. Verify environment variables
3. Test database connectivity
4. Review migration error messages
5. Consult Sequelize documentation