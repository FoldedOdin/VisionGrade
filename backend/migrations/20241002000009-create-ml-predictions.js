'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ml_predictions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subject_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subjects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      predicted_marks: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      confidence_score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      input_features: {
        type: Sequelize.JSON,
        allowNull: false
      },
      model_version: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      is_visible_to_student: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('ml_predictions', ['student_id', 'subject_id'], {
      unique: true,
      name: 'ml_predictions_unique_student_subject'
    });

    await queryInterface.addIndex('ml_predictions', ['student_id'], {
      name: 'ml_predictions_student_id_index'
    });

    await queryInterface.addIndex('ml_predictions', ['subject_id'], {
      name: 'ml_predictions_subject_id_index'
    });

    await queryInterface.addIndex('ml_predictions', ['model_version'], {
      name: 'ml_predictions_model_version_index'
    });

    await queryInterface.addIndex('ml_predictions', ['is_visible_to_student'], {
      name: 'ml_predictions_is_visible_index'
    });

    await queryInterface.addIndex('ml_predictions', ['created_at'], {
      name: 'ml_predictions_created_at_index'
    });

    // Add constraints
    await queryInterface.addConstraint('ml_predictions', {
      fields: ['predicted_marks'],
      type: 'check',
      name: 'predicted_marks_range_check',
      where: {
        predicted_marks: {
          [Sequelize.Op.between]: [0, 100]
        }
      }
    });

    await queryInterface.addConstraint('ml_predictions', {
      fields: ['confidence_score'],
      type: 'check',
      name: 'confidence_score_range_check',
      where: {
        [Sequelize.Op.or]: [
          { confidence_score: null },
          {
            confidence_score: {
              [Sequelize.Op.between]: [0, 1]
            }
          }
        ]
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ml_predictions');
  }
};