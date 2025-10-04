import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationCenter from '../NotificationCenter';
import * as studentService from '../../../services/studentService';

// Mock the student service
jest.mock('../../../services/studentService');

describe('NotificationCenter Component', () => {
  const mockNotifications = [
    {
      id: 1,
      title: 'Low Attendance Alert',
      message: 'Your attendance in Mathematics is below 75%',
      type: 'auto',
      isRead: false,
      createdAt: '2024-10-01T10:00:00Z'
    },
    {
      id: 2,
      title: 'New Assignment',
      message: 'Physics assignment has been posted',
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(studentService, 'getNotifications').mockResolvedValue({
      data: mockNotifications
    });
  });

  test('renders notification center with bell icon', async () => {
    render(<NotificationCenter />);
    
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });
  });

  test('shows unread notification count', async () => {
    render(<NotificationCenter />);
    
    await waitFor(() => {
      // Should show count of unread notifications (2 in mock data)
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  test('opens notification dropdown when bell is clicked', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Low Attendance Alert')).toBeInTheDocument();
      expect(screen.getByText('New Assignment')).toBeInTheDocument();
      expect(screen.getByText('System Maintenance')).toBeInTheDocument();
    });
  });

  test('categorizes notifications by type', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      // Should show category headers
      expect(screen.getByText(/system notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/academic notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/automated alerts/i)).toBeInTheDocument();
    });
  });

  test('displays notification timestamps', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      // Should show relative timestamps
      expect(screen.getByText(/1 day ago/i)).toBeInTheDocument();
      expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
    });
  });

  test('marks notification as read when clicked', async () => {
    const mockMarkAsRead = jest.spyOn(studentService, 'markNotificationAsRead').mockResolvedValue({});
    
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const notification = screen.getByText('Low Attendance Alert');
      fireEvent.click(notification);
    });
    
    expect(mockMarkAsRead).toHaveBeenCalledWith(1);
  });

  test('shows different icons for notification types', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      // Should show different icons for different types
      expect(screen.getByTestId('system-icon')).toBeInTheDocument();
      expect(screen.getByTestId('academic-icon')).toBeInTheDocument();
      expect(screen.getByTestId('auto-icon')).toBeInTheDocument();
    });
  });

  test('applies different styles for read/unread notifications', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const unreadNotification = screen.getByText('Low Attendance Alert').closest('.notification-item');
      const readNotification = screen.getByText('New Assignment').closest('.notification-item');
      
      expect(unreadNotification).toHaveClass('bg-blue-50');
      expect(readNotification).not.toHaveClass('bg-blue-50');
    });
  });

  test('shows empty state when no notifications', async () => {
    jest.spyOn(studentService, 'getNotifications').mockResolvedValue({
      data: []
    });
    
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  test('handles notification loading error', async () => {
    jest.spyOn(studentService, 'getNotifications').mockRejectedValue(new Error('Failed to load'));
    
    render(<NotificationCenter />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load notifications/i)).toBeInTheDocument();
    });
  });

  test('allows marking all notifications as read', async () => {
    const mockMarkAllAsRead = jest.spyOn(studentService, 'markAllNotificationsAsRead').mockResolvedValue({});
    
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const markAllButton = screen.getByRole('button', { name: /mark all as read/i });
      fireEvent.click(markAllButton);
    });
    
    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });

  test('shows notification priority levels', async () => {
    const priorityNotifications = [
      {
        ...mockNotifications[0],
        priority: 'high'
      }
    ];
    
    jest.spyOn(studentService, 'getNotifications').mockResolvedValue({
      data: priorityNotifications
    });
    
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('high-priority-indicator')).toBeInTheDocument();
    });
  });

  test('animates bell icon when new notifications arrive', async () => {
    render(<NotificationCenter />);
    
    await waitFor(() => {
      const bellIcon = screen.getByTestId('notification-bell');
      expect(bellIcon).toHaveClass('animate-bounce');
    });
  });
});