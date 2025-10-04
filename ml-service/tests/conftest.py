"""
Pytest configuration and fixtures for ML service tests
"""

import pytest
import numpy as np
import pandas as pd
import tempfile
import shutil
import os
import sys
from unittest.mock import Mock, patch

# Add the parent directory to the path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture
def sample_student_data():
    """Create sample student data for testing"""
    return {
        'student_id': 1,
        'name': 'Test Student',
        'semester': 1,
        'batch_year': 2024
    }

@pytest.fixture
def sample_subject_data():
    """Create sample subject data for testing"""
    return {
        'subject_id': 1,
        'subject_code': 'TEST101',
        'subject_name': 'Test Subject',
        'subject_type': 'theory',
        'semester': 1,
        'credits': 4
    }

@pytest.fixture
def sample_marks_data():
    """Create sample marks data for testing"""
    return pd.DataFrame({
        'student_id': [1, 2, 3, 4, 5],
        'subject_id': [1, 1, 1, 1, 1],
        'series_test_1': [45, 38, 42, 35, 48],
        'series_test_2': [43, 36, 44, 32, 47],
        'lab_internal': [48, 40, 46, 38, 49],
        'attendance_percentage': [85.5, 72.3, 88.2, 65.8, 91.4],
        'university_marks': [78, 65, 82, 58, 89]
    })

@pytest.fixture
def sample_prediction_input():
    """Create sample prediction input data"""
    return pd.DataFrame({
        'student_id': [6, 7],
        'subject_id': [1, 1],
        'series_test_1': [44, 39],
        'series_test_2': [42, 37],
        'lab_internal': [47, 41],
        'attendance_percentage': [83.2, 76.5]
    })

@pytest.fixture
def temp_model_dir():
    """Create a temporary directory for model files"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def mock_database_connection():
    """Mock database connection for testing"""
    with patch('services.database_service.DatabaseService') as mock_db:
        mock_instance = Mock()
        mock_db.return_value = mock_instance
        
        # Mock database methods
        mock_instance.get_training_data.return_value = pd.DataFrame({
            'student_id': [1, 2, 3],
            'series_test_1': [45, 38, 42],
            'series_test_2': [43, 36, 44],
            'lab_internal': [48, 40, 46],
            'attendance_percentage': [85.5, 72.3, 88.2],
            'university_marks': [78, 65, 82]
        })
        
        mock_instance.save_prediction.return_value = True
        mock_instance.get_model_metadata.return_value = {
            'version': 'v1.0.0',
            'accuracy': 0.85,
            'created_at': '2024-10-02T10:00:00Z'
        }
        
        yield mock_instance

@pytest.fixture
def mock_api_client():
    """Mock API client for testing"""
    with patch('requests.post') as mock_post, \
         patch('requests.get') as mock_get:
        
        # Mock successful API responses
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'success': True,
            'data': {'prediction_id': 1}
        }
        
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            'success': True,
            'data': []
        }
        
        yield {'post': mock_post, 'get': mock_get}

@pytest.fixture
def large_dataset():
    """Create a large dataset for performance testing"""
    np.random.seed(42)
    n_samples = 1000
    
    return pd.DataFrame({
        'student_id': range(1, n_samples + 1),
        'subject_id': np.random.randint(1, 6, n_samples),
        'series_test_1': np.random.normal(40, 8, n_samples),
        'series_test_2': np.random.normal(40, 8, n_samples),
        'lab_internal': np.random.normal(42, 6, n_samples),
        'attendance_percentage': np.random.normal(80, 12, n_samples),
        'university_marks': np.random.normal(75, 15, n_samples)
    })

@pytest.fixture
def mock_model():
    """Create a mock ML model for testing"""
    mock_model = Mock()
    mock_model.predict.return_value = np.array([75.5, 68.2, 82.1])
    mock_model.score.return_value = 0.85
    mock_model.feature_importances_ = np.array([0.3, 0.3, 0.2, 0.2])
    return mock_model

@pytest.fixture
def mock_scaler():
    """Create a mock scaler for testing"""
    mock_scaler = Mock()
    mock_scaler.fit_transform.return_value = np.array([[0.1, 0.2], [0.3, 0.4]])
    mock_scaler.transform.return_value = np.array([[0.1, 0.2], [0.3, 0.4]])
    mock_scaler.inverse_transform.return_value = np.array([[45, 42], [38, 36]])
    return mock_scaler

@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment before each test"""
    # Set test environment variables
    os.environ['TESTING'] = 'true'
    os.environ['ML_MODEL_PATH'] = '/tmp/test_models'
    os.environ['LOG_LEVEL'] = 'ERROR'
    
    yield
    
    # Cleanup after test
    if 'TESTING' in os.environ:
        del os.environ['TESTING']

@pytest.fixture
def mock_logger():
    """Mock logger for testing"""
    with patch('utils.logger.get_logger') as mock_get_logger:
        mock_logger_instance = Mock()
        mock_get_logger.return_value = mock_logger_instance
        yield mock_logger_instance

@pytest.fixture
def performance_data():
    """Create performance test data"""
    return {
        'response_times': [100, 150, 120, 180, 90, 200, 110, 160],
        'memory_usage': [50, 55, 52, 58, 48, 62, 51, 57],
        'cpu_usage': [20, 25, 22, 28, 18, 32, 21, 26],
        'concurrent_users': [10, 20, 30, 40, 50, 60, 70, 80]
    }

@pytest.fixture
def error_scenarios():
    """Create error scenarios for testing"""
    return {
        'network_error': Exception('Network connection failed'),
        'database_error': Exception('Database connection timeout'),
        'validation_error': ValueError('Invalid input data'),
        'model_error': Exception('Model prediction failed'),
        'file_error': FileNotFoundError('Model file not found')
    }

# Pytest configuration
def pytest_configure(config):
    """Configure pytest settings"""
    # Add custom markers
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests as performance tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically"""
    for item in items:
        # Add slow marker to tests that take longer than 5 seconds
        if 'performance' in item.nodeid:
            item.add_marker(pytest.mark.slow)
            item.add_marker(pytest.mark.performance)
        elif 'integration' in item.nodeid:
            item.add_marker(pytest.mark.integration)
        else:
            item.add_marker(pytest.mark.unit)

@pytest.fixture(scope="session")
def test_database():
    """Setup test database for the session"""
    # This would typically set up a test database
    # For now, we'll just return a mock
    return Mock()

@pytest.fixture
def api_test_data():
    """Create test data for API testing"""
    return {
        'valid_prediction_request': {
            'student_id': 1,
            'subject_id': 1,
            'series_test_1': 45,
            'series_test_2': 42,
            'lab_internal': 48,
            'attendance_percentage': 85.5
        },
        'invalid_prediction_request': {
            'student_id': 'invalid',
            'subject_id': None,
            'series_test_1': -10,
            'series_test_2': 150,
            'attendance_percentage': 'not_a_number'
        },
        'batch_prediction_request': {
            'predictions': [
                {
                    'student_id': 1,
                    'subject_id': 1,
                    'series_test_1': 45,
                    'series_test_2': 42,
                    'lab_internal': 48,
                    'attendance_percentage': 85.5
                },
                {
                    'student_id': 2,
                    'subject_id': 1,
                    'series_test_1': 38,
                    'series_test_2': 36,
                    'lab_internal': 40,
                    'attendance_percentage': 72.3
                }
            ]
        }
    }

# Custom assertions
def assert_prediction_valid(prediction, min_score=0, max_score=100):
    """Assert that a prediction is valid"""
    assert isinstance(prediction, (int, float)), "Prediction must be numeric"
    assert min_score <= prediction <= max_score, f"Prediction {prediction} must be between {min_score} and {max_score}"

def assert_model_performance(metrics, min_accuracy=0.6):
    """Assert that model performance meets requirements"""
    assert 'accuracy' in metrics, "Metrics must include accuracy"
    assert 'mse' in metrics, "Metrics must include MSE"
    assert 'mae' in metrics, "Metrics must include MAE"
    assert 'r2_score' in metrics, "Metrics must include R² score"
    
    assert metrics['accuracy'] >= min_accuracy, f"Accuracy {metrics['accuracy']} below minimum {min_accuracy}"
    assert metrics['mse'] >= 0, "MSE must be non-negative"
    assert metrics['mae'] >= 0, "MAE must be non-negative"

def assert_response_time(start_time, end_time, max_time=1.0):
    """Assert that response time is within acceptable limits"""
    response_time = end_time - start_time
    assert response_time <= max_time, f"Response time {response_time:.3f}s exceeds maximum {max_time}s"

# Export custom assertions
pytest.assert_prediction_valid = assert_prediction_valid
pytest.assert_model_performance = assert_model_performance
pytest.assert_response_time = assert_response_time