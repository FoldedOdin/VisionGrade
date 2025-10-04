import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ForgotPasswordForm from '../ForgotPasswordForm';
import * as authService from '../../../services/authService';

// Mock the auth service
jest.mock('../../../services/authService');

describe('ForgotPasswordForm Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders forgot password form', () => {
    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email or phone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  test('validates required field', async () => {
    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email or phone is required/i)).toBeInTheDocument();
    });
  });

  test('validates email format when email is provided', async () => {
    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const input = screen.getByLabelText(/email or phone/i);
    fireEvent.change(input, { target: { value: 'invalid-email' } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  test('validates phone format when phone is provided', async () => {
    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const input = screen.getByLabelText(/email or phone/i);
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid email', async () => {
    const mockForgotPassword = jest.spyOn(authService, 'forgotPassword').mockResolvedValue({
      success: true,
      message: 'Reset link sent'
    });

    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const input = screen.getByLabelText(/email or phone/i);
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid phone', async () => {
    const mockForgotPassword = jest.spyOn(authService, 'forgotPassword').mockResolvedValue({
      success: true,
      message: 'Reset code sent'
    });

    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const input = screen.getByLabelText(/email or phone/i);
    fireEvent.change(input, { target: { value: '1234567890' } });
    
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('1234567890');
      expect(screen.getByText(/reset code sent/i)).toBeInTheDocument();
    });
  });

  test('handles forgot password error', async () => {
    const mockForgotPassword = jest.spyOn(authService, 'forgotPassword').mockRejectedValue({
      response: { data: { message: 'User not found' } }
    });

    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const input = screen.getByLabelText(/email or phone/i);
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/user not found/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    const mockForgotPassword = jest.spyOn(authService, 'forgotPassword').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const input = screen.getByLabelText(/email or phone/i);
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  test('calls onClose when close button is clicked', () => {
    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('shows back to login link', () => {
    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });

  test('handles back to login click', () => {
    render(<ForgotPasswordForm onClose={mockOnClose} />);
    
    const backLink = screen.getByText(/back to login/i);
    fireEvent.click(backLink);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});