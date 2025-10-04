import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toast from '../Toast';

// Mock timer functions
jest.useFakeTimers();

describe('Toast Component', () => {
  const defaultProps = {
    message: 'Test toast message',
    type: 'success',
    isVisible: true,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders toast when isVisible is true', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText('Test toast message')).toBeInTheDocument();
  });

  test('does not render toast when isVisible is false', () => {
    render(<Toast {...defaultProps} isVisible={false} />);
    expect(screen.queryByText('Test toast message')).not.toBeInTheDocument();
  });

  test('applies success type styles', () => {
    render(<Toast {...defaultProps} type="success" />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-green-500');
  });

  test('applies error type styles', () => {
    render(<Toast {...defaultProps} type="error" />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-red-500');
  });

  test('applies warning type styles', () => {
    render(<Toast {...defaultProps} type="warning" />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-yellow-500');
  });

  test('applies info type styles', () => {
    render(<Toast {...defaultProps} type="info" />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-blue-500');
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Toast {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('auto-closes after duration', () => {
    const onClose = jest.fn();
    render(<Toast {...defaultProps} onClose={onClose} duration={3000} />);
    
    expect(onClose).not.toHaveBeenCalled();
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not auto-close when duration is 0', () => {
    const onClose = jest.fn();
    render(<Toast {...defaultProps} onClose={onClose} duration={0} />);
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(onClose).not.toHaveBeenCalled();
  });

  test('renders with custom title', () => {
    render(<Toast {...defaultProps} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  test('applies different positions', () => {
    const { rerender } = render(<Toast {...defaultProps} position="top-right" />);
    let toast = screen.getByRole('alert').parentElement;
    expect(toast).toHaveClass('top-4', 'right-4');
    
    rerender(<Toast {...defaultProps} position="bottom-left" />);
    toast = screen.getByRole('alert').parentElement;
    expect(toast).toHaveClass('bottom-4', 'left-4');
  });

  test('has proper accessibility attributes', () => {
    render(<Toast {...defaultProps} />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  test('renders action button when provided', () => {
    const action = {
      label: 'Undo',
      onClick: jest.fn()
    };
    
    render(<Toast {...defaultProps} action={action} />);
    
    const actionButton = screen.getByRole('button', { name: 'Undo' });
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(action.onClick).toHaveBeenCalledTimes(1);
  });
});