#!/usr/bin/env python3
"""
Large-Scale Synthetic Data Generator for VisionGrade ML Training
Generates 70-80 million realistic academic records for robust model training
"""

import sys
import os
import numpy as np
import pandas as pd
import logging
from datetime import datetime
import json
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing as mp
from tqdm import tqdm
import gc
import psutil

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.prediction_service import PredictionService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LargeSyntheticDataGenerator:
    """
    Generates large-scale synthetic academic data for ML training
    """
    
    def __init__(self, output_dir='./synthetic_data', models_dir='./models'):
        self.output_dir = output_dir
        self.models_dir = models_dir
        self.chunk_size = 1000000  # 1M records per chunk
        
        # Create directories
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(models_dir, exist_ok=True)
        
        # Academic parameters for realistic data generation
        self.subjects = [
            {'id': 1, 'name': 'Computer Networks', 'type': 'theory', 'semester': 5, 'difficulty': 0.7},
            {'id': 2, 'name': 'Database Systems', 'type': 'theory', 'semester': 4, 'difficulty': 0.6},
            {'id': 3, 'name': 'Software Engineering', 'type': 'theory', 'semester': 6, 'difficulty': 0.65},
            {'id': 4, 'name': 'Data Structures Lab', 'type': 'lab', 'semester': 3, 'difficulty': 0.5},
            {'id': 5, 'name': 'Machine Learning', 'type': 'theory', 'semester': 7, 'difficulty': 0.8},
            {'id': 6, 'name': 'Web Development Lab', 'type': 'lab', 'semester': 5, 'difficulty': 0.55},
            {'id': 7, 'name': 'Operating Systems', 'type': 'theory', 'semester': 5, 'difficulty': 0.75},
            {'id': 8, 'name': 'Computer Graphics', 'type': 'theory', 'semester': 6, 'difficulty': 0.7},
            {'id': 9, 'name': 'Artificial Intelligence', 'type': 'theory', 'semester': 8, 'difficulty': 0.85},
            {'id': 10, 'name': 'Mobile App Development', 'type': 'lab', 'semester': 7, 'difficulty': 0.6}
        ]
        
        # Student performance profiles
        self.performance_profiles = {
            'excellent': {'base_score': 85, 'variance': 8, 'consistency': 0.9, 'probability': 0.15},
            'good': {'base_score': 75, 'variance': 10, 'consistency': 0.8, 'probability': 0.25},
            'average': {'base_score': 65, 'variance': 12, 'consistency': 0.7, 'probability': 0.35},
            'below_average': {'base_score': 55, 'variance': 15, 'consistency': 0.6, 'probability': 0.20},
            'poor': {'base_score': 45, 'variance': 18, 'consistency': 0.5, 'probability': 0.05}
        }
    
    def get_memory_usage(self):
        """Get current memory usage"""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024  # MB
    
    def generate_student_profile(self):
        """Generate a realistic student performance profile"""
        # Select performance level based on probability distribution
        rand = np.random.random()
        cumulative_prob = 0
        
        for profile_name, profile_data in self.performance_profiles.items():
            cumulative_prob += profile_data['probability']
            if rand <= cumulative_prob:
                return profile_name, profile_data
        
        # Fallback to average
        return 'average', self.performance_profiles['average']
    
    def generate_realistic_marks(self, subject, student_profile, attendance_rate):
        """
        Generate realistic marks based on subject difficulty, student profile, and attendance
        """
        profile_name, profile_data = student_profile
        base_score = profile_data['base_score']
        variance = profile_data['variance']
        consistency = profile_data['consistency']
        
        # Adjust base score based on subject difficulty
        difficulty_factor = subject['difficulty']
        adjusted_base = base_score * (1 - (difficulty_factor - 0.5) * 0.3)
        
        # Attendance impact (attendance below 75% significantly affects performance)
        if attendance_rate < 75:
            attendance_penalty = (75 - attendance_rate) * 0.5
            adjusted_base -= attendance_penalty
        elif attendance_rate > 90:
            attendance_bonus = (attendance_rate - 90) * 0.2
            adjusted_base += attendance_bonus
        
        # Generate correlated internal marks
        series_1_base = adjusted_base * 0.5  # Series tests are out of 50
        series_2_base = adjusted_base * 0.5
        lab_internal_base = adjusted_base * 0.5
        
        # Add realistic variance and correlation
        correlation_factor = np.random.normal(0, variance * (1 - consistency))
        
        series_1 = max(0, min(50, series_1_base + np.random.normal(0, variance * 0.3) + correlation_factor))
        series_2 = max(0, min(50, series_2_base + np.random.normal(0, variance * 0.3) + correlation_factor * 0.8))
        lab_internal = max(0, min(50, lab_internal_base + np.random.normal(0, variance * 0.25) + correlation_factor * 0.6))
        
        # Generate university marks (out of 100) with stronger correlation to internals
        internal_avg = (series_1 + series_2 + lab_internal) / 3
        university_base = internal_avg * 1.8  # Scale to 100
        
        # Add some randomness but maintain correlation
        university_variance = variance * 0.4
        university_marks = max(0, min(100, university_base + np.random.normal(0, university_variance)))
        
        # Subject type adjustment (lab subjects tend to have slightly higher marks)
        if subject['type'] == 'lab':
            series_1 = min(50, series_1 + np.random.normal(2, 1))
            series_2 = min(50, series_2 + np.random.normal(2, 1))
            lab_internal = min(50, lab_internal + np.random.normal(3, 1))
            university_marks = min(100, university_marks + np.random.normal(3, 2))
        
        return {
            'series_test_1': round(series_1, 1),
            'series_test_2': round(series_2, 1),
            'lab_internal': round(lab_internal, 1),
            'university': round(university_marks, 1),
            'attendance_percentage': round(attendance_rate, 1)
        }
    
    def generate_chunk(self, chunk_id, records_per_chunk):
        """Generate a chunk of synthetic data"""
        logger.info(f"Generating chunk {chunk_id} with {records_per_chunk:,} records...")
        
        chunk_data = []
        
        for i in range(records_per_chunk):
            # Generate student ID (unique across chunks)
            student_id = chunk_id * records_per_chunk + i + 1
            
            # Select random subject
            subject = np.random.choice(self.subjects)
            
            # Generate student profile
            student_profile = self.generate_student_profile()
            
            # Generate realistic attendance (most students have 70-95% attendance)
            attendance_rate = max(0, min(100, np.random.normal(82, 12)))
            
            # Generate marks
            marks = self.generate_realistic_marks(subject, student_profile, attendance_rate)
            
            # Create record
            record = {
                'student_id': student_id,
                'subject_id': subject['id'],
                'subject_name': subject['name'],
                'subject_type': subject['type'],
                'semester': subject['semester'],
                'series_test_1_percentage': marks['series_test_1'] * 2,  # Convert to percentage
                'series_test_2_percentage': marks['series_test_2'] * 2,
                'lab_internal_percentage': marks['lab_internal'] * 2,
                'university_percentage': marks['university'],
                'attendance_percentage': marks['attendance_percentage'],
                'average_internal_percentage': (marks['series_test_1'] + marks['series_test_2'] + marks['lab_internal']) / 3 * 2,
                'subject_type_encoded': 1 if subject['type'] == 'lab' else 0,
                'performance_profile': student_profile[0]
            }
            
            chunk_data.append(record)
        
        # Convert to DataFrame
        df = pd.DataFrame(chunk_data)
        
        # Save chunk to disk
        chunk_filename = os.path.join(self.output_dir, f'synthetic_chunk_{chunk_id:04d}.parquet')
        df.to_parquet(chunk_filename, compression='snappy')
        
        logger.info(f"Chunk {chunk_id} saved to {chunk_filename}")
        return chunk_filename, len(df)
    
    def generate_large_dataset(self, total_records=75_000_000, num_processes=None):
        """
        Generate large synthetic dataset using multiprocessing
        """
        if num_processes is None:
            num_processes = min(mp.cpu_count(), 8)  # Limit to 8 processes max
        
        logger.info(f"🚀 Generating {total_records:,} synthetic records using {num_processes} processes...")
        logger.info(f"💾 Memory usage: {self.get_memory_usage():.1f} MB")
        
        # Calculate chunks
        num_chunks = (total_records + self.chunk_size - 1) // self.chunk_size
        records_per_chunk = total_records // num_chunks
        
        logger.info(f"📊 Creating {num_chunks} chunks of ~{records_per_chunk:,} records each")
        
        # Generate chunks in parallel
        chunk_files = []
        total_generated = 0
        
        with ProcessPoolExecutor(max_workers=num_processes) as executor:
            # Submit all chunk generation tasks
            futures = []
            for chunk_id in range(num_chunks):
                # Last chunk might have different size
                chunk_records = records_per_chunk if chunk_id < num_chunks - 1 else total_records - (chunk_id * records_per_chunk)
                future = executor.submit(self.generate_chunk, chunk_id, chunk_records)
                futures.append(future)
            
            # Collect results with progress bar
            with tqdm(total=num_chunks, desc="Generating chunks") as pbar:
                for future in futures:
                    chunk_file, chunk_size = future.result()
                    chunk_files.append(chunk_file)
                    total_generated += chunk_size
                    pbar.update(1)
                    pbar.set_postfix({'Generated': f'{total_generated:,}'})
        
        logger.info(f"✅ Generated {total_generated:,} synthetic records in {len(chunk_files)} chunks")
        logger.info(f"💾 Final memory usage: {self.get_memory_usage():.1f} MB")
        
        return chunk_files, total_generated
    
    def load_and_combine_chunks(self, chunk_files, sample_size=None):
        """
        Load and combine chunk files for training
        """
        logger.info(f"📖 Loading {len(chunk_files)} chunk files...")
        
        if sample_size:
            logger.info(f"🎯 Sampling {sample_size:,} records for training")
        
        combined_data = []
        total_loaded = 0
        
        for chunk_file in tqdm(chunk_files, desc="Loading chunks"):
            try:
                df = pd.read_parquet(chunk_file)
                
                if sample_size:
                    # Sample from this chunk proportionally
                    chunk_sample_size = min(len(df), sample_size // len(chunk_files))
                    if chunk_sample_size > 0:
                        df = df.sample(n=chunk_sample_size, random_state=42)
                
                combined_data.append(df)
                total_loaded += len(df)
                
                # Memory management
                if total_loaded % 5000000 == 0:  # Every 5M records
                    logger.info(f"💾 Loaded {total_loaded:,} records, Memory: {self.get_memory_usage():.1f} MB")
                    gc.collect()
                
            except Exception as e:
                logger.error(f"Failed to load chunk {chunk_file}: {str(e)}")
        
        # Combine all chunks
        logger.info("🔄 Combining all chunks...")
        combined_df = pd.concat(combined_data, ignore_index=True)
        
        # Clean up memory
        del combined_data
        gc.collect()
        
        logger.info(f"✅ Combined dataset: {len(combined_df):,} records")
        logger.info(f"💾 Memory usage: {self.get_memory_usage():.1f} MB")
        
        return combined_df
    
    def train_production_models(self, training_data, test_size=0.1):
        """
        Train production-ready ML models with the large dataset
        """
        logger.info(f"🤖 Training production models with {len(training_data):,} records...")
        
        # Prepare features and target
        feature_columns = [
            'series_test_1_percentage',
            'series_test_2_percentage', 
            'lab_internal_percentage',
            'average_internal_percentage',
            'subject_type_encoded',
            'semester',
            'attendance_percentage'
        ]
        
        X = training_data[feature_columns]
        y = training_data['university_percentage']
        
        logger.info(f"📊 Features: {len(feature_columns)}, Target: university_percentage")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=None
        )
        
        logger.info(f"📈 Training set: {len(X_train):,}, Test set: {len(X_test):,}")
        
        # Train multiple models
        models = {
            'random_forest': RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=10,
                min_samples_leaf=5,
                max_features='sqrt',
                random_state=42,
                n_jobs=-1,
                verbose=1
            ),
            'xgboost': xgb.XGBRegressor(
                n_estimators=200,
                max_depth=8,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1,
                verbosity=1
            )
        }
        
        trained_models = {}
        model_metrics = {}
        
        for model_name, model in models.items():
            logger.info(f"🔧 Training {model_name}...")
            start_time = datetime.now()
            
            # Train model
            model.fit(X_train, y_train)
            
            # Make predictions
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test, y_pred)
            
            # Calculate accuracy within 10% threshold
            percentage_errors = np.abs((y_pred - y_test) / y_test) * 100
            accuracy_10_percent = np.mean(percentage_errors <= 10)
            
            training_time = (datetime.now() - start_time).total_seconds()
            
            metrics = {
                'mae': mae,
                'mse': mse,
                'rmse': rmse,
                'r2_score': r2,
                'accuracy_within_10_percent': accuracy_10_percent,
                'training_time_seconds': training_time,
                'training_samples': len(X_train),
                'test_samples': len(X_test)
            }
            
            trained_models[model_name] = model
            model_metrics[model_name] = metrics
            
            logger.info(f"✅ {model_name} completed in {training_time:.1f}s")
            logger.info(f"   MAE: {mae:.2f}, RMSE: {rmse:.2f}, R²: {r2:.3f}")
            logger.info(f"   Accuracy (±10%): {accuracy_10_percent:.1%}")
        
        # Select best model
        best_model_name = min(model_metrics.keys(), key=lambda k: model_metrics[k]['mae'])
        best_model = trained_models[best_model_name]
        
        logger.info(f"🏆 Best model: {best_model_name} (MAE: {model_metrics[best_model_name]['mae']:.2f})")
        
        return trained_models, model_metrics, best_model_name
    
    def export_models(self, trained_models, model_metrics, best_model_name, feature_columns):
        """
        Export trained models to files
        """
        logger.info("💾 Exporting trained models...")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for model_name, model in trained_models.items():
            # Model filename
            model_filename = f"production_{model_name}_{timestamp}.joblib"
            model_path = os.path.join(self.models_dir, model_filename)
            
            # Create model package
            model_package = {
                'model': model,
                'model_name': model_name,
                'feature_columns': feature_columns,
                'metrics': model_metrics[model_name],
                'is_best_model': model_name == best_model_name,
                'training_timestamp': timestamp,
                'model_version': '2.0.0',
                'training_data_size': model_metrics[model_name]['training_samples'],
                'feature_importance': self.get_feature_importance(model, feature_columns)
            }
            
            # Save model
            joblib.dump(model_package, model_path)
            logger.info(f"✅ Exported {model_name} to {model_path}")
            
            # Create metadata file
            metadata_filename = f"production_{model_name}_{timestamp}_metadata.json"
            metadata_path = os.path.join(self.models_dir, metadata_filename)
            
            metadata = {
                'model_name': model_name,
                'model_file': model_filename,
                'feature_columns': feature_columns,
                'metrics': model_metrics[model_name],
                'is_best_model': model_name == best_model_name,
                'training_timestamp': timestamp,
                'model_version': '2.0.0',
                'feature_importance': model_package['feature_importance']
            }
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"📄 Exported metadata to {metadata_path}")
        
        # Create best model symlink/copy
        best_model_file = f"production_{best_model_name}_{timestamp}.joblib"
        best_model_link = os.path.join(self.models_dir, "best_production_model.joblib")
        
        try:
            if os.path.exists(best_model_link):
                os.remove(best_model_link)
            
            # Copy best model as default
            import shutil
            shutil.copy2(os.path.join(self.models_dir, best_model_file), best_model_link)
            logger.info(f"🏆 Best model copied to {best_model_link}")
        except Exception as e:
            logger.warning(f"Failed to create best model link: {str(e)}")
        
        return {
            'models_exported': len(trained_models),
            'best_model': best_model_name,
            'export_timestamp': timestamp,
            'models_directory': self.models_dir
        }
    
    def get_feature_importance(self, model, feature_columns):
        """Get feature importance from model"""
        try:
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                return dict(zip(feature_columns, importances.tolist()))
            else:
                return {}
        except:
            return {}
    
    def cleanup_chunks(self, chunk_files):
        """Clean up temporary chunk files"""
        logger.info("🧹 Cleaning up temporary chunk files...")
        
        cleaned = 0
        for chunk_file in chunk_files:
            try:
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
                    cleaned += 1
            except Exception as e:
                logger.warning(f"Failed to remove {chunk_file}: {str(e)}")
        
        logger.info(f"✅ Cleaned up {cleaned} chunk files")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate Large-Scale Synthetic Dataset and Train Production Models')
    parser.add_argument('--records', type=int, default=75_000_000,
                       help='Number of synthetic records to generate (default: 75M)')
    parser.add_argument('--processes', type=int,
                       help='Number of processes for data generation (default: auto)')
    parser.add_argument('--sample-size', type=int,
                       help='Sample size for training (default: use all data)')
    parser.add_argument('--output-dir', default='./synthetic_data',
                       help='Output directory for synthetic data')
    parser.add_argument('--models-dir', default='./models',
                       help='Output directory for trained models')
    parser.add_argument('--skip-generation', action='store_true',
                       help='Skip data generation and use existing chunks')
    parser.add_argument('--keep-chunks', action='store_true',
                       help='Keep chunk files after training')
    
    args = parser.parse_args()
    
    try:
        # Initialize generator
        generator = LargeSyntheticDataGenerator(
            output_dir=args.output_dir,
            models_dir=args.models_dir
        )
        
        start_time = datetime.now()
        logger.info(f"🚀 Starting large-scale ML training pipeline...")
        logger.info(f"📊 Target records: {args.records:,}")
        logger.info(f"💾 Initial memory usage: {generator.get_memory_usage():.1f} MB")
        
        # Step 1: Generate synthetic data (or use existing)
        if args.skip_generation:
            logger.info("⏭️  Skipping data generation, looking for existing chunks...")
            chunk_files = [
                os.path.join(args.output_dir, f) 
                for f in os.listdir(args.output_dir) 
                if f.startswith('synthetic_chunk_') and f.endswith('.parquet')
            ]
            chunk_files.sort()
            
            if not chunk_files:
                logger.error("❌ No existing chunk files found!")
                return
            
            logger.info(f"📁 Found {len(chunk_files)} existing chunk files")
            total_generated = args.records  # Assume target was met
        else:
            chunk_files, total_generated = generator.generate_large_dataset(
                total_records=args.records,
                num_processes=args.processes
            )
        
        # Step 2: Load and combine data for training
        training_data = generator.load_and_combine_chunks(
            chunk_files, 
            sample_size=args.sample_size
        )
        
        # Step 3: Train production models
        feature_columns = [
            'series_test_1_percentage',
            'series_test_2_percentage', 
            'lab_internal_percentage',
            'average_internal_percentage',
            'subject_type_encoded',
            'semester',
            'attendance_percentage'
        ]
        
        trained_models, model_metrics, best_model_name = generator.train_production_models(training_data)
        
        # Step 4: Export models
        export_info = generator.export_models(
            trained_models, 
            model_metrics, 
            best_model_name, 
            feature_columns
        )
        
        # Step 5: Cleanup (optional)
        if not args.keep_chunks:
            generator.cleanup_chunks(chunk_files)
        
        # Final summary
        total_time = (datetime.now() - start_time).total_seconds()
        
        print(f"\n🎉 LARGE-SCALE ML TRAINING COMPLETED!")
        print(f"=" * 50)
        print(f"📊 Records Generated: {total_generated:,}")
        print(f"🤖 Models Trained: {export_info['models_exported']}")
        print(f"🏆 Best Model: {export_info['best_model']}")
        print(f"⏱️  Total Time: {total_time/60:.1f} minutes")
        print(f"💾 Final Memory: {generator.get_memory_usage():.1f} MB")
        print(f"📁 Models Directory: {export_info['models_directory']}")
        
        # Model performance summary
        print(f"\n📈 MODEL PERFORMANCE SUMMARY")
        print(f"=" * 40)
        for model_name, metrics in model_metrics.items():
            status = "🏆 BEST" if model_name == best_model_name else "   "
            print(f"{status} {model_name.upper()}:")
            print(f"    MAE: {metrics['mae']:.2f}")
            print(f"    RMSE: {metrics['rmse']:.2f}")
            print(f"    R² Score: {metrics['r2_score']:.3f}")
            print(f"    Accuracy (±10%): {metrics['accuracy_within_10_percent']:.1%}")
            print(f"    Training Time: {metrics['training_time_seconds']:.1f}s")
        
        print(f"\n✅ Production models are ready for deployment!")
        print(f"💡 Use 'best_production_model.joblib' for predictions")
        
    except Exception as e:
        logger.error(f"❌ Large-scale training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())