# VisionGrade User Manual

## Table of Contents

1. [Getting Started](#getting-started)
2. [Student Guide](#student-guide)
3. [Faculty Guide](#faculty-guide)
4. [Tutor Guide](#tutor-guide)
5. [Administrator Guide](#administrator-guide)
6. [Common Features](#common-features)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### System Requirements

**For Users:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Screen resolution: 1024x768 or higher (responsive design supports mobile)

**For Installation:**
- Windows 10/11 or Linux
- Docker Desktop installed
- 4GB RAM minimum, 8GB recommended
- 10GB free disk space

### First Time Setup

1. **Access the System**
   - Open your web browser
   - Navigate to the VisionGrade URL provided by your administrator
   - You'll see the login screen with a floating glassmorphism popup

2. **Login Process**
   - Enter your credentials (ID, email, or phone number)
   - Enter your password
   - Click "Login"
   - You'll be redirected to your role-specific dashboard

3. **Initial Profile Setup**
   - Click on your profile icon in the top-right corner
   - Upload a profile photo (optional)
   - Verify your contact information
   - Update any missing details

---

## Student Guide

### Dashboard Overview

When you log in as a student, you'll see your personalized dashboard with:

- **Header**: Profile photo, notifications bell, theme toggle, logout
- **Sidebar**: Navigation menu (collapsible)
- **Main Content**: Marks, attendance, predictions, and notifications

### Viewing Your Marks

1. **Marks Display Section**
   - Shows all your registered subjects (6 theory + 2 lab subjects per semester)
   - Displays marks for different exam types:
     - Series Test I (0-50 marks)
     - Series Test II (0-50 marks)
     - Lab Internal (varies)
     - University Exam (0-100 marks)

2. **Understanding Mark Types**
   - **Series Tests**: Internal assessments conducted by faculty
   - **Lab Internals**: Practical examination marks
   - **University**: Final semester examination marks
   - **Percentage**: Calculated automatically based on obtained/total marks

3. **Mark Details**
   - Click on any subject to see detailed mark breakdown
   - View historical performance trends
   - See faculty comments (if any)

### Monitoring Your Attendance

1. **Attendance Visualization**
   - Pie charts showing attendance percentage for each subject
   - Color coding:
     - Green: Above 85% (Excellent)
     - Yellow: 75-85% (Good)
     - Orange: 65-75% (Warning)
     - Red: Below 65% (Critical)

2. **Attendance Alerts**
   - Automatic notifications when attendance drops below 75%
   - Weekly attendance summary emails
   - Subject-wise attendance breakdown

### ML Predictions (If Enabled)

1. **Predicted Marks Section**
   - Shows AI-generated predictions for university exams
   - Based on your Series Test and Lab Internal performance
   - Only visible if enabled by your tutor

2. **Understanding Predictions**
   - Predictions are estimates, not guarantees
   - Accuracy typically within ±10% of actual scores
   - Updated automatically when new marks are entered
   - Confidence score indicates prediction reliability

3. **Using Predictions**
   - Identify subjects needing more attention
   - Plan study schedule based on predicted performance
   - Discuss with faculty if predictions seem concerning

### Notifications

1. **Notification Center**
   - Click the animated bell icon to view notifications
   - Three types of notifications:
     - **System**: Administrative announcements
     - **Academic**: Faculty announcements for your subjects
     - **Auto**: Automated alerts (attendance, performance)

2. **Managing Notifications**
   - Mark notifications as read by clicking on them
   - Filter by type using the dropdown menu
   - Notifications are automatically archived after 30 days

### Generating Report Cards

1. **Report Card Download**
   - Click "Download Report Card" button
   - Choose format: PDF or DOC
   - Select semester (current or previous)
   - Include/exclude predictions (if available)

2. **Report Card Contents**
   - Personal information and photo
   - Subject-wise marks and grades
   - Attendance summary
   - Overall performance metrics
   - Faculty remarks (if any)
   - Predictions (if enabled and selected)

### Student Best Practices

- **Regular Monitoring**: Check your dashboard at least twice a week
- **Attendance Management**: Maintain above 75% attendance in all subjects
- **Early Intervention**: Contact faculty immediately if you notice concerning trends
- **Use Predictions Wisely**: Use ML predictions as guidance, not absolute truth
- **Stay Updated**: Read all notifications promptly

---

## Faculty Guide

### Dashboard Overview

Faculty dashboard provides comprehensive tools for:
- Managing assigned subjects
- Entering and updating marks
- Tracking student attendance
- Viewing performance insights
- Sending announcements
- Monitoring at-risk students

### Subject Management

1. **Assigned Subjects**
   - View all subjects assigned to you
   - See student enrollment count for each subject
   - Access subject-specific tools and data

2. **Subject Access Control**
   - You can only modify data for your assigned subjects
   - System prevents editing other faculty's subjects
   - All changes are logged for audit purposes

### Marks Entry and Management

1. **Adding Marks**
   - Navigate to "Marks Entry" section
   - Select subject and exam type
   - Enter marks for all students in batch mode
   - Validation ensures marks are within allowed ranges:
     - Series Test: 0-50
     - University: 0-100
     - Lab Internal: As configured

2. **Marks Entry Process**
   - Click "Add Marks" button
   - Select subject from dropdown
   - Choose exam type (Series Test I/II, Lab Internal, University)
   - Enter marks in the spreadsheet-like interface
   - Click "Save All" to submit

3. **Editing Marks**
   - Click on any existing mark to edit
   - Changes are tracked with timestamps
   - Students are notified of mark updates

4. **Bulk Operations**
   - Import marks from CSV file
   - Export marks to Excel for offline editing
   - Copy marks from previous semester (with confirmation)

### Attendance Management

1. **Recording Attendance**
   - Select subject and date range
   - Enter total classes conducted
   - Enter attended classes for each student
   - System automatically calculates percentages

2. **Attendance Tracking**
   - View attendance trends over time
   - Identify students with declining attendance
   - Generate attendance reports for administration

3. **Attendance Alerts**
   - System automatically alerts students below 75%
   - Faculty receives weekly attendance summary
   - At-risk students are highlighted in dashboard

### Performance Insights

1. **Graphical Analytics**
   - Pie charts showing pass/fail ratios
   - Bar charts for mark distribution
   - Trend lines for class performance over time
   - Comparative analysis between exam types

2. **Class Performance Metrics**
   - Average marks per exam type
   - Standard deviation and performance spread
   - Top and bottom performers identification
   - Subject-wise performance comparison

3. **Individual Student Analysis**
   - Click on any student to see detailed performance
   - Historical trend analysis
   - Attendance correlation with performance
   - Prediction accuracy tracking

### Announcement System

1. **Creating Announcements**
   - Click "New Announcement" button
   - Enter title and message
   - Select priority level (Low, Normal, High)
   - Choose target: All students or specific students
   - Schedule delivery (immediate or future)

2. **Announcement Types**
   - **Assignment Deadlines**: Homework and project due dates
   - **Exam Schedules**: Test dates and instructions
   - **Class Updates**: Schedule changes, room changes
   - **General Information**: Course-related announcements

3. **Managing Announcements**
   - View delivery status and read receipts
   - Edit or delete pending announcements
   - Archive old announcements

### At-Risk Student Management

1. **Identifying At-Risk Students**
   - System automatically identifies students with:
     - Attendance below 75%
     - Marks below 40% in any exam
     - Declining performance trends
     - Multiple failed assessments

2. **Risk Level Classification**
   - **Low Risk**: Minor concerns, monitoring needed
   - **Medium Risk**: Intervention recommended
   - **High Risk**: Immediate action required

3. **Intervention Tools**
   - Send personalized messages to at-risk students
   - Schedule one-on-one meetings
   - Notify parents/guardians (if configured)
   - Coordinate with tutors and counselors

### Faculty Best Practices

- **Timely Data Entry**: Enter marks within 48 hours of assessment
- **Regular Monitoring**: Review class performance weekly
- **Proactive Communication**: Address issues before they become critical
- **Use Analytics**: Leverage insights to improve teaching methods
- **Student Engagement**: Use announcements to keep students informed

---

## Tutor Guide

### Tutor Role Overview

Tutors have special responsibilities for ML prediction management and student mentoring:
- Control prediction visibility for assigned subjects
- Monitor prediction accuracy
- Provide guidance based on ML insights
- Coordinate with faculty for student support

### ML Prediction Controls

1. **Prediction Toggle Interface**
   - Access "Prediction Controls" from your dashboard
   - See all subjects where you have tutor privileges
   - Toggle predictions on/off for each subject
   - Changes take effect immediately for all students

2. **Subject-Specific Controls**
   - Enable/disable predictions per subject
   - Set prediction visibility for individual students
   - Configure prediction parameters (if advanced access)
   - Monitor prediction usage and feedback

3. **Prediction Management Process**
   - Review prediction accuracy regularly
   - Enable predictions only when confidence is high (>70%)
   - Disable predictions during exam periods (optional)
   - Communicate prediction changes to students

### Monitoring Prediction Accuracy

1. **Accuracy Metrics**
   - View overall prediction accuracy for your subjects
   - See subject-wise accuracy breakdown
   - Monitor prediction confidence scores
   - Track improvement over time

2. **Model Performance Analysis**
   - Compare predicted vs actual marks
   - Identify subjects with poor prediction accuracy
   - Review factors affecting prediction quality
   - Provide feedback for model improvement

3. **Quality Assurance**
   - Validate predictions against faculty expectations
   - Report anomalies or concerning predictions
   - Suggest model retraining when needed
   - Document prediction effectiveness

### Student Guidance and Mentoring

1. **Using Predictions for Guidance**
   - Help students interpret prediction results
   - Explain confidence scores and limitations
   - Guide study planning based on predictions
   - Address student concerns about predictions

2. **Intervention Strategies**
   - Identify students with poor predicted outcomes
   - Coordinate with subject faculty for support
   - Develop personalized improvement plans
   - Monitor progress and adjust strategies

3. **Communication with Students**
   - Explain when and why predictions are enabled/disabled
   - Provide context for prediction changes
   - Address questions about ML accuracy
   - Encourage balanced use of predictions

### Coordination with Faculty

1. **Collaborative Approach**
   - Work with faculty to validate predictions
   - Share insights from prediction analysis
   - Coordinate intervention strategies
   - Align on prediction visibility decisions

2. **Data Quality Management**
   - Ensure timely mark entry for accurate predictions
   - Validate data consistency across subjects
   - Report data quality issues
   - Support faculty in understanding ML insights

### Tutor Best Practices

- **Responsible Prediction Management**: Only enable when beneficial
- **Regular Accuracy Review**: Monitor and improve prediction quality
- **Student-Centric Approach**: Prioritize student benefit over convenience
- **Collaborative Communication**: Work closely with faculty and administration
- **Continuous Learning**: Stay updated on ML capabilities and limitations

---

## Administrator Guide

### Administrator Dashboard

The admin dashboard provides comprehensive system management tools:
- User management (students, faculty, tutors)
- Subject and curriculum management
- System-wide announcements
- Student promotion and graduation
- System monitoring and maintenance

### User Management

1. **Creating New Users**
   - Click "Add New User" button
   - Fill in required information:
     - Email and phone number
     - Role selection (Student, Faculty, Tutor, Admin)
     - Personal details
     - Role-specific information
   - System auto-generates unique ID
   - Temporary password is created and sent via email

2. **Managing Existing Users**
   - Search users by name, ID, or email
   - Filter by role, semester, or status
   - Edit user information and roles
   - Reset passwords for users
   - Deactivate/reactivate user accounts

3. **Bulk User Operations**
   - Import users from CSV file
   - Export user lists for external processing
   - Bulk password resets
   - Batch role assignments

4. **User Role Management**
   - Assign/remove faculty roles
   - Grant/revoke tutor privileges
   - Manage admin permissions
   - Configure role-specific access levels

### Subject and Curriculum Management

1. **Subject Creation and Management**
   - Add new subjects with codes and names
   - Set subject type (Theory/Lab)
   - Assign to semesters
   - Configure credit hours
   - Set mark ranges and grading schemes

2. **Faculty-Subject Assignment**
   - Assign faculty to subjects
   - Manage teaching loads
   - Handle subject transfers between faculty
   - Configure co-teaching arrangements

3. **Curriculum Planning**
   - Plan semester-wise subject offerings
   - Manage prerequisite relationships
   - Configure elective subjects
   - Handle curriculum changes

### Student Promotion and Graduation

1. **Semester Promotion**
   - Select students for promotion
   - Batch promote entire semesters
   - Handle individual promotion cases
   - Configure promotion criteria
   - Generate promotion reports

2. **Promotion Process**
   - Review student eligibility
   - Check attendance and performance criteria
   - Handle exceptions and special cases
   - Update student records
   - Notify students and faculty

3. **Graduation Management**
   - Identify graduating students
   - Verify completion requirements
   - Generate graduation lists
   - Archive graduated student data
   - Issue completion certificates

### System-Wide Communication

1. **System Announcements**
   - Create announcements for all users
   - Target specific roles or groups
   - Schedule announcements for future delivery
   - Set priority levels and expiration dates
   - Track announcement reach and engagement

2. **Emergency Communications**
   - Send urgent notifications to all users
   - System maintenance announcements
   - Emergency contact procedures
   - Crisis communication protocols

### System Monitoring and Maintenance

1. **User Activity Monitoring**
   - Track login patterns and usage
   - Monitor system performance
   - Identify inactive users
   - Generate usage reports

2. **Data Management**
   - Database backup and restore
   - Data archival procedures
   - Performance optimization
   - Storage management

3. **Security Management**
   - Monitor failed login attempts
   - Review security logs
   - Manage access controls
   - Update security policies

### System Configuration

1. **General Settings**
   - Configure system-wide parameters
   - Set academic calendar dates
   - Manage notification settings
   - Configure file upload limits

2. **Integration Settings**
   - Email server configuration
   - SMS gateway settings
   - External system integrations
   - API access management

### Administrator Best Practices

- **Regular Backups**: Ensure daily automated backups
- **Security Monitoring**: Review security logs weekly
- **User Support**: Respond to user issues promptly
- **System Updates**: Keep system updated and secure
- **Documentation**: Maintain system configuration documentation

---

## Common Features

### Theme and Appearance

1. **Light/Dark Mode Toggle**
   - Click the theme toggle button in the header
   - System remembers your preference
   - Automatic theme switching based on system preference (optional)

2. **Responsive Design**
   - Works on desktop, tablet, and mobile devices
   - Collapsible sidebar for mobile optimization
   - Touch-friendly interface elements

### Profile Management

1. **Updating Profile Information**
   - Click on profile photo/icon in header
   - Edit personal information
   - Upload/change profile photo
   - Update contact information
   - Change password

2. **Profile Photo Guidelines**
   - Supported formats: JPG, PNG
   - Maximum size: 5MB
   - Recommended dimensions: 400x400 pixels
   - Professional appearance recommended

### Notification System

1. **Notification Types**
   - **System**: Administrative messages
   - **Academic**: Subject-related announcements
   - **Auto**: Automated alerts and reminders

2. **Notification Management**
   - Mark as read/unread
   - Filter by type or date
   - Search notification history
   - Configure notification preferences

### Search and Filtering

1. **Global Search**
   - Search across subjects, students, faculty
   - Quick access to frequently used features
   - Recent activity shortcuts

2. **Advanced Filtering**
   - Filter data by date ranges
   - Sort by various criteria
   - Save frequently used filters
   - Export filtered results

### Data Export and Reporting

1. **Export Options**
   - PDF reports for formal documentation
   - Excel files for data analysis
   - CSV files for data import/export
   - Print-friendly formats

2. **Report Customization**
   - Select data ranges and filters
   - Choose report templates
   - Add custom headers and footers
   - Schedule automated reports

---

## Troubleshooting

### Common Issues and Solutions

#### Login Problems

**Issue**: Cannot login with credentials
**Solutions**:
1. Verify you're using the correct identifier (ID, email, or phone)
2. Check if Caps Lock is on
3. Try password reset if you've forgotten it
4. Contact administrator if account is locked
5. Clear browser cache and cookies

**Issue**: "Account locked" message
**Solutions**:
1. Wait 15 minutes and try again
2. Contact administrator for immediate unlock
3. Verify you're not using an old password

#### Dashboard Loading Issues

**Issue**: Dashboard not loading or showing errors
**Solutions**:
1. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Check internet connection
3. Try a different browser
4. Disable browser extensions temporarily
5. Clear browser cache

**Issue**: Data not updating
**Solutions**:
1. Refresh the page
2. Check if you have the latest permissions
3. Verify data was saved properly
4. Contact faculty/admin if data is missing

#### File Upload Problems

**Issue**: Cannot upload profile photo or documents
**Solutions**:
1. Check file size (max 5MB for photos, 10MB for documents)
2. Verify file format (JPG, PNG for photos; PDF, DOC for documents)
3. Try a different file
4. Check internet connection stability
5. Contact administrator if problem persists

#### Performance Issues

**Issue**: System running slowly
**Solutions**:
1. Close unnecessary browser tabs
2. Check internet connection speed
3. Try during off-peak hours
4. Clear browser cache
5. Use a different browser

#### Mobile Device Issues

**Issue**: Interface not working properly on mobile
**Solutions**:
1. Use landscape orientation for better experience
2. Update your mobile browser
3. Try the desktop version if mobile version has issues
4. Ensure you have a stable internet connection

#### Notification Problems

**Issue**: Not receiving notifications
**Solutions**:
1. Check notification settings in your profile
2. Verify email address is correct
3. Check spam/junk folder for emails
4. Ensure browser notifications are enabled
5. Contact administrator to verify notification settings

### Getting Help

#### Self-Service Options

1. **Help Documentation**
   - User manual (this document)
   - FAQ section
   - Video tutorials (if available)
   - System status page

2. **In-App Help**
   - Tooltips and help text
   - Contextual help buttons
   - Quick start guides
   - Feature walkthroughs

#### Contacting Support

1. **Internal Support**
   - Contact your system administrator
   - Reach out to IT support team
   - Use internal help desk system

2. **Technical Support**
   - Email: support@visiongrade.com
   - Include your user ID and role
   - Describe the issue in detail
   - Attach screenshots if helpful

3. **Emergency Support**
   - For critical system issues
   - Contact administrator immediately
   - Use alternative communication methods if system is down

#### Reporting Bugs

1. **Bug Report Information**
   - Describe what you were trying to do
   - Explain what happened vs. what you expected
   - Include steps to reproduce the issue
   - Note your browser and operating system
   - Attach screenshots or error messages

2. **Bug Report Channels**
   - Use in-app bug report feature
   - Email technical support
   - Contact system administrator
   - Use designated bug tracking system

### System Maintenance

#### Scheduled Maintenance

- System maintenance typically occurs during off-peak hours
- Users are notified 24-48 hours in advance
- Maintenance windows are usually 2-4 hours
- System status is updated during maintenance

#### Emergency Maintenance

- May occur without advance notice for critical issues
- Users are notified as soon as possible
- Updates provided regularly during maintenance
- System restored as quickly as possible

### Best Practices for All Users

1. **Regular Usage**
   - Log in regularly to stay updated
   - Check notifications frequently
   - Keep profile information current

2. **Security Practices**
   - Use strong, unique passwords
   - Log out when finished, especially on shared computers
   - Don't share login credentials
   - Report suspicious activity

3. **Data Management**
   - Save work frequently
   - Keep local backups of important data
   - Verify data accuracy before submitting
   - Report data discrepancies immediately

4. **Communication**
   - Read all notifications and announcements
   - Respond to requests promptly
   - Use appropriate channels for different types of communication
   - Be professional in all system interactions

---

## Conclusion

VisionGrade is designed to be intuitive and user-friendly while providing powerful features for academic management. This manual covers the most common use cases and features, but the system is continuously evolving with new capabilities.

For the most up-to-date information, always refer to the in-app help system and contact your administrator or support team when you need assistance.

Remember that effective use of VisionGrade requires regular engagement from all users - students monitoring their progress, faculty maintaining accurate records, and administrators ensuring smooth system operation.

**Version**: 1.0  
**Last Updated**: October 2024  
**Next Review**: January 2025