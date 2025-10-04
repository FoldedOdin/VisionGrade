import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarksDisplay from '../MarksDisplay';

describe('MarksDisplay Component', () => {
  const mockMarks = [
    {
      id: 1,
      subject: { name: 'Mathematics', code: 'MATH101' },
      seriesTest1: 45,
      seriesTest2: 42,
      labInternal: null,
      university: 85
    },
    {
      id: 2,
      subject: { name: 'Physics Lab', code: 'PHY101L' },
      seriesTest1: null,
      seriesTest2: null,
      labInternal: 48,
      university: null
    }
  ];

  test('renders marks display with subject data', () => {
    render(<MarksDisplay marks={mockMarks} />);
    
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('MATH101')).toBeInTheDocument();
    expect(screen.getByText('Physics Lab')).toBeInTheDocument();
    expect(screen.getByText('PHY101L')).toBeInTheDocument();
  });

  test('displays marks for different exam types', () => {
    render(<MarksDisplay marks={mockMarks} />);
    
    // Theory subject marks
    expect(screen.getByText('45')).toBeInTheDocument(); // Series Test 1
    expect(screen.getByText('42')).toBeInTheDocument(); // Series Test 2
    expect(screen.getByText('85')).toBeInTheDocument(); // University
    
    // Lab subject marks
    expect(screen.getByText('48')).toBeInTheDocument(); // Lab Internal
  });

  test('shows placeholder for missing marks', () => {
    render(<MarksDisplay marks={mockMarks} />);
    
    // Should show placeholders for missing marks
    const placeholders = screen.getAllByText('-');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  test('calculates and displays total marks', () => {
    render(<MarksDisplay marks={mockMarks} />);
    
    // Should calculate total for theory subjects (Series Test 1 + Series Test 2 + University)
    expect(screen.getByText('172')).toBeInTheDocument(); // 45 + 42 + 85
  });

  test('calculates and displays percentage', () => {
    render(<MarksDisplay marks={mockMarks} />);
    
    // Should calculate percentage based on total marks
    const percentageElements = screen.getAllByText(/%/);
    expect(percentageElements.length).toBeGreaterThan(0);
  });

  test('applies different styles for pass/fail', () => {
    render(<MarksDisplay marks={mockMarks} />);
    
    // Should apply green color for passing marks (>= 40)
    const passElements = screen.getAllByText('45');
    expect(passElements[0].closest('td')).toHaveClass('text-green-600');
    
    // Should apply red color for failing marks (< 40)
    const mockFailingMarks = [
      {
        id: 1,
        subject: { name: 'Chemistry', code: 'CHEM101' },
        seriesTest1: 25,
        seriesTest2: 30,
        university: 35
      }
    ];
    
    const { rerender } = render(<MarksDisplay marks={mockFailingMarks} />);
    rerender(<MarksDisplay marks={mockFailingMarks} />);
    
    const failElements = screen.getAllByText('25');
    expect(failElements[0].closest('td')).toHaveClass('text-red-600');
  });

  test('shows empty state when no marks available', () => {
    render(<MarksDisplay marks={[]} />);
    
    expect(screen.getByText(/no marks available/i)).toBeInTheDocument();
  });

  test('groups subjects by type (theory/lab)', () => {
    render(<MarksDisplay marks={mockMarks} />);
    
    // Should have separate sections for theory and lab subjects
    expect(screen.getByText(/theory subjects/i)).toBeInTheDocument();
    expect(screen.getByText(/lab subjects/i)).toBeInTheDocument();
  });

  test('displays subject credits', () => {
    const marksWithCredits = [
      {
        id: 1,
        subject: { name: 'Mathematics', code: 'MATH101', credits: 4 },
        seriesTest1: 45,
        seriesTest2: 42,
        university: 85
      }
    ];
    
    render(<MarksDisplay marks={marksWithCredits} />);
    
    expect(screen.getByText('4 Credits')).toBeInTheDocument();
  });

  test('handles loading state', () => {
    render(<MarksDisplay marks={null} loading={true} />);
    
    expect(screen.getByText(/loading marks/i)).toBeInTheDocument();
  });

  test('handles error state', () => {
    render(<MarksDisplay marks={null} error="Failed to load marks" />);
    
    expect(screen.getByText(/failed to load marks/i)).toBeInTheDocument();
  });
});