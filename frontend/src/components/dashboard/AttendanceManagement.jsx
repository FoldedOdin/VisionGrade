import React, { useState, useEffect } from 'react';
import facultyService from '../../services/facultyService';

const AttendanceManagement = ({ subject, onDataUpdate }) => {
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (subject) {
      loadAttendanceData();
    }
  }, [subject]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load both students and attendance data
      const [studentsResponse, attendanceResponse] = await Promise.all([
        facultyService.getSubjectStudents(subject.id),
        facultyService.getSubjectAttendance(subject.id)
      ]);

      if (studentsResponse.success) {
        setStudents(studentsResponse.data.students);
        
        // Initialize attendance data from existing records
        const initialAttendanceData = {};
        studentsResponse.data.students.forEach(studentData => {
          if (studentData.attendance) {
            initialAttendanceData[studentData.student.id] = {
              total_classes: studentData.attendance.total_classes,
              attended_classes: studentData.attendance.attended_classes,
              attendance_percentage: studentData.attendance.attendance_percentage
            };
          }
        });
        setAttendanceData(initialAttendanceData);
      }

      if (attendanceResponse.success) {
        setStatistics(attendanceResponse.data.statistics);
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
      setError('Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, field, value) => {
    const numValue = parseInt(value) || 0;
    
    setAttendanceData(prev => {
      const updated = {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [field]: numValue
        }
      };

      // Calculate percentage if both values are present
      const studentData = updated[studentId];
      if (studentData.total_classes && studentData.total_classes > 0) {
        studentData.attendance_percentage = Math.round(
          (studentData.attended_classes / studentData.total_classes) * 100 * 100
        ) / 100;
      }

      return updated;
    });
  };

  const handleSingleSave = async (studentId) => {
    const studentAttendance = attendanceData[studentId];
    if (!studentAttendance || !studentAttendance.total_classes) {
      setError('Please enter total classes for the student.');
      return;
    }

    if (studentAttendance.attended_classes > studentAttendance.total_classes) {
      setError('Attended classes cannot be more than total classes.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const attendanceEntry = {
        student_id: studentId,
        subject_id: subject.id,
        total_classes: studentAttendance.total_classes,
        attended_classes: studentAttendance.attended_classes || 0
      };

      const response = await facultyService.addOrUpdateAttendance(attendanceEntry);
      if (response.success) {
        setSuccess('Attendance saved successfully!');
        setTimeout(() => setSuccess(null), 3000);

        // Update local data with response
        setAttendanceData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            attendance_percentage: response.data.attendance.attendance_percentage
          }
        }));

        if (onDataUpdate) {
          onDataUpdate();
        }
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError(err.response?.data?.error?.message || 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    const attendanceToSave = Object.entries(attendanceData)
      .filter(([studentId, attendance]) => 
        attendance.total_classes && attendance.total_classes > 0
      )
      .map(([studentId, attendance]) => ({
        student_id: parseInt(studentId),
        subject_id: subject.id,
        total_classes: attendance.total_classes,
        attended_classes: attendance.attended_classes || 0
      }));

    if (attendanceToSave.length === 0) {
      setError('No attendance data to save. Please enter total classes for at least one student.');
      return;
    }

    // Validate all entries
    const invalidEntries = attendanceToSave.filter(entry => 
      entry.attended_classes > entry.total_classes
    );

    if (invalidEntries.length > 0) {
      setError('Some students have attended classes more than total classes. Please correct the data.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await facultyService.bulkUpdateAttendance(attendanceToSave);
      if (response.success) {
        setSuccess(`Bulk save completed: ${response.data.successful_operations} successful, ${response.data.failed_operations} failed`);
        setTimeout(() => setSuccess(null), 5000);

        if (response.data.failed_operations > 0) {
          console.warn('Some operations failed:', response.data.errors);
        }

        // Reload attendance data
        await loadAttendanceData();

        if (onDataUpdate) {
          onDataUpdate();
        }
      }
    } catch (err) {
      console.error('Error bulk saving attendance:', err);
      setError(err.response?.data?.error?.message || 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStatus = (percentage) => {
    if (percentage >= 75) return { color: 'green', status: 'Good' };
    if (percentage >= 60) return { color: 'yellow', status: 'Warning' };
    return { color: 'red', status: 'Critical' };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading attendance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Attendance Management - {subject.subject_name}
          </h3>
          <p className="text-sm text-gray-500">
            Manage attendance for {subject.subject_code} students
          </p>
        </div>
        <button
          onClick={handleBulkSave}
          disabled={saving || Object.keys(attendanceData).length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-1">Total Students</h4>
            <p className="text-2xl font-bold text-blue-600">{statistics.total_students}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-1">Above 75%</h4>
            <p className="text-2xl font-bold text-green-600">{statistics.students_above_threshold}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-1">Below 75%</h4>
            <p className="text-2xl font-bold text-red-600">{statistics.students_below_threshold}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-1">Average</h4>
            <p className="text-2xl font-bold text-gray-600">{statistics.average_attendance}%</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Classes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attended Classes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((studentData) => {
                const student = studentData.student;
                const currentAttendance = attendanceData[student.id] || {};
                const percentage = currentAttendance.attendance_percentage || 0;
                const status = getAttendanceStatus(percentage);

                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Semester {student.semester}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.user.unique_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={currentAttendance.total_classes || ''}
                        onChange={(e) => handleAttendanceChange(student.id, 'total_classes', e.target.value)}
                        className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max={currentAttendance.total_classes || 999}
                        value={currentAttendance.attended_classes || ''}
                        onChange={(e) => handleAttendanceChange(student.id, 'attended_classes', e.target.value)}
                        className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                        {status.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleSingleSave(student.id)}
                        disabled={saving || !currentAttendance.total_classes}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {students.length === 0 && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No students enrolled</h3>
          <p className="mt-1 text-sm text-gray-500">
            No students are currently enrolled in this subject.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Attendance Management Instructions
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Enter total classes conducted for the subject</li>
                <li>Enter attended classes for each student</li>
                <li>Attended classes cannot exceed total classes</li>
                <li>Students with less than 75% attendance will be marked as critical</li>
                <li>Click "Save" for individual entries or "Save All" for bulk operations</li>
                <li>Low attendance alerts will be sent automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;