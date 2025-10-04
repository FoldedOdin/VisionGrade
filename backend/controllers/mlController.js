const { validationResult } = require('express-validator');
const axios = require('axios');
const { MLPrediction, Student, Subject, Faculty, FacultySubject, User } = require('../models');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_SERVICE_TIMEOUT = parseInt(process.env.ML_SERVICE_TIMEOUT) || 30000;

// Create axios instance for ML service
const mlServiceClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Check ML service health
 */
const checkMLServiceHealth = async (req, res) => {
  try {
    const response = await mlServiceClient.get('/health');
    
    res.json({
      success: true,
      ml_service_status: response.data,
      backend_timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('ML service health check failed:', error.message);
    
    // Get database stats as fallback
    const dbStats = await MLPrediction.count();
    
    res.status(503).json({
      success: false,
      error: 'ML service unavailable',
      details: error.message,
      fallback_info: {
        database_predictions: dbStats,
        service_url: ML_SERVICE_URL,
        status: 'offline'
      },
      backend_timestamp: new Date().toISOString()
    });
  }
};

/**
 * Train ML model
 */
const trainModel = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject_id, academic_year } = req.body;
    const currentYear = academic_year || new Date().getFullYear();

    // Check if user has permission for subject-specific training
    if (subject_id && req.user.role === 'tutor') {
      const hasAccess = await FacultySubject.findOne({
        where: {
          faculty_id: req.user.faculty.id,
          subject_id: subject_id,
          academic_year: currentYear
        }
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only train models for your assigned subjects.'
        });
      }
    }

    // Call ML service to train model
    const response = await mlServiceClient.post('/train', {
      subject_id,
      academic_year: currentYear
    });

    logger.info(`Model training initiated by user ${req.user.id} for subject ${subject_id || 'all'}`);

    res.json({
      success: true,
      message: 'Model training completed',
      training_results: response.data,
      initiated_by: req.user.unique_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Model training failed:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'ML service error',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Model training failed',
      details: error.message
    });
  }
};

/**
 * Predict marks for a student
 */
const predictStudentMarks = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { student_id, subject_id, academic_year } = req.body;
    const currentYear = academic_year || new Date().getFullYear();

    // Check cache first
    const cachedPrediction = await cacheService.getPrediction(student_id, subject_id);
    if (cachedPrediction) {
      logger.info(`Returning cached prediction for student ${student_id}, subject ${subject_id}`);
      return res.json({
        success: true,
        message: 'Prediction retrieved from cache',
        prediction: cachedPrediction,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Check if user has permission to predict for this subject
    if (req.user.role === 'faculty' || req.user.role === 'tutor') {
      const hasAccess = await FacultySubject.findOne({
        where: {
          faculty_id: req.user.faculty.id,
          subject_id: subject_id,
          academic_year: currentYear
        }
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only predict for your assigned subjects.'
        });
      }
    }

    // Verify student exists and is enrolled in the subject
    const student = await Student.findByPk(student_id, {
      include: [{
        model: Subject,
        as: 'subjects',
        where: { id: subject_id },
        through: {
          where: { academic_year: currentYear }
        }
      }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found or not enrolled in this subject'
      });
    }

    // Call ML service for prediction
    const response = await mlServiceClient.post('/predict', {
      student_id,
      subject_id,
      academic_year: currentYear
    });

    // Cache the prediction result
    await cacheService.setPrediction(student_id, subject_id, response.data);

    logger.info(`Prediction generated for student ${student_id}, subject ${subject_id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Prediction generated successfully',
      prediction: response.data,
      student_name: student.student_name,
      subject_name: student.subjects[0].subject_name,
      generated_by: req.user.unique_id,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Prediction failed:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'ML service error',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Prediction failed',
      details: error.message
    });
  }
};

/**
 * Batch predict for all students in a subject
 */
const batchPredictSubject = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject_id, academic_year } = req.body;
    const currentYear = academic_year || new Date().getFullYear();

    // Check if user has permission for this subject
    if (req.user.role === 'faculty' || req.user.role === 'tutor') {
      const hasAccess = await FacultySubject.findOne({
        where: {
          faculty_id: req.user.facultyId || req.user.faculty?.id,
          subject_id: subject_id,
          academic_year: currentYear
        }
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only predict for your assigned subjects.'
        });
      }
    }

    // Verify subject exists
    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    let mlServiceResults = null;
    let mlServiceError = null;

    // Try ML service first
    try {
      const response = await mlServiceClient.post('/predict/batch', {
        subject_id,
        academic_year: currentYear
      });
      mlServiceResults = response.data;
    } catch (mlError) {
      logger.warn('ML service unavailable for batch prediction:', mlError.message);
      mlServiceError = 'ML service unavailable';
      
      // Fallback: Check if predictions already exist, if not suggest using sample data
      const existingPredictions = await MLPrediction.count({
        where: { subject_id: subject_id }
      });
      
      if (existingPredictions === 0) {
        return res.status(503).json({
          success: false,
          error: 'ML service unavailable and no existing predictions found',
          suggestion: 'Use the sample prediction script to generate test data',
          ml_service_error: mlError.message
        });
      }
      
      // Return existing predictions as "generated"
      mlServiceResults = {
        message: 'Using existing predictions (ML service unavailable)',
        predictions_count: existingPredictions,
        service_status: 'offline'
      };
    }

    logger.info(`Batch prediction completed for subject ${subject_id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: mlServiceError ? 'Using existing predictions (ML service unavailable)' : 'Batch prediction completed',
      results: mlServiceResults,
      subject_name: subject.subject_name,
      generated_by: req.user.unique_id,
      ml_service_error: mlServiceError,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Batch prediction failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Batch prediction failed',
      details: error.message
    });
  }
};

/**
 * Toggle prediction visibility for students
 */
const togglePredictionVisibility = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject_id } = req.params;
    const { is_visible } = req.body;
    const currentYear = new Date().getFullYear();

    // Check if user has permission for this subject
    if (req.user.role === 'tutor') {
      const hasAccess = await FacultySubject.findOne({
        where: {
          faculty_id: req.user.facultyId || req.user.faculty?.id,
          subject_id: parseInt(subject_id),
          academic_year: currentYear
        }
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only toggle predictions for your assigned subjects.'
        });
      }
    }

    // Update local database first
    const updatedCount = await MLPrediction.togglePredictionVisibility(
      parseInt(subject_id),
      is_visible,
      req.user.facultyId || req.user.faculty?.id
    );

    let mlServiceResponse = null;
    let mlServiceError = null;

    // Try to notify ML service, but don't fail if it's unavailable
    try {
      const response = await mlServiceClient.post(`/predictions/toggle/${subject_id}`, {
        is_visible,
        faculty_id: req.user.facultyId || req.user.faculty?.id
      });
      mlServiceResponse = response.data;
    } catch (mlError) {
      logger.warn('ML service unavailable for visibility toggle:', mlError.message);
      mlServiceError = 'ML service unavailable - visibility updated in database only';
    }

    logger.info(`Prediction visibility toggled for subject ${subject_id} to ${is_visible} by user ${req.user.id}`);

    res.json({
      success: true,
      message: `Predictions ${is_visible ? 'enabled' : 'disabled'} for students`,
      data: {
        subject_id: parseInt(subject_id),
        is_visible,
        updated_predictions: updatedCount,
        ml_service_response: mlServiceResponse,
        ml_service_error: mlServiceError,
        updated_by: req.user.unique_id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Toggle prediction visibility failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Toggle prediction visibility failed',
      details: error.message
    });
  }
};

/**
 * Get predictions for a student
 */
const getStudentPredictions = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { student_id } = req.params;
    const { academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    // Check cache first
    const cacheKey = `student-predictions:${student_id}:${currentYear}`;
    const cachedPredictions = await cacheService.get(cacheKey);
    if (cachedPredictions) {
      logger.info(`Returning cached predictions for student ${student_id}`);
      return res.json({
        ...cachedPredictions,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Check if user can access this student's data
    if (req.user.role === 'student') {
      if (req.user.student.id !== parseInt(student_id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only view your own predictions.'
        });
      }
    }

    // Get predictions from database (only visible ones for students)
    const predictions = await MLPrediction.getStudentPredictions(
      parseInt(student_id),
      parseInt(currentYear)
    );

    // Get student info
    const student = await Student.findByPk(student_id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['unique_id', 'email']
      }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    const responseData = {
      success: true,
      student: {
        id: student.id,
        name: student.student_name,
        unique_id: student.user.unique_id,
        semester: student.semester
      },
      predictions: predictions.map(pred => ({
        id: pred.id,
        subject: {
          id: pred.subject.id,
          name: pred.subject.subject_name,
          code: pred.subject.subject_code,
          type: pred.subject.subject_type
        },
        predicted_marks: pred.predicted_marks,
        confidence_score: pred.confidence_score,
        model_version: pred.model_version,
        is_visible: pred.is_visible_to_student,
        created_at: pred.created_at
      })),
      academic_year: currentYear,
      cached: false
    };

    // Cache the result for 15 minutes
    await cacheService.set(cacheKey, responseData, 900);

    res.json({
      ...responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get student predictions failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get student predictions',
      details: error.message
    });
  }
};

/**
 * Get all predictions for a subject
 */
const getSubjectPredictions = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject_id } = req.params;
    const { academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    // Check if user has permission for this subject
    if (req.user.role === 'faculty' || req.user.role === 'tutor') {
      const hasAccess = await FacultySubject.findOne({
        where: {
          faculty_id: req.user.facultyId || req.user.faculty?.id,
          subject_id: parseInt(subject_id),
          academic_year: currentYear
        }
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only view predictions for your assigned subjects.'
        });
      }
    }

    // Get predictions from database
    const predictions = await MLPrediction.getSubjectPredictions(
      parseInt(subject_id),
      parseInt(currentYear)
    );

    // Get subject info
    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    res.json({
      success: true,
      subject: {
        id: subject.id,
        name: subject.subject_name,
        code: subject.subject_code,
        type: subject.subject_type,
        semester: subject.semester
      },
      predictions: predictions.map(pred => ({
        id: pred.id,
        student: {
          id: pred.student.id,
          name: pred.student.student_name,
          unique_id: pred.student.user.unique_id,
          semester: pred.student.semester
        },
        predicted_marks: pred.predicted_marks,
        confidence_score: pred.confidence_score,
        model_version: pred.model_version,
        is_visible: pred.is_visible_to_student,
        input_features: pred.input_features,
        created_at: pred.created_at
      })),
      academic_year: currentYear,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get subject predictions failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get subject predictions',
      details: error.message
    });
  }
};

/**
 * Get prediction accuracy statistics
 */
const getAccuracyStats = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject_id, model_version } = req.query;

    // Get stats from local database
    const localStats = await MLPrediction.getModelAccuracyStats(
      model_version,
      subject_id ? parseInt(subject_id) : null
    );

    let mlServiceStats = null;
    let mlServiceError = null;

    // Try to get stats from ML service, but don't fail if it's unavailable
    try {
      const response = await mlServiceClient.get('/accuracy', {
        params: { subject_id, model_version }
      });
      mlServiceStats = response.data.data;
    } catch (mlError) {
      logger.warn('ML service unavailable for accuracy stats:', mlError.message);
      mlServiceError = 'ML service unavailable';
      
      // Create fallback stats from database
      mlServiceStats = {
        average_accuracy: localStats.averageAccuracy || 0,
        total_predictions: localStats.totalPredictions || 0,
        accurate_predictions: localStats.accuratePredictions || 0,
        model_version: model_version || 'v1.0.0-mock',
        service_status: 'offline'
      };
    }

    res.json({
      success: true,
      ml_service_stats: mlServiceStats,
      database_stats: localStats,
      ml_service_error: mlServiceError,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get accuracy stats failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get accuracy stats',
      details: error.message
    });
  }
};

/**
 * Get ML model information
 */
const getModelInfo = async (req, res) => {
  try {
    const response = await mlServiceClient.get('/model/info');

    res.json({
      success: true,
      model_info: response.data.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get model info failed:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'ML service error',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get model info',
      details: error.message
    });
  }
};

/**
 * Delete a specific prediction
 */
const deletePrediction = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { prediction_id } = req.params;

    // Find and delete prediction
    const prediction = await MLPrediction.findByPk(prediction_id);
    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Prediction not found'
      });
    }

    // Check if user has permission (tutor can only delete predictions for their subjects)
    if (req.user.role === 'tutor') {
      const hasAccess = await FacultySubject.findOne({
        where: {
          faculty_id: req.user.faculty.id,
          subject_id: prediction.subject_id,
          academic_year: new Date().getFullYear()
        }
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only delete predictions for your assigned subjects.'
        });
      }
    }

    await prediction.destroy();

    logger.info(`Prediction ${prediction_id} deleted by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Prediction deleted successfully',
      deleted_prediction_id: parseInt(prediction_id),
      deleted_by: req.user.unique_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Delete prediction failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete prediction',
      details: error.message
    });
  }
};

/**
 * Get prediction statistics overview
 */
const getPredictionStats = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject_id, academic_year } = req.query;
    const currentYear = academic_year || new Date().getFullYear();

    // Build where clause
    const whereClause = {};
    if (subject_id) {
      whereClause.subject_id = parseInt(subject_id);
    }

    // Get prediction counts
    const totalPredictions = await MLPrediction.count({ where: whereClause });
    const visiblePredictions = await MLPrediction.count({
      where: { ...whereClause, is_visible_to_student: true }
    });

    // Get accuracy stats
    const accuracyStats = await MLPrediction.getModelAccuracyStats(
      null,
      subject_id ? parseInt(subject_id) : null
    );

    // Get predictions by subject if no specific subject requested
    let subjectBreakdown = null;
    if (!subject_id) {
      const subjectStats = await MLPrediction.findAll({
        attributes: [
          'subject_id',
          [MLPrediction.sequelize.fn('COUNT', MLPrediction.sequelize.col('id')), 'prediction_count'],
          [MLPrediction.sequelize.fn('COUNT', MLPrediction.sequelize.literal('CASE WHEN is_visible_to_student = true THEN 1 END')), 'visible_count']
        ],
        include: [{
          model: Subject,
          as: 'subject',
          attributes: ['subject_name', 'subject_code', 'subject_type']
        }],
        group: ['subject_id', 'subject.id'],
        raw: false
      });

      subjectBreakdown = subjectStats.map(stat => ({
        subject_id: stat.subject_id,
        subject_name: stat.subject.subject_name,
        subject_code: stat.subject.subject_code,
        subject_type: stat.subject.subject_type,
        total_predictions: parseInt(stat.dataValues.prediction_count),
        visible_predictions: parseInt(stat.dataValues.visible_count)
      }));
    }

    res.json({
      success: true,
      stats: {
        total_predictions: totalPredictions,
        visible_predictions: visiblePredictions,
        hidden_predictions: totalPredictions - visiblePredictions,
        accuracy_stats: accuracyStats,
        subject_breakdown: subjectBreakdown
      },
      filters: {
        subject_id: subject_id ? parseInt(subject_id) : null,
        academic_year: currentYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get prediction stats failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get prediction stats',
      details: error.message
    });
  }
};

module.exports = {
  checkMLServiceHealth,
  trainModel,
  predictStudentMarks,
  batchPredictSubject,
  togglePredictionVisibility,
  getStudentPredictions,
  getSubjectPredictions,
  getAccuracyStats,
  getModelInfo,
  deletePrediction,
  getPredictionStats
};