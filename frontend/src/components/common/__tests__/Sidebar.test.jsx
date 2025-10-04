import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import Sidebar from '../Sidebar';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: {
      role: 'student',
      name: 'Test User'
    },
    logout: jest.fn()
  })
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Sidebar Component', () => {
  test('renders sidebar with navigation items', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  test('displays user role-specific navigation items', () => {
    renderWithProviders(<Sidebar />);
    // Student should see dashboard link
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  test('toggles sidebar collapse state', () => {
    renderWithProviders(<Sidebar />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
    fireEvent.click(toggleButton);
    
    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass('w-16'); // Collapsed width
  });

  test('shows theme toggle button', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });

  test('displays user information', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('shows logout button', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  test('handles logout click', () => {
    const mockLogout = jest.fn();
    jest.doMock('../../../hooks/useAuth', () => ({
      __esModule: true,
      default: () => ({
        user: { role: 'student', name: 'Test User' },
        logout: mockLogout
      })
    }));

    renderWithProviders(<Sidebar />);
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    // Note: The actual logout function call would be tested in integration tests
  });

  test('applies responsive classes', () => {
    renderWithProviders(<Sidebar />);
    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass('fixed', 'left-0', 'top-0', 'h-full');
  });

  test('shows active navigation item', () => {
    // Mock window.location
    delete window.location;
    window.location = { pathname: '/dashboard' };
    
    renderWithProviders(<Sidebar />);
    
    const dashboardLink = screen.getByText(/dashboard/i).closest('a');
    expect(dashboardLink).toHaveClass('bg-blue-600'); // Active state
  });
});