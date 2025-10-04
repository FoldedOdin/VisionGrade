import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileManager from '../ProfileManager';
import * as authService from '../../../services/authService';

// Mock the auth service
jest.mock('../../../services/authService');

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      profilePhoto: null
    },
    updateUser: jest.fn()
  })
}));

// Mock file reading
global.FileReader = class {
  readAsDataURL() {
    this.onload({ target: { result: 'data:image/jpeg;base64,fake-image-data' } });
  }
};

describe('ProfileManager Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders profile manager with user data', () => {
    render(<ProfileManager />);
    
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
  });

  test('allows editing profile information', async () => {
    render(<ProfileManager />);
    
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    
    expect(nameInput).toHaveValue('Updated Name');
  });

  test('validates required fields', async () => {
    render(<ProfileManager />);
    
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(<ProfileManager />);
    
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  test('handles profile photo upload', async () => {
    render(<ProfileManager />);
    
    const fileInput = screen.getByLabelText(/profile photo/i);
    const file = new File(['fake-image'], 'profile.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByAltText(/profile preview/i)).toBeInTheDocument();
    });
  });

  test('validates file type for photo upload', async () => {
    render(<ProfileManager />);
    
    const fileInput = screen.getByLabelText(/profile photo/i);
    const file = new File(['fake-file'], 'document.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/only image files are allowed/i)).toBeInTheDocument();
    });
  });

  test('validates file size for photo upload', async () => {
    render(<ProfileManager />);
    
    const fileInput = screen.getByLabelText(/profile photo/i);
    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/file size must be less than 5mb/i)).toBeInTheDocument();
    });
  });

  test('submits profile update with valid data', async () => {
    const mockUpdateProfile = jest.spyOn(authService, 'updateProfile').mockResolvedValue({
      success: true,
      user: { id: 1, name: 'Updated Name' }
    });

    render(<ProfileManager />);
    
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    
    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name'
        })
      );
    });
  });

  test('handles profile update error', async () => {
    const mockUpdateProfile = jest.spyOn(authService, 'updateProfile').mockRejectedValue({
      response: { data: { message: 'Update failed' } }
    });

    render(<ProfileManager />);
    
    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during update', async () => {
    const mockUpdateProfile = jest.spyOn(authService, 'updateProfile').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ProfileManager />);
    
    const submitButton = screen.getByRole('button', { name: /update profile/i });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/updating/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  test('allows password change', () => {
    render(<ProfileManager />);
    
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordButton);
    
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  test('validates password change form', async () => {
    render(<ProfileManager />);
    
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordButton);
    
    const updatePasswordButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updatePasswordButton);
    
    await waitFor(() => {
      expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/new password is required/i)).toBeInTheDocument();
    });
  });
});