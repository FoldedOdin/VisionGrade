'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subjects', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      subject_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true
      },
      subject_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      subject_type: {
        type: Sequelize.ENUM('theory', 'lab'),
        allowNull: false
      },
      semester: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      credits: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      }
    });

    // Add indexes
    await queryInterface.addIndex('subjects', ['subject_code'], {
      unique: true,
      name: 'subjects_subject_code_unique'
    });

    await queryInterface.addIndex('subjects', ['semester'], {
      name: 'subjects_semester_index'
    });

    await queryInterface.addIndex('subjects', ['subject_type'], {
      name: 'subjects_subject_type_index'
    });

    await queryInterface.addIndex('subjects', ['semester', 'subject_type'], {
      name: 'subjects_semester_type_index'
    });

    // Add constraints
    await queryInterface.addConstraint('subjects', {
      fields: ['semester'],
      type: 'check',
      name: 'subjects_semester_check',
      where: {
        semester: {
          [Sequelize.Op.between]: [1, 8]
        }
      }
    });

    await queryInterface.addConstraint('subjects', {
      fields: ['credits'],
      type: 'check',
      name: 'subjects_credits_check',
      where: {
        credits: {
          [Sequelize.Op.between]: [1, 6]
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subjects');
  }
};