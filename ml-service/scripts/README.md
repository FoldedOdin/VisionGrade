# ML Service Training Scripts

This directory contains scripts for training and managing ML models in VisionGrade.

## Initial Training Script

The `initial_training.py` script helps you train your first ML models for the VisionGrade system.

### Prerequisites

1. **Database with Data**: You need students with both internal marks (Series Tests, Lab Internals) AND university exam results
2. **ML Service Running**: The ML service should be running on `http://localhost:8000`
3. **Minimum Data**: At least 10 students per subject with complete marks for reliable training

### Usage

#### Option 1: Train with Real Data
```bash
# Train models using actual database data
cd ml-service/scripts
python initial_training.py

# Train for a specific subject
python initial_training.py --subject-id 1
```

#### Option 2: Train with Sample Data (for Demo/Testing)
```bash
# Generate sample data and train models (useful for testing)
python initial_training.py --sample
```

#### Option 3: Custom Configuration
```bash
# Use custom database and ML service URLs
python initial_training.py \
  --database-url "postgresql://user:pass@localhost:5432/visiongrade_db" \
  --ml-service-url "http://localhost:8000"
```

### What the Script Does

1. **Checks Data Availability**: Verifies if sufficient training data exists
2. **Generates Sample Data**: Creates realistic sample data if needed
3. **Trains Models**: Uses Random Forest and XGBoost algorithms
4. **Selects Best Model**: Automatically chooses the best performing model
5. **Saves Models**: Stores trained models for future predictions

### Training Requirements

For successful model training, you need:

- **Minimum 10 students** per subject with complete data
- **Internal Marks**: Series Test I, Series Test II, Lab Internal marks
- **University Marks**: Final university exam results (target variable)
- **Subject Information**: Subject type (theory/lab) and semester

### Sample Data Generation

When using `--sample`, the script generates realistic training data:

- **50 sample students** with correlated marks
- **Realistic mark distributions** based on typical academic performance
- **Proper correlations** between internal and university marks
- **Noise and variation** to simulate real-world data

### Output

The script provides detailed logging and will show:

```
🚀 Starting initial ML model training...
📊 Using database data for training...
Subject CS501: 25 training records
Subject CS502: 18 training records
Training model for Computer Networks...
✅ Model training successful!
Best model: random_forest
Training samples: 20
Model performance: {'mae': 8.5, 'mse': 95.2, 'r2': 0.78}
🎉 Initial training completed successfully!
```

### Troubleshooting

#### "No subjects have sufficient training data"
- You need at least 10 students with university exam results
- Use `--sample` flag to generate demo data
- Add more student records to your database

#### "Failed to connect to ML service"
- Ensure ML service is running: `python ml-service/app.py`
- Check the ML service URL (default: http://localhost:8000)
- Verify firewall and network settings

#### "Training failed: Insufficient training data"
- Each student needs both internal marks AND university results
- Check that marks are properly entered in the database
- Verify data quality and completeness

### Next Steps

After successful training:

1. **Test Predictions**: Use the `/predict` endpoint to test predictions
2. **Monitor Accuracy**: Check prediction accuracy as more data becomes available
3. **Retrain Models**: Periodically retrain with new data for better accuracy
4. **Subject-Specific Models**: Train separate models for different subjects

### API Endpoints Used

The script interacts with these ML service endpoints:

- `POST /train` - Train new models
- `GET /model/info` - Get model information
- `GET /health` - Check service health

### Files Created

After training, you'll find:

- `ml-service/models/general_model_1.0.0.joblib` - General model
- `ml-service/models/subject_1_model_1.0.0.joblib` - Subject-specific models
- Training logs and performance metrics

## Additional Scripts

### Model Management
```bash
# Check current models
curl http://localhost:8000/model/info

# Get prediction accuracy
curl http://localhost:8000/accuracy
```

### Batch Training
For production deployments, you can create batch training scripts:

```python
# Example batch training for all subjects
subjects = [1, 2, 3, 4, 5]
for subject_id in subjects:
    trainer.train_model_via_api(subject_id=subject_id)
```

## Large-Scale Production Training

For production deployment with robust models, use the large-scale synthetic data generator:

### Generate 70-80 Million Records and Train Production Models

```bash
# Generate 75M synthetic records and train production models
python scripts/generate_large_synthetic_dataset.py --records 75000000

# Use fewer records for testing (still large-scale)
python scripts/generate_large_synthetic_dataset.py --records 10000000

# Use existing chunks and train models
python scripts/generate_large_synthetic_dataset.py --skip-generation --sample-size 5000000

# Keep chunk files for future use
python scripts/generate_large_synthetic_dataset.py --records 50000000 --keep-chunks
```

### What This Provides

- **75+ Million Training Records**: Massive dataset for robust model training
- **Realistic Academic Data**: Correlated marks, attendance, subject difficulty
- **Multiple Performance Profiles**: Excellent, good, average, below-average, poor students
- **Production-Ready Models**: Random Forest and XGBoost with ±10% accuracy
- **Exported Models**: Ready-to-use .joblib files with metadata
- **Best Model Selection**: Automatically selects and exports the best performing model

### Load and Use Production Models

```bash
# Load and validate production models
python scripts/production_model_loader.py --load-best --validate --test-prediction

# Load all available models
python scripts/production_model_loader.py --load-all --export-summary model_summary.json

# Load specific model
python scripts/production_model_loader.py --model-file production_random_forest_20241002_143022.joblib
```

### Production Model Features

- **High Accuracy**: Trained on 70M+ records for ±10% accuracy
- **Feature Importance**: Identifies most predictive features
- **Model Versioning**: Tracks model versions and performance
- **Metadata**: Complete training information and metrics
- **Ready for Deployment**: Exported as .joblib files for immediate use

## Best Practices

1. **Large-Scale Training**: Use 70M+ records for production models
2. **Regular Retraining**: Retrain models each semester with new data
3. **Data Quality**: Ensure clean, complete data for better accuracy
4. **Model Validation**: Test predictions against known results
5. **Backup Models**: Keep backups of well-performing models
6. **Monitor Performance**: Track prediction accuracy over time
7. **Production Models**: Use exported production models for deployment