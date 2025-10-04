import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginForm from '../LoginForm';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const MockWrapper = ({ children }) => (
  <BrowserRouter>
    <Toaster />
    {children}
  </BrowserRouter>
);

describe('LoginForm', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSwitchToSignup: jest.fn(),
    onSwitchToForgotPassword: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form when open', () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} isOpen={false} />
      </MockWrapper>
    );

    expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
  });

  it('switches between login types', () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    const emailButton = screen.getByRole('button', { name: /email/i });
    const phoneButton = screen.getByRole('button', { name: /phone/i });
    const idButton = screen.getByRole('button', { name: /id/i });

    // Default should be ID
    expect(screen.getByPlaceholderText('Enter your ID')).toBeInTheDocument();

    // Switch to email
    fireEvent.click(emailButton);
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();

    // Switch to phone
    fireEvent.click(phoneButton);
    expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument();

    // Switch back to ID
    fireEvent.click(idButton);
    expect(screen.getByPlaceholderText('Enter your ID')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const toggleButton = passwordInput.parentElement.querySelector('button[type="button"]');

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('validates required fields', async () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ID is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates email format when email login type is selected', async () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    // Switch to email login
    const emailButton = screen.getByRole('button', { name: /email/i });
    fireEvent.click(emailButton);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('validates phone format when phone login type is selected', async () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    // Switch to phone login
    const phoneButton = screen.getByRole('button', { name: /phone/i });
    fireEvent.click(phoneButton);

    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Phone number must be 10 digits')).toBeInTheDocument();
    });
  });

  it('calls onSwitchToSignup when signup link is clicked', () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    const signupLink = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(signupLink);

    expect(mockProps.onSwitchToSignup).toHaveBeenCalledTimes(1);
  });

  it('calls onSwitchToForgotPassword when forgot password link is clicked', () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    const forgotPasswordLink = screen.getByRole('button', { name: /forgot your password/i });
    fireEvent.click(forgotPasswordLink);

    expect(mockProps.onSwitchToForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    const closeButton = screen.getByRole('button', { name: /close/i }) || 
                       document.querySelector('button.absolute.top-4.right-4');
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('submits form with valid data', async () => {
    render(
      <MockWrapper>
        <LoginForm {...mockProps} />
      </MockWrapper>
    );

    const loginInput = screen.getByPlaceholderText('Enter your ID');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(loginInput, { target: { value: 'STU001' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Signing In...');
    });
  });
});