"""
Tests for ML Service API endpoints
"""

import pytest
import json
import os
import sys
from unittest.mock import Mock, patch, MagicMock

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import app

class TestMLServiceAPI:
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    @pytest.fixture
    def mock_services(self):
        """Mock the services"""
        with patch('app.prediction_service') as mock_pred, \
             patch('app.database_service') as mock_db:
            
            # Configure mocks
            mock_pred.get_model_info.return_value = {
                'model_version': '1.0.0',
                'loaded_models': ['general'],
                'feature_columns': ['series_test_1_percentage', 'series_test_2_percentage'],
                'model_path': './models/'
            }
            
            mock_db.get_training_data.return_value = [
                {
                    'student_id': 1,
                    'subject_id': 1,
                    'exam_type': 'series_test_1',
                    'marks_obtained': 40,
                    'max_marks': 50,
                    'subject_type': 'theory',
                    'semester': 3
                }
            ]
            
            yield mock_pred, mock_db
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'OK'
        assert data['service'] == 'VisionGrade ML Service'
        assert data['version'] == '1.0.0'
    
    def test_detailed_health(self, client):
        """Test detailed health check endpoint"""
        response = client.get('/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data
        assert 'service' in data
        assert 'services' in data
        assert 'timestamp' in data
    
    def test_get_model_info_success(self, client, mock_services):
        """Test model info endpoint success"""
        mock_pred, mock_db = mock_services
        
        response = client.get('/model/info')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        assert data['data']['model_version'] == '1.0.0'
    
    def test_get_model_info_service_unavailable(self, client):
        """Test model info endpoint when service unavailable"""
        with patch('app.prediction_service', None):
            response = client.get('/model/info')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'Prediction service not available' in data['error']
    
    def test_train_model_success(self, client, mock_services):
        """Test model training endpoint success"""
        mock_pred, mock_db = mock_services
        
        mock_pred.train_model.return_value = {
            'success': True,
            'model_version': '1.0.0',
            'best_model': 'random_forest',
            'training_samples': 10,
            'test_samples': 2
        }
        
        response = client.post('/train', 
                             data=json.dumps({'subject_id': 1}),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['model_version'] == '1.0.0'
    
    def test_train_model_no_data(self, client, mock_services):
        """Test model training with no data"""
        mock_pred, mock_db = mock_services
        mock_db.get_training_data.return_value = []
        
        response = client.post('/train',
                             data=json.dumps({'subject_id': 1}),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'No training data available' in data['error']
    
    def test_train_model_service_unavailable(self, client):
        """Test training when services unavailable"""
        with patch('app.prediction_service', None), \
             patch('app.database_service', None):
            
            response = client.post('/train')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'Services not available' in data['error']
    
    def test_predict_marks_success(self, client, mock_services):
        """Test prediction endpoint success"""
        mock_pred, mock_db = mock_services
        
        mock_db.get_student_marks_for_prediction.return_value = {
            'student_id': 1,
            'subject_id': 1,
            'marks': {
                'series_test_1': 80.0,
                'series_test_2': 85.0,
                'lab_internal': 82.0
            },
            'subject_type': 'theory',
            'semester': 3
        }
        
        mock_pred.predict_university_marks.return_value = {
            'success': True,
            'predicted_marks': 78.5,
            'confidence_score': 0.85,
            'input_features': {},
            'model_version': '1.0.0'
        }
        
        mock_db.save_prediction.return_value = 123
        
        response = client.post('/predict',
                             data=json.dumps({
                                 'student_id': 1,
                                 'subject_id': 1
                             }),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['predicted_marks'] == 78.5
        assert data['confidence_score'] == 0.85
        assert data['prediction_id'] == 123
    
    def test_predict_marks_missing_data(self, client, mock_services):
        """Test prediction with missing request data"""
        response = client.post('/predict',
                             data=json.dumps({}),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'student_id and subject_id are required' in data['error']
    
    def test_predict_marks_no_student_data(self, client, mock_services):
        """Test prediction when no student data found"""
        mock_pred, mock_db = mock_services
        mock_db.get_student_marks_for_prediction.return_value = None
        
        response = client.post('/predict',
                             data=json.dumps({
                                 'student_id': 1,
                                 'subject_id': 1
                             }),
                             content_type='application/json')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'No marks data found' in data['error']
    
    def test_predict_marks_no_body(self, client):
        """Test prediction with no request body"""
        response = client.post('/predict')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Request body is required' in data['error']
    
    def test_batch_predict_success(self, client, mock_services):
        """Test batch prediction success"""
        mock_pred, mock_db = mock_services
        
        mock_db.get_students_for_prediction.return_value = [
            {
                'student_id': 1,
                'subject_id': 1,
                'marks': {'series_test_1': 80.0},
                'subject_type': 'theory',
                'semester': 3
            },
            {
                'student_id': 2,
                'subject_id': 1,
                'marks': {'series_test_1': 75.0},
                'subject_type': 'theory',
                'semester': 3
            }
        ]
        
        mock_pred.batch_predict.return_value = [
            {
                'success': True,
                'student_id': 1,
                'subject_id': 1,
                'predicted_marks': 78.5,
                'confidence_score': 0.85,
                'input_features': {},
                'model_version': '1.0.0'
            },
            {
                'success': True,
                'student_id': 2,
                'subject_id': 1,
                'predicted_marks': 72.0,
                'confidence_score': 0.80,
                'input_features': {},
                'model_version': '1.0.0'
            }
        ]
        
        mock_db.save_prediction.return_value = 123
        
        response = client.post('/predict/batch',
                             data=json.dumps({'subject_id': 1}),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['total_students'] == 2
        assert data['successful_predictions'] == 2
        assert len(data['predictions']) == 2
    
    def test_batch_predict_no_students(self, client, mock_services):
        """Test batch prediction with no students"""
        mock_pred, mock_db = mock_services
        mock_db.get_students_for_prediction.return_value = []
        
        response = client.post('/predict/batch',
                             data=json.dumps({'subject_id': 1}),
                             content_type='application/json')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'No students found' in data['error']
    
    def test_toggle_prediction_visibility_success(self, client, mock_services):
        """Test prediction visibility toggle success"""
        mock_pred, mock_db = mock_services
        mock_db.toggle_prediction_visibility.return_value = 5
        
        response = client.post('/predictions/toggle/1',
                             data=json.dumps({
                                 'is_visible': True,
                                 'faculty_id': 1
                             }),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['subject_id'] == 1
        assert data['is_visible'] is True
        assert data['updated_predictions'] == 5
    
    def test_toggle_prediction_visibility_missing_field(self, client):
        """Test toggle with missing is_visible field"""
        response = client.post('/predictions/toggle/1',
                             data=json.dumps({'faculty_id': 1}),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'is_visible field is required' in data['error']
    
    def test_toggle_prediction_visibility_unauthorized(self, client, mock_services):
        """Test toggle with unauthorized faculty"""
        mock_pred, mock_db = mock_services
        mock_db.toggle_prediction_visibility.side_effect = ValueError("Faculty does not have access")
        
        response = client.post('/predictions/toggle/1',
                             data=json.dumps({
                                 'is_visible': True,
                                 'faculty_id': 999
                             }),
                             content_type='application/json')
        
        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Faculty does not have access' in data['error']
    
    def test_get_accuracy_stats_success(self, client, mock_services):
        """Test accuracy stats endpoint success"""
        mock_pred, mock_db = mock_services
        
        mock_db.get_prediction_accuracy_stats.return_value = {
            'total_predictions': 10,
            'predictions_with_actuals': 8,
            'accurate_predictions': 6,
            'accuracy_percentage': 75.0,
            'average_difference': 8.5,
            'model_versions': ['1.0.0']
        }
        
        response = client.get('/accuracy?subject_id=1&model_version=1.0.0')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['total_predictions'] == 10
        assert data['data']['accuracy_percentage'] == 75.0
    
    def test_get_accuracy_stats_no_params(self, client, mock_services):
        """Test accuracy stats without parameters"""
        mock_pred, mock_db = mock_services
        
        mock_db.get_prediction_accuracy_stats.return_value = {
            'total_predictions': 25,
            'predictions_with_actuals': 20,
            'accurate_predictions': 15,
            'accuracy_percentage': 75.0,
            'average_difference': 8.5,
            'model_versions': ['1.0.0']
        }
        
        response = client.get('/accuracy')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['total_predictions'] == 25
    
    def test_404_error_handler(self, client):
        """Test 404 error handler"""
        response = client.get('/nonexistent')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Not Found'
        assert data['status_code'] == 404
    
    def test_500_error_handler(self, client, mock_services):
        """Test 500 error handler"""
        mock_pred, mock_db = mock_services
        mock_pred.get_model_info.side_effect = Exception("Internal error")
        
        response = client.get('/model/info')
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Internal error' in data['error']