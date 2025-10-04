import React from 'react';
import { CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AttendanceVisualization = ({ attendance = [], showSummary = false }) => {
  // Calculate overall attendance statistics
  const calculateOverallStats = () => {
    if (!attendance || attendance.length === 0) return { average: 0, totalClasses: 0, totalAttended: 0 };
    
    const totalClasses = attendance.reduce((sum, att) => sum + att.total_classes, 0);
    const totalAttended = attendance.reduce((sum, att) => sum + att.attended_classes, 0);
    const average = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;
    
    return { average: average.toFixed(1), totalClasses, totalAttended };
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 75) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getAttendanceBackground = (percentage) => {
    if (percentage >= 90) return 'bg-green-900 bg-opacity-30';
    if (percentage >= 80) return 'bg-blue-900 bg-opacity-30';
    if (percentage >= 75) return 'bg-yellow-900 bg-opacity-30';
    if (percentage >= 60) return 'bg-orange-900 bg-opacity-30';
    return 'bg-red-900 bg-opacity-30';
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-400';
    if (percentage >= 80) return 'bg-blue-400';
    if (percentage >= 75) return 'bg-yellow-400';
    if (percentage >= 60) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const overallStats = calculateOverallStats();
  const lowAttendanceSubjects = attendance.filter(att => att.attendance_percentage < 75);

  if (showSummary) {
    return (
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
        <div className="flex items-center mb-4">
          <CalendarDaysIcon className="h-6 w-6 text-blue-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">Attendance Summary</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Overall Attendance</h3>
            <div className="text-3xl font-bold text-white">{overallStats.average}%</div>
            <div className="text-xs text-blue-200">
              {overallStats.totalAttended} / {overallStats.totalClasses} classes
            </div>
          </div>
          
          <div className="bg-purple-900 bg-opacity-30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-300 mb-2">Subjects Tracked</h3>
            <div className="text-3xl font-bold text-white">{attendance.length}</div>
            <div className="text-xs text-purple-200">Active subjects</div>
          </div>
        </div>

        {lowAttendanceSubjects.length > 0 && (
          <div className="bg-red-900 bg-opacity-20 border border-red-400 border-opacity-30 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <h3 className="text-sm font-medium text-red-300">Low Attendance Alert</h3>
            </div>
            <p className="text-xs text-red-200 mb-2">
              {lowAttendanceSubjects.length} subject(s) below 75% attendance threshold
            </p>
            <div className="space-y-1">
              {lowAttendanceSubjects.map((att) => (
                <div key={att.id} className="text-xs text-red-200">
                  {att.subject.subject_name}: {att.attendance_percentage.toFixed(1)}%
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CalendarDaysIcon className="h-6 w-6 text-blue-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">Attendance Tracking</h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{overallStats.average}%</div>
          <div className="text-xs text-white text-opacity-60">Overall</div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="space-y-4">
        {attendance && attendance.map((att) => (
          <div key={att.id} className="bg-white bg-opacity-5 rounded-lg p-4 hover:bg-opacity-10 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white font-medium">{att.subject.subject_name}</h3>
                <p className="text-white text-opacity-60 text-sm">{att.subject.subject_code}</p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getAttendanceColor(att.attendance_percentage)}`}>
                  {att.attendance_percentage ? att.attendance_percentage.toFixed(1) : '0.0'}%
                </div>
                <div className="text-xs text-white text-opacity-60">
                  {att.attended_classes} / {att.total_classes} classes
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative">
              <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(att.attendance_percentage)}`}
                  style={{ width: `${Math.min(att.attendance_percentage, 100)}%` }}
                ></div>
              </div>
              {/* 75% threshold marker */}
              <div className="absolute top-0 left-3/4 w-0.5 h-2 bg-white bg-opacity-60"></div>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4 text-xs">
                <span className="text-white text-opacity-60">
                  Classes missed: {att.total_classes - att.attended_classes}
                </span>
                {att.attendance_percentage < 75 && (
                  <span className="flex items-center text-red-400">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    Below 75%
                  </span>
                )}
              </div>
              <div className="text-xs text-white text-opacity-60">
                75% minimum required
              </div>
            </div>
          </div>
        ))}
      </div>

      {attendance.length === 0 && (
        <div className="text-center py-8">
          <CalendarDaysIcon className="h-12 w-12 text-white text-opacity-40 mx-auto mb-4" />
          <p className="text-white text-opacity-60">No attendance data available</p>
          <p className="text-white text-opacity-40 text-sm">Attendance will be tracked once classes begin</p>
        </div>
      )}

      {/* Legend */}
      {attendance.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white border-opacity-20">
          <h4 className="text-sm font-medium text-white text-opacity-80 mb-2">Attendance Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
              <span className="text-white text-opacity-60">90%+ Excellent</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
              <span className="text-white text-opacity-60">80-89% Good</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
              <span className="text-white text-opacity-60">75-79% Fair</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
              <span className="text-white text-opacity-60">60-74% Poor</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
              <span className="text-white text-opacity-60">&lt;60% Critical</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceVisualization;