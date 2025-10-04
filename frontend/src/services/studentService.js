import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const studentAPI = axios.create({
  baseURL: `${API_BASE_URL}/students`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
studentAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
studentAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const studentService = {
  // Get student dashboard data
  async getDashboard() {
    try {
      const response = await studentAPI.get('/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to fetch dashboard data'
      );
    }
  },

  // Get student marks for all subjects
  async getMarks() {
    try {
      const response = await studentAPI.get('/marks');
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to fetch marks'
      );
    }
  },

  // Get student attendance for all subjects
  async getAttendance() {
    try {
      const response = await studentAPI.get('/attendance');
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to fetch attendance'
      );
    }
  },

  // Get ML predictions for student
  async getPredictions() {
    try {
      const response = await studentAPI.get('/predictions');
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to fetch predictions'
      );
    }
  },

  // Get student notifications
  async getNotifications() {
    try {
      const response = await studentAPI.get('/notifications');
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to fetch notifications'
      );
    }
  },

  // Mark notification as read
  async markNotificationRead(notificationId) {
    try {
      const response = await studentAPI.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to mark notification as read'
      );
    }
  },

  // Generate and download report card
  async downloadReportCard(format = 'pdf') {
    try {
      const response = await studentAPI.post('/report-card', 
        { format },
        {
          responseType: 'blob',
          headers: {
            'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        }
      );
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-card.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to download report card'
      );
    }
  }
};

export default studentService;