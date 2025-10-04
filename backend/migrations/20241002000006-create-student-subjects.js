'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_subjects', {
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
      academic_year: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('student_subjects', ['student_id', 'subject_id', 'academic_year'], {
      unique: true,
      name: 'student_subjects_unique_enrollment'
    });

    await queryInterface.addIndex('student_subjects', ['student_id'], {
      name: 'student_subjects_student_id_index'
    });

    await queryInterface.addIndex('student_subjects', ['subject_id'], {
      name: 'student_subjects_subject_id_index'
    });

    await queryInterface.addIndex('student_subjects', ['academic_year'], {
      name: 'student_subjects_academic_year_index'
    });

    // Add constraints
    await queryInterface.addConstraint('student_subjects', {
      fields: ['academic_year'],
      type: 'check',
      name: 'student_subjects_academic_year_check',
      where: {
        academic_year: {
          [Sequelize.Op.between]: [2020, new Date().getFullYear() + 5]
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('student_subjects');
  }
};