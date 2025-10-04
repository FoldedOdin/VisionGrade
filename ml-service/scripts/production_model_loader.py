#!/usr/bin/env python3
"""
Production Model Loader for VisionGrade
Loads and validates production-trained ML models
"""

import sys
import os
import joblib
import json
import logging
from datetime import datetime
import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionModelLoader:
    """
    Loads and manages production ML models
    """
    
    def __init__(self, models_dir='./models'):
        self.models_dir = models_dir
        self.loaded_models = {}
        self.model_metadata = {}
    
    def list_available_models(self):
        """List all available production models"""
        if not os.path.exists(self.models_dir):
            logger.warning(f"Models directory {self.models_dir} does not exist")
            return []
        
        model_files = []
        for filename in os.listdir(self.models_dir):
            if filename.endswith('.joblib') and 'production' in filename:
                model_files.append(filename)
        
        return sorted(model_files)
    
    def load_model(self, model_filename):
        """Load a specific production model"""
        model_path = os.path.join(self.models_dir, model_filename)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        try:
            logger.info(f"Loading model: {model_filename}")
            model_package = joblib.load(model_path)
            
            # Validate model package structure
            required_keys = ['model', 'feature_columns', 'metrics', 'model_version']
            for key in required_keys:
                if key not in model_package:
                    raise ValueError(f"Invalid model package: missing '{key}'")
            
            # Store model and metadata
            model_key = model_filename.replace('.joblib', '')
            self.loaded_models[model_key] = model_package['model']
            self.model_metadata[model_key] = {
                'filename': model_filename,
                'feature_columns': model_package['feature_columns'],
                'metrics': model_package['metrics'],
                'model_version': model_package['model_version'],
                'model_name': model_package.get('model_name', 'unknown'),
                'is_best_model': model_package.get('is_best_model', False),
                'training_timestamp': model_package.get('training_timestamp', 'unknown'),
                'feature_importance': model_package.get('feature_importance', {}),
                'loaded_at': datetime.now().isoformat()
            }
            
            logger.info(f"✅ Model loaded successfully: {model_package.get('model_name', 'unknown')}")
            logger.info(f"   Version: {model_package['model_version']}")
            logger.info(f"   Features: {len(model_package['feature_columns'])}")
            logger.info(f"   MAE: {model_package['metrics'].get('mae', 'N/A')}")
            
            return model_key
            
        except Exception as e:
            logger.error(f"Failed to load model {model_filename}: {str(e)}")
            raise
    
    def load_best_model(self):
        """Load the best production model"""
        best_model_path = os.path.join(self.models_dir, 'best_production_model.joblib')
        
        if os.path.exists(best_model_path):
            return self.load_model('best_production_model.joblib')
        else:
            # Find best model from available models
            available_models = self.list_available_models()
            if not available_models:
                raise FileNotFoundError("No production models found")
            
            # Load all models and find the best one
            best_model_key = None
            best_mae = float('inf')
            
            for model_file in available_models:
                try:
                    model_key = self.load_model(model_file)
                    mae = self.model_metadata[model_key]['metrics'].get('mae', float('inf'))
                    
                    if mae < best_mae:
                        best_mae = mae
                        best_model_key = model_key
                        
                except Exception as e:
                    logger.warning(f"Failed to load model {model_file}: {str(e)}")
            
            if best_model_key:
                logger.info(f"🏆 Best model identified: {best_model_key} (MAE: {best_mae:.2f})")
                return best_model_key
            else:
                raise RuntimeError("No valid models could be loaded")
    
    def predict(self, model_key, input_data):
        """Make prediction using loaded model"""
        if model_key not in self.loaded_models:
            raise ValueError(f"Model not loaded: {model_key}")
        
        model = self.loaded_models[model_key]
        metadata = self.model_metadata[model_key]
        
        # Prepare input features
        feature_columns = metadata['feature_columns']
        
        if isinstance(input_data, dict):
            # Convert dict to DataFrame
            features = pd.DataFrame([input_data])
        elif isinstance(input_data, pd.DataFrame):
            features = input_data.copy()
        else:
            raise ValueError("Input data must be dict or DataFrame")
        
        # Validate features
        missing_features = set(feature_columns) - set(features.columns)
        if missing_features:
            raise ValueError(f"Missing required features: {missing_features}")
        
        # Select and order features
        X = features[feature_columns]
        
        # Make prediction
        prediction = model.predict(X)
        
        # Return prediction with metadata
        result = {
            'prediction': prediction.tolist() if len(prediction) > 1 else float(prediction[0]),
            'model_used': model_key,
            'model_version': metadata['model_version'],
            'feature_columns': feature_columns,
            'predicted_at': datetime.now().isoformat()
        }
        
        return result
    
    def get_model_info(self, model_key=None):
        """Get information about loaded models"""
        if model_key:
            if model_key not in self.model_metadata:
                raise ValueError(f"Model not loaded: {model_key}")
            return self.model_metadata[model_key]
        else:
            return {
                'loaded_models': list(self.loaded_models.keys()),
                'model_metadata': self.model_metadata,
                'models_directory': self.models_dir
            }
    
    def validate_model_performance(self, model_key, test_data=None):
        """Validate model performance"""
        if model_key not in self.loaded_models:
            raise ValueError(f"Model not loaded: {model_key}")
        
        metadata = self.model_metadata[model_key]
        
        validation_result = {
            'model_key': model_key,
            'model_name': metadata['model_name'],
            'model_version': metadata['model_version'],
            'training_metrics': metadata['metrics'],
            'validation_timestamp': datetime.now().isoformat()
        }
        
        if test_data is not None:
            # Perform validation on test data
            try:
                # Prepare test features and target
                feature_columns = metadata['feature_columns']
                X_test = test_data[feature_columns]
                y_test = test_data['university_percentage']
                
                # Make predictions
                model = self.loaded_models[model_key]
                y_pred = model.predict(X_test)
                
                # Calculate validation metrics
                from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
                
                mae = mean_absolute_error(y_test, y_pred)
                mse = mean_squared_error(y_test, y_pred)
                rmse = np.sqrt(mse)
                r2 = r2_score(y_test, y_pred)
                
                # Calculate accuracy within 10%
                percentage_errors = np.abs((y_pred - y_test) / y_test) * 100
                accuracy_10_percent = np.mean(percentage_errors <= 10)
                
                validation_metrics = {
                    'mae': mae,
                    'mse': mse,
                    'rmse': rmse,
                    'r2_score': r2,
                    'accuracy_within_10_percent': accuracy_10_percent,
                    'test_samples': len(y_test)
                }
                
                validation_result['validation_metrics'] = validation_metrics
                validation_result['validation_performed'] = True
                
                logger.info(f"✅ Model validation completed for {model_key}")
                logger.info(f"   Validation MAE: {mae:.2f}")
                logger.info(f"   Validation R²: {r2:.3f}")
                logger.info(f"   Validation Accuracy (±10%): {accuracy_10_percent:.1%}")
                
            except Exception as e:
                validation_result['validation_error'] = str(e)
                validation_result['validation_performed'] = False
                logger.error(f"Model validation failed: {str(e)}")
        else:
            validation_result['validation_performed'] = False
            validation_result['note'] = 'No test data provided for validation'
        
        return validation_result
    
    def export_model_summary(self, output_file='model_summary.json'):
        """Export summary of all loaded models"""
        summary = {
            'export_timestamp': datetime.now().isoformat(),
            'models_directory': self.models_dir,
            'loaded_models_count': len(self.loaded_models),
            'models': {}
        }
        
        for model_key, metadata in self.model_metadata.items():
            summary['models'][model_key] = {
                'model_name': metadata['model_name'],
                'model_version': metadata['model_version'],
                'training_timestamp': metadata['training_timestamp'],
                'is_best_model': metadata['is_best_model'],
                'metrics': metadata['metrics'],
                'feature_count': len(metadata['feature_columns']),
                'loaded_at': metadata['loaded_at']
            }
        
        with open(output_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"📄 Model summary exported to {output_file}")
        return summary

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Production Model Loader and Validator')
    parser.add_argument('--models-dir', default='./models',
                       help='Directory containing production models')
    parser.add_argument('--load-best', action='store_true',
                       help='Load the best available model')
    parser.add_argument('--load-all', action='store_true',
                       help='Load all available models')
    parser.add_argument('--model-file',
                       help='Load specific model file')
    parser.add_argument('--validate', action='store_true',
                       help='Validate loaded models')
    parser.add_argument('--export-summary',
                       help='Export model summary to JSON file')
    parser.add_argument('--test-prediction', action='store_true',
                       help='Test prediction with sample data')
    
    args = parser.parse_args()
    
    try:
        # Initialize loader
        loader = ProductionModelLoader(models_dir=args.models_dir)
        
        # List available models
        available_models = loader.list_available_models()
        logger.info(f"📁 Found {len(available_models)} production models")
        
        if not available_models:
            logger.error("❌ No production models found!")
            return 1
        
        for model_file in available_models:
            logger.info(f"   📄 {model_file}")
        
        # Load models based on arguments
        loaded_models = []
        
        if args.load_best:
            model_key = loader.load_best_model()
            loaded_models.append(model_key)
        elif args.load_all:
            for model_file in available_models:
                try:
                    model_key = loader.load_model(model_file)
                    loaded_models.append(model_key)
                except Exception as e:
                    logger.error(f"Failed to load {model_file}: {str(e)}")
        elif args.model_file:
            model_key = loader.load_model(args.model_file)
            loaded_models.append(model_key)
        else:
            # Default: load best model
            model_key = loader.load_best_model()
            loaded_models.append(model_key)
        
        logger.info(f"✅ Loaded {len(loaded_models)} models successfully")
        
        # Test prediction if requested
        if args.test_prediction and loaded_models:
            logger.info("🧪 Testing prediction with sample data...")
            
            sample_data = {
                'series_test_1_percentage': 75.0,
                'series_test_2_percentage': 78.0,
                'lab_internal_percentage': 82.0,
                'average_internal_percentage': 78.3,
                'subject_type_encoded': 0,  # Theory subject
                'semester': 5,
                'attendance_percentage': 85.5
            }
            
            for model_key in loaded_models:
                try:
                    result = loader.predict(model_key, sample_data)
                    logger.info(f"🎯 {model_key} prediction: {result['prediction']:.1f}%")
                except Exception as e:
                    logger.error(f"Prediction failed for {model_key}: {str(e)}")
        
        # Validate models if requested
        if args.validate:
            logger.info("🔍 Validating loaded models...")
            for model_key in loaded_models:
                validation_result = loader.validate_model_performance(model_key)
                logger.info(f"📊 Validation completed for {model_key}")
        
        # Export summary if requested
        if args.export_summary:
            summary = loader.export_model_summary(args.export_summary)
            logger.info(f"📄 Summary exported to {args.export_summary}")
        
        # Print final summary
        print(f"\n📊 PRODUCTION MODEL LOADER SUMMARY")
        print(f"=" * 40)
        print(f"Models Directory: {args.models_dir}")
        print(f"Available Models: {len(available_models)}")
        print(f"Loaded Models: {len(loaded_models)}")
        
        for model_key in loaded_models:
            metadata = loader.get_model_info(model_key)
            status = "🏆" if metadata.get('is_best_model') else "✅"
            print(f"{status} {model_key}")
            print(f"   Model: {metadata['model_name']}")
            print(f"   Version: {metadata['model_version']}")
            print(f"   MAE: {metadata['metrics'].get('mae', 'N/A')}")
            print(f"   Accuracy: {metadata['metrics'].get('accuracy_within_10_percent', 'N/A'):.1%}")
        
        print(f"\n✅ Production models are ready for use!")
        
    except Exception as e:
        logger.error(f"❌ Model loading failed: {str(e)}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())