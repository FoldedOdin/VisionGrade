import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
import sys
import os

# Add the parent directory to the path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.prediction_service import PredictionService
from utils.data_validator import DataValidator

class TestPredictionAlgorithm:
    """Test suite for ML prediction algorithms"""
    
    @pytest.fixture
    def prediction_service(self):
        """Create a PredictionService instance for testing"""
        return PredictionService()
    
    @pytest.fixture
    def sample_training_data(self):
        """Create sample training data for testing"""
        return pd.DataFrame({
            'student_id': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            'series_test_1': [45, 38, 42, 35, 48, 40, 33, 46, 41, 37],
            'series_test_2': [43, 36, 44, 32, 47, 38, 31, 45, 39, 35],
            'lab_internal': [48, 40, 46, 38, 49, 42, 36, 47, 43, 39],
            'attendance_percentage': [85.5, 72.3, 88.2, 65.8, 91.4, 78.6, 68.9, 87.1, 80.3, 74.7],
            'university_marks': [78, 65, 82, 58, 89, 71, 55, 85, 74, 67]
        })
    
    @pytest.fixture
    def sample_prediction_data(self):
        """Create sample data for making predictions"""
        return pd.DataFrame({
            'student_id': [11, 12],
            'series_test_1': [44, 39],
            'series_test_2': [42, 37],
            'lab_internal': [47, 41],
            'attendance_percentage': [83.2, 76.5]
        })

    def test_data_preprocessing(self, prediction_service, sample_training_data):
        """Test data preprocessing functionality"""
        processed_data = prediction_service.preprocess_data(sample_training_data)
        
        # Check that processed data has the expected structure
        assert isinstance(processed_data, pd.DataFrame)
        assert len(processed_data) == len(sample_training_data)
        
        # Check for required columns
        required_columns = ['series_test_1', 'series_test_2', 'lab_internal', 'attendance_percentage']
        for col in required_columns:
            assert col in processed_data.columns
        
        # Check for no missing values after preprocessing
        assert processed_data.isnull().sum().sum() == 0

    def test_feature_engineering(self, prediction_service, sample_training_data):
        """Test feature engineering process"""
        features = prediction_service.engineer_features(sample_training_data)
        
        # Check that new features are created
        assert 'series_average' in features.columns
        assert 'total_internal_score' in features.columns
        assert 'performance_trend' in features.columns
        
        # Verify feature calculations
        expected_series_avg = (sample_training_data['series_test_1'] + sample_training_data['series_test_2']) / 2
        pd.testing.assert_series_equal(features['series_average'], expected_series_avg, check_names=False)
        
        expected_total_internal = (
            sample_training_data['series_test_1'] + 
            sample_training_data['series_test_2'] + 
            sample_training_data['lab_internal']
        )
        pd.testing.assert_series_equal(features['total_internal_score'], expected_total_internal, check_names=False)

    def test_model_training(self, prediction_service, sample_training_data):
        """Test model training process"""
        # Prepare features and target
        X = prediction_service.engineer_features(sample_training_data)
        y = sample_training_data['university_marks']
        
        # Train the model
        model, metrics = prediction_service.train_model(X, y)
        
        # Check that model is trained
        assert model is not None
        assert hasattr(model, 'predict')
        
        # Check that metrics are calculated
        assert 'mse' in metrics
        assert 'mae' in metrics
        assert 'r2_score' in metrics
        assert 'accuracy_within_10_percent' in metrics
        
        # Check that metrics are reasonable
        assert metrics['r2_score'] >= 0  # R² should be non-negative for a reasonable model
        assert metrics['mae'] >= 0  # MAE should be non-negative
        assert 0 <= metrics['accuracy_within_10_percent'] <= 1  # Accuracy should be between 0 and 1

    def test_prediction_accuracy(self, prediction_service, sample_training_data):
        """Test prediction accuracy requirements"""
        # Split data for training and testing
        train_size = int(0.8 * len(sample_training_data))
        train_data = sample_training_data[:train_size]
        test_data = sample_training_data[train_size:]
        
        # Train model
        X_train = prediction_service.engineer_features(train_data)
        y_train = train_data['university_marks']
        model, _ = prediction_service.train_model(X_train, y_train)
        
        # Make predictions on test data
        X_test = prediction_service.engineer_features(test_data)
        predictions = model.predict(X_test)
        actual = test_data['university_marks'].values
        
        # Calculate accuracy within ±10% (requirement from design)
        percentage_errors = np.abs((predictions - actual) / actual) * 100
        accuracy_within_10_percent = np.mean(percentage_errors <= 10)
        
        # Should meet the ±10% accuracy requirement for most predictions
        assert accuracy_within_10_percent >= 0.6  # At least 60% should be within ±10%

    def test_prediction_bounds(self, prediction_service, sample_training_data, sample_prediction_data):
        """Test that predictions are within valid bounds"""
        # Train model
        X_train = prediction_service.engineer_features(sample_training_data)
        y_train = sample_training_data['university_marks']
        model, _ = prediction_service.train_model(X_train, y_train)
        
        # Make predictions
        X_pred = prediction_service.engineer_features(sample_prediction_data)
        predictions = model.predict(X_pred)
        
        # Check that predictions are within valid range (0-100 for university marks)
        assert np.all(predictions >= 0), "Predictions should not be negative"
        assert np.all(predictions <= 100), "Predictions should not exceed 100"

    def test_subject_specific_predictions(self, prediction_service):
        """Test subject-specific prediction functionality"""
        # Create subject-specific training data
        math_data = pd.DataFrame({
            'student_id': [1, 2, 3, 4, 5],
            'subject_id': [1, 1, 1, 1, 1],  # Math subject
            'series_test_1': [45, 38, 42, 35, 48],
            'series_test_2': [43, 36, 44, 32, 47],
            'lab_internal': [0, 0, 0, 0, 0],  # No lab for math
            'attendance_percentage': [85.5, 72.3, 88.2, 65.8, 91.4],
            'university_marks': [78, 65, 82, 58, 89]
        })
        
        physics_data = pd.DataFrame({
            'student_id': [1, 2, 3, 4, 5],
            'subject_id': [2, 2, 2, 2, 2],  # Physics subject
            'series_test_1': [40, 35, 38, 30, 43],
            'series_test_2': [38, 33, 36, 28, 41],
            'lab_internal': [48, 40, 46, 38, 49],  # Has lab component
            'attendance_percentage': [83.2, 70.1, 86.4, 63.5, 89.7],
            'university_marks': [75, 62, 79, 55, 86]
        })
        
        # Train subject-specific models
        math_model = prediction_service.train_subject_model(math_data, subject_id=1)
        physics_model = prediction_service.train_subject_model(physics_data, subject_id=2)
        
        assert math_model is not None
        assert physics_model is not None
        
        # Models should be different for different subjects
        assert math_model != physics_model

    def test_model_persistence(self, prediction_service, sample_training_data, tmp_path):
        """Test model saving and loading functionality"""
        # Train model
        X = prediction_service.engineer_features(sample_training_data)
        y = sample_training_data['university_marks']
        model, metrics = prediction_service.train_model(X, y)
        
        # Save model
        model_path = tmp_path / "test_model.pkl"
        prediction_service.save_model(model, str(model_path), metrics)
        
        # Check that model file exists
        assert model_path.exists()
        
        # Load model
        loaded_model, loaded_metrics = prediction_service.load_model(str(model_path))
        
        # Check that loaded model works
        assert loaded_model is not None
        assert loaded_metrics == metrics
        
        # Test predictions are the same
        test_data = sample_training_data.iloc[:2]
        X_test = prediction_service.engineer_features(test_data)
        
        original_predictions = model.predict(X_test)
        loaded_predictions = loaded_model.predict(X_test)
        
        np.testing.assert_array_almost_equal(original_predictions, loaded_predictions)

    def test_cross_validation(self, prediction_service, sample_training_data):
        """Test cross-validation functionality"""
        X = prediction_service.engineer_features(sample_training_data)
        y = sample_training_data['university_marks']
        
        cv_scores = prediction_service.cross_validate_model(X, y, cv_folds=3)
        
        # Check that CV scores are returned
        assert 'cv_mse_scores' in cv_scores
        assert 'cv_mae_scores' in cv_scores
        assert 'cv_r2_scores' in cv_scores
        assert 'mean_cv_score' in cv_scores
        assert 'std_cv_score' in cv_scores
        
        # Check that we have the right number of scores
        assert len(cv_scores['cv_mse_scores']) == 3
        assert len(cv_scores['cv_mae_scores']) == 3
        assert len(cv_scores['cv_r2_scores']) == 3

    def test_feature_importance(self, prediction_service, sample_training_data):
        """Test feature importance calculation"""
        X = prediction_service.engineer_features(sample_training_data)
        y = sample_training_data['university_marks']
        model, _ = prediction_service.train_model(X, y)
        
        importance_scores = prediction_service.get_feature_importance(model, X.columns)
        
        # Check that importance scores are returned
        assert isinstance(importance_scores, dict)
        assert len(importance_scores) == len(X.columns)
        
        # Check that all importance scores are non-negative
        for feature, importance in importance_scores.items():
            assert importance >= 0
        
        # Check that importance scores sum to approximately 1 (for normalized importance)
        total_importance = sum(importance_scores.values())
        assert abs(total_importance - 1.0) < 0.01

    def test_outlier_detection(self, prediction_service):
        """Test outlier detection in training data"""
        # Create data with outliers
        data_with_outliers = pd.DataFrame({
            'student_id': [1, 2, 3, 4, 5],
            'series_test_1': [45, 38, 42, 5, 48],  # 5 is an outlier
            'series_test_2': [43, 36, 44, 32, 95],  # 95 is an outlier
            'lab_internal': [48, 40, 46, 38, 49],
            'attendance_percentage': [85.5, 72.3, 88.2, 65.8, 91.4],
            'university_marks': [78, 65, 82, 58, 89]
        })
        
        outliers = prediction_service.detect_outliers(data_with_outliers)
        
        # Should detect the outliers
        assert len(outliers) > 0
        assert any(outliers['series_test_1'] == 5)
        assert any(outliers['series_test_2'] == 95)

    def test_prediction_confidence(self, prediction_service, sample_training_data, sample_prediction_data):
        """Test prediction confidence calculation"""
        # Train model
        X_train = prediction_service.engineer_features(sample_training_data)
        y_train = sample_training_data['university_marks']
        model, _ = prediction_service.train_model(X_train, y_train)
        
        # Make predictions with confidence
        X_pred = prediction_service.engineer_features(sample_prediction_data)
        predictions, confidence_scores = prediction_service.predict_with_confidence(model, X_pred)
        
        # Check that predictions and confidence scores are returned
        assert len(predictions) == len(sample_prediction_data)
        assert len(confidence_scores) == len(sample_prediction_data)
        
        # Check that confidence scores are between 0 and 1
        assert np.all(confidence_scores >= 0)
        assert np.all(confidence_scores <= 1)

    def test_model_retraining(self, prediction_service, sample_training_data):
        """Test model retraining with new data"""
        # Initial training
        X_initial = prediction_service.engineer_features(sample_training_data)
        y_initial = sample_training_data['university_marks']
        initial_model, initial_metrics = prediction_service.train_model(X_initial, y_initial)
        
        # New data for retraining
        new_data = pd.DataFrame({
            'student_id': [11, 12, 13],
            'series_test_1': [46, 39, 41],
            'series_test_2': [44, 37, 39],
            'lab_internal': [49, 42, 44],
            'attendance_percentage': [87.3, 74.8, 81.5],
            'university_marks': [83, 68, 76]
        })
        
        # Combine data and retrain
        combined_data = pd.concat([sample_training_data, new_data], ignore_index=True)
        X_retrained = prediction_service.engineer_features(combined_data)
        y_retrained = combined_data['university_marks']
        retrained_model, retrained_metrics = prediction_service.train_model(X_retrained, y_retrained)
        
        # Check that retrained model is different
        assert retrained_model != initial_model
        
        # Performance should be similar or better with more data
        assert retrained_metrics['r2_score'] >= initial_metrics['r2_score'] - 0.1

    @pytest.mark.parametrize("missing_feature", ['series_test_1', 'series_test_2', 'lab_internal'])
    def test_missing_feature_handling(self, prediction_service, sample_training_data, missing_feature):
        """Test handling of missing features in prediction data"""
        # Create prediction data with missing feature
        incomplete_data = sample_training_data.copy()
        incomplete_data[missing_feature] = np.nan
        
        # Should handle missing data gracefully
        try:
            processed_data = prediction_service.preprocess_data(incomplete_data)
            assert missing_feature in processed_data.columns
            # Missing values should be imputed
            assert not processed_data[missing_feature].isnull().any()
        except Exception as e:
            pytest.fail(f"Failed to handle missing {missing_feature}: {str(e)}")

    def test_prediction_service_integration(self, prediction_service):
        """Test end-to-end prediction service functionality"""
        # Create comprehensive test data
        training_data = pd.DataFrame({
            'student_id': range(1, 21),
            'subject_id': [1] * 10 + [2] * 10,
            'series_test_1': np.random.randint(30, 50, 20),
            'series_test_2': np.random.randint(28, 48, 20),
            'lab_internal': [0] * 10 + list(np.random.randint(35, 50, 10)),
            'attendance_percentage': np.random.uniform(60, 95, 20),
            'university_marks': np.random.randint(50, 95, 20)
        })
        
        prediction_data = pd.DataFrame({
            'student_id': [21, 22],
            'subject_id': [1, 2],
            'series_test_1': [42, 38],
            'series_test_2': [40, 36],
            'lab_internal': [0, 45],
            'attendance_percentage': [82.5, 78.3]
        })
        
        # Full pipeline test
        try:
            # Train models
            subject_1_data = training_data[training_data['subject_id'] == 1]
            subject_2_data = training_data[training_data['subject_id'] == 2]
            
            model_1 = prediction_service.train_subject_model(subject_1_data, subject_id=1)
            model_2 = prediction_service.train_subject_model(subject_2_data, subject_id=2)
            
            # Make predictions
            pred_1_data = prediction_data[prediction_data['subject_id'] == 1]
            pred_2_data = prediction_data[prediction_data['subject_id'] == 2]
            
            if len(pred_1_data) > 0:
                X_1 = prediction_service.engineer_features(pred_1_data)
                predictions_1 = model_1.predict(X_1)
                assert len(predictions_1) == len(pred_1_data)
            
            if len(pred_2_data) > 0:
                X_2 = prediction_service.engineer_features(pred_2_data)
                predictions_2 = model_2.predict(X_2)
                assert len(predictions_2) == len(pred_2_data)
                
        except Exception as e:
            pytest.fail(f"Integration test failed: {str(e)}")

if __name__ == "__main__":
    pytest.main([__file__])