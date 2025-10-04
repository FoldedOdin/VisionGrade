'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('marks', {
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
      exam_type: {
        type: Sequelize.ENUM('series_test_1', 'series_test_2', 'lab_internal', 'university'),
        allowNull: false
      },
      marks_obtained: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      max_marks: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      faculty_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'faculty',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('marks', ['student_id', 'subject_id', 'exam_type'], {
      unique: true,
      name: 'marks_unique_student_subject_exam'
    });

    await queryInterface.addIndex('marks', ['student_id'], {
      name: 'marks_student_id_index'
    });

    await queryInterface.addIndex('marks', ['subject_id'], {
      name: 'marks_subject_id_index'
    });

    await queryInterface.addIndex('marks', ['faculty_id'], {
      name: 'marks_faculty_id_index'
    });

    await queryInterface.addIndex('marks', ['exam_type'], {
      name: 'marks_exam_type_index'
    });

    await queryInterface.addIndex('marks', ['created_at'], {
      name: 'marks_created_at_index'
    });

    // Add constraints
    await queryInterface.addConstraint('marks', {
      fields: ['marks_obtained'],
      type: 'check',
      name: 'marks_obtained_check',
      where: {
        marks_obtained: {
          [Sequelize.Op.gte]: 0
        }
      }
    });

    await queryInterface.addConstraint('marks', {
      fields: ['max_marks'],
      type: 'check',
      name: 'max_marks_check',
      where: {
        max_marks: {
          [Sequelize.Op.gt]: 0
        }
      }
    });

    await queryInterface.addConstraint('marks', {
      fields: ['marks_obtained', 'max_marks'],
      type: 'check',
      name: 'marks_obtained_not_more_than_max',
      where: Sequelize.literal('marks_obtained <= max_marks')
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('marks');
  }
};