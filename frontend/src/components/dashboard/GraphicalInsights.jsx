import React, { useState, useEffect } from 'react';
import facultyService from '../../services/facultyService';

const GraphicalInsights = ({ subject }) => {
  const [insights, setInsights] = useState(null);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    if (subject) {
      loadInsightsData();
    }
  }, [subject]);

  const loadInsightsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load insights, performance stats, and attendance stats
      const [insightsResponse, performanceResponse, attendanceResponse] = await Promise.all([
        facultyService.generateInsights(subject.id).catch(() => ({ success: false })),
        facultyService.getPerformanceStatistics(subject.id).catch(() => ({ success: false })),
        facultyService.getAttendanceStatistics(subject.id).catch(() => ({ success: false }))
      ]);

      if (insightsResponse.success) {
        setInsights(insightsResponse.data);
      }

      if (performanceResponse.success) {
        setPerformanceStats(performanceResponse.data.statistics[0]?.statistics);
      }

      if (attendanceResponse.success) {
        setAttendanceStats(attendanceResponse.data.statistics[0]?.statistics);
      }
    } catch (err) {
      console.error('Error loading insights data:', err);
      setError('Failed to load insights data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPieChart = (data, title, colors = ['#10B981', '#EF4444', '#F59E0B']) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No data available for {title}</p>
        </div>
      );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No data available for {title}</p>
        </div>
      );
    }

    let cumulativePercentage = 0;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="20"
              />
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const strokeDasharray = `${percentage * 5.03} 502`;
                const strokeDashoffset = -cumulativePercentage * 5.03;
                cumulativePercentage += percentage;

                return (
                  <circle
                    key={index}
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {item.value} ({((item.value / total) * 100).toFixed(1)}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = (data, title, color = '#3B82F6') => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No data available for {title}</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(item => item.value));

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-24 text-sm text-gray-700 mr-4">{item.label}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div
                  className="h-6 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: color,
                    width: `${(item.value / maxValue) * 100}%`
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Graphical Insights - {subject.subject_name}
          </h3>
          <p className="text-sm text-gray-500">
            Visual analytics for {subject.subject_code}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-3 py-2 text-sm rounded-md ${
              selectedView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('performance')}
            className={`px-3 py-2 text-sm rounded-md ${
              selectedView === 'performance'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setSelectedView('attendance')}
            className={`px-3 py-2 text-sm rounded-md ${
              selectedView === 'attendance'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Attendance
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pass/Fail Distribution */}
          {performanceStats && (
            renderPieChart([
              { label: 'Passed', value: performanceStats.students_passed || 0 },
              { label: 'Failed', value: performanceStats.students_failed || 0 }
            ], 'Pass/Fail Distribution', ['#10B981', '#EF4444'])
          )}

          {/* Attendance Distribution */}
          {attendanceStats && (
            renderPieChart([
              { label: 'Above 75%', value: attendanceStats.students_above_threshold || 0 },
              { label: 'Below 75%', value: attendanceStats.students_below_threshold || 0 }
            ], 'Attendance Distribution', ['#10B981', '#EF4444'])
          )}
        </div>
      )}

      {/* Performance Tab */}
      {selectedView === 'performance' && (
        <div className="space-y-6">
          {performanceStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grade Distribution */}
              {performanceStats.grade_distribution && (
                renderPieChart(
                  Object.entries(performanceStats.grade_distribution).map(([grade, count]) => ({
                    label: `Grade ${grade}`,
                    value: count
                  })),
                  'Grade Distribution',
                  ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']
                )
              )}

              {/* Exam Type Performance */}
              {performanceStats.exam_type_averages && (
                renderBarChart(
                  Object.entries(performanceStats.exam_type_averages).map(([examType, avg]) => ({
                    label: examType.replace('_', ' ').toUpperCase(),
                    value: Math.round(avg * 100) / 100
                  })),
                  'Average Marks by Exam Type',
                  '#3B82F6'
                )
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No performance data available</p>
            </div>
          )}

          {/* Performance Summary */}
          {performanceStats && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceStats.total_students || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {performanceStats.students_passed || 0}
                  </div>
                  <div className="text-sm text-gray-500">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {performanceStats.students_failed || 0}
                  </div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {performanceStats.average_percentage ? 
                      `${Math.round(performanceStats.average_percentage)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Average</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Tab */}
      {selectedView === 'attendance' && (
        <div className="space-y-6">
          {attendanceStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Range Distribution */}
              {attendanceStats.attendance_ranges && (
                renderPieChart(
                  Object.entries(attendanceStats.attendance_ranges).map(([range, count]) => ({
                    label: range,
                    value: count
                  })),
                  'Attendance Range Distribution',
                  ['#EF4444', '#F59E0B', '#10B981', '#3B82F6']
                )
              )}

              {/* Monthly Attendance Trend */}
              {attendanceStats.monthly_trend && (
                renderBarChart(
                  attendanceStats.monthly_trend.map(item => ({
                    label: item.month,
                    value: Math.round(item.average_attendance)
                  })),
                  'Monthly Attendance Trend',
                  '#10B981'
                )
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No attendance data available</p>
            </div>
          )}

          {/* Attendance Summary */}
          {attendanceStats && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {attendanceStats.total_students || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {attendanceStats.students_above_threshold || 0}
                  </div>
                  <div className="text-sm text-gray-500">Above 75%</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {attendanceStats.students_below_threshold || 0}
                  </div>
                  <div className="text-sm text-gray-500">Below 75%</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {attendanceStats.average_attendance ? 
                      `${Math.round(attendanceStats.average_attendance)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Average</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadInsightsData}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default GraphicalInsights;