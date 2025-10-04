from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging
import sys
from datetime import datetime

# Add services and utils to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))

from prediction_service import PredictionService
from database_service import DatabaseService
from error_handler import (
    MLServiceError, PredictionError, ModelError, DataError, DatabaseError,
    handle_ml_errors, handle_prediction_errors, create_error_response,
    log_error_with_context
)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    PORT = int(os.getenv('FLASK_PORT', 8000))
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    MODEL_PATH = os.getenv('MODEL_PATH', './models/')
    DATABASE_URL = os.getenv('DATABASE_URL')

# Initialize services with comprehensive error handling
try:
    prediction_service = PredictionService(model_path=Config.MODEL_PATH)
    database_service = DatabaseService(database_url=Config.DATABASE_URL)
    logger.info("Services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    log_error_with_context(e, {'component': 'service_initialization'})
    prediction_service = None
    database_service = None

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'VisionGrade ML Service',
        'version': '1.0.0',
        'message': 'ML service is running successfully'
    }), 200

@app.route('/health', methods=['GET'])
def detailed_health():
    """Detailed health check"""
    services_status = {
        'prediction_service': prediction_service is not None,
        'database_service': database_service is not None
    }
    
    return jsonify({
        'status': 'healthy' if all(services_status.values()) else 'degraded',
        'service': 'VisionGrade ML Service',
        'version': '1.0.0',
        'python_version': sys.version,
        'environment': os.getenv('FLASK_ENV', 'development'),
        'services': services_status,
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/model/info', methods=['GET'])
def get_model_info():
    """Get information about loaded models"""
    if not prediction_service:
        return jsonify({
            'success': False,
            'error': 'Prediction service not available'
        }), 503
    
    try:
        model_info = prediction_service.get_model_info()
        return jsonify({
            'success': True,
            'data': model_info
        }), 200
    except Exception as e:
        logger.error(f"Failed to get model info: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/train', methods=['POST'])
def train_model():
    """Train ML model with provided data"""
    if not prediction_service or not database_service:
        return jsonify({
            'success': False,
            'error': 'Services not available'
        }), 503
    
    try:
        data = request.get_json()
        subject_id = data.get('subject_id') if data else None
        academic_year = data.get('academic_year') if data else None
        
        # Get training data from database
        training_data = database_service.get_training_data(subject_id, academic_year)
        
        if not training_data:
            return jsonify({
                'success': False,
                'error': 'No training data available'
            }), 400
        
        # Train model
        results = prediction_service.train_model(training_data, subject_id)
        
        return jsonify(results), 200 if results.get('success') else 400
        
    except Exception as e:
        logger.error(f"Model training failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict', methods=['POST'])
@handle_prediction_errors
def predict_marks():
    """Predict university exam marks for a student with comprehensive error handling"""
    request_id = f"pred_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.urandom(4).hex()}"
    
    if not prediction_service or not database_service:
        raise MLServiceError('Prediction or database service not available', 'SERVICE_UNAVAILABLE')
    
    try:
        data = request.get_json()
        
        if not data:
            raise DataError('Request body is required')
        
        student_id = data.get('student_id')
        subject_id = data.get('subject_id')
        
        if not student_id or not subject_id:
            raise DataError('student_id and subject_id are required')
        
        # Validate input data
        try:
            student_id = int(student_id)
            subject_id = int(subject_id)
        except (ValueError, TypeError):
            raise DataError('student_id and subject_id must be valid integers')
        
        # Get student data from database with error handling
        try:
            student_data = database_service.get_student_marks_for_prediction(
                student_id, subject_id, data.get('academic_year')
            )
        except Exception as e:
            log_error_with_context(e, {
                'operation': 'get_student_data',
                'student_id': student_id,
                'subject_id': subject_id,
                'request_id': request_id
            })
            raise DatabaseError(f'Failed to retrieve student data: {str(e)}')
        
        if not student_data:
            raise DataError('No marks data found for student and subject')
        
        # Make prediction with error handling
        try:
            prediction_result = prediction_service.predict_university_marks(student_data, subject_id)
        except Exception as e:
            log_error_with_context(e, {
                'operation': 'predict_marks',
                'student_id': student_id,
                'subject_id': subject_id,
                'request_id': request_id
            })
            raise PredictionError(f'Prediction failed: {str(e)}')
        
        # Save prediction to database if successful
        if prediction_result.get('success'):
            try:
                prediction_id = database_service.save_prediction(
                    student_id=student_id,
                    subject_id=subject_id,
                    predicted_marks=prediction_result['predicted_marks'],
                    confidence_score=prediction_result['confidence_score'],
                    input_features=prediction_result['input_features'],
                    model_version=prediction_result['model_version']
                )
                prediction_result['prediction_id'] = prediction_id
                prediction_result['request_id'] = request_id
            except Exception as e:
                logger.warning(f"Failed to save prediction to database: {str(e)}")
                # Don't fail the request if saving fails, just log it
                prediction_result['save_warning'] = 'Prediction not saved to database'
        
        return jsonify(prediction_result), 200 if prediction_result.get('success') else 400
        
    except MLServiceError:
        # Re-raise ML service errors
        raise
    except Exception as e:
        log_error_with_context(e, {
            'operation': 'predict_marks',
            'request_id': request_id
        })
        raise MLServiceError(f'Unexpected error during prediction: {str(e)}', 'PREDICTION_ERROR')

@app.route('/predict/batch', methods=['POST'])
def batch_predict():
    """Make predictions for multiple students in a subject"""
    if not prediction_service or not database_service:
        return jsonify({
            'success': False,
            'error': 'Services not available'
        }), 503
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        subject_id = data.get('subject_id')
        
        if not subject_id:
            return jsonify({
                'success': False,
                'error': 'subject_id is required'
            }), 400
        
        # Get all students for the subject
        students_data = database_service.get_students_for_prediction(
            subject_id, data.get('academic_year')
        )
        
        if not students_data:
            return jsonify({
                'success': False,
                'error': 'No students found for the subject'
            }), 404
        
        # Make batch predictions
        predictions = prediction_service.batch_predict(students_data, subject_id)
        
        # Save successful predictions to database
        saved_predictions = []
        for prediction in predictions:
            if prediction.get('success'):
                try:
                    prediction_id = database_service.save_prediction(
                        student_id=prediction['student_id'],
                        subject_id=prediction['subject_id'],
                        predicted_marks=prediction['predicted_marks'],
                        confidence_score=prediction['confidence_score'],
                        input_features=prediction['input_features'],
                        model_version=prediction['model_version']
                    )
                    prediction['prediction_id'] = prediction_id
                    saved_predictions.append(prediction)
                except Exception as e:
                    logger.warning(f"Failed to save prediction for student {prediction['student_id']}: {str(e)}")
                    prediction['save_error'] = str(e)
        
        return jsonify({
            'success': True,
            'total_students': len(students_data),
            'successful_predictions': len([p for p in predictions if p.get('success')]),
            'saved_predictions': len(saved_predictions),
            'predictions': predictions
        }), 200
        
    except Exception as e:
        logger.error(f"Batch prediction failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predictions/toggle/<int:subject_id>', methods=['POST'])
def toggle_prediction_visibility(subject_id):
    """Toggle prediction visibility for students in a subject"""
    if not database_service:
        return jsonify({
            'success': False,
            'error': 'Database service not available'
        }), 503
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        is_visible = data.get('is_visible')
        faculty_id = data.get('faculty_id')
        
        if is_visible is None:
            return jsonify({
                'success': False,
                'error': 'is_visible field is required'
            }), 400
        
        # Toggle visibility
        updated_count = database_service.toggle_prediction_visibility(
            subject_id, is_visible, faculty_id
        )
        
        return jsonify({
            'success': True,
            'subject_id': subject_id,
            'is_visible': is_visible,
            'updated_predictions': updated_count,
            'message': f'Predictions {"enabled" if is_visible else "disabled"} for students'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 403
    except Exception as e:
        logger.error(f"Failed to toggle prediction visibility: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/accuracy', methods=['GET'])
def get_accuracy_stats():
    """Get prediction accuracy statistics"""
    if not database_service:
        return jsonify({
            'success': False,
            'error': 'Database service not available'
        }), 503
    
    try:
        subject_id = request.args.get('subject_id', type=int)
        model_version = request.args.get('model_version')
        
        stats = database_service.get_prediction_accuracy_stats(subject_id, model_version)
        
        return jsonify({
            'success': True,
            'data': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get accuracy stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Comprehensive error handlers
@app.errorhandler(MLServiceError)
def handle_ml_service_error(error):
    """Handle ML service specific errors"""
    response = create_error_response(error)
    status_code = 400 if error.error_code in ['DATA_ERROR', 'VALIDATION_ERROR'] else 500
    return jsonify(response), status_code

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': {
            'code': 'NOT_FOUND',
            'message': 'The requested endpoint does not exist',
            'timestamp': datetime.utcnow().isoformat()
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Internal server error: {error}')
    log_error_with_context(error, {'component': 'flask_error_handler'})
    return jsonify({
        'success': False,
        'error': {
            'code': 'INTERNAL_SERVER_ERROR',
            'message': 'An unexpected error occurred',
            'timestamp': datetime.utcnow().isoformat()
        }
    }), 500

@app.errorhandler(Exception)
def handle_unexpected_error(error):
    """Handle any unexpected errors"""
    logger.error(f'Unexpected error: {error}')
    log_error_with_context(error, {'component': 'unexpected_error_handler'})
    
    # Don't expose internal error details in production
    if os.getenv('FLASK_ENV') == 'production':
        message = 'An unexpected error occurred'
    else:
        message = str(error)
    
    return jsonify({
        'success': False,
        'error': {
            'code': 'UNEXPECTED_ERROR',
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }
    }), 500

if __name__ == '__main__':
    logger.info(f"🤖 Starting VisionGrade ML Service on {Config.HOST}:{Config.PORT}")
    logger.info(f"🔧 Debug mode: {Config.DEBUG}")
    
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )