'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_settings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      setting_key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      setting_value: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('system_settings', ['setting_key'], {
      unique: true,
      name: 'system_settings_key_unique'
    });

    await queryInterface.addIndex('system_settings', ['updated_by'], {
      name: 'system_settings_updated_by_index'
    });

    await queryInterface.addIndex('system_settings', ['updated_at'], {
      name: 'system_settings_updated_at_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('system_settings');
  }
};