'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      recipient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notification_type: {
        type: Sequelize.ENUM('system', 'academic', 'auto'),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_read: {
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
    await queryInterface.addIndex('notifications', ['recipient_id'], {
      name: 'notifications_recipient_id_index'
    });

    await queryInterface.addIndex('notifications', ['sender_id'], {
      name: 'notifications_sender_id_index'
    });

    await queryInterface.addIndex('notifications', ['notification_type'], {
      name: 'notifications_type_index'
    });

    await queryInterface.addIndex('notifications', ['is_read'], {
      name: 'notifications_is_read_index'
    });

    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'notifications_created_at_index'
    });

    await queryInterface.addIndex('notifications', ['recipient_id', 'is_read'], {
      name: 'notifications_recipient_read_index'
    });

    await queryInterface.addIndex('notifications', ['recipient_id', 'created_at'], {
      name: 'notifications_recipient_created_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  }
};