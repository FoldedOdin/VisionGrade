import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PredictionControls from '../PredictionControls';
import facultyService from '../../../services/facultyService';

// Mock the faculty service
jest.mock('../../../services/facultyService');

const mockSubject = {
  id: 1,
  subject_name: 'Mathematics',
  subject_code: 'MATH101',
  subject_type: 'theory',
  semester: 1
};

const mockPredictionData = {
  predictions: [
    {
      id: 1,
      student: {
        id: 1,
        name: 'John Doe',
        unique_id: 'STU001'
      },
      predicted_marks: 75.5,
      confidence_score: 0.85,
      is_visible: true,
      created_at: '2024-10-02T10:00:00Z'
    },
    {
      id: 2,
      student: {
        id: 2,
        name: 'Jane Smith',
        unique_id: 'STU002'
      },
      predicted_marks: 45.2,
      confidence_score: 0.78,
      is_visible: true,
      created_at: '2024-10-02T10:00:00Z'
    }
  ],
  subject: mockSubject
};

const mockAccuracyData = {
  ml_service_stats: {
    average_accuracy: 85.5,
    total_predictions: 2,
    accurate_predictions: 1
  }
};

describe('PredictionControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders message for non-tutor users', () => {
    render(<PredictionControls subject={mockSubject} userRole="faculty" />);
    
    expect(screen.getByText('ML prediction controls are only available for tutors.')).toBeInTheDocument();
  });

  it('shows loading state initially for tutors', () => {
    facultyService.getSubjectPredictions.mockImplementation(() => new Promise(() => {}));
    facultyService.getPredictionAccuracy.mockImplementation(() => new Promise(() => {}));

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);
    
    expect(screen.getByTestId('loading-skeleton') || document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays prediction data for tutors', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: mockPredictionData.predictions,
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: mockAccuracyData.ml_service_stats
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('ML Prediction Controls')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage ML predictions for Mathematics')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('76%')).toBeInTheDocument(); // Rounded predicted marks
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows visibility toggle controls', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: mockPredictionData.predictions,
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: mockAccuracyData.ml_service_stats
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('Student Visibility')).toBeInTheDocument();
    });

    expect(screen.getByText('Hide')).toBeInTheDocument();
    expect(screen.getByText('Show')).toBeInTheDocument();
  });

  it('handles visibility toggle', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: mockPredictionData.predictions,
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: mockAccuracyData.ml_service_stats
    });
    facultyService.togglePredictionVisibility.mockResolvedValue({
      success: true,
      data: {
        is_visible: false,
        updated_predictions: 2
      }
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    const hideButton = screen.getByText('Hide');
    fireEvent.click(hideButton);

    await waitFor(() => {
      expect(facultyService.togglePredictionVisibility).toHaveBeenCalledWith(1, false);
    });
  });

  it('handles prediction generation', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: [],
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: mockAccuracyData.ml_service_stats
    });
    facultyService.generateBatchPredictions.mockResolvedValue({
      success: true
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('Generate Predictions')).toBeInTheDocument();
    });

    const generateButton = screen.getByText('Generate Predictions');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(facultyService.generateBatchPredictions).toHaveBeenCalledWith(1);
    });
  });

  it('displays accuracy statistics', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: mockPredictionData.predictions,
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: mockAccuracyData.ml_service_stats
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('Model Accuracy')).toBeInTheDocument();
    });

    expect(screen.getByText('86%')).toBeInTheDocument(); // Rounded accuracy
    expect(screen.getByText('2')).toBeInTheDocument(); // Total predictions
  });

  it('shows empty state when no predictions exist', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: [],
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: { average_accuracy: 0, total_predictions: 0 }
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('No predictions available')).toBeInTheDocument();
    });

    expect(screen.getByText('Generate predictions to see student performance forecasts.')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    facultyService.getSubjectPredictions.mockRejectedValue(new Error('API Error'));
    facultyService.getPredictionAccuracy.mockRejectedValue(new Error('API Error'));

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load prediction data. Please try again.')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows pass/fail indicators correctly', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: mockPredictionData.predictions,
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: mockAccuracyData.ml_service_stats
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('Pass')).toBeInTheDocument();
      expect(screen.getByText('At Risk')).toBeInTheDocument();
    });
  });

  it('displays confidence scores correctly', async () => {
    facultyService.getSubjectPredictions.mockResolvedValue({
      success: true,
      predictions: mockPredictionData.predictions,
      subject: mockSubject
    });
    facultyService.getPredictionAccuracy.mockResolvedValue({
      success: true,
      ml_service_stats: mockAccuracyData.ml_service_stats
    });

    render(<PredictionControls subject={mockSubject} userRole="tutor" />);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument(); // First student confidence
      expect(screen.getByText('78%')).toBeInTheDocument(); // Second student confidence
    });
  });
});