'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('students', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      student_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      semester: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      batch_year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      graduation_status: {
        type: Sequelize.ENUM('active', 'graduated', 'dropped'),
        defaultValue: 'active'
      }
    });

    // Add indexes
    await queryInterface.addIndex('students', ['user_id'], {
      name: 'students_user_id_index'
    });

    await queryInterface.addIndex('students', ['semester'], {
      name: 'students_semester_index'
    });

    await queryInterface.addIndex('students', ['batch_year'], {
      name: 'students_batch_year_index'
    });

    await queryInterface.addIndex('students', ['graduation_status'], {
      name: 'students_graduation_status_index'
    });

    // Add constraints
    await queryInterface.addConstraint('students', {
      fields: ['semester'],
      type: 'check',
      name: 'students_semester_check',
      where: {
        semester: {
          [Sequelize.Op.between]: [1, 8]
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('students');
  }
};