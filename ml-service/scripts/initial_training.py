#!/usr/bin/env python3
"""
Initial ML Model Training Script for VisionGrade
This script trains initial ML models using sample or existing data
"""

import sys
import os
import json
import logging
from datetime import datetime
import requests

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database_service import DatabaseService
from services.prediction_service import PredictionService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class InitialTrainer:
    def __init__(self, database_url=None, ml_service_url=None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.ml_service_url = ml_service_url or os.getenv('ML_SERVICE_URL', 'http://localhost:8000')
        
        if self.database_url:
            self.db_service = DatabaseService(self.database_url)
        else:
            self.db_service = None
            logger.warning("No database URL provided, will use ML service API only")
    
    def check_training_data_availability(self):
        """Check if sufficient training data exists"""
        if not self.db_service:
            logger.error("Database service not available")
            return False
        
        try:
            # Get all subjects
            subjects = self.db_service.get_all_subjects()
            
            training_summary = []
            for subject in subjects:
                # Check training data for each subject
                training_data = self.db_service.get_training_data(subject['id'])
                
                summary = {
                    'subject_id': subject['id'],
                    'subject_name': subject['subject_name'],
                    'subject_code': subject['subject_code'],
                    'training_records': len(training_data),
                    'can_train': len(training_data) >= 10
                }
                training_summary.append(summary)
                
                logger.info(f"Subject {subject['subject_code']}: {len(training_data)} training records")
            
            return training_summary
            
        except Exception as e:
            logger.error(f"Failed to check training data: {str(e)}")
            return False
    
    def generate_sample_data(self, num_students=50):
        """Generate sample training data for demonstration"""
        import random
        import numpy as np
        
        logger.info(f"Generating {num_students} sample training records...")
        
        sample_data = []
        
        for i in range(num_students):
            # Generate realistic internal marks (correlated with final performance)
            base_performance = random.uniform(40, 95)  # Base performance level
            noise_factor = random.uniform(0.8, 1.2)   # Individual variation
            
            # Series tests (slightly correlated)
            series_1 = max(0, min(50, base_performance * 0.5 + random.gauss(0, 5)))
            series_2 = max(0, min(50, base_performance * 0.5 + random.gauss(0, 5)))
            
            # Lab internal (usually higher)
            lab_internal = max(0, min(50, base_performance * 0.6 + random.gauss(0, 3)))
            
            # University marks (target) - correlated with internals but with variation
            internal_avg = (series_1 + series_2 + lab_internal) / 3
            university_marks = max(0, min(100, internal_avg * 1.8 + random.gauss(0, 8)))
            
            record = {
                'student_id': i + 1,
                'subject_id': 1,  # Default subject
                'exam_type': 'university',
                'marks_obtained': university_marks,
                'max_marks': 100,
                'subject_type': 'theory',
                'semester': 5,
                'marks': {
                    'series_test_1': series_1,
                    'series_test_2': series_2,
                    'lab_internal': lab_internal,
                    'university': university_marks
                }
            }
            sample_data.append(record)
        
        logger.info("Sample data generated successfully")
        return sample_data
    
    def train_model_via_api(self, subject_id=None, academic_year=None):
        """Train model using ML service API"""
        try:
            url = f"{self.ml_service_url}/train"
            payload = {}
            
            if subject_id:
                payload['subject_id'] = subject_id
            if academic_year:
                payload['academic_year'] = academic_year
            
            logger.info(f"Training model via API: {url}")
            response = requests.post(url, json=payload, timeout=300)  # 5 minute timeout
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    logger.info("✅ Model training successful!")
                    logger.info(f"Best model: {result.get('best_model')}")
                    logger.info(f"Training samples: {result.get('training_samples')}")
                    logger.info(f"Model performance: {result.get('model_performance')}")
                    return result
                else:
                    logger.error(f"❌ Training failed: {result.get('error')}")
                    return None
            else:
                logger.error(f"❌ API request failed: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to connect to ML service: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Training failed: {str(e)}")
            return None
    
    def train_model_direct(self, training_data, subject_id=None):
        """Train model directly using prediction service"""
        try:
            prediction_service = PredictionService()
            
            logger.info(f"Training model directly with {len(training_data)} records...")
            result = prediction_service.train_model(training_data, subject_id)
            
            if result.get('success'):
                logger.info("✅ Direct model training successful!")
                logger.info(f"Best model: {result.get('best_model')}")
                logger.info(f"Training samples: {result.get('training_samples')}")
                logger.info(f"Model performance: {result.get('model_performance')}")
                return result
            else:
                logger.error(f"❌ Direct training failed: {result.get('error')}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Direct training failed: {str(e)}")
            return None
    
    def run_initial_training(self, use_sample_data=False, subject_id=None):
        """Run the initial training process"""
        logger.info("🚀 Starting initial ML model training...")
        
        if use_sample_data:
            logger.info("📊 Using sample data for training...")
            sample_data = self.generate_sample_data()
            result = self.train_model_direct(sample_data, subject_id)
        else:
            logger.info("📊 Using database data for training...")
            
            # Check data availability first
            training_summary = self.check_training_data_availability()
            if not training_summary:
                logger.error("❌ Cannot check training data availability")
                return False
            
            # Find subjects with sufficient data
            trainable_subjects = [s for s in training_summary if s['can_train']]
            
            if not trainable_subjects:
                logger.warning("⚠️  No subjects have sufficient training data (minimum 10 records)")
                logger.info("💡 Consider using sample data: python initial_training.py --sample")
                return False
            
            # Train models for each subject with sufficient data
            results = []
            for subject in trainable_subjects:
                logger.info(f"Training model for {subject['subject_name']}...")
                result = self.train_model_via_api(subject['subject_id'])
                if result:
                    results.append(result)
            
            if results:
                logger.info(f"✅ Successfully trained {len(results)} models")
                return True
            else:
                logger.error("❌ No models were successfully trained")
                return False
        
        return result is not None

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Initial ML Model Training for VisionGrade')
    parser.add_argument('--sample', action='store_true', 
                       help='Use sample data for training (for demo/testing)')
    parser.add_argument('--subject-id', type=int, 
                       help='Train model for specific subject ID')
    parser.add_argument('--database-url', 
                       help='Database URL (overrides environment variable)')
    parser.add_argument('--ml-service-url', default='http://localhost:8000',
                       help='ML Service URL (default: http://localhost:8000)')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = InitialTrainer(
        database_url=args.database_url,
        ml_service_url=args.ml_service_url
    )
    
    # Run training
    success = trainer.run_initial_training(
        use_sample_data=args.sample,
        subject_id=args.subject_id
    )
    
    if success:
        logger.info("🎉 Initial training completed successfully!")
        print("\n✅ ML models are now ready for predictions!")
        print("💡 You can now use the prediction endpoints in the ML service.")
    else:
        logger.error("❌ Initial training failed!")
        print("\n❌ Training failed. Check the logs above for details.")
        print("💡 Try using sample data: python initial_training.py --sample")
        sys.exit(1)

if __name__ == '__main__':
    main()