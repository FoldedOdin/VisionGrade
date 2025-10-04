"""
Tests for ML Prediction Service
"""

import pytest
import numpy as np
import pandas as pd
import os
import tempfile
import shutil
from unittest.mock import Mock, patch
import sys

# Add services to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services'))

from prediction_service import PredictionService

class TestPredictionService:
    
    @pytest.fixture
    def temp_model_path(self):
        """Create temporary directory for models"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def prediction_service(self, temp_model_path):
        """Create prediction service instance"""
        return PredictionService(model_path=temp_model_path)
    
    @pytest.fixture
    def sample_training_data(self):
        """Sample training data for testing"""
        return [
            {
                'student_id': 1,
                'subject_id': 1,
                'exam_type': 'series_test_1',
                'marks_obtained': 40,
                'max_marks': 50,
                'subject_type': 'theory',
                'semester': 3
            },
            {
                'student_id': 1,
                'subject_id': 1,
                'exam_type': 'series_test_2',
                'marks_obtained': 42,
                'max_marks': 50,
                'subject_type': 'theory',
                'semester': 3
            },
            {
                'student_id': 1,
                'subject_id': 1,
                'exam_type': 'lab_internal',
                'marks_obtained': 45,
                'max_marks': 50,
                'subject_type': 'theory',
                'semester': 3
            },
            {
                'student_id': 1,
                'subject_id': 1,
                'exam_type': 'university',
                'marks_obtained': 75,
                'max_marks': 100,
                'subject_type': 'theory',
                'semester': 3
            },
            # Student 2
            {
                'student_id': 2,
                'subject_id': 1,
                'exam_type': 'series_test_1',
                'marks_obtained': 35,
                'max_marks': 50,
                'subject_type': 'theory',
                'semester': 3
            },
            {
                'student_id': 2,
                'subject_id': 1,
                'exam_type': 'series_test_2',
                'marks_obtained': 38,
                'max_marks': 50,
                'subject_type': 'theory',
                'semester': 3
            },
            {
                'student_id': 2,
                'subject_id': 1,
                'exam_type': 'lab_internal',
                'marks_obtained': 40,
                'max_marks': 50,
                'subject_type': 'theory',
                'semester': 3
            },
            {
                'student_id': 2,
                'subject_id': 1,
                'exam_type': 'university',
                'marks_obtained': 65,
                'max_marks': 100,
                'subject_type': 'theory',
                'semester': 3
            }
        ]
    
    @pytest.fixture
    def sample_student_data(self):
        """Sample student data for prediction"""
        return {
            'student_id': 3,
            'subject_id': 1,
            'student_name': 'Test Student',
            'subject_name': 'Test Subject',
            'subject_type': 'theory',
            'semester': 3,
            'marks': {
                'series_test_1': 80.0,
                'series_test_2': 85.0,
                'lab_internal': 82.0
            }
        }
    
    def test_initialization(self, temp_model_path):
        """Test service initialization"""
        service = PredictionService(model_path=temp_model_path)
        
        assert service.model_path == temp_model_path
        assert service.model_version == "1.0.0"
        assert len(service.feature_columns) == 6
        assert os.path.exists(temp_model_path)
    
    def test_prepare_training_data(self, prediction_service, sample_training_data):
        """Test training data preparation"""
        X, y = prediction_service.prepare_training_data(sample_training_data)
        
        assert isinstance(X, pd.DataFrame)
        assert isinstance(y, pd.Series)
        assert len(X) == 2  # 2 students with university marks
        assert len(y) == 2
        assert list(X.columns) == prediction_service.feature_columns
        
        # Check feature values for first student
        first_row = X.iloc[0]
        assert first_row['series_test_1_percentage'] == 80.0  # 40/50 * 100
        assert first_row['series_test_2_percentage'] == 84.0  # 42/50 * 100
        assert first_row['lab_internal_percentage'] == 90.0   # 45/50 * 100
        assert first_row['subject_type_encoded'] == 0  # theory
        assert first_row['semester'] == 3
    
    def test_prepare_training_data_insufficient_data(self, prediction_service):
        """Test training data preparation with insufficient data"""
        insufficient_data = [
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
        
        with pytest.raises(ValueError, match="No valid training data found"):
            prediction_service.prepare_training_data(insufficient_data)
    
    def test_prepare_prediction_features(self, prediction_service, sample_student_data):
        """Test feature preparation for prediction"""
        features = prediction_service._prepare_prediction_features(sample_student_data)
        
        assert len(features) == 6
        assert features[0] == 80.0  # series_test_1
        assert features[1] == 85.0  # series_test_2
        assert features[2] == 82.0  # lab_internal
        assert features[3] == (80.0 + 85.0 + 82.0) / 3  # average
        assert features[4] == 0  # subject_type_encoded (theory)
        assert features[5] == 3  # semester
    
    def test_prepare_prediction_features_missing_marks(self, prediction_service):
        """Test feature preparation with missing marks"""
        student_data = {
            'student_id': 3,
            'subject_id': 1,
            'subject_type': 'lab',
            'semester': 4,
            'marks': {
                'series_test_1': 75.0
                # Missing series_test_2 and lab_internal
            }
        }
        
        features = prediction_service._prepare_prediction_features(student_data)
        
        assert len(features) == 6
        assert features[0] == 75.0  # series_test_1
        assert features[1] == 75.0  # series_test_2 filled with average
        assert features[2] == 75.0  # lab_internal filled with average
        assert features[3] == 75.0  # average
        assert features[4] == 1  # subject_type_encoded (lab)
        assert features[5] == 4  # semester
    
    def test_calculate_confidence(self, prediction_service):
        """Test confidence score calculation"""
        # Complete data
        complete_data = {
            'marks': {
                'series_test_1': 80.0,
                'series_test_2': 82.0,
                'lab_internal': 81.0
            }
        }
        features = [80.0, 82.0, 81.0, 81.0, 0, 3]
        confidence = prediction_service._calculate_confidence(complete_data, features)
        
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.5  # Should be high for complete, consistent data
        
        # Incomplete data
        incomplete_data = {
            'marks': {
                'series_test_1': 80.0
            }
        }
        features = [80.0, 80.0, 80.0, 80.0, 0, 3]
        confidence_incomplete = prediction_service._calculate_confidence(incomplete_data, features)
        
        assert confidence_incomplete < confidence  # Should be lower for incomplete data
    
    def test_get_model_info(self, prediction_service):
        """Test model info retrieval"""
        info = prediction_service.get_model_info()
        
        assert 'model_version' in info
        assert 'loaded_models' in info
        assert 'feature_columns' in info
        assert 'model_path' in info
        assert info['model_version'] == "1.0.0"
        assert len(info['feature_columns']) == 6
    
    def test_predict_without_model(self, prediction_service, sample_student_data):
        """Test prediction without trained model"""
        result = prediction_service.predict_university_marks(sample_student_data)
        
        assert result['success'] is False
        assert 'error' in result
        assert 'No trained model found' in result['error']
    
    def test_batch_predict_empty_list(self, prediction_service):
        """Test batch prediction with empty list"""
        results = prediction_service.batch_predict([])
        
        assert isinstance(results, list)
        assert len(results) == 0
    
    def test_batch_predict_with_errors(self, prediction_service):
        """Test batch prediction with invalid data"""
        invalid_data = [
            {'student_id': 1, 'subject_id': 1, 'marks': {}},  # No marks
            {'student_id': 2}  # Missing subject_id
        ]
        
        results = prediction_service.batch_predict(invalid_data)
        
        assert len(results) == 2
        assert all(not result['success'] for result in results)
        assert all('error' in result for result in results)

    @pytest.mark.integration
    def test_full_training_and_prediction_workflow(self, prediction_service, sample_training_data, sample_student_data):
        """Integration test for full workflow"""
        # Generate more training data for better model training
        extended_training_data = []
        for i in range(15):  # Create 15 students
            student_id = i + 1
            base_score = 60 + (i * 2)  # Varying performance
            
            for exam_type, max_marks in [('series_test_1', 50), ('series_test_2', 50), ('lab_internal', 50), ('university', 100)]:
                if exam_type == 'university':
                    marks = min(100, base_score + np.random.randint(-10, 15))
                else:
                    marks = min(50, int((base_score / 100) * 50) + np.random.randint(-5, 8))
                
                extended_training_data.append({
                    'student_id': student_id,
                    'subject_id': 1,
                    'exam_type': exam_type,
                    'marks_obtained': marks,
                    'max_marks': max_marks,
                    'subject_type': 'theory',
                    'semester': 3
                })
        
        # Train model
        training_result = prediction_service.train_model(extended_training_data, subject_id=1)
        
        assert training_result['success'] is True
        assert 'model_performance' in training_result
        assert training_result['training_samples'] > 0
        assert training_result['test_samples'] > 0
        
        # Make prediction
        prediction_result = prediction_service.predict_university_marks(sample_student_data, subject_id=1)
        
        assert prediction_result['success'] is True
        assert 'predicted_marks' in prediction_result
        assert 'confidence_score' in prediction_result
        assert 0 <= prediction_result['predicted_marks'] <= 100
        assert 0 <= prediction_result['confidence_score'] <= 1
        assert prediction_result['model_version'] == "1.0.0"
    
    def test_model_persistence(self, temp_model_path, sample_training_data):
        """Test model saving and loading"""
        # Create service and train model
        service1 = PredictionService(model_path=temp_model_path)
        
        # Generate sufficient training data
        extended_training_data = []
        for i in range(15):
            student_id = i + 1
            base_score = 60 + (i * 2)
            
            for exam_type, max_marks in [('series_test_1', 50), ('series_test_2', 50), ('lab_internal', 50), ('university', 100)]:
                if exam_type == 'university':
                    marks = min(100, base_score + np.random.randint(-10, 15))
                else:
                    marks = min(50, int((base_score / 100) * 50) + np.random.randint(-5, 8))
                
                extended_training_data.append({
                    'student_id': student_id,
                    'subject_id': 1,
                    'exam_type': exam_type,
                    'marks_obtained': marks,
                    'max_marks': max_marks,
                    'subject_type': 'theory',
                    'semester': 3
                })
        
        training_result = service1.train_model(extended_training_data, subject_id=1)
        assert training_result['success'] is True
        
        # Create new service instance and check if model is loaded
        service2 = PredictionService(model_path=temp_model_path)
        model_info = service2.get_model_info()
        
        assert 'subject_1' in model_info['loaded_models']