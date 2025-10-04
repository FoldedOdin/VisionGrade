# Report Generation API Documentation

## Overview

The Report Generation API provides comprehensive reporting functionality for the VisionGrade system, including student report cards, faculty reports, and graphical insights. It supports both PDF and DOC formats with various filtering and customization options.

## Base URL

```
/api/reports
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

Report generation endpoints are rate-limited to 10 requests per 15-minute window per user.

## Endpoints

### 1. Get Report Templates

Get available report templates based on user role.

**Endpoint:** `GET /api/reports/templates`

**Authorization:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "student_report_card",
        "name": "Student Report Card",
        "description": "Comprehensive report card with marks, attendance, and performance summary",
        "formats": ["pdf", "docx"],
        "requiredRole": ["student", "faculty", "tutor", "admin"]
      },
      {
        "id": "faculty_report",
        "name": "Faculty Report",
        "description": "Subject-wise performance report with filtering options",
        "formats": ["pdf", "docx"],
        "requiredRole": ["faculty", "tutor", "admin"]
      },
      {
        "id": "graphical_insights",
        "name": "Graphical Insights",
        "description": "Visual charts for pass/fail, attendance, and grade distribution",
        "formats": ["json"],
        "requiredRole": ["faculty", "tutor", "admin"]
      }
    ],
    "message": "Report templates retrieved successfully"
  }
}
```

### 2. Generate Student Report Card

Generate a comprehensive report card for a student.

**Endpoint:** `POST /api/reports/student/:studentId/report-card`

**Authorization:** 
- Students can only access their own reports
- Faculty, tutors, and admins can access any student report

**Query Parameters:**
- `format` (optional): `pdf` or `docx` (default: `pdf`)
- `academicYear` (optional): Academic year (default: current year)

**Response:**
```json
{
  "success": true,
  "data": {
    "report": {
      "filename": "report_card_STU001_2024.pdf",
      "filepath": "/path/to/file",
      "url": "/api/reports/download/report_card_STU001_2024.pdf"
    },
    "message": "Report card generated successfully"
  }
}
```

**Report Contents:**
- Student information (ID, name, semester, batch year)
- Academic performance table with all exam types
- Attendance summary by subject
- Overall performance summary with grades and pass/fail status

### 3. Generate Faculty Report

Generate a detailed report for faculty showing their subject performance.

**Endpoint:** `POST /api/reports/faculty/:facultyId/report`

**Authorization:**
- Faculty can only access their own reports
- Admins can access any faculty report

**Query Parameters:**
- `format` (optional): `pdf` or `docx` (default: `pdf`)
- `academicYear` (optional): Academic year filter
- `semester` (optional): Semester filter
- `minAttendance` (optional): Minimum attendance percentage filter
- `subjectId` (optional): Specific subject filter

**Response:**
```json
{
  "success": true,
  "data": {
    "report": {
      "filename": "faculty_report_FAC001_1635789123456.pdf",
      "filepath": "/path/to/file",
      "url": "/api/reports/download/faculty_report_FAC001_1635789123456.pdf"
    },
    "message": "Faculty report generated successfully"
  }
}
```

**Report Contents:**
- Faculty information and summary statistics
- Subject-wise performance breakdown
- Student enrollment and performance data
- Pass/fail rates and attendance statistics

### 4. Generate Graphical Insights

Generate visual insights data for charts and graphs.

**Endpoint:** `GET /api/reports/insights/subject/:subjectId`

**Authorization:**
- Faculty can only access insights for their assigned subjects
- Admins can access insights for any subject

**Query Parameters:**
- `academicYear` (optional): Academic year filter

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": {
      "subject": {
        "id": 1,
        "subject_name": "Software Engineering",
        "subject_code": "CS501"
      },
      "academicYear": 2024,
      "passFailChart": {
        "type": "pie",
        "title": "Pass/Fail Distribution",
        "data": [
          { "label": "Passed", "value": 25, "color": "#4CAF50" },
          { "label": "Failed", "value": 5, "color": "#F44336" }
        ]
      },
      "attendanceChart": {
        "type": "pie",
        "title": "Attendance Distribution",
        "data": [
          { "label": "Above 75%", "value": 22, "color": "#2196F3" },
          { "label": "Below 75%", "value": 8, "color": "#FF9800" }
        ]
      },
      "gradeDistribution": {
        "type": "pie",
        "title": "Grade Distribution",
        "data": [
          { "label": "A+", "value": 5, "color": "#4CAF50" },
          { "label": "A", "value": 8, "color": "#8BC34A" },
          { "label": "B+", "value": 7, "color": "#CDDC39" },
          { "label": "B", "value": 5, "color": "#FFEB3B" },
          { "label": "C+", "value": 3, "color": "#FF9800" },
          { "label": "C", "value": 2, "color": "#FF5722" },
          { "label": "F", "value": 0, "color": "#F44336" }
        ]
      }
    },
    "message": "Graphical insights generated successfully"
  }
}
```

### 5. Download Report File

Download a generated report file.

**Endpoint:** `GET /api/reports/download/:filename`

**Authorization:** All authenticated users

**Response:** File download with appropriate headers

**Headers:**
- `Content-Type`: `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `Content-Disposition`: `attachment; filename="report.pdf"`

### 6. Bulk Generate Reports (Admin Only)

Generate multiple reports in batch.

**Endpoint:** `POST /api/reports/bulk-generate`

**Authorization:** Admin only

**Request Body:**
```json
{
  "reportType": "student_report_card",
  "targets": [
    { "id": 1 },
    { "id": 2 },
    { "id": 3 }
  ],
  "format": "pdf",
  "filters": {
    "academicYear": 2024
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "success": true,
        "target": { "id": 1 },
        "report": {
          "filename": "report_card_STU001_2024.pdf",
          "url": "/api/reports/download/report_card_STU001_2024.pdf"
        }
      },
      {
        "success": false,
        "target": { "id": 2 },
        "error": "Student not found"
      }
    ],
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 1
    },
    "message": "Bulk report generation completed. 1 successful, 1 failed."
  }
}
```

### 7. Clean Up Old Reports (Admin Only)

Remove old report files from the server.

**Endpoint:** `DELETE /api/reports/cleanup`

**Authorization:** Admin only

**Query Parameters:**
- `daysOld` (optional): Number of days old (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully cleaned up reports older than 30 days"
  }
}
```

### 8. Get Report Status

Check the status of a report generation (for future async implementation).

**Endpoint:** `GET /api/reports/status/:reportId`

**Authorization:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "12345",
    "status": "completed",
    "message": "Report generation completed"
  }
}
```

## Error Responses

### Common Error Codes

- `STUDENT_NOT_FOUND`: Student ID does not exist
- `FACULTY_NOT_FOUND`: Faculty ID does not exist
- `SUBJECT_NOT_FOUND`: Subject ID does not exist
- `ACCESS_DENIED`: User doesn't have permission to access the resource
- `INVALID_FILENAME`: Filename contains invalid characters
- `FILE_NOT_FOUND`: Report file not found on server
- `REPORT_GENERATION_ERROR`: Error occurred during report generation
- `RATE_LIMIT_EXCEEDED`: Too many requests within the time window

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  }
}
```

## Report Templates

### Student Report Card Template

**Sections:**
1. **Header**: Institution name, report title, academic year
2. **Student Information**: ID, name, email, semester, batch year
3. **Academic Performance Table**: 
   - Subject name
   - Series Test 1 marks
   - Series Test 2 marks
   - University exam marks
   - Grade and status
4. **Attendance Summary**: Subject-wise attendance with percentages
5. **Performance Summary**: Overall statistics and averages
6. **Footer**: Generation date and system signature

### Faculty Report Template

**Sections:**
1. **Header**: Faculty name and report generation date
2. **Summary Statistics**: Total subjects, students, averages
3. **Subject-wise Details**: For each assigned subject:
   - Student enrollment count
   - Average marks and pass rate
   - Attendance statistics
   - Performance insights
4. **Graphical Data**: Pass/fail ratios and grade distributions

## File Management

### File Storage
- Reports are stored in `/uploads/reports/` directory
- Files are automatically named with timestamps to prevent conflicts
- Old files are cleaned up automatically based on configuration

### File Security
- Filename validation prevents directory traversal attacks
- Access control ensures users can only download authorized reports
- Files are served with appropriate security headers

## Performance Considerations

### Rate Limiting
- Report generation is rate-limited to prevent system overload
- Bulk operations have additional restrictions
- Different limits may apply based on user role

### File Cleanup
- Automatic cleanup of old report files to manage disk space
- Configurable retention period (default: 30 days)
- Manual cleanup available for administrators

### Caching
- Report templates are cached for better performance
- Generated insights data can be cached for frequently accessed subjects
- File metadata is cached to improve download performance

## Usage Examples

### Generate Student Report Card (JavaScript)

```javascript
const response = await fetch('/api/reports/student/123/report-card?format=pdf', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  // Download the report
  window.open(result.data.report.url, '_blank');
}
```

### Generate Faculty Report with Filters

```javascript
const response = await fetch('/api/reports/faculty/456/report?format=docx&semester=5&minAttendance=75', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('Report generated:', result.data.report.filename);
```

### Get Graphical Insights for Charts

```javascript
const response = await fetch('/api/reports/insights/subject/789', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
const chartData = result.data.insights.passFailChart.data;

// Use with Chart.js or similar library
const chart = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: chartData.map(d => d.label),
    datasets: [{
      data: chartData.map(d => d.value),
      backgroundColor: chartData.map(d => d.color)
    }]
  }
});
```

## Integration Notes

### Frontend Integration
- Use the templates endpoint to dynamically show available report types
- Implement progress indicators for report generation
- Handle file downloads appropriately in the browser
- Cache insights data for dashboard charts

### Mobile Considerations
- PDF reports are mobile-friendly with responsive layouts
- DOC files can be opened in mobile office applications
- Consider providing preview functionality for mobile users

### Accessibility
- Generated reports include proper document structure
- Alternative text is provided for charts and graphs
- High contrast colors are used in visual elements
- Reports are compatible with screen readers