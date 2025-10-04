'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance', {
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
      total_classes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      attended_classes: {
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
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('attendance', ['student_id', 'subject_id'], {
      unique: true,
      name: 'attendance_unique_student_subject'
    });

    await queryInterface.addIndex('attendance', ['student_id'], {
      name: 'attendance_student_id_index'
    });

    await queryInterface.addIndex('attendance', ['subject_id'], {
      name: 'attendance_subject_id_index'
    });

    await queryInterface.addIndex('attendance', ['faculty_id'], {
      name: 'attendance_faculty_id_index'
    });

    await queryInterface.addIndex('attendance', ['updated_at'], {
      name: 'attendance_updated_at_index'
    });

    // Add constraints
    await queryInterface.addConstraint('attendance', {
      fields: ['total_classes'],
      type: 'check',
      name: 'total_classes_check',
      where: {
        total_classes: {
          [Sequelize.Op.gte]: 0
        }
      }
    });

    await queryInterface.addConstraint('attendance', {
      fields: ['attended_classes'],
      type: 'check',
      name: 'attended_classes_check',
      where: {
        attended_classes: {
          [Sequelize.Op.gte]: 0
        }
      }
    });

    await queryInterface.addConstraint('attendance', {
      fields: ['attended_classes', 'total_classes'],
      type: 'check',
      name: 'attended_not_more_than_total',
      where: Sequelize.literal('attended_classes <= total_classes')
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('attendance');
  }
};