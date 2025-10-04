import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders spinner with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  test('renders spinner with small size', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  test('renders spinner with large size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  test('renders with custom color', () => {
    render(<LoadingSpinner color="red" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-red-600');
  });

  test('renders with loading text', () => {
    render(<LoadingSpinner text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  test('centers spinner when center prop is true', () => {
    const { container } = render(<LoadingSpinner center />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'justify-center', 'items-center');
  });

  test('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-spinner');
  });

  test('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  test('renders overlay when overlay prop is true', () => {
    const { container } = render(<LoadingSpinner overlay />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
  });
});