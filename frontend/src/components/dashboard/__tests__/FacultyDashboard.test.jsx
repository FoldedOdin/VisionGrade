import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FacultyDashboard from '../FacultyDashboard';
import facultyService from '../../../services/facultyService';

// Mock the faculty service
jest.mock('../../../services/facultyService');

// Mock the child components
jest.mock('../MarksEntryForm', () => {
  return function MockMarksEntryForm() {
    return <div data-testid="marks-entry-form">Marks Entry Form</div>;
  };
});

jest.mock('../AttendanceManagement', () => {
  return function MockAttendanceManagement() {
    return <div data-testid="attendance-management">Attendance Management</div>;
  };
});

jest.mock('../GraphicalInsights', () => {
  return function MockGraphicalInsights() {
    return <div data-testid="graphical-insights">Graphical Insights</div>;
  };
});

jest.mock('../AnnouncementSystem', () => {
  return function MockAnnouncementSystem() {
    return <div data-testid="announcement-system">Announcement System</div>;
  };
});

jest.mock('../AtRiskStudentAlerts', () => {
  return function MockAtRiskStudentAlerts() {
    return <div data-testid="at-risk-alerts">At Risk Student Alerts</div>;
  };
});

const mockDashboardData = {
  success: true,
  data: {
    faculty_info: {
      id: 1,
      name: 'Dr. John Smith',
      department: 'Computer Science',
      is_tutor: true,
      tutor_semester: 3,
      user: {
        unique_id: 'FAC001',
        email: 'john.smith@university.edu',
        profile_photo: null
      }
    },
    assigned_subjects: [
      {
        id: 1,
        subject_code: 'CS101',
        subject_name: 'Introduction to Programming',
        subject_type: 'theory',
        semester: 1,
        credits: 3
      }
    ],
    dashboard_statistics: {
      total_subjects: 1,
      total_students: 25,
      students_at_risk: 3,
      low_attendance_alerts: 2,
      recent_activities: [
        {
          type: 'marks_entry',
          description: 'Added series_test_1 marks for John Doe in Introduction to Programming',
          subject: 'Introduction to Programming',
          student: 'John Doe',
          marks: '45/50',
          created_at: '2025-10-02T10:30:00Z'
        }
      ]
    },
    academic_year: 2025
  }
};

const mockSubjectsData = {
  success: true,
  data: {
    subjects: [
      {
        id: 1,
        subject_code: 'CS101',
        subject_name: 'Introduction to Programming',
        subject_type: 'theory',
        semester: 1,
        credits: 3,
        statistics: {
          enrolled_students: 25,
          students_with_marks: 20,
          students_with_attendance: 25,
          average_attendance: 85.5,
          marks_completion_rate: 80,
          attendance_completion_rate: 100
        }
      }
    ],
    academic_year: 2025,
    total_subjects: 1
  }
};

const renderFacultyDashboard = () => {
  return render(
    <BrowserRouter>
      <FacultyDashboard />
    </BrowserRouter>
  );
};

describe('FacultyDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    facultyService.getDashboard.mockResolvedValue(mockDashboardData);
    facultyService.getSubjects.mockResolvedValue(mockSubjectsData);
  });

  it('renders loading state initially', () => {
    facultyService.getDashboard.mockImplementation(() => new Promise(() => {}));
    facultyService.getSubjects.mockImplementation(() => new Promise(() => {}));
    
    renderFacultyDashboard();
    
    expect(screen.getByText('Loading faculty dashboard...')).toBeInTheDocument();
  });

  it('renders faculty dashboard with data', async () => {
    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('Faculty Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Welcome back, Dr. John Smith')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Tutor - Semester 3')).toBeInTheDocument();
  });

  it('displays dashboard statistics', async () => {
    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Total subjects
    });

    expect(screen.getByText('25')).toBeInTheDocument(); // Total students
    expect(screen.getByText('3')).toBeInTheDocument(); // At risk students
    expect(screen.getByText('2')).toBeInTheDocument(); // Low attendance alerts
  });

  it('displays assigned subjects', async () => {
    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('Introduction to Programming')).toBeInTheDocument();
    });

    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('theory')).toBeInTheDocument();
    expect(screen.getByText('Semester 1 • 3 Credits')).toBeInTheDocument();
    expect(screen.getByText('25 Students')).toBeInTheDocument();
  });

  it('displays recent activities', async () => {
    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('Recent Activities')).toBeInTheDocument();
    });

    expect(screen.getByText('Added series_test_1 marks for John Doe in Introduction to Programming')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    const errorMessage = 'Failed to load dashboard data';
    facultyService.getDashboard.mockRejectedValue(new Error(errorMessage));
    facultyService.getSubjects.mockRejectedValue(new Error(errorMessage));

    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders tab navigation', async () => {
    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    expect(screen.getByText('Marks Entry')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('At-Risk Alerts')).toBeInTheDocument();
  });

  it('shows overview tab content by default', async () => {
    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('Introduction to Programming Overview')).toBeInTheDocument();
    });

    expect(screen.getByText('25')).toBeInTheDocument(); // Enrolled students
    expect(screen.getByText('80%')).toBeInTheDocument(); // Marks completion rate
    expect(screen.getByText('85.5%')).toBeInTheDocument(); // Average attendance
  });
});

describe('FacultyDashboard API Integration', () => {
  it('calls faculty service methods on mount', async () => {
    facultyService.getDashboard.mockResolvedValue(mockDashboardData);
    facultyService.getSubjects.mockResolvedValue(mockSubjectsData);

    renderFacultyDashboard();

    await waitFor(() => {
      expect(facultyService.getDashboard).toHaveBeenCalledTimes(1);
      expect(facultyService.getSubjects).toHaveBeenCalledTimes(1);
    });
  });

  it('handles API call failures gracefully', async () => {
    facultyService.getDashboard.mockRejectedValue(new Error('Network error'));
    facultyService.getSubjects.mockRejectedValue(new Error('Network error'));

    renderFacultyDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument();
    });
  });
});