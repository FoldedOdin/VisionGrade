import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../hooks/useAuth';
import StudentDashboard from '../StudentDashboard';

// Mock the student service
jest.mock('../../../services/studentService', () => ({
  getDashboard: jest.fn().mockRejectedValue(new Error('API not available')),
  getMarks: jest.fn().mockRejectedValue(new Error('API not available')),
  getAttendance: jest.fn().mockRejectedValue(new Error('API not available')),
  getPredictions: jest.fn().mockRejectedValue(new Error('API not available')),
  getNotifications: jest.fn().mockRejectedValue(new Error('API not available')),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('StudentDashboard', () => {
  test('renders student dashboard with loading state', async () => {
    renderWithProviders(<StudentDashboard />);
    
    // Should show loading spinner initially
    expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
  });

  test('renders dashboard content after loading', async () => {
    renderWithProviders(<StudentDashboard />);
    
    // Wait for loading to complete and content to appear
    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for main dashboard elements
    expect(screen.getByText('Welcome back, Student')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Marks')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Predictions')).toBeInTheDocument();
  });

  test('displays mock data when API fails', async () => {
    renderWithProviders(<StudentDashboard />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should display mock marks data
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getByText('Chemistry')).toBeInTheDocument();
    });
  });
});