#!/usr/bin/env python3
"""
Batch Training Script for All Subjects
Trains ML models for all subjects with sufficient data
"""

import sys
import os
import logging
import requests
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database_service import DatabaseService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BatchTrainer:
    def __init__(self, database_url=None, ml_service_url=None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.ml_service_url = ml_service_url or os.getenv('ML_SERVICE_URL', 'http://localhost:8000')
        
        if self.database_url:
            self.db_service = DatabaseService(self.database_url)
        else:
            raise ValueError("Database URL is required")
    
    def get_trainable_subjects(self, min_records=10):
        """Get all subjects that have sufficient training data"""
        try:
            subjects = self.db_service.get_all_subjects()
            trainable_subjects = []
            
            for subject in subjects:
                training_data = self.db_service.get_training_data(subject['id'])
                
                if len(training_data) >= min_records:
                    trainable_subjects.append({
                        'id': subject['id'],
                        'name': subject['subject_name'],
                        'code': subject['subject_code'],
                        'training_records': len(training_data)
                    })
                    logger.info(f"✅ {subject['subject_code']}: {len(training_data)} records (trainable)")
                else:
                    logger.warning(f"⚠️  {subject['subject_code']}: {len(training_data)} records (insufficient)")
            
            return trainable_subjects
            
        except Exception as e:
            logger.error(f"Failed to get trainable subjects: {str(e)}")
            return []
    
    def train_subject_model(self, subject_id, academic_year=None):
        """Train model for a specific subject"""
        try:
            url = f"{self.ml_service_url}/train"
            payload = {'subject_id': subject_id}
            
            if academic_year:
                payload['academic_year'] = academic_year
            
            logger.info(f"Training model for subject {subject_id}...")
            response = requests.post(url, json=payload, timeout=300)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return result
                else:
                    logger.error(f"Training failed for subject {subject_id}: {result.get('error')}")
                    return None
            else:
                logger.error(f"API request failed for subject {subject_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to train subject {subject_id}: {str(e)}")
            return None
    
    def train_all_subjects(self, academic_year=None, min_records=10):
        """Train models for all subjects with sufficient data"""
        logger.info("🚀 Starting batch training for all subjects...")
        
        # Get trainable subjects
        trainable_subjects = self.get_trainable_subjects(min_records)
        
        if not trainable_subjects:
            logger.error("❌ No subjects have sufficient training data")
            return []
        
        logger.info(f"📊 Found {len(trainable_subjects)} trainable subjects")
        
        # Train models for each subject
        results = []
        successful_trainings = 0
        
        for subject in trainable_subjects:
            logger.info(f"\n🎯 Training: {subject['name']} ({subject['code']})")
            logger.info(f"📈 Training records: {subject['training_records']}")
            
            result = self.train_subject_model(subject['id'], academic_year)
            
            if result:
                successful_trainings += 1
                logger.info(f"✅ Success! Best model: {result.get('best_model')}")
                logger.info(f"📊 Performance: MAE={result.get('model_performance', {}).get('mae', 'N/A'):.2f}")
                
                results.append({
                    'subject_id': subject['id'],
                    'subject_name': subject['name'],
                    'subject_code': subject['code'],
                    'success': True,
                    'result': result
                })
            else:
                logger.error(f"❌ Failed to train model for {subject['name']}")
                results.append({
                    'subject_id': subject['id'],
                    'subject_name': subject['name'],
                    'subject_code': subject['code'],
                    'success': False,
                    'error': 'Training failed'
                })
        
        # Summary
        logger.info(f"\n🎉 Batch training completed!")
        logger.info(f"✅ Successful: {successful_trainings}/{len(trainable_subjects)} subjects")
        
        if successful_trainings < len(trainable_subjects):
            logger.warning(f"⚠️  Failed: {len(trainable_subjects) - successful_trainings} subjects")
        
        return results
    
    def generate_training_report(self, results):
        """Generate a detailed training report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_subjects': len(results),
            'successful_trainings': len([r for r in results if r['success']]),
            'failed_trainings': len([r for r in results if not r['success']]),
            'subjects': []
        }
        
        for result in results:
            subject_info = {
                'subject_id': result['subject_id'],
                'subject_name': result['subject_name'],
                'subject_code': result['subject_code'],
                'success': result['success']
            }
            
            if result['success']:
                training_result = result['result']
                subject_info.update({
                    'best_model': training_result.get('best_model'),
                    'training_samples': training_result.get('training_samples'),
                    'test_samples': training_result.get('test_samples'),
                    'model_performance': training_result.get('model_performance'),
                    'model_version': training_result.get('model_version')
                })
            else:
                subject_info['error'] = result.get('error')
            
            report['subjects'].append(subject_info)
        
        return report

def main():
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description='Batch ML Model Training for All Subjects')
    parser.add_argument('--academic-year', type=int, 
                       help='Academic year for training data')
    parser.add_argument('--min-records', type=int, default=10,
                       help='Minimum training records required per subject (default: 10)')
    parser.add_argument('--database-url', 
                       help='Database URL (overrides environment variable)')
    parser.add_argument('--ml-service-url', default='http://localhost:8000',
                       help='ML Service URL (default: http://localhost:8000)')
    parser.add_argument('--report-file', 
                       help='Save detailed report to JSON file')
    
    args = parser.parse_args()
    
    try:
        # Initialize trainer
        trainer = BatchTrainer(
            database_url=args.database_url,
            ml_service_url=args.ml_service_url
        )
        
        # Run batch training
        results = trainer.train_all_subjects(
            academic_year=args.academic_year,
            min_records=args.min_records
        )
        
        if not results:
            logger.error("❌ No training results obtained")
            sys.exit(1)
        
        # Generate report
        report = trainer.generate_training_report(results)
        
        # Save report if requested
        if args.report_file:
            with open(args.report_file, 'w') as f:
                json.dump(report, f, indent=2)
            logger.info(f"📄 Report saved to: {args.report_file}")
        
        # Print summary
        print(f"\n📊 TRAINING SUMMARY")
        print(f"==================")
        print(f"Total Subjects: {report['total_subjects']}")
        print(f"Successful: {report['successful_trainings']}")
        print(f"Failed: {report['failed_trainings']}")
        print(f"Success Rate: {(report['successful_trainings']/report['total_subjects']*100):.1f}%")
        
        if report['successful_trainings'] > 0:
            print(f"\n✅ ML models are now ready for predictions!")
        else:
            print(f"\n❌ No models were successfully trained!")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Batch training failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()