'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('faculty', {
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
      faculty_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_tutor: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      tutor_semester: {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('faculty', ['user_id'], {
      name: 'faculty_user_id_index'
    });

    await queryInterface.addIndex('faculty', ['is_tutor'], {
      name: 'faculty_is_tutor_index'
    });

    await queryInterface.addIndex('faculty', ['tutor_semester'], {
      name: 'faculty_tutor_semester_index'
    });

    await queryInterface.addIndex('faculty', ['department'], {
      name: 'faculty_department_index'
    });

    // Add constraints
    await queryInterface.addConstraint('faculty', {
      fields: ['tutor_semester'],
      type: 'check',
      name: 'faculty_tutor_semester_check',
      where: {
        [Sequelize.Op.or]: [
          { tutor_semester: null },
          {
            tutor_semester: {
              [Sequelize.Op.between]: [1, 8]
            }
          }
        ]
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('faculty');
  }
};