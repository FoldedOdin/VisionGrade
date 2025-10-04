import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getFieldError, sanitizeInput } from '../../utils/validation';

const FormField = ({
  label,
  name,
  type = 'text',
  value = '',
  error,
  touched,
  placeholder,
  required = false,
  disabled = false,
  options = [], // For select fields
  onChange,
  onBlur,
  onFocus,
  className = '',
  helpText,
  icon,
  showPasswordToggle = false,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  step,
  min,
  max,
  rows = 3, // For textarea
  validation = {}, // Real-time validation rules
  showValidation = true,
  showRecoverySuggestions = true,
  debounceMs = 300,
  ...props
}) => {
  const { isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [recoverySuggestion, setRecoverySuggestion] = useState('');
  const [validationWarning, setValidationWarning] = useState('');
  const validationTimeoutRef = useRef(null);

  // Enhanced real-time validation with debouncing
  useEffect(() => {
    if (showValidation && validation && Object.keys(validation).length > 0 && touched) {
      // Clear previous timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      setIsValidating(true);

      validationTimeoutRef.current = setTimeout(() => {
        validateField();
        setIsValidating(false);
      }, debounceMs);
    }

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [value, validation, touched, showValidation, debounceMs]);

  const validateField = () => {
    try {
      setLocalError('');
      setRecoverySuggestion('');
      setValidationWarning('');

      const fieldError = getFieldError(name || 'field', value, validation);
      
      if (fieldError) {
        setLocalError(fieldError);
        
        // Generate recovery suggestions
        if (validation.required && (!value || value.toString().trim() === '')) {
          setRecoverySuggestion(`Please enter a value for ${label || 'this field'}`);
        } else if (validation.pattern && value && !validation.pattern.value.test(value)) {
          if (validation.pattern.value.toString().includes('email')) {
            setRecoverySuggestion('Please enter a valid email address (e.g., user@example.com)');
          } else if (validation.pattern.value.toString().includes('phone')) {
            setRecoverySuggestion('Please enter a valid phone number (10 digits)');
          } else {
            setRecoverySuggestion('Please check the format and try again');
          }
        } else if (validation.minLength && value && value.length < validation.minLength.value) {
          setRecoverySuggestion(`Please enter at least ${validation.minLength.value - value.length} more characters`);
        } else if (validation.maxLength && value && value.length > validation.maxLength.value) {
          setRecoverySuggestion(`Please remove ${value.length - validation.maxLength.value} characters`);
        }
      } else if (value && typeof value === 'string') {
        // Add warnings for potential issues
        if (value !== value.trim()) {
          setValidationWarning('Value has leading or trailing spaces');
        } else if (value.length > 500 && type !== 'textarea') {
          setValidationWarning('Value is unusually long');
        } else if (type === 'password' && value.length >= 8) {
          // Password strength warning
          const hasUpper = /[A-Z]/.test(value);
          const hasLower = /[a-z]/.test(value);
          const hasNumber = /\d/.test(value);
          const hasSpecial = /[@$!%*?&]/.test(value);
          
          const strengthScore = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
          
          if (strengthScore < 3) {
            setValidationWarning('Consider using a stronger password');
          }
        }
      }
    } catch (validationError) {
      console.error('Validation error:', validationError);
      setLocalError('Validation error occurred');
      setRecoverySuggestion('Please refresh the page and try again');
    }
  };

  const displayError = error || localError;
  const hasError = touched && displayError;
  const isValid = touched && !hasError && value && !isValidating;
  const hasWarning = Boolean(validationWarning && !hasError);

  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Sanitize input to prevent XSS
    if (typeof newValue === 'string' && type !== 'password') {
      newValue = sanitizeInput(newValue);
    }
    
    // Clear previous errors when user starts typing
    if (localError) {
      setLocalError('');
      setRecoverySuggestion('');
    }
    
    onChange?.(newValue);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getInputType = () => {
    if (type === 'password' && showPassword) {
      return 'text';
    }
    return type;
  };

  const getInputBorderClass = () => {
    if (hasError) return `border-red-500 ${isDark ? 'focus:border-red-400' : 'focus:border-red-600'} focus:ring-red-500/20`;
    if (isValid) return `border-green-500 ${isDark ? 'focus:border-green-400' : 'focus:border-green-600'} focus:ring-green-500/20`;
    if (hasWarning) return `border-yellow-500 ${isDark ? 'focus:border-yellow-400' : 'focus:border-yellow-600'} focus:ring-yellow-500/20`;
    if (isFocused) return `${isDark ? 'border-blue-400 focus:border-blue-300' : 'border-blue-500 focus:border-blue-600'} focus:ring-blue-500/20`;
    return `${isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}`;
  };

  const baseInputClasses = `
    w-full px-4 py-3 rounded-lg border transition-all duration-200
    ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${getInputBorderClass()}
    focus:outline-none focus:ring-2
    ${icon ? 'pl-12' : ''}
    ${showPasswordToggle && type === 'password' ? 'pr-12' : ''}
  `;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={rows}
            maxLength={maxLength}
            minLength={minLength}
            autoComplete={autoComplete}
            className={`${baseInputClasses} resize-vertical`}
            {...props}
          />
        );

      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            className={baseInputClasses}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={value}
              onChange={(e) => onChange?.(e.target.checked)}
              onBlur={handleBlur}
              onFocus={handleFocus}
              disabled={disabled}
              required={required}
              className={`
                w-4 h-4 rounded border transition-colors duration-200
                ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}
                ${hasError ? 'border-red-500' : isValid ? 'border-green-500' : ''}
                text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              {...props}
            />
            {label && (
              <label
                htmlFor={name}
                className={`
                  ml-3 text-sm font-medium cursor-pointer
                  ${isDark ? 'text-gray-300' : 'text-gray-700'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  id={`${name}-${option.value}`}
                  name={name}
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                  disabled={disabled}
                  required={required}
                  className={`
                    w-4 h-4 border transition-colors duration-200
                    ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}
                    ${hasError ? 'border-red-500' : isValid ? 'border-green-500' : ''}
                    text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  {...props}
                />
                <label
                  htmlFor={`${name}-${option.value}`}
                  className={`
                    ml-3 text-sm font-medium cursor-pointer
                    ${isDark ? 'text-gray-300' : 'text-gray-700'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={getInputType()}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            minLength={minLength}
            pattern={pattern}
            step={step}
            min={min}
            max={max}
            autoComplete={autoComplete}
            className={baseInputClasses}
            {...props}
          />
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div className={`space-y-1 ${className}`}>
        {renderInput()}
        {hasError && (
          <p className="text-sm text-red-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helpText && !hasError && (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {helpText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && type !== 'checkbox' && (
        <label
          htmlFor={name}
          className={`
            block text-sm font-medium
            ${isDark ? 'text-gray-300' : 'text-gray-700'}
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className={`
            absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none
            ${isDark ? 'text-gray-400' : 'text-gray-500'}
          `}>
            {icon}
          </div>
        )}

        {renderInput()}

        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={`
              absolute right-3 top-1/2 transform -translate-y-1/2
              ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
              focus:outline-none transition-colors duration-200
            `}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}

        {/* Validation status icon */}
        {showValidation && touched && (hasError || isValid || hasWarning || isValidating) && (
          <div className={`
            absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none
            ${showPasswordToggle && type === 'password' ? 'right-12' : 'right-3'}
          `}>
            {isValidating ? (
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            ) : hasError ? (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : isValid ? (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : hasWarning ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : null}
          </div>
        )}
      </div>

      {/* Warning message */}
      {hasWarning && !hasError && (
        <div className="flex items-start space-x-2 animate-slide-down">
          <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-yellow-600">{validationWarning}</p>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div className="space-y-1 animate-slide-down">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-500">{displayError}</p>
          </div>
          
          {/* Recovery Suggestion */}
          {showRecoverySuggestions && recoverySuggestion && (
            <div className="ml-6">
              <p className={`text-xs p-2 rounded border-l-2 border-blue-300 ${
                isDark ? 'text-gray-300 bg-gray-800' : 'text-gray-600 bg-gray-50'
              }`}>
                💡 {recoverySuggestion}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Help text */}
      {helpText && !hasError && !hasWarning && (
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {helpText}
        </p>
      )}

      {/* Character count for text inputs with maxLength */}
      {maxLength && (type === 'text' || type === 'textarea') && (
        <div className="flex justify-end">
          <span className={`text-xs ${
            value && value.length > maxLength * 0.9 
              ? 'text-red-500' 
              : value && value.length > maxLength * 0.7 
                ? 'text-yellow-500' 
                : isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {value ? value.length : 0}/{maxLength}
            {value && value.length > maxLength * 0.9 && (
              <span className="ml-1">⚠️</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default FormField;