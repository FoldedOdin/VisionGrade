import api from './api';

class AdminService {
  // Dashboard data
  async getDashboardData() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User management
  async getAllUsers(params = {}) {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUser(userData) {
    try {
      const response = await api.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Tutor management
  async getTutors() {
    try {
      const response = await api.get('/admin/tutors');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async assignTutor(facultyId, semester) {
    try {
      const response = await api.post('/admin/tutors/assign', {
        facultyId,
        semester
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async unassignTutor(facultyId) {
    try {
      const response = await api.delete(`/admin/tutors/unassign/${facultyId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Subject management
  async getAllSubjects(semester = null) {
    try {
      const params = semester ? { semester } : {};
      const response = await api.get('/admin/subjects', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createSubject(subjectData) {
    try {
      const response = await api.post('/admin/subjects', subjectData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateSubject(subjectId, subjectData) {
    try {
      const response = await api.put(`/admin/subjects/${subjectId}`, subjectData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteSubject(subjectId) {
    try {
      const response = await api.delete(`/admin/subjects/${subjectId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // System announcements
  async createSystemAnnouncement(title, message) {
    try {
      const response = await api.post('/admin/announcements', {
        title,
        message
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Faculty-Subject assignment management
  async getFacultyAssignments(academicYear = null) {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.get('/admin/faculty-assignments', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async assignSubjectsToFaculty(facultyId, subjectIds, academicYear = null) {
    try {
      const response = await api.post('/admin/faculty-assignments', {
        faculty_id: facultyId,
        subject_ids: subjectIds,
        academic_year: academicYear
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeSubjectAssignment(facultyId, subjectId, academicYear = null) {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.delete(`/admin/faculty-assignments/${facultyId}/${subjectId}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Student promotion and graduation
  async promoteStudents(fromSemester, toSemester, studentIds = null) {
    try {
      const response = await api.post('/admin/promote-students', {
        fromSemester,
        toSemester,
        studentIds
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async graduateStudents(semester, studentIds = null) {
    try {
      const response = await api.post('/admin/graduate-students', {
        semester,
        studentIds
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  handleError(error) {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error.message || 'An error occurred');
    }
    return new Error(error.message || 'Network error occurred');
  }
}

export default new AdminService();