import React, { useState, useEffect } from 'react';
import facultyService from '../../services/facultyService';

const AtRiskStudentAlerts = ({ subject }) => {
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (subject) {
      loadAtRiskStudents();
    }
  }, [subject]);

  const loadAtRiskStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await facultyService.getAtRiskStudents(null, subject.id);
      if (response.success) {
        setAtRiskStudents(response.data.at_risk_students);
      }
    } catch (err) {
      console.error('Error loading at-risk students:', err);
      setError('Failed to load at-risk students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskFactorIcon = (factor) => {
    switch (factor) {
      case 'low_attendance':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'low_marks':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const filteredStudents = atRiskStudents.filter(studentData => {
    if (filterType === 'all') return true;
    if (filterType === 'attendance') return studentData.risk_factors.includes('low_attendance');
    if (filterType === 'marks') return studentData.risk_factors.includes('low_marks');
    if (filterType === 'high_risk') return studentData.risk_level === 'high';
    return true;
  });

  const handleSendAlert = async (studentData) => {
    try {
      const alertMessage = generateAlertMessage(studentData);
      
      // Send personalized announcement to the specific student
      await facultyService.sendSubjectAnnouncement(
        subject.id,
        'Academic Performance Alert',
        alertMessage
      );

      alert('Alert sent successfully to the student!');
    } catch (err) {
      console.error('Error sending alert:', err);
      alert('Failed to send alert. Please try again.');
    }
  };

  const generateAlertMessage = (studentData) => {
    const student = studentData.student;
    const riskFactors = studentData.risk_factors;
    
    let message = `Dear ${student.name},\n\n`;
    message += `This is an important notice regarding your academic performance in ${subject.subject_name} (${subject.subject_code}).\n\n`;
    
    if (riskFactors.includes('low_attendance')) {
      const attendance = studentData.attendance;
      message += `• Attendance Concern: Your current attendance is ${attendance.attendance_percentage}%, which is below the required 75% threshold. You have attended ${attendance.attended_classes} out of ${attendance.total_classes} classes.\n\n`;
    }
    
    if (riskFactors.includes('low_marks')) {
      message += `• Academic Performance: Your recent exam performance indicates you may be at risk of not meeting the passing criteria.\n\n`;
    }
    
    message += `We encourage you to:\n`;
    message += `- Attend all upcoming classes regularly\n`;
    message += `- Seek help during office hours if you're facing difficulties\n`;
    message += `- Form study groups with classmates\n`;
    message += `- Utilize available academic resources\n\n`;
    message += `Please feel free to reach out if you need any assistance or guidance.\n\n`;
    message += `Best regards,\nFaculty - ${subject.subject_name}`;
    
    return message;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading at-risk students...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            At-Risk Student Alerts - {subject.subject_name}
          </h3>
          <p className="text-sm text-gray-500">
            Students who may need additional support in {subject.subject_code}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All At-Risk</option>
            <option value="high_risk">High Risk Only</option>
            <option value="attendance">Low Attendance</option>
            <option value="marks">Low Marks</option>
          </select>
          <button
            onClick={loadAtRiskStudents}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-1">High Risk</h4>
          <p className="text-2xl font-bold text-red-600">
            {atRiskStudents.filter(s => s.risk_level === 'high').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-1">Medium Risk</h4>
          <p className="text-2xl font-bold text-yellow-600">
            {atRiskStudents.filter(s => s.risk_level === 'medium').length}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-1">Low Attendance</h4>
          <p className="text-2xl font-bold text-blue-600">
            {atRiskStudents.filter(s => s.risk_factors.includes('low_attendance')).length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-1">Low Marks</h4>
          <p className="text-2xl font-bold text-purple-600">
            {atRiskStudents.filter(s => s.risk_factors.includes('low_marks')).length}
          </p>
        </div>
      </div>

      {/* Students List */}
      {filteredStudents.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Factors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recent Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((studentData, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {studentData.student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {studentData.student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {studentData.student.user.unique_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRiskLevelColor(studentData.risk_level)}`}>
                        {studentData.risk_level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {studentData.risk_factors.map((factor, idx) => (
                          <div key={idx} className="flex items-center text-xs text-gray-600">
                            {getRiskFactorIcon(factor)}
                            <span className="ml-1">
                              {factor.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {studentData.attendance ? (
                        <div>
                          <div className={`font-medium ${studentData.attendance.attendance_percentage < 75 ? 'text-red-600' : 'text-green-600'}`}>
                            {studentData.attendance.attendance_percentage}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {studentData.attendance.attended_classes}/{studentData.attendance.total_classes}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {studentData.marks && studentData.marks.length > 0 ? (
                        <div className="space-y-1">
                          {studentData.marks.slice(0, 2).map((mark, idx) => (
                            <div key={idx} className="text-xs">
                              <span className={`font-medium ${mark.percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                                {mark.marks_obtained}/{mark.max_marks}
                              </span>
                              <span className="text-gray-500 ml-1">
                                ({mark.exam_type})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No marks</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedStudent(studentData)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleSendAlert(studentData)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Send Alert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No at-risk students found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filterType === 'all' 
              ? 'All students in this subject are performing well.'
              : `No students match the selected filter: ${filterType.replace('_', ' ')}.`
            }
          </p>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Student Details - {selectedStudent.student.name}
                </h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Student Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Student Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 font-medium">{selectedStudent.student.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <span className="ml-2 font-medium">{selectedStudent.student.user.unique_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Semester:</span>
                      <span className="ml-2 font-medium">{selectedStudent.student.semester}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Risk Level:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(selectedStudent.risk_level)}`}>
                        {selectedStudent.risk_level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendance Details */}
                {selectedStudent.attendance && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Attendance Details</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Percentage:</span>
                        <span className={`ml-2 font-medium ${selectedStudent.attendance.attendance_percentage < 75 ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedStudent.attendance.attendance_percentage}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Attended:</span>
                        <span className="ml-2 font-medium">{selectedStudent.attendance.attended_classes}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-2 font-medium">{selectedStudent.attendance.total_classes}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Marks Details */}
                {selectedStudent.marks && selectedStudent.marks.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Recent Marks</h4>
                    <div className="space-y-2">
                      {selectedStudent.marks.map((mark, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{mark.exam_type.replace('_', ' ').toUpperCase()}:</span>
                          <span className={`font-medium ${mark.percentage < 40 ? 'text-red-600' : 'text-green-600'}`}>
                            {mark.marks_obtained}/{mark.max_marks} ({mark.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleSendAlert(selectedStudent);
                      setSelectedStudent(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                  >
                    Send Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              At-Risk Student Guidelines
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>High risk students have multiple risk factors (low attendance + low marks)</li>
                <li>Medium risk students have one primary risk factor</li>
                <li>Send personalized alerts to encourage improvement</li>
                <li>Consider scheduling one-on-one meetings with high-risk students</li>
                <li>Monitor progress regularly and update intervention strategies</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtRiskStudentAlerts;