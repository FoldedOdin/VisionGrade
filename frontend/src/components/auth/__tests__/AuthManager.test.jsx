import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthManager from '../AuthManager';
import { AuthProvider } from '../../../hooks/useAuth.jsx';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const MockWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <Toaster />
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('AuthManager', () => {
  beforeEach(() => {
    // Clear any existing window.authManager
    if (typeof window !== 'undefined') {
      delete window.authManager;
    }
  });

  it('renders without crashing', () => {
    render(
      <MockWrapper>
        <AuthManager />
      </MockWrapper>
    );
    
    // Should not show any forms initially
    expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Account')).not.toBeInTheDocument();
    expect(screen.queryByText('Reset Password')).not.toBeInTheDocument();
  });

  it('exposes authManager functions to window', () => {
    render(
      <MockWrapper>
        <AuthManager />
      </MockWrapper>
    );

    expect(window.authManager).toBeDefined();
    expect(typeof window.authManager.openLogin).toBe('function');
    expect(typeof window.authManager.openSignup).toBe('function');
    expect(typeof window.authManager.openForgotPassword).toBe('function');
    expect(typeof window.authManager.openProfile).toBe('function');
  });

  it('opens login form when openLogin is called', () => {
    render(
      <MockWrapper>
        <AuthManager />
      </MockWrapper>
    );

    // Call the function to open login
    window.authManager.openLogin();

    // Re-render to see the changes
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });
});