'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('faculty_subjects', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      faculty_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'faculty',
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
    await queryInterface.addIndex('faculty_subjects', ['faculty_id', 'subject_id', 'academic_year'], {
      unique: true,
      name: 'faculty_subjects_unique_assignment'
    });

    await queryInterface.addIndex('faculty_subjects', ['faculty_id'], {
      name: 'faculty_subjects_faculty_id_index'
    });

    await queryInterface.addIndex('faculty_subjects', ['subject_id'], {
      name: 'faculty_subjects_subject_id_index'
    });

    await queryInterface.addIndex('faculty_subjects', ['academic_year'], {
      name: 'faculty_subjects_academic_year_index'
    });

    // Add constraints
    await queryInterface.addConstraint('faculty_subjects', {
      fields: ['academic_year'],
      type: 'check',
      name: 'faculty_subjects_academic_year_check',
      where: {
        academic_year: {
          [Sequelize.Op.between]: [2020, new Date().getFullYear() + 5]
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('faculty_subjects');
  }
};