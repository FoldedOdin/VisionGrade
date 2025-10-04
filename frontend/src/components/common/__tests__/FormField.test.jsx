import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormField from '../FormField';

describe('FormField Component', () => {
  const defaultProps = {
    label: 'Test Field',
    name: 'testField',
    type: 'text'
  };

  test('renders form field with label', () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
  });

  test('renders input with correct type', () => {
    render(<FormField {...defaultProps} type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  test('renders textarea when type is textarea', () => {
    render(<FormField {...defaultProps} type="textarea" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  test('renders select when type is select', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ];
    
    render(<FormField {...defaultProps} type="select" options={options} />);
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  test('displays error message when error prop is provided', () => {
    render(<FormField {...defaultProps} error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  test('applies error styles when error is present', () => {
    render(<FormField {...defaultProps} error="Error message" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  test('displays help text when provided', () => {
    render(<FormField {...defaultProps} helpText="This is help text" />);
    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  test('marks field as required when required prop is true', () => {
    render(<FormField {...defaultProps} required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('disables input when disabled prop is true', () => {
    render(<FormField {...defaultProps} disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  test('handles onChange events', () => {
    const handleChange = jest.fn();
    render(<FormField {...defaultProps} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'test value'
        })
      })
    );
  });

  test('handles onBlur events', () => {
    const handleBlur = jest.fn();
    render(<FormField {...defaultProps} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  test('applies custom className', () => {
    render(<FormField {...defaultProps} className="custom-field" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-field');
  });

  test('sets placeholder text', () => {
    render(<FormField {...defaultProps} placeholder="Enter text here" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter text here');
  });

  test('sets default value', () => {
    render(<FormField {...defaultProps} defaultValue="default text" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('default text');
  });

  test('renders with icon when provided', () => {
    const Icon = () => <span data-testid="field-icon">📧</span>;
    render(<FormField {...defaultProps} icon={<Icon />} />);
    expect(screen.getByTestId('field-icon')).toBeInTheDocument();
  });
});