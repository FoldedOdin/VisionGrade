import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  UserCheck, 
  Settings,
  TrendingUp,
  Bell,
  Plus
} from 'lucide-react';
import adminService from '../../services/adminService';
import UserManagement from './admin/UserManagement';
import TutorAssignment from './admin/TutorAssignment';
import SubjectManagement from './admin/SubjectManagement';
import FacultyAssignment from './admin/FacultyAssignment';
import SystemAnnouncements from './admin/SystemAnnouncements';
import StudentPromotion from './admin/StudentPromotion';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboardData();
      setDashboardData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'tutors', label: 'Tutor Assignment', icon: UserCheck },
    { id: 'subjects', label: 'Subject Management', icon: BookOpen },
    { id: 'faculty-assignments', label: 'Faculty Assignments', icon: Settings },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'promotion', label: 'Student Promotion', icon: GraduationCap }
  ];

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading dashboard</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage users, subjects, and system settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <Settings className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Users"
                value={dashboardData?.totalUsers || 0}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Active Students"
                value={dashboardData?.activeStudents || 0}
                icon={GraduationCap}
                color="green"
              />
              <StatCard
                title="Faculty Members"
                value={dashboardData?.totalFaculty || 0}
                icon={UserCheck}
                color="purple"
              />
              <StatCard
                title="Total Subjects"
                value={dashboardData?.totalSubjects || 0}
                icon={BookOpen}
                color="orange"
              />
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Students</span>
                    <span className="font-semibold text-green-600">
                      {dashboardData?.activeStudents || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Graduated Students</span>
                    <span className="font-semibold text-blue-600">
                      {dashboardData?.graduatedStudents || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New User</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('subjects')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Subject</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('faculty-assignments')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Assign Subjects</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                    <span>Send Announcement</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'tutors' && <TutorAssignment />}
        {activeTab === 'subjects' && <SubjectManagement />}
        {activeTab === 'faculty-assignments' && <FacultyAssignment />}
        {activeTab === 'announcements' && <SystemAnnouncements />}
        {activeTab === 'promotion' && <StudentPromotion />}
      </div>
    </div>
  );
};

export default AdminDashboard;