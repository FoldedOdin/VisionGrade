import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FormField from '../FormField';
import { useFormValidation } from '../../../hooks/useFormValidation';
import errorService from '../../../services/errorService';
import { validateFormData, sanitizeInput } from '../../../utils/validation';

// Mock the theme context
vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false })
}));

describe('Frontend Error Handling', () => {
  describe('FormField Component', () => {
    it('should display real-time validation errors', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();

      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          value=""
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          validation={{
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address'
            }
          }}
          showValidation={true}
          touched={true}
        />
      );

      const input = screen.getByLabelText(/email/i);
      
      // Test invalid email
      await user.type(input, 'invalid-email');
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Test recovery suggestion
      expect(screen.getByText(/enter an email in the format/i)).toBeInTheDocument();
    });

    it('should show password strength warnings', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <FormField
          label="Password"
          name="password"
          type="password"
          value=""
          onChange={mockOnChange}
          validation={{
            required: 'Password is required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' }
          }}
          showValidation={true}
          touched={true}
        />
      );

      const input = screen.getByLabelText(/password/i);
      
      // Test weak password
      await user.type(input, 'weakpass');
      
      await waitFor(() => {
        expect(screen.getByText(/consider using a stronger password/i)).toBeInTheDocument();
      });
    });

    it('should sanitize input to prevent XSS', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText(/name/i);
      
      // Test XSS attempt
      await user.type(input, '<script>alert("xss")</script>');
      
      // Should sanitize the input
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>')
      );
    });

    it('should provide character count warnings', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <FormField
          label="Description"
          name="description"
          type="textarea"
          value=""
          onChange={mockOnChange}
          maxLength={100}
        />
      );

      const textarea = screen.getByLabelText(/description/i);
      
      // Type text approaching limit
      const longText = 'a'.repeat(95);
      await user.type(textarea, longText);
      
      await waitFor(() => {
        expect(screen.getByText(/95\/100/)).toBeInTheDocument();
        expect(screen.getByText(/⚠️/)).toBeInTheDocument();
      });
    });

    it('should show loading state during validation', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          value=""
          onChange={mockOnChange}
          validation={{
            required: 'Email is required'
          }}
          showValidation={true}
          touched={true}
          debounceMs={500}
        />
      );

      const input = screen.getByLabelText(/email/i);
      
      await user.type(input, 'test@example.com');
      
      // Should show loading spinner briefly
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('useFormValidation Hook', () => {
    const TestComponent = ({ validationSchema }) => {
      const {
        values,
        errors,
        handleChange,
        handleSubmit,
        submitError,
        isSubmitting
      } = useFormValidation({}, validationSchema);

      const onSubmit = async (data) => {
        throw new Error('Test error');
      };

      return (
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit);
        }}>
          <input
            data-testid="email-input"
            value={values.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
          />
          {errors.email && <div data-testid="email-error">{errors.email}</div>}
          {submitError && <div data-testid="submit-error">{submitError}</div>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      );
    };

    it('should handle form submission errors gracefully', async () => {
      const user = userEvent.setup();
      const validationSchema = {
        email: {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Invalid email format'
          }
        }
      };

      render(<TestComponent validationSchema={validationSchema} />);

      const input = screen.getByTestId('email-input');
      const submitButton = screen.getByRole('button');

      await user.type(input, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toBeInTheDocument();
      });
    });

    it('should provide field-specific error recovery', async () => {
      const user = userEvent.setup();
      const validationSchema = {
        email: {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Invalid email format'
          }
        }
      };

      render(<TestComponent validationSchema={validationSchema} />);

      const input = screen.getByTestId('email-input');

      // Test invalid email
      await user.type(input, 'invalid-email');
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email format');
      });

      // Clear and test empty field
      await user.clear(input);
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
      });
    });
  });

  describe('Error Service', () => {
    beforeEach(() => {
      // Reset error service state
      vi.clearAllMocks();
    });

    it('should handle authentication errors with secure messages', () => {
      const authError = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'AUTHENTICATION_ERROR',
              message: 'Invalid credentials'
            }
          }
        }
      };

      const result = errorService.handleError(authError, { action: 'login_attempt' });

      expect(result.message).not.toContain('user not found');
      expect(result.message).not.toContain('email does not exist');
      expect(result.message).toContain('Invalid credentials');
      expect(result.suggestions).toContain('Verify your email/phone and password');
    });

    it('should provide role-specific authorization messages', () => {
      const authzError = {
        response: {
          status: 403,
          data: {
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: 'Insufficient permissions'
            }
          }
        }
      };

      // Mock user role
      localStorage.setItem('userRole', 'student');

      const result = errorService.handleError(authzError, { requiredRole: 'faculty' });

      expect(result.message).toContain('faculty members');
      expect(result.suggestions).toContain('Contact your instructor');
    });

    it('should handle network errors with retry suggestions', () => {
      const networkError = {
        request: {},
        message: 'Network Error'
      };

      const result = errorService.handleError(networkError);

      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.recoverable).toBe(true);
      expect(result.suggestions).toContain('Check your internet connection');
    });

    it('should provide context-aware validation error messages', () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [
                {
                  field: 'email',
                  message: 'Invalid email format',
                  suggestion: 'Enter an email in the format: user@example.com'
                }
              ]
            }
          }
        }
      };

      const result = errorService.handleError(validationError);

      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.details).toHaveLength(1);
      expect(result.details[0].suggestion).toContain('user@example.com');
    });

    it('should handle rate limiting with retry information', () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            error: {
              code: 'RATE_LIMIT_ERROR',
              message: 'Too many requests',
              details: {
                retryAfter: 60
              }
            }
          }
        }
      };

      const result = errorService.handleError(rateLimitError);

      expect(result.type).toBe('RATE_LIMIT_ERROR');
      expect(result.retryAfter).toBe(60);
      expect(result.suggestions).toContain('Wait 60 seconds');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'data:text/html,<script>alert(1)</script>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('data:');
      });
    });

    it('should preserve safe content', () => {
      const safeInputs = [
        'Normal text content',
        'Email: user@example.com',
        'Phone: (555) 123-4567',
        'Address: 123 Main St, City, State 12345'
      ];

      safeInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).toBe(input);
      });
    });

    it('should handle edge cases safely', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        123,
        true,
        [],
        {}
      ];

      edgeCases.forEach(input => {
        expect(() => sanitizeInput(input)).not.toThrow();
      });
    });
  });

  describe('Form Validation Utilities', () => {
    it('should validate complete forms with comprehensive feedback', () => {
      const formData = {
        email: 'invalid-email',
        password: '123',
        confirmPassword: '456',
        name: ''
      };

      const schema = {
        email: {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Invalid email format'
          }
        },
        password: {
          required: 'Password is required',
          minLength: { value: 8, message: 'Password too short' }
        },
        confirmPassword: {
          required: 'Please confirm password',
          validate: (value) => value === formData.password || 'Passwords do not match'
        },
        name: {
          required: 'Name is required'
        }
      };

      const result = validateFormData(formData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(result.errors).toHaveProperty('confirmPassword');
      expect(result.errors).toHaveProperty('name');
      expect(result.suggestions).toHaveProperty('email');
      expect(result.summary.errorCount).toBe(4);
    });

    it('should provide recovery suggestions for common validation errors', () => {
      const testCases = [
        {
          data: { email: 'invalid' },
          schema: { email: { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } } },
          expectedSuggestion: 'check the format'
        },
        {
          data: { password: '123' },
          schema: { password: { minLength: { value: 8, message: 'Too short' } } },
          expectedSuggestion: 'at least 8 characters'
        },
        {
          data: { name: '' },
          schema: { name: { required: 'Name is required' } },
          expectedSuggestion: 'provide a value'
        }
      ];

      testCases.forEach(({ data, schema, expectedSuggestion }) => {
        const result = validateFormData(data, schema);
        const field = Object.keys(data)[0];
        expect(result.suggestions[field]).toContain(expectedSuggestion);
      });
    });
  });
});