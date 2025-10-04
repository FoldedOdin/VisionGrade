import React from 'react';
import MarksDisplay from './MarksDisplay';
import AttendanceVisualization from './AttendanceVisualization';
import PredictedMarks from './PredictedMarks';
import NotificationCenter from './NotificationCenter';
import ReportCardDownload from './ReportCardDownload';

const DashboardDemo = () => {
  // Mock data for testing
  const mockMarks = [
    { id: 1, subject: { subject_name: 'Mathematics', subject_code: 'MATH101', subject_type: 'theory' }, series_test_1: 42, series_test_2: 38, lab_internal: null, university: null },
    { id: 2, subject: { subject_name: 'Physics', subject_code: 'PHY101', subject_type: 'theory' }, series_test_1: 45, series_test_2: 41, lab_internal: null, university: null },
    { id: 3, subject: { subject_name: 'Chemistry', subject_code: 'CHE101', subject_type: 'theory' }, series_test_1: 39, series_test_2: 43, lab_internal: null, university: null },
    { id: 4, subject: { subject_name: 'Physics Lab', subject_code: 'PHYL101', subject_type: 'lab' }, series_test_1: null, series_test_2: null, lab_internal: 85, university: null },
    { id: 5, subject: { subject_name: 'Chemistry Lab', subject_code: 'CHEL101', subject_type: 'lab' }, series_test_1: null, series_test_2: null, lab_internal: 88, university: null }
  ];

  const mockAttendance = [
    { id: 1, subject: { subject_name: 'Mathematics', subject_code: 'MATH101' }, total_classes: 45, attended_classes: 42, attendance_percentage: 93.33 },
    { id: 2, subject: { subject_name: 'Physics', subject_code: 'PHY101' }, total_classes: 40, attended_classes: 35, attendance_percentage: 87.50 },
    { id: 3, subject: { subject_name: 'Chemistry', subject_code: 'CHE101' }, total_classes: 38, attended_classes: 28, attendance_percentage: 73.68 }
  ];

  const mockPredictions = [
    { id: 1, subject: { subject_name: 'Mathematics', subject_code: 'MATH101' }, predicted_marks: 78.5, confidence_score: 0.85, is_visible_to_student: true },
    { id: 2, subject: { subject_name: 'Physics', subject_code: 'PHY101' }, predicted_marks: 82.3, confidence_score: 0.88, is_visible_to_student: true }
  ];

  const mockNotifications = [
    { id: 1, title: 'Low Attendance Alert', message: 'Your attendance in Chemistry is below 75%.', notification_type: 'auto', is_read: false, created_at: '2025-10-01T10:30:00Z' },
    { id: 2, title: 'Assignment Reminder', message: 'Mathematics assignment due tomorrow.', notification_type: 'academic', is_read: false, created_at: '2025-10-01T09:15:00Z' }
  ];

  const handleNotificationRead = (id) => {
    console.log('Notification read:', id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard Components Demo</h1>
          <NotificationCenter 
            notifications={mockNotifications}
            onNotificationRead={handleNotificationRead}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <MarksDisplay marks={mockMarks} showSummary={true} />
            <AttendanceVisualization attendance={mockAttendance} showSummary={true} />
          </div>
          <div className="space-y-6">
            <PredictedMarks predictions={mockPredictions} />
            <ReportCardDownload />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Detailed Views</h2>
          <div className="space-y-6">
            <MarksDisplay marks={mockMarks} showSummary={false} />
            <AttendanceVisualization attendance={mockAttendance} showSummary={false} />
            <PredictedMarks predictions={mockPredictions} showDetails={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardDemo;