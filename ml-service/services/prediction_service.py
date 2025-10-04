"""
ML Prediction Service for VisionGrade
Handles university exam predictions based on Series Test and Lab Internal marks
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib
import os
import logging
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
import json

logger = logging.getLogger(__name__)

class PredictionService:
    """
    ML service for predicting university exam marks based on internal assessments
    """
    
    def __init__(self, model_path: str = './models/'):
        self.model_path = model_path
        self.models = {}
        self.model_version = "2.0.0"  # Updated for production models
        self.feature_columns = [
            'series_test_1_percentage',
            'series_test_2_percentage', 
            'lab_internal_percentage',
            'average_internal_percentage',
            'subject_type_encoded',  # 0 for theory, 1 for lab
            'semester',
            'attendance_percentage'  # Added attendance feature
        ]
        
        # Ensure model directory exists
        os.makedirs(model_path, exist_ok=True)
        
        # Load production models first, then fallback to regular models
        self._load_production_models()
        self._load_models()
    
    def prepare_training_data(self, marks_data: List[Dict]) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare training data from marks records
        
        Args:
            marks_data: List of mark records with student, subject, and exam data
            
        Returns:
            Tuple of (features_df, target_series)
        """
        training_records = []
        
        # Group marks by student and subject
        student_subject_marks = {}
        for mark in marks_data:
            key = (mark['student_id'], mark['subject_id'])
            if key not in student_subject_marks:
                student_subject_marks[key] = {
                    'student_id': mark['student_id'],
                    'subject_id': mark['subject_id'],
                    'subject_type': mark.get('subject_type', 'theory'),
                    'semester': mark.get('semester', 1),
                    'marks': {}
                }
            
            exam_type = mark['exam_type']
            percentage = (mark['marks_obtained'] / mark['max_marks']) * 100
            student_subject_marks[key]['marks'][exam_type] = percentage
        
        # Create training records for students with university marks
        for key, data in student_subject_marks.items():
            marks = data['marks']
            
            # Only include records with university marks (target) and at least 2 internal assessments
            if 'university' in marks:
                internal_count = sum(1 for exam in ['series_test_1', 'series_test_2', 'lab_internal'] 
                                   if exam in marks)
                
                if internal_count >= 2:
                    # Fill missing internal marks with average of available ones
                    internal_marks = [marks.get(exam, 0) for exam in ['series_test_1', 'series_test_2', 'lab_internal']]
                    available_internals = [m for m in internal_marks if m > 0]
                    avg_internal = np.mean(available_internals) if available_internals else 0
                    
                    # Fill missing values with average
                    series_1 = marks.get('series_test_1', avg_internal)
                    series_2 = marks.get('series_test_2', avg_internal)
                    lab_internal = marks.get('lab_internal', avg_internal)
                    
                    record = {
                        'student_id': data['student_id'],
                        'subject_id': data['subject_id'],
                        'series_test_1_percentage': series_1,
                        'series_test_2_percentage': series_2,
                        'lab_internal_percentage': lab_internal,
                        'average_internal_percentage': np.mean([series_1, series_2, lab_internal]),
                        'subject_type_encoded': 1 if data['subject_type'] == 'lab' else 0,
                        'semester': data['semester'],
                        'university_percentage': marks['university']
                    }
                    training_records.append(record)
        
        if not training_records:
            raise ValueError("No valid training data found. Need students with university marks and internal assessments.")
        
        df = pd.DataFrame(training_records)
        
        # Features and target
        X = df[self.feature_columns]
        y = df['university_percentage']
        
        logger.info(f"Prepared training data: {len(df)} records with {len(self.feature_columns)} features")
        return X, y
    
    def train_model(self, marks_data: List[Dict], subject_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Train ML model for university exam prediction
        
        Args:
            marks_data: Training data from database
            subject_id: Optional subject ID for subject-specific model
            
        Returns:
            Training results and model performance metrics
        """
        try:
            # Prepare training data
            X, y = self.prepare_training_data(marks_data)
            
            if len(X) < 10:
                raise ValueError(f"Insufficient training data: {len(X)} records. Need at least 10 records.")
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=None
            )
            
            # Train multiple models and select best
            models_to_try = {
                'random_forest': RandomForestRegressor(
                    n_estimators=100,
                    max_depth=10,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42
                ),
                'xgboost': xgb.XGBRegressor(
                    n_estimators=100,
                    max_depth=6,
                    learning_rate=0.1,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    random_state=42
                )
            }
            
            best_model = None
            best_score = float('inf')
            best_model_name = None
            model_results = {}
            
            for model_name, model in models_to_try.items():
                # Train model
                model.fit(X_train, y_train)
                
                # Evaluate
                y_pred = model.predict(X_test)
                mae = mean_absolute_error(y_test, y_pred)
                mse = mean_squared_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                
                model_results[model_name] = {
                    'mae': mae,
                    'mse': mse,
                    'rmse': np.sqrt(mse),
                    'r2': r2
                }
                
                # Select best model based on MAE
                if mae < best_score:
                    best_score = mae
                    best_model = model
                    best_model_name = model_name
            
            # Save best model
            model_key = f"subject_{subject_id}" if subject_id else "general"
            self.models[model_key] = best_model
            
            # Save model to disk
            model_filename = f"{model_key}_model_{self.model_version}.joblib"
            model_filepath = os.path.join(self.model_path, model_filename)
            joblib.dump(best_model, model_filepath)
            
            # Calculate feature importance
            if hasattr(best_model, 'feature_importances_'):
                feature_importance = dict(zip(self.feature_columns, best_model.feature_importances_))
            else:
                feature_importance = {}
            
            training_results = {
                'success': True,
                'model_version': self.model_version,
                'best_model': best_model_name,
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'model_performance': model_results[best_model_name],
                'all_models_performance': model_results,
                'feature_importance': feature_importance,
                'model_path': model_filepath,
                'trained_at': datetime.now().isoformat()
            }
            
            logger.info(f"Model training completed. Best model: {best_model_name} with MAE: {best_score:.2f}")
            return training_results
            
        except Exception as e:
            logger.error(f"Model training failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'trained_at': datetime.now().isoformat()
            }
    
    def predict_university_marks(self, student_data: Dict, subject_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Predict university exam marks for a student
        
        Args:
            student_data: Dictionary containing student's internal marks and subject info
            subject_id: Optional subject ID for subject-specific prediction
            
        Returns:
            Prediction results with confidence score
        """
        try:
            # Get appropriate model (prioritize production models)
            model_key = None
            model = None
            
            # Try production models first
            if 'production_best' in self.models:
                model_key = 'production_best'
                model = self.models['production_best']
            elif any(key.startswith('production_') for key in self.models.keys()):
                # Use any available production model
                production_keys = [k for k in self.models.keys() if k.startswith('production_')]
                model_key = production_keys[0]
                model = self.models[model_key]
            else:
                # Fallback to subject-specific or general models
                subject_key = f"subject_{subject_id}" if subject_id else "general"
                model = self.models.get(subject_key)
                model_key = subject_key
                
                if model is None:
                    # Try to load model from disk
                    model_filename = f"{subject_key}_model_{self.model_version}.joblib"
                    model_filepath = os.path.join(self.model_path, model_filename)
                    
                    if os.path.exists(model_filepath):
                        model = joblib.load(model_filepath)
                        self.models[subject_key] = model
                        model_key = subject_key
                    else:
                        raise ValueError(f"No trained model found. Please train a model first.")
            
            # Prepare features
            features = self._prepare_prediction_features(student_data)
            
            # Make prediction
            prediction = model.predict([features])[0]
            
            # Calculate confidence score based on feature completeness and model performance
            confidence = self._calculate_confidence(student_data, features)
            
            # Ensure prediction is within valid range
            prediction = max(0, min(100, prediction))
            
            result = {
                'success': True,
                'predicted_marks': round(prediction, 2),
                'confidence_score': round(confidence, 2),
                'input_features': dict(zip(self.feature_columns, features)),
                'model_version': self.model_version,
                'model_used': model_key,
                'predicted_at': datetime.now().isoformat()
            }
            
            logger.info(f"Prediction made for student {student_data.get('student_id')}: {prediction:.2f}%")
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'predicted_at': datetime.now().isoformat()
            }
    
    def _prepare_prediction_features(self, student_data: Dict) -> List[float]:
        """
        Prepare feature vector for prediction
        
        Args:
            student_data: Student's marks and subject information
            
        Returns:
            Feature vector for model input
        """
        marks = student_data.get('marks', {})
        
        # Extract internal marks percentages
        series_1 = marks.get('series_test_1', 0)
        series_2 = marks.get('series_test_2', 0)
        lab_internal = marks.get('lab_internal', 0)
        
        # Calculate average (handle missing values)
        available_marks = [m for m in [series_1, series_2, lab_internal] if m > 0]
        avg_internal = np.mean(available_marks) if available_marks else 0
        
        # Fill missing values with average
        if series_1 == 0 and avg_internal > 0:
            series_1 = avg_internal
        if series_2 == 0 and avg_internal > 0:
            series_2 = avg_internal
        if lab_internal == 0 and avg_internal > 0:
            lab_internal = avg_internal
        
        # Recalculate average with filled values
        avg_internal = np.mean([series_1, series_2, lab_internal])
        
        features = [
            series_1,
            series_2,
            lab_internal,
            avg_internal,
            1 if student_data.get('subject_type') == 'lab' else 0,
            student_data.get('semester', 1)
        ]
        
        # Add attendance if it's in feature columns (for production models)
        if 'attendance_percentage' in self.feature_columns:
            attendance = student_data.get('attendance_percentage', 80.0)  # Default 80%
            features.append(attendance)
        
        return features
    
    def _calculate_confidence(self, student_data: Dict, features: List[float]) -> float:
        """
        Calculate confidence score for prediction
        
        Args:
            student_data: Original student data
            features: Prepared feature vector
            
        Returns:
            Confidence score between 0 and 1
        """
        marks = student_data.get('marks', {})
        
        # Base confidence
        confidence = 0.5
        
        # Increase confidence based on available internal marks
        available_internals = sum(1 for exam in ['series_test_1', 'series_test_2', 'lab_internal'] 
                                if marks.get(exam, 0) > 0)
        confidence += (available_internals / 3) * 0.3
        
        # Increase confidence if marks are consistent (low variance)
        internal_marks = [marks.get(exam, 0) for exam in ['series_test_1', 'series_test_2', 'lab_internal'] 
                         if marks.get(exam, 0) > 0]
        if len(internal_marks) >= 2:
            variance = np.var(internal_marks)
            # Lower variance = higher confidence
            consistency_bonus = max(0, (100 - variance) / 100) * 0.2
            confidence += consistency_bonus
        
        # Ensure confidence is between 0 and 1
        return max(0.0, min(1.0, confidence))
    
    def _load_production_models(self):
        """Load production models trained on large datasets"""
        try:
            # Try to load best production model first
            best_model_path = os.path.join(self.model_path, 'best_production_model.joblib')
            
            if os.path.exists(best_model_path):
                try:
                    model_package = joblib.load(best_model_path)
                    
                    # Validate model package
                    if isinstance(model_package, dict) and 'model' in model_package:
                        self.models['production_best'] = model_package['model']
                        self.model_version = model_package.get('model_version', '2.0.0')
                        
                        # Update feature columns if available
                        if 'feature_columns' in model_package:
                            self.feature_columns = model_package['feature_columns']
                        
                        logger.info(f"✅ Loaded production model: {model_package.get('model_name', 'best')}")
                        logger.info(f"   Version: {self.model_version}")
                        logger.info(f"   Features: {len(self.feature_columns)}")
                        logger.info(f"   MAE: {model_package.get('metrics', {}).get('mae', 'N/A')}")
                        return True
                    else:
                        # Legacy model format
                        self.models['production_best'] = model_package
                        logger.info("Loaded legacy production model")
                        return True
                        
                except Exception as e:
                    logger.warning(f"Failed to load best production model: {str(e)}")
            
            # Try to load any production model
            if os.path.exists(self.model_path):
                for filename in os.listdir(self.model_path):
                    if filename.startswith('production_') and filename.endswith('.joblib'):
                        try:
                            model_path = os.path.join(self.model_path, filename)
                            model_package = joblib.load(model_path)
                            
                            if isinstance(model_package, dict) and 'model' in model_package:
                                model_key = f"production_{model_package.get('model_name', 'unknown')}"
                                self.models[model_key] = model_package['model']
                                logger.info(f"Loaded production model: {model_key}")
                                return True
                                
                        except Exception as e:
                            logger.warning(f"Failed to load production model {filename}: {str(e)}")
            
            logger.info("No production models found, will use regular training")
            return False
            
        except Exception as e:
            logger.warning(f"Failed to load production models: {str(e)}")
            return False
    
    def _load_models(self):
        """Load existing models from disk"""
        try:
            if os.path.exists(self.model_path):
                for filename in os.listdir(self.model_path):
                    if filename.endswith('.joblib') and self.model_version in filename and not filename.startswith('production_'):
                        model_key = filename.replace(f'_model_{self.model_version}.joblib', '')
                        model_filepath = os.path.join(self.model_path, filename)
                        
                        try:
                            model = joblib.load(model_filepath)
                            self.models[model_key] = model
                            logger.info(f"Loaded model: {model_key}")
                        except Exception as e:
                            logger.warning(f"Failed to load model {filename}: {str(e)}")
        except Exception as e:
            logger.warning(f"Failed to load models: {str(e)}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about loaded models
        
        Returns:
            Dictionary with model information
        """
        return {
            'model_version': self.model_version,
            'loaded_models': list(self.models.keys()),
            'feature_columns': self.feature_columns,
            'model_path': self.model_path
        }
    
    def batch_predict(self, students_data: List[Dict], subject_id: Optional[int] = None) -> List[Dict]:
        """
        Make predictions for multiple students
        
        Args:
            students_data: List of student data dictionaries
            subject_id: Optional subject ID for subject-specific prediction
            
        Returns:
            List of prediction results
        """
        results = []
        
        for student_data in students_data:
            try:
                prediction = self.predict_university_marks(student_data, subject_id)
                prediction['student_id'] = student_data.get('student_id')
                prediction['subject_id'] = student_data.get('subject_id')
                results.append(prediction)
            except Exception as e:
                results.append({
                    'success': False,
                    'error': str(e),
                    'student_id': student_data.get('student_id'),
                    'subject_id': student_data.get('subject_id'),
                    'predicted_at': datetime.now().isoformat()
                })
        
        return results

    # Additional methods for comprehensive testing support
    
    def preprocess_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Preprocess data for ML pipeline
        
        Args:
            data: Raw data DataFrame
            
        Returns:
            Preprocessed DataFrame
        """
        processed_data = data.copy()
        
        # Handle missing values
        numeric_columns = ['series_test_1', 'series_test_2', 'lab_internal', 'attendance_percentage']
        for col in numeric_columns:
            if col in processed_data.columns:
                # Fill missing values with median
                processed_data[col] = processed_data[col].fillna(processed_data[col].median())
        
        # Remove any remaining NaN values
        processed_data = processed_data.dropna()
        
        return processed_data
    
    def engineer_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Engineer features for ML model
        
        Args:
            data: Input DataFrame
            
        Returns:
            DataFrame with engineered features
        """
        features = data.copy()
        
        # Calculate series average
        if 'series_test_1' in features.columns and 'series_test_2' in features.columns:
            features['series_average'] = (features['series_test_1'] + features['series_test_2']) / 2
        
        # Calculate total internal score
        internal_cols = ['series_test_1', 'series_test_2', 'lab_internal']
        available_cols = [col for col in internal_cols if col in features.columns]
        if available_cols:
            features['total_internal_score'] = features[available_cols].sum(axis=1)
        
        # Calculate performance trend (difference between series tests)
        if 'series_test_1' in features.columns and 'series_test_2' in features.columns:
            features['performance_trend'] = features['series_test_2'] - features['series_test_1']
        
        return features
    
    def train_model(self, X: pd.DataFrame, y: pd.Series) -> Tuple[Any, Dict]:
        """
        Train ML model with features and target
        
        Args:
            X: Feature DataFrame
            y: Target Series
            
        Returns:
            Tuple of (trained_model, metrics)
        """
        from sklearn.model_selection import train_test_split
        from sklearn.ensemble import RandomForestRegressor
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Calculate metrics
        y_pred = model.predict(X_test)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'r2_score': r2_score(y_test, y_pred),
            'accuracy_within_10_percent': self._calculate_accuracy_within_threshold(y_test, y_pred, 10)
        }
        
        return model, metrics
    
    def _calculate_accuracy_within_threshold(self, y_true, y_pred, threshold_percent):
        """Calculate percentage of predictions within threshold"""
        percentage_errors = np.abs((y_pred - y_true) / y_true) * 100
        return np.mean(percentage_errors <= threshold_percent)
    
    def train_subject_model(self, data: pd.DataFrame, subject_id: int) -> Any:
        """
        Train subject-specific model
        
        Args:
            data: Training data for specific subject
            subject_id: Subject identifier
            
        Returns:
            Trained model
        """
        # Preprocess and engineer features
        processed_data = self.preprocess_data(data)
        features = self.engineer_features(processed_data)
        
        # Prepare features and target
        feature_cols = [col for col in features.columns if col != 'university_marks']
        X = features[feature_cols]
        y = features['university_marks'] if 'university_marks' in features.columns else features.iloc[:, -1]
        
        # Train model
        model, _ = self.train_model(X, y)
        
        # Store model
        self.models[f'subject_{subject_id}'] = model
        
        return model
    
    def save_model(self, model: Any, path: str, metrics: Dict) -> None:
        """
        Save model to disk with metadata
        
        Args:
            model: Trained model
            path: File path to save model
            metrics: Model performance metrics
        """
        model_data = {
            'model': model,
            'metrics': metrics,
            'version': self.model_version,
            'saved_at': datetime.now().isoformat()
        }
        
        joblib.dump(model_data, path)
    
    def load_model(self, path: str) -> Tuple[Any, Dict]:
        """
        Load model from disk
        
        Args:
            path: File path to load model from
            
        Returns:
            Tuple of (model, metrics)
        """
        model_data = joblib.load(path)
        return model_data['model'], model_data['metrics']
    
    def cross_validate_model(self, X: pd.DataFrame, y: pd.Series, cv_folds: int = 5) -> Dict:
        """
        Perform cross-validation on model
        
        Args:
            X: Features
            y: Target
            cv_folds: Number of CV folds
            
        Returns:
            Cross-validation scores
        """
        from sklearn.model_selection import cross_val_score
        from sklearn.ensemble import RandomForestRegressor
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        
        # Calculate CV scores
        mse_scores = -cross_val_score(model, X, y, cv=cv_folds, scoring='neg_mean_squared_error')
        mae_scores = -cross_val_score(model, X, y, cv=cv_folds, scoring='neg_mean_absolute_error')
        r2_scores = cross_val_score(model, X, y, cv=cv_folds, scoring='r2')
        
        return {
            'cv_mse_scores': mse_scores.tolist(),
            'cv_mae_scores': mae_scores.tolist(),
            'cv_r2_scores': r2_scores.tolist(),
            'mean_cv_score': np.mean(r2_scores),
            'std_cv_score': np.std(r2_scores)
        }
    
    def get_feature_importance(self, model: Any, feature_names: List[str]) -> Dict[str, float]:
        """
        Get feature importance from trained model
        
        Args:
            model: Trained model
            feature_names: List of feature names
            
        Returns:
            Dictionary of feature importance scores
        """
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            # Normalize to sum to 1
            importances = importances / np.sum(importances)
            return dict(zip(feature_names, importances))
        else:
            return {name: 0.0 for name in feature_names}
    
    def detect_outliers(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Detect outliers in data using IQR method
        
        Args:
            data: Input DataFrame
            
        Returns:
            DataFrame containing outlier records
        """
        outliers = pd.DataFrame()
        
        numeric_columns = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            Q1 = data[col].quantile(0.25)
            Q3 = data[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            col_outliers = data[(data[col] < lower_bound) | (data[col] > upper_bound)]
            outliers = pd.concat([outliers, col_outliers]).drop_duplicates()
        
        return outliers
    
    def predict_with_confidence(self, model: Any, X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Make predictions with confidence scores
        
        Args:
            model: Trained model
            X: Features for prediction
            
        Returns:
            Tuple of (predictions, confidence_scores)
        """
        predictions = model.predict(X)
        
        # Calculate confidence based on prediction variance (for ensemble models)
        if hasattr(model, 'estimators_'):
            # For ensemble models, use prediction variance
            individual_predictions = np.array([tree.predict(X) for tree in model.estimators_])
            prediction_std = np.std(individual_predictions, axis=0)
            # Convert std to confidence (inverse relationship)
            max_std = np.max(prediction_std) if np.max(prediction_std) > 0 else 1
            confidence_scores = 1 - (prediction_std / max_std)
        else:
            # For non-ensemble models, use a default confidence
            confidence_scores = np.full(len(predictions), 0.8)
        
        return predictions, confidence_scores