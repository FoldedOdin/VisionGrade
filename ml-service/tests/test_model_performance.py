import pytest
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import sys
import os

# Add the parent directory to the path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.prediction_service import PredictionService

class TestModelPerformance:
    """Test suite for ML model performance validation"""
    
    @pytest.fixture
    def prediction_service(self):
        """Create a PredictionService instance for testing"""
        return PredictionService()
    
    @pytest.fixture
    def large_dataset(self):
        """Create a larger dataset for performance testing"""
        np.random.seed(42)  # For reproducible results
        n_samples = 200
        
        # Generate realistic academic data
        series_test_1 = np.random.normal(40, 8, n_samples)
        series_test_2 = series_test_1 + np.random.normal(0, 3, n_samples)  # Correlated with test 1
        lab_internal = np.random.normal(42, 6, n_samples)
        attendance = np.random.normal(80, 12, n_samples)
        
        # Generate university marks with realistic correlation
        university_marks = (
            0.3 * series_test_1 + 
            0.3 * series_test_2 + 
            0.2 * lab_internal + 
            0.2 * (attendance / 100 * 50) + 
            np.random.normal(0, 5, n_samples)
        )
        
        # Ensure values are within valid ranges
        series_test_1 = np.clip(series_test_1, 0, 50)
        series_test_2 = np.clip(series_test_2, 0, 50)
        lab_internal = np.clip(lab_internal, 0, 50)
        attendance = np.clip(attendance, 0, 100)
        university_marks = np.clip(university_marks, 0, 100)
        
        return pd.DataFrame({
            'student_id': range(1, n_samples + 1),
            'series_test_1': series_test_1,
            'series_test_2': series_test_2,
            'lab_internal': lab_internal,
            'attendance_percentage': attendance,
            'university_marks': university_marks
        })

    def test_model_accuracy_requirement(self, prediction_service, large_dataset):
        """Test that model meets the ±10% accuracy requirement"""
        # Split data
        train_size = int(0.8 * len(large_dataset))
        train_data = large_dataset[:train_size]
        test_data = large_dataset[train_size:]
        
        # Train model
        X_train = prediction_service.engineer_features(train_data)
        y_train = train_data['university_marks']
        model, metrics = prediction_service.train_model(X_train, y_train)
        
        # Test predictions
        X_test = prediction_service.engineer_features(test_data)
        y_test = test_data['university_marks']
        predictions = model.predict(X_test)
        
        # Calculate percentage errors
        percentage_errors = np.abs((predictions - y_test) / y_test) * 100
        accuracy_within_10_percent = np.mean(percentage_errors <= 10)
        
        # Should meet the ±10% accuracy requirement for at least 70% of predictions
        assert accuracy_within_10_percent >= 0.7, f"Only {accuracy_within_10_percent:.2%} of predictions within ±10%"
        
        # Additional metrics
        mse = mean_squared_error(y_test, predictions)
        mae = mean_absolute_error(y_test, predictions)
        r2 = r2_score(y_test, predictions)
        
        print(f"Model Performance Metrics:")
        print(f"  Accuracy within ±10%: {accuracy_within_10_percent:.2%}")
        print(f"  MSE: {mse:.2f}")
        print(f"  MAE: {mae:.2f}")
        print(f"  R² Score: {r2:.3f}")
        
        # Performance thresholds
        assert mae <= 15, f"MAE too high: {mae:.2f}"
        assert r2 >= 0.5, f"R² score too low: {r2:.3f}"

    def test_model_consistency(self, prediction_service, large_dataset):
        """Test model consistency across multiple training runs"""
        accuracies = []
        r2_scores = []
        
        # Train model multiple times with different random states
        for random_state in range(5):
            # Shuffle data
            shuffled_data = large_dataset.sample(frac=1, random_state=random_state).reset_index(drop=True)
            
            # Split data
            train_size = int(0.8 * len(shuffled_data))
            train_data = shuffled_data[:train_size]
            test_data = shuffled_data[train_size:]
            
            # Train model
            X_train = prediction_service.engineer_features(train_data)
            y_train = train_data['university_marks']
            model, _ = prediction_service.train_model(X_train, y_train, random_state=random_state)
            
            # Test predictions
            X_test = prediction_service.engineer_features(test_data)
            y_test = test_data['university_marks']
            predictions = model.predict(X_test)
            
            # Calculate metrics
            percentage_errors = np.abs((predictions - y_test) / y_test) * 100
            accuracy = np.mean(percentage_errors <= 10)
            r2 = r2_score(y_test, predictions)
            
            accuracies.append(accuracy)
            r2_scores.append(r2)
        
        # Check consistency
        accuracy_std = np.std(accuracies)
        r2_std = np.std(r2_scores)
        
        print(f"Model Consistency:")
        print(f"  Accuracy std: {accuracy_std:.3f}")
        print(f"  R² std: {r2_std:.3f}")
        print(f"  Mean accuracy: {np.mean(accuracies):.2%}")
        print(f"  Mean R²: {np.mean(r2_scores):.3f}")
        
        # Models should be reasonably consistent
        assert accuracy_std <= 0.1, f"Accuracy too inconsistent: {accuracy_std:.3f}"
        assert r2_std <= 0.1, f"R² too inconsistent: {r2_std:.3f}"

    def test_prediction_speed(self, prediction_service, large_dataset):
        """Test prediction speed meets performance requirements"""
        import time
        
        # Train model
        train_size = int(0.8 * len(large_dataset))
        train_data = large_dataset[:train_size]
        
        X_train = prediction_service.engineer_features(train_data)
        y_train = train_data['university_marks']
        model, _ = prediction_service.train_model(X_train, y_train)
        
        # Test prediction speed
        test_data = large_dataset[train_size:]
        X_test = prediction_service.engineer_features(test_data)
        
        # Time multiple predictions
        start_time = time.time()
        for _ in range(10):
            predictions = model.predict(X_test)
        end_time = time.time()
        
        avg_time_per_batch = (end_time - start_time) / 10
        avg_time_per_prediction = avg_time_per_batch / len(X_test)
        
        print(f"Prediction Speed:")
        print(f"  Average time per batch ({len(X_test)} predictions): {avg_time_per_batch:.3f}s")
        print(f"  Average time per prediction: {avg_time_per_prediction*1000:.2f}ms")
        
        # Should predict within 1 second for a batch (requirement from design)
        assert avg_time_per_batch <= 1.0, f"Prediction too slow: {avg_time_per_batch:.3f}s"

    def test_model_robustness_to_outliers(self, prediction_service, large_dataset):
        """Test model robustness to outliers in data"""
        # Create dataset with outliers
        data_with_outliers = large_dataset.copy()
        
        # Add some outliers
        outlier_indices = np.random.choice(len(data_with_outliers), size=10, replace=False)
        data_with_outliers.loc[outlier_indices, 'series_test_1'] = np.random.choice([0, 50], size=10)
        data_with_outliers.loc[outlier_indices, 'attendance_percentage'] = np.random.choice([30, 100], size=10)
        
        # Train models with and without outliers
        train_size = int(0.8 * len(large_dataset))
        
        # Model without outliers
        clean_train = large_dataset[:train_size]
        X_clean = prediction_service.engineer_features(clean_train)
        y_clean = clean_train['university_marks']
        clean_model, _ = prediction_service.train_model(X_clean, y_clean)
        
        # Model with outliers
        outlier_train = data_with_outliers[:train_size]
        X_outlier = prediction_service.engineer_features(outlier_train)
        y_outlier = outlier_train['university_marks']
        outlier_model, _ = prediction_service.train_model(X_outlier, y_outlier)
        
        # Test on clean test data
        test_data = large_dataset[train_size:]
        X_test = prediction_service.engineer_features(test_data)
        y_test = test_data['university_marks']
        
        clean_predictions = clean_model.predict(X_test)
        outlier_predictions = outlier_model.predict(X_test)
        
        clean_r2 = r2_score(y_test, clean_predictions)
        outlier_r2 = r2_score(y_test, outlier_predictions)
        
        print(f"Robustness to Outliers:")
        print(f"  Clean model R²: {clean_r2:.3f}")
        print(f"  Outlier model R²: {outlier_r2:.3f}")
        print(f"  Performance degradation: {(clean_r2 - outlier_r2):.3f}")
        
        # Model should be reasonably robust to outliers
        performance_degradation = clean_r2 - outlier_r2
        assert performance_degradation <= 0.2, f"Model too sensitive to outliers: {performance_degradation:.3f}"

    def test_feature_importance_stability(self, prediction_service, large_dataset):
        """Test that feature importance is stable across different training runs"""
        feature_importances = []
        
        # Train model multiple times
        for random_state in range(5):
            shuffled_data = large_dataset.sample(frac=1, random_state=random_state).reset_index(drop=True)
            train_size = int(0.8 * len(shuffled_data))
            train_data = shuffled_data[:train_size]
            
            X_train = prediction_service.engineer_features(train_data)
            y_train = train_data['university_marks']
            model, _ = prediction_service.train_model(X_train, y_train, random_state=random_state)
            
            importance = prediction_service.get_feature_importance(model, X_train.columns)
            feature_importances.append(importance)
        
        # Calculate stability of feature importance
        feature_names = list(feature_importances[0].keys())
        importance_matrix = np.array([[imp[feature] for feature in feature_names] for imp in feature_importances])
        
        # Calculate coefficient of variation for each feature
        mean_importance = np.mean(importance_matrix, axis=0)
        std_importance = np.std(importance_matrix, axis=0)
        cv_importance = std_importance / (mean_importance + 1e-8)  # Add small value to avoid division by zero
        
        print(f"Feature Importance Stability:")
        for i, feature in enumerate(feature_names):
            print(f"  {feature}: mean={mean_importance[i]:.3f}, cv={cv_importance[i]:.3f}")
        
        # Feature importance should be reasonably stable
        max_cv = np.max(cv_importance)
        assert max_cv <= 0.5, f"Feature importance too unstable: max CV = {max_cv:.3f}"

    def test_model_performance_by_score_range(self, prediction_service, large_dataset):
        """Test model performance across different score ranges"""
        # Train model
        train_size = int(0.8 * len(large_dataset))
        train_data = large_dataset[:train_size]
        test_data = large_dataset[train_size:]
        
        X_train = prediction_service.engineer_features(train_data)
        y_train = train_data['university_marks']
        model, _ = prediction_service.train_model(X_train, y_train)
        
        # Test predictions
        X_test = prediction_service.engineer_features(test_data)
        y_test = test_data['university_marks']
        predictions = model.predict(X_test)
        
        # Analyze performance by score ranges
        score_ranges = [
            (0, 40, 'Fail'),
            (40, 60, 'Pass'),
            (60, 75, 'Good'),
            (75, 100, 'Excellent')
        ]
        
        for min_score, max_score, label in score_ranges:
            mask = (y_test >= min_score) & (y_test < max_score)
            if np.sum(mask) > 0:
                range_y_test = y_test[mask]
                range_predictions = predictions[mask]
                
                range_mae = mean_absolute_error(range_y_test, range_predictions)
                range_r2 = r2_score(range_y_test, range_predictions)
                
                percentage_errors = np.abs((range_predictions - range_y_test) / range_y_test) * 100
                range_accuracy = np.mean(percentage_errors <= 10)
                
                print(f"Performance for {label} range ({min_score}-{max_score}):")
                print(f"  Samples: {np.sum(mask)}")
                print(f"  MAE: {range_mae:.2f}")
                print(f"  R²: {range_r2:.3f}")
                print(f"  Accuracy within ±10%: {range_accuracy:.2%}")
                
                # Each range should have reasonable performance
                assert range_mae <= 20, f"MAE too high for {label} range: {range_mae:.2f}"

    def test_model_generalization(self, prediction_service, large_dataset):
        """Test model generalization using k-fold cross-validation"""
        from sklearn.model_selection import KFold
        
        X = prediction_service.engineer_features(large_dataset)
        y = large_dataset['university_marks']
        
        kf = KFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = []
        cv_accuracies = []
        
        for train_idx, val_idx in kf.split(X):
            X_train_fold, X_val_fold = X.iloc[train_idx], X.iloc[val_idx]
            y_train_fold, y_val_fold = y.iloc[train_idx], y.iloc[val_idx]
            
            # Train model
            model, _ = prediction_service.train_model(X_train_fold, y_train_fold)
            
            # Validate
            predictions = model.predict(X_val_fold)
            
            # Calculate metrics
            r2 = r2_score(y_val_fold, predictions)
            percentage_errors = np.abs((predictions - y_val_fold) / y_val_fold) * 100
            accuracy = np.mean(percentage_errors <= 10)
            
            cv_scores.append(r2)
            cv_accuracies.append(accuracy)
        
        mean_r2 = np.mean(cv_scores)
        std_r2 = np.std(cv_scores)
        mean_accuracy = np.mean(cv_accuracies)
        std_accuracy = np.std(cv_accuracies)
        
        print(f"Cross-Validation Results:")
        print(f"  Mean R²: {mean_r2:.3f} ± {std_r2:.3f}")
        print(f"  Mean Accuracy: {mean_accuracy:.2%} ± {std_accuracy:.3f}")
        
        # Model should generalize well
        assert mean_r2 >= 0.5, f"Poor generalization: mean R² = {mean_r2:.3f}"
        assert std_r2 <= 0.15, f"Unstable generalization: R² std = {std_r2:.3f}"
        assert mean_accuracy >= 0.65, f"Poor accuracy generalization: {mean_accuracy:.2%}"

    def test_memory_usage(self, prediction_service, large_dataset):
        """Test memory usage during model training and prediction"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        
        # Measure memory before training
        memory_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # Train model
        train_size = int(0.8 * len(large_dataset))
        train_data = large_dataset[:train_size]
        
        X_train = prediction_service.engineer_features(train_data)
        y_train = train_data['university_marks']
        model, _ = prediction_service.train_model(X_train, y_train)
        
        # Measure memory after training
        memory_after_training = process.memory_info().rss / 1024 / 1024  # MB
        
        # Make predictions
        test_data = large_dataset[train_size:]
        X_test = prediction_service.engineer_features(test_data)
        predictions = model.predict(X_test)
        
        # Measure memory after prediction
        memory_after_prediction = process.memory_info().rss / 1024 / 1024  # MB
        
        training_memory_increase = memory_after_training - memory_before
        prediction_memory_increase = memory_after_prediction - memory_after_training
        
        print(f"Memory Usage:")
        print(f"  Before training: {memory_before:.1f} MB")
        print(f"  After training: {memory_after_training:.1f} MB")
        print(f"  After prediction: {memory_after_prediction:.1f} MB")
        print(f"  Training memory increase: {training_memory_increase:.1f} MB")
        print(f"  Prediction memory increase: {prediction_memory_increase:.1f} MB")
        
        # Memory usage should be reasonable
        assert training_memory_increase <= 100, f"Training uses too much memory: {training_memory_increase:.1f} MB"
        assert prediction_memory_increase <= 10, f"Prediction uses too much memory: {prediction_memory_increase:.1f} MB"

if __name__ == "__main__":
    pytest.main([__file__])