import React, { useState, useEffect, Suspense } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import studentService from '../../services/studentService';
import LoadingSpinner from '../common/LoadingSpinner';
import Card, { StatsCard, ActionCard } from '../common/Card';
import Button from '../common/Button';
import { 
  LazyMarksDisplay,
  LazyAttendanceVisualization,
  LazyPredictedMarks,
  LazyNotificationCenter,
  LazyReportCardDownload
} from '../../utils/lazyLoading';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load all dashboard data in parallel
      const [marksRes, attendanceRes, predictionsRes, notificationsRes] = await Promise.allSettled([
        studentService.getMarks(),
        studentService.getAttendance(),
        studentService.getPredictions(),
        studentService.getNotifications()
      ]);

      // Handle marks data
      if (marksRes.status === 'fulfilled') {
        setMarks(marksRes.value.marks || []);
      } else {
        console.error('Failed to load marks:', marksRes.reason);
        setMarks([]); // Empty state instead of mock data
        toast.error('Failed to load marks data');
      }

      // Handle attendance data
      if (attendanceRes.status === 'fulfilled') {
        setAttendance(attendanceRes.value.attendance || []);
      } else {
        console.error('Failed to load attendance:', attendanceRes.reason);
        setAttendance([]); // Empty state instead of mock data
        toast.error('Failed to load attendance data');
      }

      // Handle predictions data
      if (predictionsRes.status === 'fulfilled') {
        setPredictions(predictionsRes.value.predictions || []);
      } else {
        console.error('Failed to load predictions:', predictionsRes.reason);
        setPredictions([]); // Empty state instead of mock data
      }

      // Handle notifications data
      if (notificationsRes.status === 'fulfilled') {
        setNotifications(notificationsRes.value.notifications || []);
      } else {
        console.error('Failed to load notifications:', notificationsRes.reason);
        setNotifications([]); // Empty state instead of mock data
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationRead = async (notificationId) => {
    try {
      await studentService.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" text="Loading your dashboard..." />
      </div>
    );
  }

  // Calculate quick stats
  const totalSubjects = marks.length;
  const averageAttendance = attendance.length > 0 
    ? (attendance.reduce((sum, att) => sum + att.attendance_percentage, 0) / attendance.length).toFixed(1)
    : 0;
  const lowAttendanceCount = attendance.filter(att => att.attendance_percentage < 75).length;
  const visiblePredictions = predictions.filter(pred => pred.is_visible_to_student).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card glass className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Student Dashboard
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Welcome back, {user?.student_name || user?.fullName || 'Student'} 👋
            </p>
          </div>
          <Suspense fallback={<LoadingSpinner size="small" />}>
            <LazyNotificationCenter 
              notifications={notifications}
              onNotificationRead={handleNotificationRead}
            />
          </Suspense>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Subjects"
          value={totalSubjects}
          icon="📚"
          className="animate-slide-in-up"
        />
        <StatsCard
          title="Average Attendance"
          value={`${averageAttendance}%`}
          icon="📅"
          trend={averageAttendance >= 85 ? 'up' : averageAttendance >= 75 ? 'neutral' : 'down'}
          trendValue={averageAttendance >= 75 ? 'Good' : 'Needs Improvement'}
          className="animate-slide-in-up"
          style={{ animationDelay: '0.1s' }}
        />
        <StatsCard
          title="Low Attendance Alerts"
          value={lowAttendanceCount}
          icon="⚠️"
          trend={lowAttendanceCount === 0 ? 'up' : 'down'}
          trendValue={lowAttendanceCount === 0 ? 'All Good' : 'Action Needed'}
          className="animate-slide-in-up"
          style={{ animationDelay: '0.2s' }}
        />
        <StatsCard
          title="ML Predictions"
          value={visiblePredictions}
          icon="🔮"
          className="animate-slide-in-up"
          style={{ animationDelay: '0.3s' }}
        />
      </div>

      {/* Navigation Tabs */}
      <Card glass className="p-2">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'marks', label: 'Marks', icon: '📝' },
            { id: 'attendance', label: 'Attendance', icon: '📅' },
            { id: 'predictions', label: 'Predictions', icon: '🔮' }
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? 'primary' : 'ghost'}
              size="medium"
              glass={activeTab !== tab.id}
              className={`flex-1 min-w-0 transition-all-smooth ${
                activeTab === tab.id ? 'animate-scale-in' : ''
              }`}
              icon={<span className="mr-1">{tab.icon}</span>}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.icon}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
            <div className="space-y-6">
              <Suspense fallback={<LoadingSpinner size="small" />}>
                <LazyMarksDisplay marks={marks} showSummary={true} />
              </Suspense>
              <Suspense fallback={<LoadingSpinner size="small" />}>
                <LazyAttendanceVisualization attendance={attendance} showSummary={true} />
              </Suspense>
            </div>
            <div className="space-y-6">
              <Suspense fallback={<LoadingSpinner size="small" />}>
                <LazyPredictedMarks predictions={predictions} />
              </Suspense>
              <Suspense fallback={<LoadingSpinner size="small" />}>
                <LazyReportCardDownload />
              </Suspense>
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div className="animate-fade-in">
            <Suspense fallback={<LoadingSpinner size="medium" />}>
              <LazyMarksDisplay marks={marks} showSummary={false} />
            </Suspense>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="animate-fade-in">
            <Suspense fallback={<LoadingSpinner size="medium" />}>
              <LazyAttendanceVisualization attendance={attendance} showSummary={false} />
            </Suspense>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="animate-fade-in">
            <Suspense fallback={<LoadingSpinner size="medium" />}>
              <LazyPredictedMarks predictions={predictions} showDetails={true} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;