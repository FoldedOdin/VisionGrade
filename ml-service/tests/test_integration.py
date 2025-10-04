"""
Integration tests for ML Service
Tests the complete workflow from training to prediction
"""

import pytest
import json
import os
import sys
import tempfile
import shutil
from unittest.mock import Mock, patch
import numpy as np

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import app

class TestMLServiceIntegration:
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    @pytest.fixture
    def temp_model_path(self):
        """Create temporary directory for models"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mock_database_service(self):
        """Mock database service with realistic data"""
        with patch('app.database_service') as mock_db:
            # Mock training data
            mock_db.get_training_data.return_value = self.generate_training_data()
            
            # Mock student data for prediction
            mock_db.get_student_marks_for_prediction.return_value = {
                'student_id': 1,
                'subject_id': 1,
                'student_name': 'Test Student',
                'subject_name': 'Mathematics',
                'subject_code': 'MATH101',
                'subject_type': 'theory',
                'semester': 3,
                'marks': {
                    'series_test_1': 80.0,
                    'series_test_2': 85.0,
                    'lab_internal': 82.0
                }
            }
            
            # Mock students for batch prediction
            mock_db.get_students_for_prediction.return_value = [
                {
                    'student_id': 1,
                    'subject_id': 1,
                    'marks': {'series_test_1': 80.0, 'series_test_2': 85.0, 'lab_internal': 82.0},
                    'subject_type': 'theory',
                    'semester': 3
                },
                {
                    'student_id': 2,
                    'subject_id': 1,
                    'marks': {'series_test_1': 75.0, 'series_test_2': 78.0, 'lab_internal': 77.0},
                    'subject_type': 'theory',
                    'semester': 3
                }
            ]
            
            # Mock save prediction
            mock_db.save_prediction.return_value = 123
            
            # Mock toggle visibility
            mock_db.toggle_prediction_visibility.return_value = 5
            
            # Mock accuracy stats
            mock_db.get_prediction_accuracy_stats.return_value = {
                'total_predictions': 10,
                'predictions_with_actuals': 8,
                'accurate_predictions': 6,
                'accuracy_percentage': 75.0,
                'average_difference': 8.5,
                'model_versions': ['1.0.0']
            }
            
            yield mock_db
    
    def generate_training_data(self):
        """Generate realistic training data for testing"""
        training_data = []
        
        # Generate data for 20 students
        for student_id in range(1, 21):
            subject_id = 1
            base_performance = 60 + (student_id % 5) * 8  # Varying performance levels
            
            # Add some randomness
            np.random.seed(student_id)  # For reproducible results
            
            for exam_type, max_marks in [
                ('series_test_1', 50),
                ('series_test_2', 50), 
                ('lab_internal', 50),
                ('university', 100)
            ]:
                if exam_type == 'university':
                    # University marks correlate with internal performance
                    marks = min(100, max(0, base_performance + np.random.randint(-15, 20)))
                else:
                    # Internal marks
                    marks = min(50, max(0, int((base_performance / 100) * 50) + np.random.randint(-8, 12)))
                
                training_data.append({
                    'student_id': student_id,
                    'subject_id': subject_id,
                    'exam_type': exam_type,
                    'marks_obtained': marks,
                    'max_marks': max_marks,
                    'subject_type': 'theory',
                    'semester': 3
                })
        
        return training_data
    
    @pytest.mark.integration
    def test_complete_ml_workflow(self, client, mock_database_service, temp_model_path):
        """Test complete ML workflow: train -> predict -> toggle visibility"""
        
        # Patch the model path
        with patch('app.prediction_service.model_path', temp_model_path):
            
            # Step 1: Train model
            train_response = client.post('/train', 
                                       data=json.dumps({'subject_id': 1}),
                                       content_type='application/json')
            
            assert train_response.status_code == 200
            train_data = json.loads(train_response.data)
            assert train_data['success'] is True
            assert 'model_performance' in train_data
            assert train_data['training_samples'] > 0
            
            # Step 2: Make single prediction
            predict_response = client.post('/predict',
                                         data=json.dumps({
                                             'student_id': 1,
                                             'subject_id': 1
                                         }),
                                         content_type='application/json')
            
            assert predict_response.status_code == 200
            predict_data = json.loads(predict_response.data)
            assert predict_data['success'] is True
            assert 'predicted_marks' in predict_data
            assert 0 <= predict_data['predicted_marks'] <= 100
            assert 0 <= predict_data['confidence_score'] <= 1
            
            # Step 3: Batch prediction
            batch_response = client.post('/predict/batch',
                                       data=json.dumps({'subject_id': 1}),
                                       content_type='application/json')
            
            assert batch_response.status_code == 200
            batch_data = json.loads(batch_response.data)
            assert batch_data['success'] is True
            assert batch_data['total_students'] == 2
            assert batch_data['successful_predictions'] == 2
            
            # Step 4: Toggle prediction visibility
            toggle_response = client.post('/predictions/toggle/1',
                                        data=json.dumps({
                                            'is_visible': True,
                                            'faculty_id': 1
                                        }),
                                        content_type='application/json')
            
            assert toggle_response.status_code == 200
            toggle_data = json.loads(toggle_response.data)
            assert toggle_data['success'] is True
            assert toggle_data['is_visible'] is True
            
            # Step 5: Get accuracy stats
            accuracy_response = client.get('/accuracy?subject_id=1')
            
            assert accuracy_response.status_code == 200
            accuracy_data = json.loads(accuracy_response.data)
            assert accuracy_data['success'] is True
            assert 'data' in accuracy_data
    
    def test_model_persistence_across_requests(self, client, mock_database_service, temp_model_path):
        """Test that trained models persist across requests"""
        
        with patch('app.prediction_service.model_path', temp_model_path):
            
            # Train model
            train_response = client.post('/train',
                                       data=json.dumps({'subject_id': 1}),
                                       content_type='application/json')
            
            assert train_response.status_code == 200
            
            # Make prediction (should use the trained model)
            predict_response = client.post('/predict',
                                         data=json.dumps({
                                             'student_id': 1,
                                             'subject_id': 1
                                         }),
                                         content_type='application/json')
            
            assert predict_response.status_code == 200
            predict_data = json.loads(predict_response.data)
            assert predict_data['success'] is True
            
            # Get model info to verify model is loaded
            info_response = client.get('/model/info')
            
            assert info_response.status_code == 200
            info_data = json.loads(info_response.data)
            assert info_data['success'] is True
            assert 'subject_1' in info_data['data']['loaded_models']
    
    def test_error_handling_workflow(self, client, mock_database_service):
        """Test error handling in various scenarios"""
        
        # Test training with no data
        mock_database_service.get_training_data.return_value = []
        
        train_response = client.post('/train',
                                   data=json.dumps({'subject_id': 1}),
                                   content_type='application/json')
        
        assert train_response.status_code == 400
        train_data = json.loads(train_response.data)
        assert train_data['success'] is False
        assert 'No training data available' in train_data['error']
        
        # Test prediction with no student data
        mock_database_service.get_student_marks_for_prediction.return_value = None
        
        predict_response = client.post('/predict',
                                     data=json.dumps({
                                         'student_id': 999,
                                         'subject_id': 1
                                     }),
                                     content_type='application/json')
        
        assert predict_response.status_code == 404
        predict_data = json.loads(predict_response.data)
        assert predict_data['success'] is False
        assert 'No marks data found' in predict_data['error']
        
        # Test batch prediction with no students
        mock_database_service.get_students_for_prediction.return_value = []
        
        batch_response = client.post('/predict/batch',
                                   data=json.dumps({'subject_id': 1}),
                                   content_type='application/json')
        
        assert batch_response.status_code == 404
        batch_data = json.loads(batch_response.data)
        assert batch_data['success'] is False
        assert 'No students found' in batch_data['error']
    
    def test_prediction_accuracy_validation(self, client, mock_database_service, temp_model_path):
        """Test that predictions are within reasonable ranges"""
        
        with patch('app.prediction_service.model_path', temp_model_path):
            
            # Train model
            client.post('/train',
                       data=json.dumps({'subject_id': 1}),
                       content_type='application/json')
            
            # Test predictions for different performance levels
            test_cases = [
                {'marks': {'series_test_1': 90.0, 'series_test_2': 88.0, 'lab_internal': 92.0}},  # High performer
                {'marks': {'series_test_1': 50.0, 'series_test_2': 52.0, 'lab_internal': 48.0}},  # Average performer
                {'marks': {'series_test_1': 30.0, 'series_test_2': 28.0, 'lab_internal': 32.0}}   # Low performer
            ]
            
            for i, test_case in enumerate(test_cases):
                # Update mock data
                student_data = {
                    'student_id': i + 1,
                    'subject_id': 1,
                    'student_name': f'Test Student {i + 1}',
                    'subject_name': 'Mathematics',
                    'subject_type': 'theory',
                    'semester': 3,
                    'marks': test_case['marks']
                }
                mock_database_service.get_student_marks_for_prediction.return_value = student_data
                
                # Make prediction
                predict_response = client.post('/predict',
                                             data=json.dumps({
                                                 'student_id': i + 1,
                                                 'subject_id': 1
                                             }),
                                             content_type='application/json')
                
                assert predict_response.status_code == 200
                predict_data = json.loads(predict_response.data)
                assert predict_data['success'] is True
                
                predicted_marks = predict_data['predicted_marks']
                confidence = predict_data['confidence_score']
                
                # Validate prediction range
                assert 0 <= predicted_marks <= 100, f"Predicted marks {predicted_marks} out of range"
                assert 0 <= confidence <= 1, f"Confidence score {confidence} out of range"
                
                # Validate that prediction correlates with internal performance
                avg_internal = sum(test_case['marks'].values()) / len(test_case['marks'])
                
                # High performers should get higher predictions
                if avg_internal > 80:
                    assert predicted_marks > 70, f"High performer got low prediction: {predicted_marks}"
                elif avg_internal < 40:
                    assert predicted_marks < 60, f"Low performer got high prediction: {predicted_marks}"
    
    def test_concurrent_requests(self, client, mock_database_service, temp_model_path):
        """Test handling of concurrent requests"""
        import threading
        import time
        
        with patch('app.prediction_service.model_path', temp_model_path):
            
            # Train model first
            client.post('/train',
                       data=json.dumps({'subject_id': 1}),
                       content_type='application/json')
            
            results = []
            
            def make_prediction(student_id):
                try:
                    response = client.post('/predict',
                                         data=json.dumps({
                                             'student_id': student_id,
                                             'subject_id': 1
                                         }),
                                         content_type='application/json')
                    results.append(response.status_code == 200)
                except Exception as e:
                    results.append(False)
            
            # Create multiple threads to make concurrent requests
            threads = []
            for i in range(5):
                thread = threading.Thread(target=make_prediction, args=(i + 1,))
                threads.append(thread)
            
            # Start all threads
            for thread in threads:
                thread.start()
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            # All requests should succeed
            assert all(results), f"Some concurrent requests failed: {results}"
            assert len(results) == 5