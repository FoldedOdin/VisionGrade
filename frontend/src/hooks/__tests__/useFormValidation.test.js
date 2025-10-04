import { renderHook, act } from '@testing-library/react';
import { useFormValidation, useAsyncOperation, useFieldValidation } from '../useFormValidation';
import { validationRules } from '../../utils/validation';

describe('useFormValidation', () => {
  const mockValidationSchema = {
    email: validationRules.email,
    password: validationRules.password,
    fullName: validationRules.fullName
  };

  const initialValues = {
    email: '',
    password: '',
    fullName: ''
  };

  it('should initialize with default values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBeNull();
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('should handle field changes', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    expect(result.current.values.email).toBe('test@example.com');
  });

  it('should sanitize input values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    act(() => {
      result.current.handleChange('fullName', '<script>alert("xss")</script>John Doe');
    });

    expect(result.current.values.fullName).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;John Doe');
  });

  it('should validate fields on blur', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    act(() => {
      result.current.handleChange('email', 'invalid-email');
      result.current.handleBlur('email');
    });

    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.email).toBeDefined();
    expect(result.current.hasErrors).toBe(true);
  });

  it('should perform real-time validation for touched fields', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    // First blur to mark as touched
    act(() => {
      result.current.handleChange('email', 'invalid');
      result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBeDefined();

    // Now change to valid email - should clear error
    act(() => {
      result.current.handleChange('email', 'valid@example.com');
    });

    expect(result.current.errors.email).toBeNull();
  });

  it('should validate entire form on submit', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });
    
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit(mockSubmit);
    });

    expect(submitResult.success).toBe(false);
    expect(submitResult.error).toBe('Please fix the validation errors');
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should submit valid form', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });
    
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    // Set valid values
    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'Password123!');
      result.current.handleChange('fullName', 'John Doe');
    });

    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit(mockSubmit);
    });

    expect(submitResult.success).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
      fullName: 'John Doe'
    });
  });

  it('should handle submit errors', async () => {
    const mockError = new Error('Submit failed');
    mockError.response = {
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            { field: 'email', message: 'Email already exists' }
          ]
        }
      }
    };

    const mockSubmit = jest.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    // Set valid values
    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'Password123!');
      result.current.handleChange('fullName', 'John Doe');
    });

    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit(mockSubmit);
    });

    expect(submitResult.success).toBe(false);
    expect(result.current.errors.email).toBe('Email already exists');
    expect(result.current.submitError).toBe('Please fix the validation errors');
  });

  it('should reset form', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    // Make changes
    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleBlur('email');
      result.current.setFieldError('password', 'Some error');
    });

    expect(result.current.values.email).toBe('test@example.com');
    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.password).toBe('Some error');

    // Reset
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('should provide field props', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleBlur('email');
    });

    const fieldProps = result.current.getFieldProps('email');

    expect(fieldProps.value).toBe('test@example.com');
    expect(fieldProps.touched).toBe(true);
    expect(fieldProps.error).toBeNull(); // Valid email
    expect(typeof fieldProps.onChange).toBe('function');
    expect(typeof fieldProps.onBlur).toBe('function');
  });

  it('should clear submit error when user starts typing', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, mockValidationSchema)
    );

    // Set submit error
    act(() => {
      result.current.setFieldError('submit', 'Submit failed');
    });

    // Start typing
    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    expect(result.current.submitError).toBeNull();
  });
});

describe('useAsyncOperation', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAsyncOperation());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should handle successful async operation', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const mockAsyncFn = jest.fn().mockResolvedValue('success data');

    let operationResult;
    await act(async () => {
      operationResult = await result.current.execute(mockAsyncFn, 'arg1', 'arg2');
    });

    expect(operationResult.success).toBe(true);
    expect(operationResult.data).toBe('success data');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('success data');
    expect(mockAsyncFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should handle failed async operation', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const mockError = new Error('Operation failed');
    const mockAsyncFn = jest.fn().mockRejectedValue(mockError);

    let operationResult;
    await act(async () => {
      operationResult = await result.current.execute(mockAsyncFn);
    });

    expect(operationResult.success).toBe(false);
    expect(operationResult.error).toBe('Operation failed');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Operation failed');
    expect(result.current.data).toBeNull();
  });

  it('should handle API error responses', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const mockError = new Error('Network Error');
    mockError.response = {
      data: {
        error: {
          message: 'API Error Message'
        }
      }
    };
    const mockAsyncFn = jest.fn().mockRejectedValue(mockError);

    let operationResult;
    await act(async () => {
      operationResult = await result.current.execute(mockAsyncFn);
    });

    expect(operationResult.error).toBe('API Error Message');
    expect(result.current.error).toBe('API Error Message');
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useAsyncOperation());

    // Set some state
    act(() => {
      result.current.execute(jest.fn().mockResolvedValue('data'));
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });
});

describe('useFieldValidation', () => {
  const mockValidationRules = validationRules.email;

  it('should initialize with default state', () => {
    const { result } = renderHook(() => 
      useFieldValidation('email', mockValidationRules)
    );

    expect(result.current.value).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isValidating).toBe(false);
    expect(result.current.touched).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('should handle value changes', () => {
    const { result } = renderHook(() => 
      useFieldValidation('email', mockValidationRules)
    );

    act(() => {
      result.current.handleChange('test@example.com');
    });

    expect(result.current.value).toBe('test@example.com');
  });

  it('should sanitize input', () => {
    const { result } = renderHook(() => 
      useFieldValidation('email', mockValidationRules)
    );

    act(() => {
      result.current.handleChange('<script>alert("xss")</script>test@example.com');
    });

    expect(result.current.value).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;test@example.com');
  });

  it('should validate on blur with debounce', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => 
      useFieldValidation('email', mockValidationRules, 100)
    );

    act(() => {
      result.current.handleChange('invalid-email');
      result.current.handleBlur();
    });

    expect(result.current.touched).toBe(true);
    expect(result.current.isValidating).toBe(true);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBeDefined();

    jest.useRealTimers();
  });

  it('should reset field state', () => {
    const { result } = renderHook(() => 
      useFieldValidation('email', mockValidationRules)
    );

    act(() => {
      result.current.handleChange('test@example.com');
      result.current.handleBlur();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.value).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.touched).toBe(false);
    expect(result.current.isValidating).toBe(false);
  });
});