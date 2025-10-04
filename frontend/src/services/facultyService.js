import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Faculty Service
 * Handles all faculty-related API calls
 */
const facultyService = {
  /**
   * Get faculty dashboard data
   */
  getDashboard: async () => {
    try {
      const response = await api.get('/faculty/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get faculty dashboard error:', error);
      throw error;
    }
  },

  /**
   * Get subjects assigned to faculty
   */
  getSubjects: async (academicYear = null) => {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.get('/faculty/subjects', { params });
      return response.data;
    } catch (error) {
      console.error('Get faculty subjects error:', error);
      throw error;
    }
  },

  /**
   * Get students enrolled in a specific subject
   */
  getSubjectStudents: async (subjectId, academicYear = null) => {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.get(`/faculty/subjects/${subjectId}/students`, { params });
      return response.data;
    } catch (error) {
      console.error('Get subject students error:', error);
      throw error;
    }
  },

  /**
   * Get students at risk of failing
   */
  getAtRiskStudents: async (academicYear = null, subjectId = null) => {
    try {
      const params = {};
      if (academicYear) params.academic_year = academicYear;
      if (subjectId) params.subject_id = subjectId;
      
      const response = await api.get('/faculty/at-risk-students', { params });
      return response.data;
    } catch (error) {
      console.error('Get at-risk students error:', error);
      throw error;
    }
  },

  /**
   * Get marks for a specific subject
   */
  getSubjectMarks: async (subjectId, examType = null, academicYear = null) => {
    try {
      const params = {};
      if (examType) params.exam_type = examType;
      if (academicYear) params.academic_year = academicYear;
      
      const response = await api.get(`/marks/subject/${subjectId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get subject marks error:', error);
      throw error;
    }
  },

  /**
   * Add or update marks for a student
   */
  addOrUpdateMarks: async (marksData) => {
    try {
      const response = await api.post('/marks', marksData);
      return response.data;
    } catch (error) {
      console.error('Add/update marks error:', error);
      throw error;
    }
  },

  /**
   * Bulk add/update marks for multiple students
   */
  bulkAddOrUpdateMarks: async (marksDataArray) => {
    try {
      const response = await api.post('/marks/bulk', { marks_data: marksDataArray });
      return response.data;
    } catch (error) {
      console.error('Bulk marks operation error:', error);
      throw error;
    }
  },

  /**
   * Get attendance for a specific subject
   */
  getSubjectAttendance: async (subjectId, academicYear = null) => {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.get(`/attendance/subject/${subjectId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get subject attendance error:', error);
      throw error;
    }
  },

  /**
   * Add or update attendance for a student
   */
  addOrUpdateAttendance: async (attendanceData) => {
    try {
      const response = await api.post('/attendance', attendanceData);
      return response.data;
    } catch (error) {
      console.error('Add/update attendance error:', error);
      throw error;
    }
  },

  /**
   * Bulk update attendance for multiple students
   */
  bulkUpdateAttendance: async (attendanceDataArray) => {
    try {
      const response = await api.post('/attendance/bulk', { attendance_data: attendanceDataArray });
      return response.data;
    } catch (error) {
      console.error('Bulk attendance operation error:', error);
      throw error;
    }
  },

  /**
   * Get students with low attendance
   */
  getLowAttendanceStudents: async (threshold = 75, subjectId = null, academicYear = null) => {
    try {
      const params = { threshold };
      if (subjectId) params.subject_id = subjectId;
      if (academicYear) params.academic_year = academicYear;
      
      const response = await api.get('/attendance/low-attendance', { params });
      return response.data;
    } catch (error) {
      console.error('Get low attendance students error:', error);
      throw error;
    }
  },

  /**
   * Get performance statistics for faculty's subjects
   */
  getPerformanceStatistics: async (subjectId = null, academicYear = null) => {
    try {
      const params = {};
      if (subjectId) params.subject_id = subjectId;
      if (academicYear) params.academic_year = academicYear;
      
      const response = await api.get('/marks/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Get performance statistics error:', error);
      throw error;
    }
  },

  /**
   * Get attendance statistics for faculty's subjects
   */
  getAttendanceStatistics: async (subjectId = null, academicYear = null) => {
    try {
      const params = {};
      if (subjectId) params.subject_id = subjectId;
      if (academicYear) params.academic_year = academicYear;
      
      const response = await api.get('/attendance/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Get attendance statistics error:', error);
      throw error;
    }
  },

  /**
   * Send announcement to students in a specific subject
   */
  sendSubjectAnnouncement: async (subjectId, title, message, academicYear = null) => {
    try {
      const data = {
        subject_id: subjectId,
        title,
        message
      };
      if (academicYear) data.academic_year = academicYear;
      
      const response = await api.post('/notifications/subject-announcement', data);
      return response.data;
    } catch (error) {
      console.error('Send subject announcement error:', error);
      throw error;
    }
  },

  /**
   * Generate graphical insights for a subject
   */
  generateInsights: async (subjectId) => {
    try {
      const response = await api.get(`/reports/insights/subject/${subjectId}`);
      return response.data;
    } catch (error) {
      console.error('Generate insights error:', error);
      throw error;
    }
  },

  /**
   * Generate faculty report
   */
  generateFacultyReport: async (facultyId, filters = {}) => {
    try {
      const response = await api.post(`/reports/faculty/${facultyId}/report`, filters);
      return response.data;
    } catch (error) {
      console.error('Generate faculty report error:', error);
      throw error;
    }
  },

  /**
   * Toggle ML prediction visibility for students
   */
  togglePredictionVisibility: async (subjectId, isVisible) => {
    try {
      const response = await api.post(`/ml/predictions/toggle/${subjectId}`, {
        is_visible: isVisible
      });
      return response.data;
    } catch (error) {
      console.error('Toggle prediction visibility error:', error);
      throw error;
    }
  },

  /**
   * Get ML prediction accuracy for faculty's subjects
   */
  getPredictionAccuracy: async (subjectId = null) => {
    try {
      const params = subjectId ? { subject_id: subjectId } : {};
      const response = await api.get('/ml/accuracy', { params });
      return response.data;
    } catch (error) {
      console.error('Get prediction accuracy error:', error);
      throw error;
    }
  },

  /**
   * Get subject predictions for tutors
   */
  getSubjectPredictions: async (subjectId, academicYear = null) => {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.get(`/ml/predictions/subject/${subjectId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get subject predictions error:', error);
      throw error;
    }
  },

  /**
   * Generate batch predictions for a subject
   */
  generateBatchPredictions: async (subjectId, academicYear = null) => {
    try {
      const data = { subject_id: subjectId };
      if (academicYear) data.academic_year = academicYear;
      
      const response = await api.post('/ml/predict/batch', data);
      return response.data;
    } catch (error) {
      console.error('Generate batch predictions error:', error);
      throw error;
    }
  },

  /**
   * Get prediction statistics for tutors
   */
  getPredictionStats: async (subjectId = null, academicYear = null) => {
    try {
      const params = {};
      if (subjectId) params.subject_id = subjectId;
      if (academicYear) params.academic_year = academicYear;
      
      const response = await api.get('/ml/predictions/stats', { params });
      return response.data;
    } catch (error) {
      console.error('Get prediction stats error:', error);
      throw error;
    }
  }
};

export default facultyService;