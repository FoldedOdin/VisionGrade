import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock implementations for commonly used modules
export const mockAuthService = {
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  updateProfile: jest.fn(),
  getCurrentUser: jest.fn()
};

export const mockStudentService = {
  getDashboard: jest.fn(),
  getMarks: jest.fn(),
  getAttendance: jest.fn(),
  getNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  generateReportCard: jest.fn()
};

export const mockFacultyService = {
  getSubjects: jest.fn(),
  addMarks: jest.fn(),
  updateMarks: jest.fn(),
  addAttendance: jest.fn(),
  getInsights: jest.fn(),
  getAtRiskStudents: jest.fn(),
  createAnnouncement: jest.fn()
};

export const mockAdminService = {
  getUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getSubjects: jest.fn(),
  createSubject: jest.fn(),
  updateSubject: jest.fn(),
  promoteStudents: jest.fn(),
  createSystemAnnouncement: jest.fn()
};

// Custom render function with providers
export function renderWithProviders(ui, options = {}) {
  const {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock user data for testing
export const mockUsers = {
  student: {
    id: 1,
    uniqueId: 'STU001',
    name: 'Test Student',
    email: 'student@test.com',
    phone: '1234567890',
    role: 'student',
    profilePhoto: null
  },
  faculty: {
    id: 2,
    uniqueId: 'FAC001',
    name: 'Test Faculty',
    email: 'faculty@test.com',
    phone: '0987654321',
    role: 'faculty',
    profilePhoto: null
  },
  admin: {
    id: 3,
    uniqueId: 'ADM001',
    name: 'Test Admin',
    email: 'admin@test.com',
    phone: '5555555555',
    role: 'admin',
    profilePhoto: null
  }
};

// Mock academic data
export const mockSubjects = [
  {
    id: 1,
    subjectCode: 'MATH101',
    subjectName: 'Mathematics',
    subjectType: 'theory',
    semester: 1,
    credits: 4
  },
  {
    id: 2,
    subjectCode: 'PHY101',
    subjectName: 'Physics',
    subjectType: 'theory',
    semester: 1,
    credits: 4
  },
  {
    id: 3,
    subjectCode: 'PHY101L',
    subjectName: 'Physics Lab',
    subjectType: 'lab',
    semester: 1,
    credits: 2
  }
];

export const mockMarks = [
  {
    id: 1,
    subject: mockSubjects[0],
    seriesTest1: 45,
    seriesTest2: 42,
    labInternal: null,
    university: 85
  },
  {
    id: 2,
    subject: mockSubjects[1],
    seriesTest1: 38,
    seriesTest2: 40,
    labInternal: null,
    university: 78
  },
  {
    id: 3,
    subject: mockSubjects[2],
    seriesTest1: null,
    seriesTest2: null,
    labInternal: 48,
    university: null
  }
];

export const mockAttendance = [
  {
    id: 1,
    subject: mockSubjects[0],
    totalClasses: 50,
    attendedClasses: 45,
    attendancePercentage: 90.0
  },
  {
    id: 2,
    subject: mockSubjects[1],
    totalClasses: 40,
    attendedClasses: 28,
    attendancePercentage: 70.0
  },
  {
    id: 3,
    subject: mockSubjects[2],
    totalClasses: 30,
    attendedClasses: 25,
    attendancePercentage: 83.3
  }
];

export const mockNotifications = [
  {
    id: 1,
    title: 'Low Attendance Alert',
    message: 'Your attendance in Physics is below 75%',
    type: 'auto',
    isRead: false,
    createdAt: '2024-10-01T10:00:00Z'
  },
  {
    id: 2,
    title: 'New Assignment',
    message: 'Mathematics assignment has been posted',
    type: 'academic',
    isRead: true,
    createdAt: '2024-09-30T15:30:00Z'
  },
  {
    id: 3,
    title: 'System Maintenance',
    message: 'System will be down for maintenance on Sunday',
    type: 'system',
    isRead: false,
    createdAt: '2024-09-29T09:00:00Z'
  }
];

// Test utilities
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const mockLocalStorage = () => {
  const store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
};

// Setup global mocks
beforeEach(() => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage()
  });

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Clear all mocks
  jest.clearAllMocks();
});

// Export everything for easy importing
export * from '@testing-library/react';
export { renderWithProviders as render };