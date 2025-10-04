import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceVisualization from '../AttendanceVisualization';

describe('AttendanceVisualization Component', () => {
  const mockAttendance = [
    {
      id: 1,
      subject: { name: 'Mathematics', code: 'MATH101' },
      totalClasses: 50,
      attendedClasses: 45,
      attendancePercentage: 90.0
    },
    {
      id: 2,
      subject: { name: 'Physics', code: 'PHY101' },
      totalClasses: 40,
      attendedClasses: 28,
      attendancePercentage: 70.0
    },
    {
      id: 3,
      subject: { name: 'Chemistry', code: 'CHEM101' },
      totalClasses: 45,
      attendedClasses: 30,
      attendancePercentage: 66.7
    }
  ];

  test('renders attendance visualization with subject data', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
    expect(screen.getByText('Chemistry')).toBeInTheDocument();
  });

  test('displays attendance percentages', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('70.0%')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
  });

  test('displays attended vs total classes', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    expect(screen.getByText('45/50')).toBeInTheDocument();
    expect(screen.getByText('28/40')).toBeInTheDocument();
    expect(screen.getByText('30/45')).toBeInTheDocument();
  });

  test('applies color coding based on attendance percentage', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    // Good attendance (>= 85%) should be green
    const goodAttendance = screen.getByText('90.0%').closest('.attendance-item');
    expect(goodAttendance).toHaveClass('border-green-500');
    
    // Warning attendance (75-84%) should be yellow
    const warningAttendance = screen.getByText('70.0%').closest('.attendance-item');
    expect(warningAttendance).toHaveClass('border-yellow-500');
    
    // Poor attendance (< 75%) should be red
    const poorAttendance = screen.getByText('66.7%').closest('.attendance-item');
    expect(poorAttendance).toHaveClass('border-red-500');
  });

  test('shows progress bars for attendance', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(3);
    
    // Check progress bar values
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '90');
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '70');
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '66.7');
  });

  test('displays warning for low attendance', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    // Should show warning for attendance below 75%
    expect(screen.getByText(/attendance below 75%/i)).toBeInTheDocument();
  });

  test('shows overall attendance summary', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    // Should calculate and display overall attendance
    const overallPercentage = ((45 + 28 + 30) / (50 + 40 + 45) * 100).toFixed(1);
    expect(screen.getByText(`${overallPercentage}%`)).toBeInTheDocument();
  });

  test('handles empty attendance data', () => {
    render(<AttendanceVisualization attendance={[]} />);
    
    expect(screen.getByText(/no attendance data available/i)).toBeInTheDocument();
  });

  test('handles loading state', () => {
    render(<AttendanceVisualization attendance={null} loading={true} />);
    
    expect(screen.getByText(/loading attendance/i)).toBeInTheDocument();
  });

  test('handles error state', () => {
    render(<AttendanceVisualization attendance={null} error="Failed to load attendance" />);
    
    expect(screen.getByText(/failed to load attendance/i)).toBeInTheDocument();
  });

  test('displays attendance trends', () => {
    render(<AttendanceVisualization attendance={mockAttendance} showTrends={true} />);
    
    // Should show trend indicators
    expect(screen.getByText(/improving/i)).toBeInTheDocument();
    expect(screen.getByText(/declining/i)).toBeInTheDocument();
  });

  test('shows attendance alerts', () => {
    render(<AttendanceVisualization attendance={mockAttendance} />);
    
    // Should show alert for subjects with low attendance
    const alerts = screen.getAllByText(/alert/i);
    expect(alerts.length).toBeGreaterThan(0);
  });

  test('allows filtering by attendance threshold', () => {
    render(<AttendanceVisualization attendance={mockAttendance} threshold={75} />);
    
    // Should highlight subjects below threshold
    const belowThreshold = mockAttendance.filter(item => item.attendancePercentage < 75);
    expect(screen.getAllByText(/below threshold/i)).toHaveLength(belowThreshold.length);
  });
});