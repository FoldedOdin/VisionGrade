"""
Comprehensive error handling utilities for ML service
"""

import logging
import traceback
import sys
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
from functools import wraps
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class MLServiceError(Exception):
    """Base exception for ML service errors"""
    def __init__(self, message: str, error_code: str = "ML_SERVICE_ERROR", details: Dict = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.timestamp = datetime.utcnow().isoformat()
        super().__init__(self.message)

class PredictionError(MLServiceError):
    """Exception for prediction-related errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "PREDICTION_ERROR", details)

class ModelError(MLServiceError):
    """Exception for model-related errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "MODEL_ERROR", details)

class DataError(MLServiceError):
    """Exception for data-related errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "DATA_ERROR", details)

class DatabaseError(MLServiceError):
    """Exception for database-related errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "DATABASE_ERROR", details)

class ExternalServiceError(MLServiceError):
    """Exception for external service errors"""
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "EXTERNAL_SERVICE_ERROR", details)

def handle_ml_errors(func):
    """
    Decorator for handling ML service errors with graceful degradation
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except MLServiceError:
            # Re-raise ML service errors as-is
            raise
        except Exception as e:
            # Convert unexpected errors to ML service errors
            error_details = {
                'function': func.__name__,
                'args': str(args)[:200],  # Limit length
                'kwargs': str(kwargs)[:200],
                'traceback': traceback.format_exc()
            }
            
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}", extra=error_details)
            
            raise MLServiceError(
                f"Unexpected error in {func.__name__}: {str(e)}",
                "UNEXPECTED_ERROR",
                error_details
            )
    
    return wrapper

def handle_prediction_errors(func):
    """
    Decorator specifically for prediction functions with fallback strategies
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except (PredictionError, ModelError):
            # Re-raise prediction/model errors
            raise
        except Exception as e:
            logger.error(f"Prediction error in {func.__name__}: {str(e)}")
            
            # Try to provide a fallback prediction
            fallback_result = get_fallback_prediction(*args, **kwargs)
            if fallback_result is not None:
                logger.warning(f"Using fallback prediction for {func.__name__}")
                return fallback_result
            
            # If no fallback available, raise error
            raise PredictionError(
                f"Prediction failed: {str(e)}",
                {
                    'function': func.__name__,
                    'original_error': str(e),
                    'fallback_attempted': True
                }
            )
    
    return wrapper

def get_fallback_prediction(*args, **kwargs) -> Optional[Dict]:
    """
    Provide fallback prediction when main prediction fails
    """
    try:
        # Extract student data if available
        student_data = kwargs.get('student_data', {})
        subject_data = kwargs.get('subject_data', {})
        
        # Try to provide a more intelligent fallback based on available data
        fallback_marks = 65.0  # Conservative default
        confidence = 0.3
        
        # If we have some historical data, use it for better fallback
        if student_data:
            series_test_1 = student_data.get('series_test_1_marks', 0)
            series_test_2 = student_data.get('series_test_2_marks', 0)
            lab_internal = student_data.get('lab_internal_marks', 0)
            
            # Simple average-based fallback if we have some marks
            available_marks = [mark for mark in [series_test_1, series_test_2, lab_internal] if mark > 0]
            if available_marks:
                # Scale to university exam range (0-100)
                avg_percentage = sum(available_marks) / len(available_marks) / 50 * 100  # Assuming 50 is max for internals
                fallback_marks = min(max(avg_percentage, 35), 85)  # Clamp between 35-85
                confidence = 0.5  # Slightly higher confidence with data
        
        return {
            'predicted_marks': round(fallback_marks, 1),
            'confidence_score': confidence,
            'prediction_method': 'fallback',
            'warning': 'This is a fallback prediction due to model unavailability',
            'fallback_reason': 'Primary prediction model failed',
            'data_quality': 'limited' if not student_data else 'partial'
        }
    except Exception as e:
        logger.error(f"Fallback prediction also failed: {str(e)}")
        return {
            'predicted_marks': 60.0,
            'confidence_score': 0.2,
            'prediction_method': 'emergency_fallback',
            'warning': 'Emergency fallback prediction - please try again later',
            'error': 'Both primary and fallback predictions failed'
        }

def validate_data_integrity(data: Any, data_type: str = "unknown") -> Tuple[bool, List[str]]:
    """
    Validate data integrity with comprehensive checks
    """
    errors = []
    
    try:
        # Check for None/empty data
        if data is None:
            errors.append(f"{data_type} data is None")
            return False, errors
        
        # Handle different data types
        if isinstance(data, (list, tuple)):
            if len(data) == 0:
                errors.append(f"{data_type} data is empty")
            
            # Check for None values in list
            none_count = sum(1 for item in data if item is None)
            if none_count > 0:
                errors.append(f"{data_type} contains {none_count} None values")
        
        elif isinstance(data, dict):
            if len(data) == 0:
                errors.append(f"{data_type} dictionary is empty")
            
            # Check for None values in dictionary
            none_keys = [k for k, v in data.items() if v is None]
            if none_keys:
                errors.append(f"{data_type} has None values for keys: {none_keys}")
        
        elif isinstance(data, np.ndarray):
            if data.size == 0:
                errors.append(f"{data_type} array is empty")
            
            # Check for NaN or infinite values
            if np.isnan(data).any():
                errors.append(f"{data_type} contains NaN values")
            
            if np.isinf(data).any():
                errors.append(f"{data_type} contains infinite values")
        
        elif isinstance(data, pd.DataFrame):
            if data.empty:
                errors.append(f"{data_type} DataFrame is empty")
            
            # Check for missing values
            missing_count = data.isnull().sum().sum()
            if missing_count > 0:
                errors.append(f"{data_type} DataFrame has {missing_count} missing values")
        
        return len(errors) == 0, errors
        
    except Exception as e:
        errors.append(f"Error validating {data_type} data integrity: {str(e)}")
        return False, errors

def safe_numeric_conversion(value: Any, default: float = 0.0) -> float:
    """
    Safely convert value to numeric with error handling
    """
    try:
        if value is None:
            return default
        
        if isinstance(value, (int, float)):
            if np.isnan(value) or np.isinf(value):
                return default
            return float(value)
        
        if isinstance(value, str):
            # Try to convert string to float
            cleaned_value = value.strip()
            if cleaned_value == '' or cleaned_value.lower() in ['null', 'none', 'nan']:
                return default
            
            return float(cleaned_value)
        
        # Try direct conversion
        return float(value)
        
    except (ValueError, TypeError, OverflowError):
        logger.warning(f"Failed to convert {value} to numeric, using default {default}")
        return default

def handle_database_errors(func):
    """
    Decorator for handling database-related errors
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            error_message = str(e).lower()
            
            # Categorize database errors
            if 'connection' in error_message or 'connect' in error_message:
                raise DatabaseError(
                    "Database connection failed",
                    {'original_error': str(e), 'category': 'connection'}
                )
            elif 'timeout' in error_message:
                raise DatabaseError(
                    "Database operation timed out",
                    {'original_error': str(e), 'category': 'timeout'}
                )
            elif 'syntax' in error_message or 'sql' in error_message:
                raise DatabaseError(
                    "Database query error",
                    {'original_error': str(e), 'category': 'query'}
                )
            else:
                raise DatabaseError(
                    f"Database error: {str(e)}",
                    {'original_error': str(e), 'category': 'unknown'}
                )
    
    return wrapper

def create_error_response(error: Exception, request_id: str = None) -> Dict[str, Any]:
    """
    Create standardized error response
    """
    if isinstance(error, MLServiceError):
        return {
            'success': False,
            'error': {
                'code': error.error_code,
                'message': error.message,
                'details': error.details,
                'timestamp': error.timestamp,
                'request_id': request_id
            }
        }
    else:
        return {
            'success': False,
            'error': {
                'code': 'UNEXPECTED_ERROR',
                'message': str(error),
                'timestamp': datetime.utcnow().isoformat(),
                'request_id': request_id
            }
        }

def log_error_with_context(error: Exception, context: Dict[str, Any] = None):
    """
    Log error with additional context information
    """
    context = context or {}
    
    log_data = {
        'error_type': type(error).__name__,
        'error_message': str(error),
        'timestamp': datetime.utcnow().isoformat(),
        'context': context
    }
    
    if isinstance(error, MLServiceError):
        log_data.update({
            'error_code': error.error_code,
            'error_details': error.details
        })
    
    # Add traceback for debugging
    if logger.isEnabledFor(logging.DEBUG):
        log_data['traceback'] = traceback.format_exc()
    
    logger.error("ML Service Error", extra=log_data)

def graceful_degradation(primary_func, fallback_func, *args, **kwargs):
    """
    Execute primary function with fallback on failure
    """
    try:
        return primary_func(*args, **kwargs)
    except Exception as e:
        logger.warning(f"Primary function {primary_func.__name__} failed: {str(e)}")
        logger.info(f"Attempting fallback function {fallback_func.__name__}")
        
        try:
            result = fallback_func(*args, **kwargs)
            logger.info(f"Fallback function {fallback_func.__name__} succeeded")
            return result
        except Exception as fallback_error:
            logger.error(f"Fallback function {fallback_func.__name__} also failed: {str(fallback_error)}")
            raise PredictionError(
                f"Both primary and fallback functions failed",
                {
                    'primary_error': str(e),
                    'fallback_error': str(fallback_error)
                }
            )

def retry_with_backoff(func, max_retries: int = 3, base_delay: float = 1.0, backoff_factor: float = 2.0):
    """
    Retry function with exponential backoff
    """
    import time
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                if attempt == max_retries:
                    break
                
                delay = base_delay * (backoff_factor ** attempt)
                logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {str(e)}. Retrying in {delay}s...")
                time.sleep(delay)
        
        # All retries failed
        raise MLServiceError(
            f"Function {func.__name__} failed after {max_retries + 1} attempts",
            "RETRY_EXHAUSTED",
            {
                'max_retries': max_retries,
                'last_error': str(last_exception)
            }
        )
    
    return wrapper

def validate_model_health(model, test_data: Optional[np.ndarray] = None) -> Tuple[bool, List[str]]:
    """
    Comprehensive model health validation with detailed diagnostics
    """
    issues = []
    warnings = []
    
    try:
        # Check if model exists
        if model is None:
            issues.append("Model is None - no model loaded")
            return False, issues
        
        # Check if model has required methods
        required_methods = ['predict']
        optional_methods = ['predict_proba', 'score', 'get_params']
        
        for method in required_methods:
            if not hasattr(model, method):
                issues.append(f"Model missing required method: {method}")
        
        for method in optional_methods:
            if not hasattr(model, method):
                warnings.append(f"Model missing optional method: {method}")
        
        # Check model attributes
        if hasattr(model, 'n_features_in_'):
            if model.n_features_in_ <= 0:
                issues.append(f"Model has invalid feature count: {model.n_features_in_}")
        else:
            warnings.append("Model doesn't expose feature count information")
        
        # Test prediction if test data provided
        if test_data is not None and hasattr(model, 'predict'):
            try:
                # Validate test data first
                if not isinstance(test_data, np.ndarray):
                    test_data = np.array(test_data)
                
                if test_data.size == 0:
                    issues.append("Test data is empty")
                    return len(issues) == 0, issues
                
                # Ensure 2D array
                if test_data.ndim == 1:
                    test_data = test_data.reshape(1, -1)
                
                # Make prediction
                prediction = model.predict(test_data)
                
                # Validate prediction output
                if prediction is None:
                    issues.append("Model prediction returned None")
                elif isinstance(prediction, np.ndarray):
                    if prediction.size == 0:
                        issues.append("Model prediction returned empty array")
                    elif np.isnan(prediction).any():
                        issues.append("Model prediction contains NaN values")
                    elif np.isinf(prediction).any():
                        issues.append("Model prediction contains infinite values")
                    elif (prediction < 0).any():
                        warnings.append("Model prediction contains negative values")
                    elif (prediction > 100).any():
                        warnings.append("Model prediction contains values > 100")
                else:
                    # Handle scalar predictions
                    if np.isnan(prediction) or np.isinf(prediction):
                        issues.append("Model prediction is NaN or infinite")
                
                # Test prediction consistency
                if len(test_data) > 1:
                    prediction2 = model.predict(test_data[:1])
                    if not np.allclose(prediction[:1], prediction2, rtol=1e-5):
                        warnings.append("Model predictions are not consistent")
                        
            except Exception as e:
                issues.append(f"Model prediction test failed: {str(e)}")
        
        # Check model memory usage (if possible)
        try:
            import sys
            model_size = sys.getsizeof(model)
            if model_size > 100 * 1024 * 1024:  # 100MB
                warnings.append(f"Model is large ({model_size / 1024 / 1024:.1f}MB)")
        except Exception:
            pass  # Memory check is optional
        
        # Log warnings
        if warnings:
            logger.warning(f"Model health warnings: {warnings}")
        
        return len(issues) == 0, issues + [f"Warning: {w}" for w in warnings]
        
    except Exception as e:
        issues.append(f"Error validating model health: {str(e)}")
        return False, issues

def create_comprehensive_error_response(error: Exception, context: Dict[str, Any] = None, request_id: str = None) -> Dict[str, Any]:
    """
    Create comprehensive error response with recovery suggestions
    """
    context = context or {}
    
    if isinstance(error, MLServiceError):
        response = {
            'success': False,
            'error': {
                'code': error.error_code,
                'message': error.message,
                'details': error.details,
                'timestamp': error.timestamp,
                'request_id': request_id
            }
        }
        
        # Add recovery suggestions based on error type
        recovery_suggestions = get_recovery_suggestions(error.error_code, error.details)
        if recovery_suggestions:
            response['error']['recovery_suggestions'] = recovery_suggestions
            
        # Add context information
        if context:
            response['error']['context'] = context
            
        return response
    else:
        return {
            'success': False,
            'error': {
                'code': 'UNEXPECTED_ERROR',
                'message': str(error),
                'timestamp': datetime.utcnow().isoformat(),
                'request_id': request_id,
                'recovery_suggestions': [
                    'Try the request again',
                    'Check your input data',
                    'Contact support if the issue persists'
                ]
            }
        }

def get_recovery_suggestions(error_code: str, details: Dict = None) -> List[str]:
    """
    Generate recovery suggestions based on error type
    """
    suggestions = []
    
    suggestion_map = {
        'PREDICTION_ERROR': [
            'Check if all required input data is provided',
            'Verify that marks are within valid ranges',
            'Try again with different input values',
            'Contact support if predictions consistently fail'
        ],
        'MODEL_ERROR': [
            'The prediction model may be temporarily unavailable',
            'Try again in a few minutes',
            'Use manual calculation as a temporary alternative',
            'Contact system administrator'
        ],
        'DATA_ERROR': [
            'Check that all required fields are filled',
            'Verify that numeric values are within expected ranges',
            'Ensure data format matches requirements',
            'Remove any special characters from input'
        ],
        'DATABASE_ERROR': [
            'Check your internet connection',
            'Try the operation again',
            'Verify that referenced records exist',
            'Contact support if database issues persist'
        ],
        'EXTERNAL_SERVICE_ERROR': [
            'The external service may be temporarily unavailable',
            'Check your network connection',
            'Try again in a few minutes',
            'Use alternative methods if available'
        ]
    }
    
    suggestions = suggestion_map.get(error_code, [
        'Try the operation again',
        'Check your input data',
        'Contact support if the issue persists'
    ])
    
    # Add specific suggestions based on error details
    if details:
        if 'timeout' in str(details).lower():
            suggestions.insert(0, 'The operation timed out - try with smaller data sets')
        elif 'memory' in str(details).lower():
            suggestions.insert(0, 'Insufficient memory - try processing smaller batches')
        elif 'network' in str(details).lower():
            suggestions.insert(0, 'Network issue detected - check your connection')
    
    return suggestions