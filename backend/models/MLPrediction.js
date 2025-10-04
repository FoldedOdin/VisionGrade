const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MLPrediction extends Model {
    static associate(models) {
      // MLPrediction belongs to Student
      MLPrediction.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student'
      });

      // MLPrediction belongs to Subject
      MLPrediction.belongsTo(models.Subject, {
        foreignKey: 'subject_id',
        as: 'subject'
      });
    }

    // Instance method to get prediction accuracy (if actual marks are available)
    async getPredictionAccuracy() {
      const actualMark = await sequelize.models.Mark.findOne({
        where: {
          student_id: this.student_id,
          subject_id: this.subject_id,
          exam_type: 'university'
        }
      });

      if (!actualMark) {
        return null;
      }

      const actualPercentage = (actualMark.marks_obtained / actualMark.max_marks) * 100;
      const predictedPercentage = this.predicted_marks;
      const accuracy = 100 - Math.abs(actualPercentage - predictedPercentage);
      
      return {
        predicted: predictedPercentage,
        actual: actualPercentage,
        accuracy: Math.max(0, accuracy),
        difference: Math.abs(actualPercentage - predictedPercentage)
      };
    }

    // Instance method to check if prediction is within acceptable range (±10%)
    async isAccuratePrediction() {
      const accuracy = await this.getPredictionAccuracy();
      return accuracy ? accuracy.difference <= 10 : null;
    }

    // Static method to create or update prediction
    static async createOrUpdatePrediction(studentId, subjectId, predictedMarks, inputFeatures, modelVersion, confidenceScore = null) {
      if (predictedMarks < 0 || predictedMarks > 100) {
        throw new Error('Predicted marks must be between 0 and 100');
      }

      const [prediction, created] = await MLPrediction.findOrCreate({
        where: {
          student_id: studentId,
          subject_id: subjectId
        },
        defaults: {
          student_id: studentId,
          subject_id: subjectId,
          predicted_marks: predictedMarks,
          confidence_score: confidenceScore,
          input_features: inputFeatures,
          model_version: modelVersion,
          is_visible_to_student: false
        }
      });

      if (!created) {
        await prediction.update({
          predicted_marks: predictedMarks,
          confidence_score: confidenceScore,
          input_features: inputFeatures,
          model_version: modelVersion,
          created_at: new Date()
        });
      }

      return prediction;
    }

    // Static method to toggle prediction visibility for students
    static async togglePredictionVisibility(subjectId, isVisible, facultyId = null) {
      // Verify faculty has access to this subject if facultyId is provided
      if (facultyId) {
        const hasAccess = await sequelize.models.FacultySubject.findOne({
          where: {
            faculty_id: facultyId,
            subject_id: subjectId,
            academic_year: new Date().getFullYear()
          }
        });

        if (!hasAccess) {
          throw new Error('Faculty does not have access to this subject');
        }
      }

      const [updatedCount] = await MLPrediction.update(
        { is_visible_to_student: isVisible },
        {
          where: {
            subject_id: subjectId
          }
        }
      );

      return updatedCount;
    }

    // Static method to get predictions for a student (only visible ones)
    static async getStudentPredictions(studentId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      return await MLPrediction.findAll({
        where: {
          student_id: studentId,
          is_visible_to_student: true
        },
        include: [
          {
            model: sequelize.models.Subject,
            as: 'subject'
          }
        ],
        order: [
          [{ model: sequelize.models.Subject, as: 'subject' }, 'semester', 'ASC'],
          [{ model: sequelize.models.Subject, as: 'subject' }, 'subject_name', 'ASC']
        ]
      });
    }

    // Static method to get all predictions for a subject (for faculty/tutor)
    static async getSubjectPredictions(subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      return await MLPrediction.findAll({
        where: {
          subject_id: subjectId
        },
        include: [
          {
            model: sequelize.models.Student,
            as: 'student',
            include: [
              {
                model: sequelize.models.User,
                as: 'user'
              }
            ]
          },
          {
            model: sequelize.models.Subject,
            as: 'subject'
          }
        ],
        order: [
          [{ model: sequelize.models.Student, as: 'student' }, 'student_name', 'ASC']
        ]
      });
    }

    // Static method to get model accuracy statistics
    static async getModelAccuracyStats(modelVersion = null, subjectId = null) {
      const whereClause = {};
      if (modelVersion) whereClause.model_version = modelVersion;
      if (subjectId) whereClause.subject_id = subjectId;

      const predictions = await MLPrediction.findAll({
        where: whereClause,
        include: [
          {
            model: sequelize.models.Student,
            as: 'student'
          },
          {
            model: sequelize.models.Subject,
            as: 'subject'
          }
        ]
      });

      const stats = {
        totalPredictions: predictions.length,
        predictionsWithActuals: 0,
        accuratePredictions: 0,
        averageAccuracy: 0,
        averageDifference: 0,
        modelVersions: new Set()
      };

      let totalAccuracy = 0;
      let totalDifference = 0;

      for (const prediction of predictions) {
        stats.modelVersions.add(prediction.model_version);
        
        const accuracy = await prediction.getPredictionAccuracy();
        if (accuracy) {
          stats.predictionsWithActuals++;
          totalAccuracy += accuracy.accuracy;
          totalDifference += accuracy.difference;
          
          if (accuracy.difference <= 10) {
            stats.accuratePredictions++;
          }
        }
      }

      if (stats.predictionsWithActuals > 0) {
        stats.averageAccuracy = totalAccuracy / stats.predictionsWithActuals;
        stats.averageDifference = totalDifference / stats.predictionsWithActuals;
        stats.accuracyPercentage = (stats.accuratePredictions / stats.predictionsWithActuals) * 100;
      }

      stats.modelVersions = Array.from(stats.modelVersions);
      
      return stats;
    }

    // Static method to get predictions that need input data for training
    static async getPredictionsForTraining(subjectId = null) {
      const whereClause = {};
      if (subjectId) whereClause.subject_id = subjectId;

      return await MLPrediction.findAll({
        where: whereClause,
        include: [
          {
            model: sequelize.models.Student,
            as: 'student',
            include: [{
              model: sequelize.models.Mark,
              as: 'marks',
              where: {
                exam_type: ['series_test_1', 'series_test_2', 'lab_internal']
              },
              required: true
            }]
          },
          {
            model: sequelize.models.Subject,
            as: 'subject'
          }
        ]
      });
    }

    // Static method to bulk create predictions
    static async bulkCreatePredictions(predictionsData) {
      const results = [];
      
      for (const data of predictionsData) {
        try {
          const prediction = await MLPrediction.createOrUpdatePrediction(
            data.student_id,
            data.subject_id,
            data.predicted_marks,
            data.input_features,
            data.model_version,
            data.confidence_score
          );
          results.push({ success: true, prediction, data });
        } catch (error) {
          results.push({ success: false, error: error.message, data });
        }
      }

      return results;
    }
  }

  MLPrediction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      }
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    predicted_marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },
    input_features: {
      type: DataTypes.JSON,
      allowNull: false
    },
    model_version: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    is_visible_to_student: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'MLPrediction',
    tableName: 'ml_predictions',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'subject_id']
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['subject_id']
      },
      {
        fields: ['model_version']
      },
      {
        fields: ['is_visible_to_student']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return MLPrediction;
};