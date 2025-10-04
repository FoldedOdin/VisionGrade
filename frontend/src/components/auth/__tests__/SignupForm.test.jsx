import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignupForm from '../SignupForm';
import * as authService from '../../../services/authService';

// Mock the auth service
jest.mock('../../../services/authService');

describe('SignupForm Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders signup form with all fields', () => {
    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  test('validates password confirmation', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.blur(confirmPasswordInput);
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('validates phone number format', async () => {
    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.blur(phoneInput);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const mockSignup = jest.spyOn(authService, 'signup').mockResolvedValue({
      success: true,
      user: { id: 1, name: 'Test User' }
    });

    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'student' } });
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        password: 'password123',
        role: 'student'
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('handles signup error', async () => {
    const mockSignup = jest.spyOn(authService, 'signup').mockRejectedValue({
      response: { data: { message: 'Email already exists' } }
    });

    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'student' } });
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    const mockSignup = jest.spyOn(authService, 'signup').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'student' } });
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/signing up/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  test('calls onClose when close button is clicked', () => {
    render(<SignupForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});