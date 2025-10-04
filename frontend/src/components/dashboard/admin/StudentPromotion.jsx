import React, { useState } from 'react';
import { GraduationCap, ArrowRight, Users, CheckCircle, AlertCircle } from 'lucide-react';
import adminService from '../../../services/adminService';

const StudentPromotion = () => {
  const [activeTab, setActiveTab] = useState('promotion');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Promotion form state
  const [promotionData, setPromotionData] = useState({
    fromSemester: 1,
    toSemester: 2,
    studentIds: []
  });

  // Graduation form state
  const [graduationData, setGraduationData] = useState({
    semester: 8,
    studentIds: []
  });

  const handlePromotion = async (e) => {
    e.preventDefault();
    
    if (promotionData.fromSemester >= promotionData.toSemester) {
      setError('Target semester must be higher than current semester');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await adminService.promoteStudents(
        promotionData.fromSemester,
        promotionData.toSemester,
        promotionData.studentIds.length > 0 ? promotionData.studentIds : null
      );

      setSuccess(response.message);
      setPromotionData({
        fromSemester: promotionData.toSemester,
        toSemester: promotionData.toSemester + 1,
        studentIds: []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGraduation = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await adminService.graduateStudents(
        graduationData.semester,
        graduationData.studentIds.length > 0 ? graduationData.studentIds : null
      );

      setSuccess(response.message);
      setGraduationData({
        semester: 8,
        studentIds: []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSemesterName = (semester) => {
    const names = {
      1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth',
      5: 'Fifth', 6: 'Sixth', 7: 'Seventh', 8: 'Eighth'
    };
    return names[semester] || `Semester ${semester}`;
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <GraduationCap className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Promotion & Graduation</h2>
          <p className="text-gray-600">Manage semester transitions and graduations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => {
                setActiveTab('promotion');
                clearMessages();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'promotion'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ArrowRight className="h-4 w-4" />
                <span>Semester Promotion</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('graduation');
                clearMessages();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'graduation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span>Graduation</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Promotion Tab */}
          {activeTab === 'promotion' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Semester Promotion</p>
                    <p>
                      Promote students from one semester to the next. This will update their 
                      semester status and send them a notification about the promotion.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePromotion} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Semester *
                    </label>
                    <select
                      required
                      value={promotionData.fromSemester}
                      onChange={(e) => {
                        const fromSem = parseInt(e.target.value);
                        setPromotionData(prev => ({
                          ...prev,
                          fromSemester: fromSem,
                          toSemester: Math.min(fromSem + 1, 8)
                        }));
                        clearMessages();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(sem => (
                        <option key={sem} value={sem}>
                          {getSemesterName(sem)} Semester
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Semester *
                    </label>
                    <select
                      required
                      value={promotionData.toSemester}
                      onChange={(e) => {
                        setPromotionData(prev => ({
                          ...prev,
                          toSemester: parseInt(e.target.value)
                        }));
                        clearMessages();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      {[2, 3, 4, 5, 6, 7, 8].filter(sem => sem > promotionData.fromSemester).map(sem => (
                        <option key={sem} value={sem}>
                          {getSemesterName(sem)} Semester
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Selection
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Promotion Scope</span>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="promotionScope"
                          checked={promotionData.studentIds.length === 0}
                          onChange={() => {
                            setPromotionData(prev => ({ ...prev, studentIds: [] }));
                            clearMessages();
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Promote all students in {getSemesterName(promotionData.fromSemester)} Semester
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="promotionScope"
                          checked={promotionData.studentIds.length > 0}
                          onChange={() => {
                            setPromotionData(prev => ({ ...prev, studentIds: ['placeholder'] }));
                            clearMessages();
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Promote selected students only (Feature coming soon)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium mb-1">Important:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>This action will update student records permanently</li>
                        <li>All affected students will receive a promotion notification</li>
                        <li>Make sure to verify the semester selection before proceeding</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>{loading ? 'Promoting Students...' : 'Promote Students'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Graduation Tab */}
          {activeTab === 'graduation' && (
            <div className="space-y-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <GraduationCap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium mb-1">Student Graduation</p>
                    <p>
                      Mark students as graduated when they complete their final semester. 
                      This will change their status and archive their academic records.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleGraduation} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Graduating Semester *
                  </label>
                  <select
                    required
                    value={graduationData.semester}
                    onChange={(e) => {
                      setGraduationData(prev => ({
                        ...prev,
                        semester: parseInt(e.target.value)
                      }));
                      clearMessages();
                    }}
                    className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    {[6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>
                        {getSemesterName(sem)} Semester
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Selection
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Graduation Scope</span>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="graduationScope"
                          checked={graduationData.studentIds.length === 0}
                          onChange={() => {
                            setGraduationData(prev => ({ ...prev, studentIds: [] }));
                            clearMessages();
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Graduate all students in {getSemesterName(graduationData.semester)} Semester
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="graduationScope"
                          checked={graduationData.studentIds.length > 0}
                          onChange={() => {
                            setGraduationData(prev => ({ ...prev, studentIds: ['placeholder'] }));
                            clearMessages();
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Graduate selected students only (Feature coming soon)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium mb-1">Warning:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Graduation is a permanent action that cannot be easily undone</li>
                        <li>Graduated students will no longer appear in active student lists</li>
                        <li>All affected students will receive a graduation notification</li>
                        <li>Academic records will be archived but preserved</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>{loading ? 'Processing Graduation...' : 'Graduate Students'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPromotion;