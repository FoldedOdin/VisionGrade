import React, { useState, useEffect } from 'react';
import facultyService from '../../services/facultyService';
import MarksEntryForm from './MarksEntryForm';
import AttendanceManagement from './AttendanceManagement';
import GraphicalInsights from './GraphicalInsights';
import AnnouncementSystem from './AnnouncementSystem';
import AtRiskStudentAlerts from './AtRiskStudentAlerts';
import PredictionControls from './PredictionControls';

const FacultyDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dashboard data and subjects in parallel
      const [dashboardResponse, subjectsResponse] = await Promise.all([
        facultyService.getDashboard(),
        facultyService.getSubjects()
      ]);

      if (dashboardResponse.success) {
        setDashboardData(dashboardResponse.data);
      }

      if (subjectsResponse.success) {
        setSubjects(subjectsResponse.data.subjects);
        // Set first subject as default selected
        if (subjectsResponse.data.subjects.length > 0) {
          setSelectedSubject(subjectsResponse.data.subjects[0]);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    // Reset to overview tab when changing subjects
    setActiveTab('overview');
  };

  const handleDataUpdate = () => {
    // Refresh dashboard data when marks/attendance are updated
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading faculty dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 rounded-lg mb-6">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Faculty Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {dashboardData?.faculty_info?.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium text-gray-900">
                  {dashboardData?.faculty_info?.department || 'N/A'}
                </p>
              </div>
              {dashboardData?.faculty_info?.is_tutor && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Tutor - Semester {dashboardData.faculty_info.tutor_semester}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {subjects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.dashboard_statistics?.total_students || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">At Risk Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.dashboard_statistics?.students_at_risk || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 4.828A4 4 0 015.5 4H9v1H5.5a3 3 0 00-2.121.879l-.707.707A1 1 0 002 7.414V16.5A1.5 1.5 0 003.5 18H12v1H3.5A2.5 2.5 0 011 16.5V7.414a2 2 0 01.586-1.414l1.242-1.242z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Low Attendance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.dashboard_statistics?.low_attendance_alerts || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Selection */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Select Subject</h2>
          </div>
          <div className="p-6">
            {subjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Assigned</h3>
                <p className="text-gray-500 mb-4">
                  You don't have any subjects assigned yet. Contact your administrator to get subjects assigned to your account.
                </p>
                <button
                  onClick={loadDashboardData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    onClick={() => handleSubjectChange(subject)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedSubject?.id === subject.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{subject.subject_name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subject.subject_type === 'theory' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {subject.subject_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{subject.subject_code}</p>
                    <div className="text-xs text-gray-400">
                      <p>Semester {subject.semester} • {subject.credits} Credits</p>
                      <p>{subject.statistics?.enrolled_students || 0} Students</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Tabs */}
        {selectedSubject && (
          <div className="bg-white rounded-lg shadow">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', name: 'Overview', icon: '📊' },
                  { id: 'marks', name: 'Marks Entry', icon: '📝' },
                  { id: 'attendance', name: 'Attendance', icon: '📅' },
                  { id: 'insights', name: 'Insights', icon: '📈' },
                  { id: 'announcements', name: 'Announcements', icon: '📢' },
                  { id: 'alerts', name: 'At-Risk Alerts', icon: '⚠️' },
                  ...(dashboardData?.faculty_info?.is_tutor ? [
                    { id: 'predictions', name: 'ML Predictions', icon: '🤖' }
                  ] : [])
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {selectedSubject.subject_name} Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Enrollment</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedSubject.statistics?.enrolled_students || 0}
                        </p>
                        <p className="text-sm text-gray-500">Total Students</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Marks Progress</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedSubject.statistics?.marks_completion_rate || 0}%
                        </p>
                        <p className="text-sm text-gray-500">Completion Rate</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Attendance</h4>
                        <p className="text-2xl font-bold text-yellow-600">
                          {selectedSubject.statistics?.average_attendance || 0}%
                        </p>
                        <p className="text-sm text-gray-500">Average</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'marks' && (
                <MarksEntryForm 
                  subject={selectedSubject} 
                  onDataUpdate={handleDataUpdate}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceManagement 
                  subject={selectedSubject} 
                  onDataUpdate={handleDataUpdate}
                />
              )}

              {activeTab === 'insights' && (
                <GraphicalInsights subject={selectedSubject} />
              )}

              {activeTab === 'announcements' && (
                <AnnouncementSystem subject={selectedSubject} />
              )}

              {activeTab === 'alerts' && (
                <AtRiskStudentAlerts subject={selectedSubject} />
              )}

              {activeTab === 'predictions' && dashboardData?.faculty_info?.is_tutor && (
                <PredictionControls 
                  subject={selectedSubject} 
                  userRole="tutor"
                />
              )}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activities</h2>
          </div>
          <div className="p-6">
            {dashboardData?.dashboard_statistics?.recent_activities?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.dashboard_statistics.recent_activities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString()} at{' '}
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 opacity-50">📋</div>
                <p className="text-gray-500">No recent activities to display.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Activities will appear here as you interact with the system.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;