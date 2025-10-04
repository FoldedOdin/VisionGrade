import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const authAPI = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
authAPI.interceptors.request.use(
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
authAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Login with ID, email, or phone
  async login(credentials) {
    try {
      const response = await authAPI.post('/login', credentials);
      const { data } = response.data;
      const { user, tokens } = data;
      
      if (tokens?.access_token) {
        localStorage.setItem('authToken', tokens.access_token);
      }
      
      return { token: tokens?.access_token, user };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Login failed'
      );
    }
  },

  // Register new user
  async signup(userData) {
    try {
      const response = await authAPI.post('/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Registration failed'
      );
    }
  },

  // Get current user profile
  async getProfile() {
    try {
      const response = await authAPI.get('/profile');
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Failed to fetch profile'
      );
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await authAPI.put('/profile', profileData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Profile update failed'
      );
    }
  },

  // Request password reset
  async forgotPassword(contact, method) {
    try {
      const response = await authAPI.post('/forgot-password', {
        contact,
        method
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Password reset request failed'
      );
    }
  },

  // Reset password with token
  async resetPassword(token, newPassword) {
    try {
      const response = await authAPI.post('/reset-password', {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Password reset failed'
      );
    }
  },

  // Change password (authenticated user)
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await authAPI.post('/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        'Password change failed'
      );
    }
  },

  // Logout
  async logout() {
    try {
      await authAPI.post('/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('authToken');
    }
  },

  // Verify token validity
  async verifyToken() {
    try {
      const response = await authAPI.get('/verify');
      return response.data;
    } catch (error) {
      throw new Error('Token verification failed');
    }
  }
};

export default authService;