import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import ErrorBoundary from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Wrapper component for testing
const TestWrapper = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error fallback when child component throws', () => {
    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
  });

  it('should display error ID', () => {
    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });

  it('should have Try Again button', () => {
    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should have Reload Page button', () => {
    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', () => {
    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Error boundary should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click Try Again
    fireEvent.click(screen.getByText('Try Again'));

    // Re-render with no error
    rerender(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </TestWrapper>
    );

    // Should show normal content
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onErrorMock = jest.fn();

    render(
      <TestWrapper>
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = (error, retry) => (
      <div>
        <h1>Custom Error UI</h1>
        <p>Error: {error?.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <TestWrapper>
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="Custom error" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.getByText('Error: Custom error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Dev error" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Copy Error Details')).toBeInTheDocument();
    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Prod error" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.queryByText('Copy Error Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle multiple errors correctly', () => {
    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Reset and throw different error
    fireEvent.click(screen.getByText('Try Again'));

    rerender(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle errors in nested components', () => {
    const NestedComponent = () => (
      <div>
        <span>Nested content</span>
        <ThrowError shouldThrow={true} errorMessage="Nested error" />
      </div>
    );

    render(
      <TestWrapper>
        <ErrorBoundary>
          <NestedComponent />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should preserve error boundary state across re-renders', () => {
    const TestComponent = ({ count }) => {
      if (count > 2) {
        throw new Error('Count too high');
      }
      return <div>Count: {count}</div>;
    };

    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary>
          <TestComponent count={1} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Count: 1')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <ErrorBoundary>
          <TestComponent count={2} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Count: 2')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <ErrorBoundary>
          <TestComponent count={3} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});