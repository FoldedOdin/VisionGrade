const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { body, param, query } = require('express-validator');

/**
 * @route   GET /api/ml/health
 * @desc    Check ML service health
 * @access  Private (Admin only)
 */
router.get('/health',
  authenticateToken,
  requireRole(['admin']),
  mlController.checkMLServiceHealth
);

/**
 * @route   POST /api/ml/train
 * @desc    Train ML model for predictions
 * @access  Private (Admin, Tutor)
 */
router.post('/train',
  authenticateToken,
  requireRole(['admin', 'tutor']),
  [
    body('subject_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Subject ID must be a positive integer'),
    body('academic_year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Academic year must be between 2020 and 2030')
  ],
  mlController.trainModel
);

/**
 * @route   POST /api/ml/predict
 * @desc    Generate prediction for a student
 * @access  Private (Faculty, Tutor, Admin)
 */
router.post('/predict',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  [
    body('student_id')
      .isInt({ min: 1 })
      .withMessage('Student ID is required and must be a positive integer'),
    body('subject_id')
      .isInt({ min: 1 })
      .withMessage('Subject ID is required and must be a positive integer'),
    body('academic_year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Academic year must be between 2020 and 2030')
  ],
  mlController.predictStudentMarks
);

/**
 * @route   POST /api/ml/predict/batch
 * @desc    Generate predictions for all students in a subject
 * @access  Private (Faculty, Tutor, Admin)
 */
router.post('/predict/batch',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  [
    body('subject_id')
      .isInt({ min: 1 })
      .withMessage('Subject ID is required and must be a positive integer'),
    body('academic_year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Academic year must be between 2020 and 2030')
  ],
  mlController.batchPredictSubject
);

/**
 * @route   POST /api/ml/predictions/toggle/:subject_id
 * @desc    Toggle prediction visibility for students
 * @access  Private (Tutor, Admin)
 */
router.post('/predictions/toggle/:subject_id',
  authenticateToken,
  requireRole(['tutor', 'admin']),
  [
    param('subject_id')
      .isInt({ min: 1 })
      .withMessage('Subject ID must be a positive integer'),
    body('is_visible')
      .isBoolean()
      .withMessage('is_visible must be a boolean value')
  ],
  mlController.togglePredictionVisibility
);

/**
 * @route   GET /api/ml/predictions/student/:student_id
 * @desc    Get predictions for a student (visible ones only)
 * @access  Private (Student - own data, Faculty, Tutor, Admin)
 */
router.get('/predictions/student/:student_id',
  authenticateToken,
  [
    param('student_id')
      .isInt({ min: 1 })
      .withMessage('Student ID must be a positive integer'),
    query('academic_year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Academic year must be between 2020 and 2030')
  ],
  mlController.getStudentPredictions
);

/**
 * @route   GET /api/ml/predictions/subject/:subject_id
 * @desc    Get all predictions for a subject
 * @access  Private (Faculty, Tutor, Admin)
 */
router.get('/predictions/subject/:subject_id',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  [
    param('subject_id')
      .isInt({ min: 1 })
      .withMessage('Subject ID must be a positive integer'),
    query('academic_year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Academic year must be between 2020 and 2030')
  ],
  mlController.getSubjectPredictions
);

/**
 * @route   GET /api/ml/accuracy
 * @desc    Get prediction accuracy statistics
 * @access  Private (Faculty, Tutor, Admin)
 */
router.get('/accuracy',
  authenticateToken,
  requireRole(['faculty', 'tutor', 'admin']),
  [
    query('subject_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Subject ID must be a positive integer'),
    query('model_version')
      .optional()
      .isString()
      .withMessage('Model version must be a string')
  ],
  mlController.getAccuracyStats
);

/**
 * @route   GET /api/ml/model/info
 * @desc    Get ML model information
 * @access  Private (Admin, Tutor)
 */
router.get('/model/info',
  authenticateToken,
  requireRole(['admin', 'tutor']),
  mlController.getModelInfo
);

/**
 * @route   DELETE /api/ml/predictions/:prediction_id
 * @desc    Delete a specific prediction
 * @access  Private (Admin, Tutor)
 */
router.delete('/predictions/:prediction_id',
  authenticateToken,
  requireRole(['admin', 'tutor']),
  [
    param('prediction_id')
      .isInt({ min: 1 })
      .withMessage('Prediction ID must be a positive integer')
  ],
  mlController.deletePrediction
);

/**
 * @route   GET /api/ml/predictions/stats
 * @desc    Get prediction statistics overview
 * @access  Private (Admin, Tutor)
 */
router.get('/predictions/stats',
  authenticateToken,
  requireRole(['admin', 'tutor']),
  [
    query('subject_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Subject ID must be a positive integer'),
    query('academic_year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Academic year must be between 2020 and 2030')
  ],
  mlController.getPredictionStats
);

module.exports = router;