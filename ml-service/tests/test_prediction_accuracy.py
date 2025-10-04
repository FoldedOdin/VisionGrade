import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock
import sys
import os

# Add the parent directory to the path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.prediction_service import PredictionService
from utils.data_validator import DataValidator

class TestMLPredictionAccuracy:
    """Test ML prediction accuracy with sample data"""
    
    @pytest.fixture
    def prediction_service(self):
        """Create a prediction service instance for testing"""
        return PredictionService()
    
    @pytest.fixture
    def sample_training_data(self):
        """Create sample training data that mimics real academic data"""
        np.random.seed(42)  # For reproducible results
        
        # Generate realistic academic data
        n_samples = 1000
        
        # Series Test 1 marks (0-50)
        series_test_1 = np.random.normal(35, 8, n_samples)
        series_test_1 = np.clip(series_test_1, 0, 50)
        
        # Series Test 2 marks (0-50) - correlated with Series Test 1
        series_test_2 = series_test_1 + np.random.normal(0, 5, n_samples)
        series_test_2 = np.clip(series_test_2, 0, 50)
        
        # Lab Internal marks (0-50)
        lab_internal = np.random.normal(40, 6, n_samples)
        lab_internal = np.clip(lab_internal, 0, 50)
        
        # Attendance percentage (0-100)
        attendance = np.random.normal(80, 15, n_samples)
        attendance = np.clip(attendance, 0, 100)
        
        # University marks (target) - realistic correlation with internal assessments
        university_marks = (
            0.3 * series_test_1 + 
            0.3 * series_test_2 + 
            0.2 * lab_internal + 
            0.2 * (attendance / 100 * 50) +
            np.random.normal(0, 8, n_samples)
        )
        university_marks = np.clip(university_marks * 2, 0, 100)  # Scale to 0-100
        
        return pd.DataFrame({
            'series_test_1': series_test_1,
            'series_test_2': series_test_2,
            'lab_internal': lab_internal,
            'attendance_percentage': attendance,
            'university_marks': university_marks
        })
    
    @pytest.fixture
    def sample_test_data(self):
        """Create sample test data for prediction"""
        return pd.DataFrame({
            'series_test_1': [40, 35, 45, 30, 42],
            'series_test_2': [38, 33, 47, 28, 44],
            'lab_internal': [45, 40, 48, 35, 46],
            'attendance_percentage': [85, 70, 90, 60, 88]
        })
    
    def test_prediction_accuracy_within_tolerance(self, prediction_service, sample_training_data, sample_test_data):
        """Test that ML predictions are within ±10% accuracy tolerance"""
        
        # Mock the database connection and model loading
        with patch.object(prediction_service, '_load_model') as mock_load_model, \
             patch.object(prediction_service, '_get_training_data') as mock_get_data:
            
            # Setup mocks
            mock_get_data.return_value = sample_training_data
            
            # Train the model with sample data
            prediction_service.train_model('CS501')
            
            # Get actual university marks for comparison (simulate known results)
            actual_marks = [75, 65, 85, 55, 80]
            
            # Make predictions
            predictions = []
            for i, row in sample_test_data.iterrows():
                prediction = prediction_service.predict_university_marks(
                    student_id=i+1,
                    subject_id='CS501',
                    series_test_1=row['series_test_1'],
                    series_test_2=row['series_test_2'],
                    lab_internal=row['lab_internal'],
                    attendance_percentage=row['attendance_percentage']
                )
                predictions.append(prediction['predicted_marks'])
            
            # Calculate accuracy metrics
            predictions = np.array(predictions)
            actual_marks = np.array(actual_marks)
            
            # Mean Absolute Error
            mae = np.mean(np.abs(predictions - actual_marks))
            
            # Mean Absolute Percentage Error
            mape = np.mean(np.abs((actual_marks - predictions) / actual_marks)) * 100
            
            # Check if predictions are within ±10% tolerance
            percentage_errors = np.abs((actual_marks - predictions) / actual_marks) * 100
            within_tolerance = np.all(percentage_errors <= 10)
            
            print(f"Mean Absolute Error: {mae:.2f}")
            print(f"Mean Absolute Percentage Error: {mape:.2f}%")
            print(f"Individual errors: {percentage_errors}")
            
            # Assertions
            assert mae < 15, f"MAE {mae:.2f} exceeds acceptable threshold of 15"
            assert mape < 20, f"MAPE {mape:.2f}% exceeds acceptable threshold of 20%"
            
            # At least 80% of predictions should be within ±10% tolerance
            tolerance_rate = np.mean(percentage_errors <= 10) * 100
            assert tolerance_rate >= 80, f"Only {tolerance_rate:.1f}% of predictions within ±10% tolerance"
    
    def test_prediction_consistency(self, prediction_service, sample_training_data):
        """Test that predictions are consistent for the same input"""
        
        with patch.object(prediction_service, '_get_training_data') as mock_get_data:
            mock_get_data.return_value = sample_training_data
            
            # Train the model
            prediction_service.train_model('CS501')
            
            # Make multiple predictions with same input
            test_input = {
                'student_id': 1,
                'subject_id': 'CS501',
                'series_test_1': 40,
                'series_test_2': 38,
                'lab_internal': 45,
                'attendance_percentage': 85
            }
            
            predictions = []
            for _ in range(5):
                prediction = prediction_service.predict_university_marks(**test_input)
                predictions.append(prediction['predicted_marks'])
            
            # Check consistency (should be identical for same input)
            predictions = np.array(predictions)
            std_dev = np.std(predictions)
            
            assert std_dev < 0.1, f"Predictions not consistent, std dev: {std_dev}"
    
    def test_prediction_bounds(self, prediction_service, sample_training_data):
        """Test that predictions are within valid bounds (0-100)"""
        
        with patch.object(prediction_service, '_get_training_data') as mock_get_data:
            mock_get_data.return_value = sample_training_data
            
            # Train the model
            prediction_service.train_model('CS501')
            
            # Test with extreme values
            extreme_cases = [
                {'series_test_1': 0, 'series_test_2': 0, 'lab_internal': 0, 'attendance_percentage': 0},
                {'series_test_1': 50, 'series_test_2': 50, 'lab_internal': 50, 'attendance_percentage': 100},
                {'series_test_1': 25, 'series_test_2': 25, 'lab_internal': 25, 'attendance_percentage': 50}
            ]
            
            for i, case in enumerate(extreme_cases):
                prediction = prediction_service.predict_university_marks(
                    student_id=i+1,
                    subject_id='CS501',
                    **case
                )
                
                predicted_marks = prediction['predicted_marks']
                
                # Check bounds
                assert 0 <= predicted_marks <= 100, f"Prediction {predicted_marks} out of bounds for case {case}"
    
    def test_prediction_confidence_scores(self, prediction_service, sample_training_data):
        """Test that confidence scores are reasonable"""
        
        with patch.object(prediction_service, '_get_training_data') as mock_get_data:
            mock_get_data.return_value = sample_training_data
            
            # Train the model
            prediction_service.train_model('CS501')
            
            # Make prediction
            prediction = prediction_service.predict_university_marks(
                student_id=1,
                subject_id='CS501',
                series_test_1=40,
                series_test_2=38,
                lab_internal=45,
                attendance_percentage=85
            )
            
            confidence = prediction['confidence_score']
            
            # Confidence should be between 0 and 1
            assert 0 <= confidence <= 1, f"Confidence score {confidence} out of valid range"
            
            # For good training data, confidence should be reasonably high
            assert confidence >= 0.5, f"Confidence score {confidence} too low for good training data"
    
    def test_model_performance_metrics(self, prediction_service, sample_training_data):
        """Test overall model performance metrics"""
        
        with patch.object(prediction_service, '_get_training_data') as mock_get_data:
            mock_get_data.return_value = sample_training_data
            
            # Split data for training and testing
            train_size = int(0.8 * len(sample_training_data))
            train_data = sample_training_data[:train_size]
            test_data = sample_training_data[train_size:]
            
            mock_get_data.return_value = train_data
            
            # Train the model
            prediction_service.train_model('CS501')
            
            # Make predictions on test set
            predictions = []
            actuals = []
            
            for _, row in test_data.iterrows():
                prediction = prediction_service.predict_university_marks(
                    student_id=1,
                    subject_id='CS501',
                    series_test_1=row['series_test_1'],
                    series_test_2=row['series_test_2'],
                    lab_internal=row['lab_internal'],
                    attendance_percentage=row['attendance_percentage']
                )
                predictions.append(prediction['predicted_marks'])
                actuals.append(row['university_marks'])
            
            predictions = np.array(predictions)
            actuals = np.array(actuals)
            
            # Calculate R² score
            ss_res = np.sum((actuals - predictions) ** 2)
            ss_tot = np.sum((actuals - np.mean(actuals)) ** 2)
            r2_score = 1 - (ss_res / ss_tot)
            
            print(f"R² Score: {r2_score:.3f}")
            
            # R² should be reasonably high for a good model
            assert r2_score >= 0.6, f"R² score {r2_score:.3f} indicates poor model performance"
    
    def test_insufficient_data_handling(self, prediction_service):
        """Test handling of insufficient training data"""
        
        # Create minimal training data
        minimal_data = pd.DataFrame({
            'series_test_1': [40, 35],
            'series_test_2': [38, 33],
            'lab_internal': [45, 40],
            'attendance_percentage': [85, 70],
            'university_marks': [75, 65]
        })
        
        with patch.object(prediction_service, '_get_training_data') as mock_get_data:
            mock_get_data.return_value = minimal_data
            
            # Should handle insufficient data gracefully
            try:
                prediction_service.train_model('CS501')
                
                # If training succeeds, prediction should still work
                prediction = prediction_service.predict_university_marks(
                    student_id=1,
                    subject_id='CS501',
                    series_test_1=40,
                    series_test_2=38,
                    lab_internal=45,
                    attendance_percentage=85
                )
                
                # Should return a valid prediction structure
                assert 'predicted_marks' in prediction
                assert 'confidence_score' in prediction
                
            except Exception as e:
                # Should raise appropriate error for insufficient data
                assert "insufficient" in str(e).lower() or "data" in str(e).lower()

if __name__ == '__main__':
    pytest.main([__file__, '-v'])