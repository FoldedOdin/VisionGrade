# Student Dashboard Components

This directory contains the implementation of the student dashboard interface for VisionGrade, fulfilling task 10 from the implementation plan.

## Components Overview

### StudentDashboard.jsx
The main dashboard component that orchestrates all student-related functionality:
- **Responsive Layout**: Adapts to different screen sizes with mobile-first design
- **Tab Navigation**: Overview, Marks, Attendance, and Predictions tabs
- **Data Loading**: Handles API calls with fallback to mock data for development
- **Error Handling**: Graceful degradation when services are unavailable

### MarksDisplay.jsx
Displays academic marks for all registered subjects:
- **Theory Subjects**: Shows Series Test I, Series Test II, and University exam marks
- **Lab Subjects**: Shows Lab Internal and University exam marks
- **Color Coding**: Visual indicators for performance levels (green=excellent, yellow=good, orange=fair, red=poor)
- **Summary View**: Condensed overview for the main dashboard
- **Detailed View**: Complete marks table with all subjects

### AttendanceVisualization.jsx
Visualizes attendance tracking with percentages:
- **Progress Bars**: Visual representation of attendance percentage
- **Color Coding**: Performance-based colors with 75% threshold marker
- **Low Attendance Alerts**: Highlights subjects below 75% attendance
- **Statistics**: Overall attendance calculation and subject-wise breakdown
- **Responsive Design**: Adapts to different screen sizes

### PredictedMarks.jsx
Shows ML-powered university exam predictions:
- **Visibility Control**: Respects faculty toggle settings for prediction visibility
- **Confidence Scores**: Displays prediction confidence with visual indicators
- **Grade Predictions**: Shows expected grades (A, B, C, F) based on predicted marks
- **Hidden Predictions**: Option to view predictions hidden by faculty
- **Disclaimer**: Clear information about prediction accuracy and limitations

### NotificationCenter.jsx
Animated notification system with bell icon:
- **Real-time Updates**: Animated bell icon when new notifications arrive
- **Categorization**: System, Academic, and Auto notification types
- **Read/Unread Status**: Visual indicators and read status management
- **Dropdown Interface**: Glassmorphism-styled notification panel
- **Time Stamps**: Relative time display (e.g., "2h ago", "Just now")

### ReportCardDownload.jsx
Report card generation and download functionality:
- **Format Selection**: PDF and DOC format options
- **Download Progress**: Loading states during report generation
- **Report Information**: Clear description of included content
- **Error Handling**: User-friendly error messages for failed downloads

### LoadingSpinner.jsx
Reusable loading component:
- **Multiple Sizes**: Small, medium, large, and extra-large variants
- **Color Options**: White, blue, green, and purple color schemes
- **Smooth Animation**: CSS-based spinning animation

## Features Implemented

### ✅ Responsive Design
- Mobile-first approach with breakpoints for tablet and desktop
- Flexible grid layouts that adapt to screen size
- Touch-friendly interface elements

### ✅ Marks Display
- Complete marks for all registered subjects (6 theory + 2 lab default)
- Series Test I and II marks (0-50 range validation)
- Lab Internal marks (0-100 range validation)
- University exam marks display
- Color-coded performance indicators

### ✅ Attendance Tracking
- Percentage-based attendance calculation
- Visual progress bars with 75% threshold markers
- Low attendance alerts and warnings
- Subject-wise attendance breakdown
- Overall attendance statistics

### ✅ ML Predictions
- Subject-specific university exam predictions
- Confidence score visualization
- Faculty-controlled visibility toggle
- Grade predictions (A/B/C/F)
- Prediction accuracy disclaimers

### ✅ Notification System
- Animated bell icon with bounce effect
- Unread notification counter with badge
- Categorized notifications (System/Academic/Auto)
- Real-time read status updates
- Glassmorphism-styled dropdown interface

### ✅ Report Card Download
- PDF and DOC format selection
- Progress indicators during generation
- Comprehensive report content description
- Error handling and user feedback

## Technical Implementation

### State Management
- React hooks for local component state
- Custom useAuth hook for authentication context
- Efficient data loading with Promise.allSettled

### API Integration
- Dedicated studentService for all API calls
- Axios interceptors for authentication and error handling
- Graceful fallback to mock data during development

### Styling
- Tailwind CSS for responsive design
- Glassmorphism effects with backdrop-filter
- Gradient backgrounds and smooth transitions
- Heroicons for consistent iconography

### Error Handling
- Try-catch blocks for all async operations
- User-friendly error messages with react-hot-toast
- Graceful degradation when services are unavailable
- Loading states for better user experience

## Mock Data
For development and testing, the components include comprehensive mock data:
- 8 subjects (6 theory + 2 lab) with realistic marks
- Attendance data with various percentage levels
- ML predictions with confidence scores
- Sample notifications of different types

## Requirements Fulfilled

This implementation satisfies the following requirements from the specification:

- **2.1**: Display marks for all registered subjects ✅
- **2.2**: Show 6 theory and 2 lab subjects by default ✅
- **2.3**: Calculate and display percentage-based attendance ✅
- **2.4**: Display ML predictions when enabled by faculty ✅
- **3.1**: Display notifications with animated bell icon ✅
- **3.3**: Generate downloadable PDF/DOC report cards ✅
- **10.2**: Responsive design for all device types ✅
- **10.3**: Smooth transitions and animations ✅

## Usage

### Basic Usage
```jsx
import StudentDashboard from './components/dashboard/StudentDashboard';

function App() {
  return <StudentDashboard />;
}
```

### Individual Components
```jsx
import MarksDisplay from './components/dashboard/MarksDisplay';
import AttendanceVisualization from './components/dashboard/AttendanceVisualization';

function CustomDashboard() {
  return (
    <div>
      <MarksDisplay marks={marksData} showSummary={true} />
      <AttendanceVisualization attendance={attendanceData} showSummary={false} />
    </div>
  );
}
```

### Demo Page
Visit `/demo` route to see all components with mock data in action.

## Testing
- Unit tests for individual components
- Integration tests for dashboard functionality
- Mock service implementations for isolated testing
- Responsive design testing across device sizes

## Future Enhancements
- Real-time updates via WebSocket connections
- Offline support with service workers
- Advanced filtering and sorting options
- Export functionality for individual components
- Accessibility improvements (ARIA labels, keyboard navigation)