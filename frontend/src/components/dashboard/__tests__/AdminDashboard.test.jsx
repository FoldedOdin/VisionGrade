import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Mock functions for Jest
import AdminDashboard from '../AdminDashboard';
import adminService from '../../../services/adminService';

// Mock the admin service
jest.mock('../../../services/adminService', () => ({
  default: {
    getDashboardData: jest.fn(),
  },
}));

// Mock the admin components
jest.mock('../admin/UserManagement', () => ({
  default: () => <div data-testid="user-management">User Management Component</div>,
}));

jest.mock('../admin/TutorAssignment', () => ({
  default: () => <div data-testid="tutor-assignment">Tutor Assignment Component</div>,
}));

jest.mock('../admin/SubjectManagement', () => ({
  default: () => <div data-testid="subject-management">Subject Management Component</div>,
}));

jest.mock('../admin/SystemAnnouncements', () => ({
  default: () => <div data-testid="system-announcements">System Announcements Component</div>,
}));

jest.mock('../admin/StudentPromotion', () => ({
  default: () => <div data-testid="student-promotion">Student Promotion Component</div>,
}));

describe('AdminDashboard', () => {
  const mockDashboardData = {
    totalUsers: 150,
    activeStudents: 120,
    totalFaculty: 25,
    totalSubjects: 48,
    graduatedStudents: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    adminService.getDashboardData.mockImplementation(() => new Promise(() => {}));
    
    render(<AdminDashboard />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders dashboard data after loading', async () => {
    adminService.getDashboardData.mockResolvedValue({
      data: mockDashboardData,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
    expect(screen.getByText('120')).toBeInTheDocument(); // Active Students
    expect(screen.getByText('25')).toBeInTheDocument(); // Faculty Members
    expect(screen.getByText('48')).toBeInTheDocument(); // Total Subjects
  });

  it('renders error state when dashboard data fails to load', async () => {
    const errorMessage = 'Failed to load dashboard data';
    adminService.getDashboardData.mockRejectedValue(new Error(errorMessage));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('allows retrying after error', async () => {
    adminService.getDashboardData
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: mockDashboardData });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(adminService.getDashboardData).toHaveBeenCalledTimes(2);
  });

  it('renders navigation tabs', async () => {
    adminService.getDashboardData.mockResolvedValue({
      data: mockDashboardData,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Tutor Assignment')).toBeInTheDocument();
    expect(screen.getByText('Subject Management')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Student Promotion')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    adminService.getDashboardData.mockResolvedValue({
      data: mockDashboardData,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Initially shows overview
    expect(screen.getByText('Total Users')).toBeInTheDocument();

    // Switch to User Management
    fireEvent.click(screen.getByText('User Management'));
    expect(screen.getByTestId('user-management')).toBeInTheDocument();

    // Switch to Tutor Assignment
    fireEvent.click(screen.getByText('Tutor Assignment'));
    expect(screen.getByTestId('tutor-assignment')).toBeInTheDocument();

    // Switch to Subject Management
    fireEvent.click(screen.getByText('Subject Management'));
    expect(screen.getByTestId('subject-management')).toBeInTheDocument();

    // Switch to Announcements
    fireEvent.click(screen.getByText('Announcements'));
    expect(screen.getByTestId('system-announcements')).toBeInTheDocument();

    // Switch to Student Promotion
    fireEvent.click(screen.getByText('Student Promotion'));
    expect(screen.getByTestId('student-promotion')).toBeInTheDocument();
  });

  it('renders quick action buttons in overview', async () => {
    adminService.getDashboardData.mockResolvedValue({
      data: mockDashboardData,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByText('Add New Subject')).toBeInTheDocument();
    expect(screen.getByText('Send Announcement')).toBeInTheDocument();
  });

  it('quick action buttons navigate to correct tabs', async () => {
    adminService.getDashboardData.mockResolvedValue({
      data: mockDashboardData,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Click Add New User button
    fireEvent.click(screen.getByText('Add New User'));
    expect(screen.getByTestId('user-management')).toBeInTheDocument();

    // Go back to overview
    fireEvent.click(screen.getByText('Overview'));

    // Click Add New Subject button
    fireEvent.click(screen.getByText('Add New Subject'));
    expect(screen.getByTestId('subject-management')).toBeInTheDocument();

    // Go back to overview
    fireEvent.click(screen.getByText('Overview'));

    // Click Send Announcement button
    fireEvent.click(screen.getByText('Send Announcement'));
    expect(screen.getByTestId('system-announcements')).toBeInTheDocument();
  });

  it('displays student status breakdown', async () => {
    adminService.getDashboardData.mockResolvedValue({
      data: mockDashboardData,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Student Status')).toBeInTheDocument();
    expect(screen.getByText('Active Students')).toBeInTheDocument();
    expect(screen.getByText('Graduated Students')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // Graduated count
  });
});