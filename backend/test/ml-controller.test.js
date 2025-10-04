const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const axios = require('axios');

// Create test app
const app = express();
app.use(express.json());

// Mock middleware
const mockAuth = (req, res, next) => {
  req.user = {
    id: 1,
    unique_id: 'TEST001',
    role: 'tutor',
    faculty: { id: 1 }
  };
  next();
};

const mockRbac = (roles) => (req, res, next) => {
  if (roles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Access denied' });
  }
};

// Mock models
const mockModels = {
  MLPrediction: {
    togglePredictionVisibility: sinon.stub(),
    getStudentPredictions: sinon.stub(),
    getSubjectPredictions: sinon.stub(),
    getModelAccuracyStats: sinon.stub(),
    findByPk: sinon.stub(),
    count: sinon.stub(),
    findAll: sinon.stub(),
    sequelize: {
      fn: sinon.stub(),
      col: sinon.stub(),
      literal: sinon.stub()
    }
  },
  Student: {
    findByPk: sinon.stub()
  },
  Subject: {
    findByPk: sinon.stub()
  },
  FacultySubject: {
    findOne: sinon.stub()
  },
  User: {}
};

// Mock axios
const axiosStub = sinon.stub(axios, 'create').returns({
  get: sinon.stub(),
  post: sinon.stub()
});

// Mock the controller with mocked dependencies
const proxyquire = require('proxyquire');
const mlController = proxyquire('../controllers/mlController', {
  '../models': mockModels,
  'axios': axios
});

// Setup routes
app.get('/ml/health', mockAuth, mockRbac(['admin']), mlController.checkMLServiceHealth);
app.post('/ml/train', mockAuth, mockRbac(['admin', 'tutor']), mlController.trainModel);
app.post('/ml/predict', mockAuth, mockRbac(['faculty', 'tutor', 'admin']), mlController.predictStudentMarks);
app.post('/ml/predict/batch', mockAuth, mockRbac(['faculty', 'tutor', 'admin']), mlController.batchPredictSubject);
app.post('/ml/predictions/toggle/:subject_id', mockAuth, mockRbac(['tutor', 'admin']), mlController.togglePredictionVisibility);
app.get('/ml/predictions/student/:student_id', mockAuth, mlController.getStudentPredictions);
app.get('/ml/predictions/subject/:subject_id', mockAuth, mockRbac(['faculty', 'tutor', 'admin']), mlController.getSubjectPredictions);
app.get('/ml/accuracy', mockAuth, mockRbac(['faculty', 'tutor', 'admin']), mlController.getAccuracyStats);
app.get('/ml/model/info', mockAuth, mockRbac(['admin', 'tutor']), mlController.getModelInfo);
app.delete('/ml/predictions/:prediction_id', mockAuth, mockRbac(['admin', 'tutor']), mlController.deletePrediction);
app.get('/ml/predictions/stats', mockAuth, mockRbac(['admin', 'tutor']), mlController.getPredictionStats);

describe('ML Controller', () => {
  let mlServiceClient;

  beforeEach(() => {
    // Reset all stubs
    Object.values(mockModels).forEach(model => {
      if (typeof model === 'object') {
        Object.values(model).forEach(method => {
          if (typeof method === 'function' && method.restore) {
            method.restore();
          }
          if (typeof method === 'object' && method.reset) {
            method.reset();
          }
        });
      }
    });

    // Setup axios mock
    mlServiceClient = {
      get: sinon.stub(),
      post: sinon.stub()
    };
    axiosStub.returns(mlServiceClient);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GET /ml/health', () => {
    it('should return ML service health status', async () => {
      const healthResponse = {
        data: {
          status: 'healthy',
          service: 'VisionGrade ML Service',
          version: '1.0.0'
        }
      };

      mlServiceClient.get.resolves(healthResponse);

      const response = await request(app)
        .get('/ml/health')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.ml_service_status).to.deep.equal(healthResponse.data);
      expect(mlServiceClient.get.calledWith('/health')).to.be.true;
    });

    it('should handle ML service unavailable', async () => {
      mlServiceClient.get.rejects(new Error('Service unavailable'));

      const response = await request(app)
        .get('/ml/health')
        .expect(503);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('ML service unavailable');
    });
  });

  describe('POST /ml/train', () => {
    beforeEach(() => {
      mockModels.FacultySubject.findOne.resolves({ id: 1 });
    });

    it('should train model successfully', async () => {
      const trainingResponse = {
        data: {
          success: true,
          model_version: '1.0.0',
          best_model: 'random_forest'
        }
      };

      mlServiceClient.post.resolves(trainingResponse);

      const response = await request(app)
        .post('/ml/train')
        .send({ subject_id: 1 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.training_results).to.deep.equal(trainingResponse.data);
      expect(mlServiceClient.post.calledWith('/train')).to.be.true;
    });

    it('should deny access for unauthorized subject', async () => {
      mockModels.FacultySubject.findOne.resolves(null);

      const response = await request(app)
        .post('/ml/train')
        .send({ subject_id: 999 })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access denied');
    });
  });

  describe('POST /ml/predict', () => {
    beforeEach(() => {
      mockModels.FacultySubject.findOne.resolves({ id: 1 });
      mockModels.Student.findByPk.resolves({
        id: 1,
        student_name: 'Test Student',
        subjects: [{
          subject_name: 'Test Subject'
        }]
      });
    });

    it('should predict student marks successfully', async () => {
      const predictionResponse = {
        data: {
          success: true,
          predicted_marks: 78.5,
          confidence_score: 0.85
        }
      };

      mlServiceClient.post.resolves(predictionResponse);

      const response = await request(app)
        .post('/ml/predict')
        .send({ student_id: 1, subject_id: 1 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.prediction).to.deep.equal(predictionResponse.data);
      expect(mlServiceClient.post.calledWith('/predict')).to.be.true;
    });

    it('should return 404 for non-existent student', async () => {
      mockModels.Student.findByPk.resolves(null);

      const response = await request(app)
        .post('/ml/predict')
        .send({ student_id: 999, subject_id: 1 })
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Student not found');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/ml/predict')
        .send({ student_id: 1 }) // Missing subject_id
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Validation failed');
    });
  });

  describe('POST /ml/predict/batch', () => {
    beforeEach(() => {
      mockModels.FacultySubject.findOne.resolves({ id: 1 });
      mockModels.Subject.findByPk.resolves({
        id: 1,
        subject_name: 'Test Subject'
      });
    });

    it('should perform batch prediction successfully', async () => {
      const batchResponse = {
        data: {
          success: true,
          total_students: 5,
          successful_predictions: 5
        }
      };

      mlServiceClient.post.resolves(batchResponse);

      const response = await request(app)
        .post('/ml/predict/batch')
        .send({ subject_id: 1 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.results).to.deep.equal(batchResponse.data);
      expect(mlServiceClient.post.calledWith('/predict/batch')).to.be.true;
    });

    it('should return 404 for non-existent subject', async () => {
      mockModels.Subject.findByPk.resolves(null);

      const response = await request(app)
        .post('/ml/predict/batch')
        .send({ subject_id: 999 })
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Subject not found');
    });
  });

  describe('POST /ml/predictions/toggle/:subject_id', () => {
    beforeEach(() => {
      mockModels.FacultySubject.findOne.resolves({ id: 1 });
      mockModels.MLPrediction.togglePredictionVisibility.resolves(5);
    });

    it('should toggle prediction visibility successfully', async () => {
      const toggleResponse = {
        data: {
          success: true,
          updated_predictions: 5
        }
      };

      mlServiceClient.post.resolves(toggleResponse);

      const response = await request(app)
        .post('/ml/predictions/toggle/1')
        .send({ is_visible: true })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.is_visible).to.be.true;
      expect(response.body.updated_predictions).to.equal(5);
      expect(mlServiceClient.post.calledWith('/predictions/toggle/1')).to.be.true;
    });

    it('should validate is_visible field', async () => {
      const response = await request(app)
        .post('/ml/predictions/toggle/1')
        .send({}) // Missing is_visible
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Validation failed');
    });
  });

  describe('GET /ml/predictions/student/:student_id', () => {
    beforeEach(() => {
      mockModels.MLPrediction.getStudentPredictions.resolves([
        {
          id: 1,
          predicted_marks: 78.5,
          confidence_score: 0.85,
          subject: {
            id: 1,
            subject_name: 'Test Subject',
            subject_code: 'TS101',
            subject_type: 'theory'
          }
        }
      ]);

      mockModels.Student.findByPk.resolves({
        id: 1,
        student_name: 'Test Student',
        semester: 3,
        user: {
          unique_id: 'STU001',
          email: 'test@example.com'
        }
      });
    });

    it('should get student predictions successfully', async () => {
      const response = await request(app)
        .get('/ml/predictions/student/1')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.student.name).to.equal('Test Student');
      expect(response.body.predictions).to.have.length(1);
      expect(response.body.predictions[0].predicted_marks).to.equal(78.5);
    });

    it('should return 404 for non-existent student', async () => {
      mockModels.Student.findByPk.resolves(null);

      const response = await request(app)
        .get('/ml/predictions/student/999')
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Student not found');
    });
  });

  describe('GET /ml/accuracy', () => {
    it('should get accuracy statistics successfully', async () => {
      const accuracyResponse = {
        data: {
          data: {
            total_predictions: 10,
            accuracy_percentage: 85.0
          }
        }
      };

      const localStats = {
        totalPredictions: 10,
        accuratePredictions: 8
      };

      mlServiceClient.get.resolves(accuracyResponse);
      mockModels.MLPrediction.getModelAccuracyStats.resolves(localStats);

      const response = await request(app)
        .get('/ml/accuracy')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.ml_service_stats).to.deep.equal(accuracyResponse.data.data);
      expect(response.body.database_stats).to.deep.equal(localStats);
    });
  });

  describe('GET /ml/model/info', () => {
    it('should get model information successfully', async () => {
      const modelInfoResponse = {
        data: {
          data: {
            model_version: '1.0.0',
            loaded_models: ['general']
          }
        }
      };

      mlServiceClient.get.resolves(modelInfoResponse);

      const response = await request(app)
        .get('/ml/model/info')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.model_info).to.deep.equal(modelInfoResponse.data.data);
    });
  });

  describe('DELETE /ml/predictions/:prediction_id', () => {
    beforeEach(() => {
      const mockPrediction = {
        id: 1,
        subject_id: 1,
        destroy: sinon.stub().resolves()
      };
      mockModels.MLPrediction.findByPk.resolves(mockPrediction);
      mockModels.FacultySubject.findOne.resolves({ id: 1 });
    });

    it('should delete prediction successfully', async () => {
      const response = await request(app)
        .delete('/ml/predictions/1')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.deleted_prediction_id).to.equal(1);
    });

    it('should return 404 for non-existent prediction', async () => {
      mockModels.MLPrediction.findByPk.resolves(null);

      const response = await request(app)
        .delete('/ml/predictions/999')
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Prediction not found');
    });
  });

  describe('GET /ml/predictions/stats', () => {
    beforeEach(() => {
      mockModels.MLPrediction.count.resolves(10);
      mockModels.MLPrediction.getModelAccuracyStats.resolves({
        totalPredictions: 10,
        accuratePredictions: 8
      });
      mockModels.MLPrediction.findAll.resolves([]);
    });

    it('should get prediction statistics successfully', async () => {
      const response = await request(app)
        .get('/ml/predictions/stats')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.stats.total_predictions).to.equal(10);
      expect(response.body.stats.accuracy_stats).to.be.an('object');
    });
  });
});