const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Notification extends Model {
    static associate(models) {
      // Notification belongs to User (recipient)
      Notification.belongsTo(models.User, {
        foreignKey: 'recipient_id',
        as: 'recipient'
      });

      // Notification belongs to User (sender)
      Notification.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
      });
    }

    // Instance method to mark notification as read
    async markAsRead() {
      if (!this.is_read) {
        await this.update({ is_read: true });
      }
      return this;
    }

    // Instance method to get notification age in hours
    getAgeInHours() {
      const now = new Date();
      const created = new Date(this.created_at);
      return Math.floor((now - created) / (1000 * 60 * 60));
    }

    // Instance method to check if notification is recent (less than 24 hours)
    isRecent() {
      return this.getAgeInHours() < 24;
    }

    // Static method to create system notification (from admin)
    static async createSystemNotification(recipientId, title, message, senderId = null) {
      return await Notification.create({
        recipient_id: recipientId,
        sender_id: senderId,
        notification_type: 'system',
        title: title,
        message: message
      });
    }

    // Static method to create academic notification (from faculty)
    static async createAcademicNotification(recipientId, senderId, title, message) {
      return await Notification.create({
        recipient_id: recipientId,
        sender_id: senderId,
        notification_type: 'academic',
        title: title,
        message: message
      });
    }

    // Static method to create automatic notification (system generated)
    static async createAutoNotification(recipientId, title, message) {
      return await Notification.create({
        recipient_id: recipientId,
        sender_id: null,
        notification_type: 'auto',
        title: title,
        message: message
      });
    }

    // Static method to create low attendance alert
    static async createLowAttendanceAlert(studentId, subjectName, attendancePercentage) {
      const title = 'Low Attendance Alert';
      const message = `Your attendance in ${subjectName} is ${attendancePercentage.toFixed(1)}%, which is below the required 75%. Please improve your attendance to avoid academic issues.`;
      
      return await Notification.createAutoNotification(studentId, title, message);
    }

    // Static method to create at-risk student alert for faculty
    static async createAtRiskStudentAlert(facultyId, studentName, subjectName, reason) {
      const title = 'At-Risk Student Alert';
      const message = `Student ${studentName} in ${subjectName} is at risk due to ${reason}. Please consider providing additional support.`;
      
      return await Notification.createAutoNotification(facultyId, title, message);
    }

    // Static method to send bulk notifications
    static async sendBulkNotifications(recipientIds, title, message, senderId = null, notificationType = 'system') {
      const notifications = recipientIds.map(recipientId => ({
        recipient_id: recipientId,
        sender_id: senderId,
        notification_type: notificationType,
        title: title,
        message: message,
        created_at: new Date()
      }));

      return await Notification.bulkCreate(notifications);
    }

    // Static method to send subject-specific announcement
    static async sendSubjectAnnouncement(subjectId, title, message, senderId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      // Get all students enrolled in the subject
      const enrollments = await sequelize.models.StudentSubject.findAll({
        where: {
          subject_id: subjectId,
          academic_year: currentYear
        },
        include: [{
          model: sequelize.models.Student,
          as: 'student',
          include: [{
            model: sequelize.models.User,
            as: 'user'
          }]
        }]
      });

      const recipientIds = enrollments.map(enrollment => enrollment.student.user_id);
      
      if (recipientIds.length === 0) {
        return [];
      }

      return await Notification.sendBulkNotifications(
        recipientIds, 
        title, 
        message, 
        senderId, 
        'academic'
      );
    }

    // Static method to get user notifications with pagination
    static async getUserNotifications(userId, options = {}) {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        notificationType = null
      } = options;

      const whereClause = { recipient_id: userId };
      
      if (unreadOnly) {
        whereClause.is_read = false;
      }
      
      if (notificationType) {
        whereClause.notification_type = notificationType;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await Notification.findAndCountAll({
        where: whereClause,
        include: [{
          model: sequelize.models.User,
          as: 'sender',
          attributes: ['id', 'unique_id', 'role'],
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: limit,
        offset: offset
      });

      return {
        notifications: rows,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      };
    }

    // Static method to get notification statistics for a user
    static async getUserNotificationStats(userId) {
      const stats = await Notification.findAll({
        where: { recipient_id: userId },
        attributes: [
          'notification_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.cast(sequelize.col('is_read'), 'integer')), 'read_count']
        ],
        group: ['notification_type'],
        raw: true
      });

      const result = {
        total: 0,
        unread: 0,
        byType: {}
      };

      stats.forEach(stat => {
        const count = parseInt(stat.count);
        const readCount = parseInt(stat.read_count) || 0;
        const unreadCount = count - readCount;

        result.total += count;
        result.unread += unreadCount;
        
        result.byType[stat.notification_type] = {
          total: count,
          read: readCount,
          unread: unreadCount
        };
      });

      return result;
    }

    // Static method to mark multiple notifications as read
    static async markMultipleAsRead(notificationIds, userId) {
      const [updatedCount] = await Notification.update(
        { is_read: true },
        {
          where: {
            id: notificationIds,
            recipient_id: userId,
            is_read: false
          }
        }
      );

      return updatedCount;
    }

    // Static method to delete old notifications (cleanup)
    static async deleteOldNotifications(daysOld = 90) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await Notification.destroy({
        where: {
          created_at: {
            [sequelize.Sequelize.Op.lt]: cutoffDate
          },
          is_read: true
        }
      });

      return deletedCount;
    }

    // Static method to get recent notifications for dashboard
    static async getRecentNotifications(userId, limit = 5) {
      return await Notification.findAll({
        where: { recipient_id: userId },
        include: [{
          model: sequelize.models.User,
          as: 'sender',
          attributes: ['id', 'unique_id', 'role'],
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: limit
      });
    }
  }

  Notification.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    notification_type: {
      type: DataTypes.ENUM('system', 'academic', 'auto'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: false,
    indexes: [
      {
        fields: ['recipient_id']
      },
      {
        fields: ['sender_id']
      },
      {
        fields: ['notification_type']
      },
      {
        fields: ['is_read']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['recipient_id', 'is_read']
      },
      {
        fields: ['recipient_id', 'created_at']
      }
    ]
  });

  return Notification;
};