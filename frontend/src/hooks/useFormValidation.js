import { useState, useCallback, useEffect } from 'react';
import { validationRules, getFieldError, sanitizeInput } from '../utils/validation';

/**
 * Custom hook for real-time form validation with error handling
 */
export const useFormValidation = (initialValues = {}, validationSchema = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Real-time validation
  const validateField = useCallback((fieldName, value) => {
    const rules = validationSchema[fieldName];
    if (!rules) return null;

    return getFieldError(fieldName, value, rules);
  }, [validationSchema]);

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationSchema, validateField]);

  // Handle field change with real-time validation
  const handleChange = useCallback((fieldName, value) => {
    // Sanitize input to prevent XSS
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
    
    setValues(prev => ({
      ...prev,
      [fieldName]: sanitizedValue
    }));

    // Clear submit error when user starts typing
    if (submitError) {
      setSubmitError(null);
    }

    // Real-time validation for touched fields
    if (touched[fieldName]) {
      const error = validateField(fieldName, sanitizedValue);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  }, [touched, validateField, submitError]);

  // Handle field blur
  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // Validate field on blur
    const error = validateField(fieldName, values[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, [values, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Mark all fields as touched
    const allTouched = Object.keys(validationSchema).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate form
    const isValid = validateForm();
    
    if (!isValid) {
      setIsSubmitting(false);
      return { success: false, error: 'Please fix the validation errors' };
    }

    try {
      const result = await onSubmit(values);
      setIsSubmitting(false);
      return { success: true, data: result };
    } catch (error) {
      setIsSubmitting(false);
      
      // Handle different types of errors
      let errorMessage = 'An unexpected error occurred';
      let fieldErrors = {};

      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        
        // Handle validation errors from backend
        if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
          apiError.details.forEach(detail => {
            fieldErrors[detail.field] = detail.message;
          });
          errorMessage = 'Please fix the validation errors';
        } else {
          errorMessage = apiError.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Set field-specific errors
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...fieldErrors }));
      }

      setSubmitError(errorMessage);
      return { success: false, error: errorMessage, fieldErrors };
    }
  }, [values, validationSchema, validateForm]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitError(null);
  }, [initialValues]);

  // Set field value programmatically
  const setFieldValue = useCallback((fieldName, value) => {
    handleChange(fieldName, value);
  }, [handleChange]);

  // Set field error programmatically
  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((fieldName) => ({
    value: values[fieldName] || '',
    error: errors[fieldName],
    touched: touched[fieldName],
    onChange: (value) => handleChange(fieldName, value),
    onBlur: () => handleBlur(fieldName)
  }), [values, errors, touched, handleChange, handleBlur]);

  // Check if form has errors
  const hasErrors = Object.keys(errors).some(key => errors[key]);

  // Check if form is valid (no errors and all required fields touched)
  const isValid = !hasErrors && Object.keys(validationSchema).every(field => 
    !validationSchema[field].required || (touched[field] && values[field])
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    hasErrors,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    clearFieldError,
    getFieldProps,
    validateForm,
    validateField
  };
};

/**
 * Hook for handling async operations with error states
 */
export const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (asyncFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction(...args);
      setData(result);
      return { success: true, data: result };
    } catch (err) {
      let errorMessage = 'An unexpected error occurred';
      
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset
  };
};

/**
 * Hook for handling form field validation with debouncing
 */
export const useFieldValidation = (fieldName, validationRules, debounceMs = 300) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);

  // Debounced validation
  useEffect(() => {
    if (!touched || !value) {
      setError(null);
      return;
    }

    setIsValidating(true);
    const timeoutId = setTimeout(() => {
      const validationError = getFieldError(fieldName, value, validationRules);
      setError(validationError);
      setIsValidating(false);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, fieldName, validationRules, debounceMs, touched]);

  const handleChange = useCallback((newValue) => {
    setValue(typeof newValue === 'string' ? sanitizeInput(newValue) : newValue);
  }, []);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const reset = useCallback(() => {
    setValue('');
    setError(null);
    setIsValidating(false);
    setTouched(false);
  }, []);

  return {
    value,
    error,
    isValidating,
    touched,
    isValid: !error && touched,
    handleChange,
    handleBlur,
    reset
  };
};

export default useFormValidation;