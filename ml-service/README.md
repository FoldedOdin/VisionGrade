# VisionGrade ML Service

Machine Learning service for predicting university exam marks based on internal assessments (Series Tests and Lab Internals).

## Features

- **University Exam Prediction**: Predicts university exam marks based on Series Test I, Series Test II, and Lab Internal marks
- **Multiple ML Models**: Uses Random Forest and XGBoost algorithms, automatically selects the best performing model
- **Subject-Specific Models**: Can train separate models for different subjects
- **Prediction Visibility Control**: Tutors can toggle prediction visibility for students
- **Model Accuracy Tracking**: Tracks and reports prediction accuracy when actual results are available
- **Batch Processing**: Supports batch predictions for entire classes
- **RESTful API**: Complete REST API for integration with the main application

## Architecture

```
ml-service/
├── app.py                 # Flask application and API endpoints
├── services/
│   ├── prediction_service.py    # Core ML prediction logic
│   └── database_service.py      # Database operations
├── utils/
│   └── data_validator.py        # Data validation utilities
├── models/                      # Trained ML models storage
├── tests/                       # Test files
└── requirements.txt             # Python dependencies
```

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health check with service status

### Model Management
- `GET /model/info` - Get information about loaded models
- `POST /train` - Train ML model with available data

### Predictions
- `POST /predict` - Generate prediction for a single student
- `POST /predict/batch` - Generate predictions for all students in a subject
- `POST /predictions/toggle/{subject_id}` - Toggle prediction visibility for students

### Analytics
- `GET /accuracy` - Get prediction accuracy statistics

## Installation

1. **Install Python Dependencies**
   ```bash
   cd ml-service
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the Service**
   ```bash
   python app.py
   ```

## Initial Model Training

**IMPORTANT**: Before making predictions, you need to train ML models first!

### Quick Start (Demo/Testing)
```bash
# Train models with sample data (for testing)
cd ml-service/scripts
python initial_training.py --sample
```

### Production Setup
```bash
# 1. Check if your data is ready for training
python scripts/check_training_readiness.py

# 2. Train models with real data
python scripts/initial_training.py

# 3. Train all subjects at once
python scripts/train_all_subjects.py
```

### Training Requirements
- **Minimum 10 students** per subject with complete data
- Students must have **university exam results** (target variable)
- Students must have **at least 2 internal assessments** (Series Tests, Lab Internal)

### What Gets Trained
- **Random Forest** and **XGBoost** models
- **Best model** automatically selected based on performance
- **Subject-specific models** for better accuracy
- Models saved to `./models/` directory

## Configuration

Environment variables in `.env`:

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=true
FLASK_HOST=0.0.0.0
FLASK_PORT=8000

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/visiongrade_db

# Model Configuration
MODEL_PATH=./models/
MODEL_VERSION=1.0.0
PREDICTION_THRESHOLD=0.7

# Logging
LOG_LEVEL=INFO
```

## Usage Examples

### Training a Model

```bash
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{"subject_id": 1, "academic_year": 2025}'
```

### Making a Prediction

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "subject_id": 1,
    "academic_year": 2025
  }'
```

### Batch Prediction

```bash
curl -X POST http://localhost:8000/predict/batch \
  -H "Content-Type: application/json" \
  -d '{"subject_id": 1, "academic_year": 2025}'
```

### Toggle Prediction Visibility

```bash
curl -X POST http://localhost:8000/predictions/toggle/1 \
  -H "Content-Type: application/json" \
  -d '{
    "is_visible": true,
    "faculty_id": 1
  }'
```

## ML Model Details

### Input Features
The ML model uses the following features for prediction:

1. **Series Test 1 Percentage** (0-100%)
2. **Series Test 2 Percentage** (0-100%)
3. **Lab Internal Percentage** (0-100%)
4. **Average Internal Percentage** (calculated)
5. **Subject Type** (0 for theory, 1 for lab)
6. **Semester** (1-8)

### Model Training
- **Algorithms**: Random Forest and XGBoost
- **Model Selection**: Automatically selects best performing model based on Mean Absolute Error
- **Validation**: 80/20 train-test split
- **Minimum Data**: Requires at least 10 students with university exam results for training

### Prediction Accuracy
- **Target Accuracy**: ±10% of actual university exam percentage
- **Confidence Score**: 0.0 to 1.0 based on data completeness and consistency
- **Performance Tracking**: Tracks accuracy when actual results become available

## Data Requirements

### Training Data
For model training, the service needs:
- Students with Series Test I, II, and Lab Internal marks
- Corresponding university exam marks (target variable)
- Minimum 10 students for reliable training

### Prediction Data
For making predictions:
- At least 2 out of 3 internal assessment marks
- Subject information (type, semester)
- Missing marks are filled with average of available marks

## Testing

Run tests using the provided test runner:

```bash
# Run all tests
python run_tests.py

# Run only unit tests
python run_tests.py --type unit

# Run only integration tests
python run_tests.py --type integration

# Run with verbose output
python run_tests.py --verbose

# Check dependencies
python run_tests.py --check-deps
```

## Error Handling

The service includes comprehensive error handling:

- **Validation Errors**: Invalid input data format or ranges
- **Model Errors**: Missing or corrupted model files
- **Database Errors**: Connection issues or data inconsistencies
- **Prediction Errors**: Insufficient data for reliable predictions

All errors return structured JSON responses with appropriate HTTP status codes.

## Performance Considerations

- **Model Loading**: Models are loaded once at startup and cached in memory
- **Prediction Speed**: Single predictions complete in <1 second
- **Batch Processing**: Optimized for processing multiple students efficiently
- **Memory Usage**: Models are lightweight and suitable for production deployment

## Security

- **Input Validation**: All inputs are validated before processing
- **SQL Injection Prevention**: Uses parameterized queries
- **Access Control**: Integrates with backend RBAC system
- **Data Privacy**: No sensitive data is logged or exposed

## Monitoring and Logging

- **Health Checks**: Multiple endpoints for service monitoring
- **Performance Metrics**: Tracks prediction accuracy and response times
- **Error Logging**: Comprehensive error logging with timestamps
- **Model Versioning**: Tracks which model version generated each prediction

## Integration with Backend

The ML service integrates with the main backend through:

1. **Database Access**: Direct PostgreSQL connection for training data
2. **REST API**: Backend calls ML service endpoints
3. **Prediction Storage**: Results saved to `ml_predictions` table
4. **Visibility Control**: Tutor permissions managed through backend

## Deployment

### Development
```bash
python app.py
```

### Production
```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Docker
```bash
docker build -t visiongrade-ml .
docker run -p 8000:8000 visiongrade-ml
```

## Troubleshooting

### Common Issues

1. **Model Training Fails**
   - Check if sufficient training data exists (minimum 10 students)
   - Verify database connection and data format
   - Ensure students have both internal and university marks

2. **Predictions Are Inaccurate**
   - Retrain model with more recent data
   - Check if input features are complete
   - Verify data quality and consistency

3. **Service Unavailable**
   - Check if all dependencies are installed
   - Verify database connection
   - Check logs for specific error messages

### Logs Location
- Application logs: `logs/ml_service.log`
- Error details in console output during development

## Contributing

1. Follow PEP 8 style guidelines
2. Add tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting

## License

Part of the VisionGrade Student Performance Analysis System.