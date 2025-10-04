import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Plus, Trash2, Edit, Check, X } from 'lucide-react';
import adminService from '../../../services/adminService';

const FacultyAssignment = () => {
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [academicYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [assignmentsResponse, subjectsResponse] = await Promise.all([
        adminService.getFacultyAssignments(academicYear),
        adminService.getAllSubjects()
      ]);

      setFacultyAssignments(assignmentsResponse.data.faculty_assignments);
      setSubjects(subjectsResponse.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubjects = (faculty) => {
    setSelectedFaculty(faculty);
    setSelectedSubjects(faculty.subjectAssignments?.map(sa => sa.subject.id) || []);
    setShowModal(true);
  };

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSaveAssignments = async () => {
    try {
      setLoading(true);
      await adminService.assignSubjectsToFaculty(
        selectedFaculty.id,
        selectedSubjects,
        academicYear
      );
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (facultyId, subjectId) => {
    if (!window.confirm('Are you sure you want to remove this subject assignment?')) {
      return;
    }

    try {
      await adminService.removeSubjectAssignment(facultyId, subjectId, academicYear);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getSubjectsBySemester = (semester) => {
    return subjects.filter(subject => subject.semester === semester);
  };

  const getFacultyWithoutAssignments = () => {
    return facultyAssignments.filter(faculty => 
      !faculty.subjectAssignments || faculty.subjectAssignments.length === 0
    );
  };

  const getTotalAssignments = () => {
    return facultyAssignments.reduce((total, faculty) => 
      total + (faculty.subjectAssignments?.length || 0), 0
    );
  };

  if (loading && facultyAssignments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading faculty assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Faculty Subject Assignment</h2>
          <p className="text-gray-600">Assign subjects to faculty members for teaching</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(parseInt(e.target.value))}
            className="admin-select px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            style={{
              backgroundColor: 'white',
              color: '#1f2937',
              border: '1px solid #d1d5db'
            }}
          >
            {[2023, 2024, 2025, 2026].map(year => (
              <option 
                key={year} 
                value={year}
                style={{
                  backgroundColor: 'white',
                  color: '#1f2937'
                }}
              >
                Academic Year {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Faculty</p>
              <p className="text-2xl font-bold text-gray-900">{facultyAssignments.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{getTotalAssignments()}</p>
            </div>
            <BookOpen className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unassigned Faculty</p>
              <p className="text-2xl font-bold text-gray-900">{getFacultyWithoutAssignments().length}</p>
            </div>
            <Users className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Faculty Assignments List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Faculty Members & Their Assignments</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {facultyAssignments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Faculty Found</h3>
              <p className="text-gray-600">No faculty members found in the system.</p>
            </div>
          ) : (
            facultyAssignments.map((faculty) => (
              <div key={faculty.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {faculty.faculty_name}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>ID: {faculty.user?.unique_id}</span>
                          <span>Department: {faculty.department || 'N/A'}</span>
                          <span>Email: {faculty.user?.email}</span>
                          {faculty.is_tutor && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              Tutor - Semester {faculty.tutor_semester}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Subjects */}
                    <div className="ml-13">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-700">
                          Assigned Subjects ({faculty.subjectAssignments?.length || 0})
                        </h5>
                        <button
                          onClick={() => handleAssignSubjects(faculty)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit Assignments</span>
                        </button>
                      </div>

                      {faculty.subjectAssignments && faculty.subjectAssignments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {faculty.subjectAssignments.map((assignment) => (
                            <div
                              key={assignment.subject.id}
                              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {assignment.subject.subject_code}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {assignment.subject.subject_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Semester {assignment.subject.semester} • {assignment.subject.credits} Credits
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveAssignment(faculty.id, assignment.subject.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Remove assignment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No subjects assigned</p>
                          <button
                            onClick={() => handleAssignSubjects(faculty)}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Assign Subjects
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showModal && selectedFaculty && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Assign Subjects to {selectedFaculty.faculty_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select subjects for Academic Year {academicYear}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(semester => {
                  const semesterSubjects = getSubjectsBySemester(semester);
                  if (semesterSubjects.length === 0) return null;

                  return (
                    <div key={semester} className="border rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Semester {semester} ({semesterSubjects.length} subjects)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {semesterSubjects.map(subject => (
                          <div
                            key={subject.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              selectedSubjects.includes(subject.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleSubjectToggle(subject.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedSubjects.includes(subject.id)}
                                    onChange={() => handleSubjectToggle(subject.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {subject.subject_code}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {subject.subject_name}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {subject.subject_type} • {subject.credits} Credits
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <div className="text-sm text-gray-600">
                  {selectedSubjects.length} subjects selected
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignments}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Assignments'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAssignment;