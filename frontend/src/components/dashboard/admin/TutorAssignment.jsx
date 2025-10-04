import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Trash2, Users } from 'lucide-react';
import adminService from '../../../services/adminService';

const TutorAssignment = () => {
  const [tutors, setTutors] = useState([]);
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tutorsResponse, usersResponse] = await Promise.all([
        adminService.getTutors(),
        adminService.getAllUsers({ role: 'faculty', limit: 100 })
      ]);
      
      setTutors(tutorsResponse.data);
      setFacultyMembers(usersResponse.data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTutor = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await adminService.assignTutor(selectedFaculty, selectedSemester);
      setShowModal(false);
      setSelectedFaculty('');
      setSelectedSemester(1);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignTutor = async (facultyId) => {
    if (!window.confirm('Are you sure you want to unassign this tutor?')) {
      return;
    }

    try {
      await adminService.unassignTutor(facultyId);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getAvailableFaculty = () => {
    const tutorFacultyIds = tutors.map(tutor => tutor.id);
    return facultyMembers.filter(user => 
      user.faculty && !tutorFacultyIds.includes(user.faculty.id)
    );
  };

  const getSemesterName = (semester) => {
    const names = {
      1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth',
      5: 'Fifth', 6: 'Sixth', 7: 'Seventh', 8: 'Eighth'
    };
    return names[semester] || `Semester ${semester}`;
  };

  if (loading && tutors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tutor Assignment</h2>
          <p className="text-gray-600">Assign faculty members as tutors for specific semesters</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Assign Tutor</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tutors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tutors Assigned</h3>
            <p className="text-gray-600 mb-4">Start by assigning faculty members as tutors</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Assign First Tutor</span>
            </button>
          </div>
        ) : (
          tutors.map((tutor) => (
            <div key={tutor.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {tutor.faculty_name}
                    </h3>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Faculty ID:</span>
                      <span className="font-medium">{tutor.user?.unique_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Department:</span>
                      <span className="font-medium">{tutor.department || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Assigned to:</span>
                      <span className="font-medium text-blue-600">
                        {getSemesterName(tutor.tutor_semester)} Semester
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Email:</span>
                      <span className="font-medium">{tutor.user?.email}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleUnassignTutor(tutor.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Unassign tutor"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Semester Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Semester Coverage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => {
            const assignedTutor = tutors.find(t => t.tutor_semester === semester);
            return (
              <div
                key={semester}
                className={`p-3 rounded-lg border-2 ${
                  assignedTutor
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    Semester {semester}
                  </div>
                  {assignedTutor ? (
                    <div className="text-xs text-green-600 mt-1">
                      {assignedTutor.faculty_name}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      No tutor assigned
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Tutor</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAssignTutor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Faculty Member *
                  </label>
                  <select
                    required
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Choose a faculty member...</option>
                    {getAvailableFaculty().map((user) => (
                      <option key={user.faculty.id} value={user.faculty.id}>
                        {user.faculty.faculty_name} ({user.unique_id}) - {user.faculty.department}
                      </option>
                    ))}
                  </select>
                  {getAvailableFaculty().length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      All faculty members are already assigned as tutors
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Semester *
                  </label>
                  <select
                    required
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => {
                      const isAssigned = tutors.some(t => t.tutor_semester === semester);
                      return (
                        <option 
                          key={semester} 
                          value={semester}
                          disabled={isAssigned}
                        >
                          {getSemesterName(semester)} Semester {isAssigned ? '(Already assigned)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || getAvailableFaculty().length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Assigning...' : 'Assign Tutor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorAssignment;