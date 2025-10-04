import React, { useState, useEffect } from 'react';
import facultyService from '../../services/facultyService';

const MarksEntryForm = ({ subject, onDataUpdate }) => {
  const [students, setStudents] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('series_test_1');
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const examTypes = [
    { value: 'series_test_1', label: 'Series Test I', maxMarks: 50 },
    { value: 'series_test_2', label: 'Series Test II', maxMarks: 50 },
    { value: 'lab_internal', label: 'Lab Internal', maxMarks: 50 },
    { value: 'university', label: 'University Exam', maxMarks: 100 }
  ];

  useEffect(() => {
    if (subject) {
      loadSubjectStudents();
    }
  }, [subject]);

  useEffect(() => {
    if (subject && selectedExamType) {
      loadExistingMarks();
    }
  }, [subject, selectedExamType]);

  const loadSubjectStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await facultyService.getSubjectStudents(subject.id);
      if (response.success) {
        setStudents(response.data.students);
      }
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingMarks = async () => {
    try {
      const response = await facultyService.getSubjectMarks(subject.id, selectedExamType);
      if (response.success) {
        const existingMarks = {};
        response.data.marks.forEach(mark => {
          existingMarks[mark.student.id] = {
            marks_obtained: mark.marks_obtained,
            max_marks: mark.max_marks,
            id: mark.id
          };
        });
        setMarksData(existingMarks);
      }
    } catch (err) {
      console.error('Error loading existing marks:', err);
      // Don't show error for this as it's expected when no marks exist
    }
  };

  const handleMarksChange = (studentId, marks) => {
    const currentExamType = examTypes.find(et => et.value === selectedExamType);
    const maxMarks = currentExamType?.maxMarks || 100;
    
    // Validate marks range
    if (marks < 0 || marks > maxMarks) {
      return;
    }

    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks_obtained: marks,
        max_marks: maxMarks
      }
    }));
  };

  const handleSingleSave = async (studentId) => {
    const studentMarks = marksData[studentId];
    if (!studentMarks || studentMarks.marks_obtained === undefined) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const marksEntry = {
        student_id: studentId,
        subject_id: subject.id,
        exam_type: selectedExamType,
        marks_obtained: studentMarks.marks_obtained,
        max_marks: studentMarks.max_marks
      };

      const response = await facultyService.addOrUpdateMarks(marksEntry);
      if (response.success) {
        setSuccess(`Marks saved for student successfully!`);
        setTimeout(() => setSuccess(null), 3000);
        
        // Update the marks data with the returned ID
        setMarksData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            id: response.data.mark.id
          }
        }));

        if (onDataUpdate) {
          onDataUpdate();
        }
      }
    } catch (err) {
      console.error('Error saving marks:', err);
      setError(err.response?.data?.error?.message || 'Failed to save marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    const marksToSave = Object.entries(marksData)
      .filter(([studentId, marks]) => marks.marks_obtained !== undefined)
      .map(([studentId, marks]) => ({
        student_id: parseInt(studentId),
        subject_id: subject.id,
        exam_type: selectedExamType,
        marks_obtained: marks.marks_obtained,
        max_marks: marks.max_marks
      }));

    if (marksToSave.length === 0) {
      setError('No marks to save. Please enter marks for at least one student.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await facultyService.bulkAddOrUpdateMarks(marksToSave);
      if (response.success) {
        setSuccess(`Bulk save completed: ${response.data.successful_operations} successful, ${response.data.failed_operations} failed`);
        setTimeout(() => setSuccess(null), 5000);

        if (response.data.failed_operations > 0) {
          console.warn('Some operations failed:', response.data.errors);
        }

        // Reload existing marks to get updated data
        await loadExistingMarks();

        if (onDataUpdate) {
          onDataUpdate();
        }
      }
    } catch (err) {
      console.error('Error bulk saving marks:', err);
      setError(err.response?.data?.error?.message || 'Failed to save marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getMaxMarksForExamType = () => {
    const examType = examTypes.find(et => et.value === selectedExamType);
    return examType?.maxMarks || 100;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Marks Entry - {subject.subject_name}
          </h3>
          <p className="text-sm text-gray-500">
            Enter marks for {subject.subject_code} students
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedExamType}
            onChange={(e) => setSelectedExamType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {examTypes.map(examType => (
              <option key={examType.value} value={examType.value}>
                {examType.label} (Max: {examType.maxMarks})
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkSave}
            disabled={saving || Object.keys(marksData).length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

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

      {/* Marks Entry Table */}
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
                  Current Marks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enter Marks (Max: {getMaxMarksForExamType()})
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((studentData) => {
                const student = studentData.student;
                const currentMarks = studentData.marks[selectedExamType];
                const enteredMarks = marksData[student.id];
                const marksToShow = enteredMarks?.marks_obtained !== undefined 
                  ? enteredMarks.marks_obtained 
                  : currentMarks?.marks_obtained || '';
                
                const percentage = enteredMarks?.marks_obtained !== undefined
                  ? Math.round((enteredMarks.marks_obtained / getMaxMarksForExamType()) * 100)
                  : currentMarks?.percentage || 0;

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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currentMarks ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          currentMarks.passed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {currentMarks.marks_obtained}/{currentMarks.max_marks} ({currentMarks.percentage}%)
                        </span>
                      ) : (
                        <span className="text-gray-400">Not entered</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max={getMaxMarksForExamType()}
                        value={marksToShow}
                        onChange={(e) => handleMarksChange(student.id, parseInt(e.target.value) || 0)}
                        className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        percentage >= 40 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleSingleSave(student.id)}
                        disabled={saving || enteredMarks?.marks_obtained === undefined}
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
              Marks Entry Instructions
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Series Test marks range: 0-50</li>
                <li>University exam marks range: 0-100</li>
                <li>Lab Internal marks range: 0-50</li>
                <li>Click "Save" for individual entries or "Save All" for bulk operations</li>
                <li>Existing marks will be updated if you enter new values</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarksEntryForm;