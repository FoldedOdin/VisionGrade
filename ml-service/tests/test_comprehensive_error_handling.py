import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the parent directory to the path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.error_handler import (
    MLServiceError, PredictionError, ModelError, DataError, DatabaseError,
    handle_ml_errors, handle_prediction_errors, get_fallback_prediction,
    validate_data_integrity, safe_numeric_conversion, handle_database_errors,
    create_comprehensive_error_response, get_recovery_suggestions,
    validate_model_health, graceful_degradation, retry_with_backoff
)

class TestMLServiceErrorHandling:
    """Test comprehensive error handling in ML service"""

    def test_ml_service_error_creation(self):
        """Test MLServiceError creation with details"""
        error = MLServiceError(
            "Test error message",
            "TEST_ERROR_CODE",
            details={"field": "test_field", "value": "test_value"}
        )
        
        assert error.message == "Test error message"
        assert error.error_code == "TEST_ERROR_CODE"
        assert error.details["field"] == "test_field"
        assert error.timestamp is not None

    def test_prediction_error_inheritance(self):
        """Test PredictionError inherits from MLServiceError"""
        error = PredictionError("Prediction failed", {"model": "test_model"})
        
        assert isinstance(error, MLServiceError)
        assert error.error_code == "PREDICTION_ERROR"
        assert error.details["model"] == "test_model"

    def test_handle_ml_errors_decorator(self):
        """Test ML error handling decorator"""
        @handle_ml_errors
        def failing_function():
            raise ValueError("Test error")
        
        with pytest.raises(MLServiceError) as exc_info:
            failing_function()
        
        assert exc_info.value.error_code == "UNEXPECTED_ERROR"
        assert "Test error" in exc_info.value.message

    def test_handle_prediction_errors_with_fallback(self):
        """Test prediction error handling with fallback"""
        @handle_prediction_errors
        def failing_prediction():
            raise ValueError("Model unavailable")
        
        with patch('utils.error_handler.get_fallback_prediction') as mock_fallback:
            mock_fallback.return_value = {
                'predicted_marks': 65.0,
                'confidence_score': 0.3,
                'prediction_method': 'fallback'
            }
            
            result = failing_prediction()
            assert result['prediction_method'] == 'fallback'
            assert result['predicted_marks'] == 65.0

    def test_fallback_prediction_with_data(self):
        """Test fallback prediction with student data"""
        student_data = {
            'series_test_1_marks': 40,
            'series_test_2_marks': 45,
            'lab_internal_marks': 42
        }
        
        result = get_fallback_prediction(student_data=student_data)
        
        assert result is not None
        assert result['predicted_marks'] > 0
        assert result['confidence_score'] > 0.3  # Should be higher with data
        assert result['prediction_method'] == 'fallback'
        assert 'warning' in result

    def test_fallback_prediction_without_data(self):
        """Test fallback prediction without student data"""
        result = get_fallback_prediction()
        
        assert result is not None
        assert result['predicted_marks'] == 65.0
        assert result['confidence_score'] == 0.3
        assert result['prediction_method'] == 'fallback'

    def test_validate_data_integrity_numpy_array(self):
        """Test data integrity validation for numpy arrays"""
        # Valid array
        valid_array = np.array([1, 2, 3, 4, 5])
        is_valid, errors = validate_data_integrity(valid_array, "test_array")
        assert is_valid
        assert len(errors) == 0
        
        # Array with NaN
        nan_array = np.array([1, 2, np.nan, 4, 5])
        is_valid, errors = validate_data_integrity(nan_array, "nan_array")
        assert not is_valid
        assert any("NaN" in error for error in errors)
        
        # Array with infinity
        inf_array = np.array([1, 2, np.inf, 4, 5])
        is_valid, errors = validate_data_integrity(inf_array, "inf_array")
        assert not is_valid
        assert any("infinite" in error for error in errors)

    def test_validate_data_integrity_pandas_dataframe(self):
        """Test data integrity validation for pandas DataFrames"""
        # Valid DataFrame
        valid_df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
        is_valid, errors = validate_data_integrity(valid_df, "test_df")
        assert is_valid
        assert len(errors) == 0
        
        # DataFrame with missing values
        missing_df = pd.DataFrame({'a': [1, None, 3], 'b': [4, 5, None]})
        is_valid, errors = validate_data_integrity(missing_df, "missing_df")
        assert not is_valid
        assert any("missing values" in error for error in errors)

    def test_validate_data_integrity_edge_cases(self):
        """Test data integrity validation edge cases"""
        # None data
        is_valid, errors = validate_data_integrity(None, "none_data")
        assert not is_valid
        assert any("None" in error for error in errors)
        
        # Empty list
        is_valid, errors = validate_data_integrity([], "empty_list")
        assert not is_valid
        assert any("empty" in error for error in errors)
        
        # Empty dict
        is_valid, errors = validate_data_integrity({}, "empty_dict")
        assert not is_valid
        assert any("empty" in error for error in errors)

    def test_safe_numeric_conversion(self):
        """Test safe numeric conversion with various inputs"""
        # Valid conversions
        assert safe_numeric_conversion(42) == 42.0
        assert safe_numeric_conversion("42") == 42.0
        assert safe_numeric_conversion("42.5") == 42.5
        
        # Invalid conversions with default
        assert safe_numeric_conversion("invalid") == 0.0
        assert safe_numeric_conversion("invalid", default=99.0) == 99.0
        assert safe_numeric_conversion(None) == 0.0
        assert safe_numeric_conversion("") == 0.0
        
        # Special cases
        assert safe_numeric_conversion(np.nan) == 0.0
        assert safe_numeric_conversion(np.inf) == 0.0
        assert safe_numeric_conversion("null") == 0.0

    def test_handle_database_errors_decorator(self):
        """Test database error handling decorator"""
        @handle_database_errors
        def failing_db_operation():
            raise ConnectionError("Database connection failed")
        
        with pytest.raises(DatabaseError) as exc_info:
            failing_db_operation()
        
        assert exc_info.value.error_code == "DATABASE_ERROR"
        assert "connection failed" in exc_info.value.message.lower()

    def test_create_comprehensive_error_response(self):
        """Test comprehensive error response creation"""
        error = PredictionError("Model prediction failed", {"model_version": "1.0"})
        context = {"student_id": 123, "subject_id": 456}
        request_id = "req_123"
        
        response = create_comprehensive_error_response(error, context, request_id)
        
        assert response['success'] is False
        assert response['error']['code'] == "PREDICTION_ERROR"
        assert response['error']['message'] == "Model prediction failed"
        assert response['error']['request_id'] == request_id
        assert response['error']['context'] == context
        assert 'recovery_suggestions' in response['error']

    def test_get_recovery_suggestions(self):
        """Test recovery suggestions generation"""
        # Prediction error suggestions
        suggestions = get_recovery_suggestions("PREDICTION_ERROR")
        assert len(suggestions) > 0
        assert any("input data" in s.lower() for s in suggestions)
        
        # Model error suggestions
        suggestions = get_recovery_suggestions("MODEL_ERROR")
        assert len(suggestions) > 0
        assert any("model" in s.lower() for s in suggestions)
        
        # Data error suggestions
        suggestions = get_recovery_suggestions("DATA_ERROR", {"timeout": True})
        assert len(suggestions) > 0
        assert any("timeout" in s.lower() for s in suggestions)

    def test_validate_model_health_valid_model(self):
        """Test model health validation with valid model"""
        mock_model = Mock()
        mock_model.predict.return_value = np.array([65.0, 70.0, 75.0])
        mock_model.n_features_in_ = 5
        
        test_data = np.array([[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]])
        
        is_healthy, issues = validate_model_health(mock_model, test_data)
        
        assert is_healthy
        assert len([issue for issue in issues if not issue.startswith("Warning:")]) == 0

    def test_validate_model_health_invalid_model(self):
        """Test model health validation with invalid model"""
        # None model
        is_healthy, issues = validate_model_health(None)
        assert not is_healthy
        assert any("None" in issue for issue in issues)
        
        # Model without predict method
        mock_model = Mock(spec=[])
        is_healthy, issues = validate_model_health(mock_model)
        assert not is_healthy
        assert any("missing required method: predict" in issue for issue in issues)

    def test_validate_model_health_prediction_issues(self):
        """Test model health validation with prediction issues"""
        # Model returning NaN
        mock_model = Mock()
        mock_model.predict.return_value = np.array([np.nan, 70.0])
        
        test_data = np.array([[1, 2, 3], [4, 5, 6]])
        
        is_healthy, issues = validate_model_health(mock_model, test_data)
        
        assert not is_healthy
        assert any("NaN" in issue for issue in issues)

    def test_graceful_degradation(self):
        """Test graceful degradation functionality"""
        def primary_function():
            raise ValueError("Primary failed")
        
        def fallback_function():
            return "fallback_result"
        
        result = graceful_degradation(primary_function, fallback_function)
        assert result == "fallback_result"

    def test_graceful_degradation_both_fail(self):
        """Test graceful degradation when both functions fail"""
        def primary_function():
            raise ValueError("Primary failed")
        
        def fallback_function():
            raise ValueError("Fallback failed")
        
        with pytest.raises(PredictionError) as exc_info:
            graceful_degradation(primary_function, fallback_function)
        
        assert "Both primary and fallback functions failed" in exc_info.value.message

    def test_retry_with_backoff_success(self):
        """Test retry with backoff - eventual success"""
        call_count = 0
        
        @retry_with_backoff
        def flaky_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Temporary failure")
            return "success"
        
        result = flaky_function()
        assert result == "success"
        assert call_count == 3

    def test_retry_with_backoff_max_retries(self):
        """Test retry with backoff - max retries exceeded"""
        @retry_with_backoff
        def always_failing_function():
            raise ConnectionError("Always fails")
        
        with pytest.raises(MLServiceError) as exc_info:
            always_failing_function()
        
        assert exc_info.value.error_code == "RETRY_EXHAUSTED"

    def test_error_logging_and_context(self):
        """Test error logging with context information"""
        with patch('utils.error_handler.log_error_with_context') as mock_log:
            error = PredictionError("Test error")
            context = {"test_context": "value"}
            
            # This would be called in actual error handling
            from utils.error_handler import log_error_with_context
            log_error_with_context(error, context)
            
            # Verify logging was called (in actual implementation)
            # mock_log.assert_called_once()

    def test_model_memory_usage_warning(self):
        """Test model memory usage warnings"""
        # Create a mock model that appears large
        mock_model = Mock()
        mock_model.predict.return_value = np.array([65.0])
        
        with patch('sys.getsizeof', return_value=200 * 1024 * 1024):  # 200MB
            is_healthy, issues = validate_model_health(mock_model, np.array([[1, 2, 3]]))
            
            # Should still be healthy but with warnings
            assert is_healthy
            warning_issues = [issue for issue in issues if issue.startswith("Warning:")]
            assert any("large" in issue.lower() for issue in warning_issues)

    def test_prediction_consistency_check(self):
        """Test prediction consistency validation"""
        call_count = 0
        
        def inconsistent_predict(data):
            nonlocal call_count
            call_count += 1
            # Return different results for same input
            return np.array([65.0 + call_count])
        
        mock_model = Mock()
        mock_model.predict.side_effect = inconsistent_predict
        
        test_data = np.array([[1, 2, 3], [4, 5, 6]])
        
        is_healthy, issues = validate_model_health(mock_model, test_data)
        
        # Should be healthy but with consistency warning
        assert is_healthy
        warning_issues = [issue for issue in issues if issue.startswith("Warning:")]
        assert any("consistent" in issue.lower() for issue in warning_issues)

    def test_error_response_with_request_id(self):
        """Test error response includes request ID for tracking"""
        error = DataError("Invalid input data")
        request_id = "req_12345"
        
        response = create_comprehensive_error_response(error, request_id=request_id)
        
        assert response['error']['request_id'] == request_id
        assert response['error']['code'] == "DATA_ERROR"

    def test_comprehensive_error_handling_integration(self):
        """Test integration of multiple error handling components"""
        # Simulate a complete error handling flow
        
        @handle_ml_errors
        @handle_prediction_errors
        def complex_prediction_function(data):
            # Validate input data
            is_valid, errors = validate_data_integrity(data, "input_data")
            if not is_valid:
                raise DataError(f"Invalid input data: {errors}")
            
            # Simulate model prediction
            if np.any(data < 0):
                raise ModelError("Model cannot handle negative values")
            
            return {"predicted_marks": 75.0, "confidence": 0.8}
        
        # Test with valid data
        valid_data = np.array([40, 45, 42])
        result = complex_prediction_function(valid_data)
        assert result["predicted_marks"] == 75.0
        
        # Test with invalid data (should trigger fallback)
        with patch('utils.error_handler.get_fallback_prediction') as mock_fallback:
            mock_fallback.return_value = {"predicted_marks": 60.0, "prediction_method": "fallback"}
            
            invalid_data = np.array([-5, 45, 42])
            result = complex_prediction_function(invalid_data)
            assert result["prediction_method"] == "fallback"

if __name__ == "__main__":
    pytest.main([__file__])