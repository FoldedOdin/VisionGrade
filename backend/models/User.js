const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      // User has one Student profile
      User.hasOne(models.Student, {
        foreignKey: 'user_id',
        as: 'student'
      });

      // User has one Faculty profile
      User.hasOne(models.Faculty, {
        foreignKey: 'user_id',
        as: 'faculty'
      });

      // Backward compatibility aliases
      User.hasOne(models.Student, {
        foreignKey: 'user_id',
        as: 'studentProfile'
      });

      User.hasOne(models.Faculty, {
        foreignKey: 'user_id',
        as: 'facultyProfile'
      });

      // User can receive many notifications
      User.hasMany(models.Notification, {
        foreignKey: 'recipient_id',
        as: 'receivedNotifications'
      });

      // User can send many notifications
      User.hasMany(models.Notification, {
        foreignKey: 'sender_id',
        as: 'sentNotifications'
      });
    }

    // Instance method to get user's full profile
    async getFullProfile() {
      const profile = {
        id: this.id,
        unique_id: this.unique_id,
        email: this.email,
        phone: this.phone,
        role: this.role,
        profile_photo: this.profile_photo,
        created_at: this.created_at
      };

      if (this.role === 'student') {
        profile.studentProfile = await this.getStudentProfile();
      } else if (this.role === 'faculty' || this.role === 'tutor') {
        profile.facultyProfile = await this.getFacultyProfile();
      }

      return profile;
    }

    // Static method to generate unique ID
    static async generateUniqueId(role) {
      const prefix = {
        'student': 'STU',
        'faculty': 'FAC',
        'tutor': 'TUT',
        'admin': 'ADM'
      };

      const currentYear = new Date().getFullYear().toString().slice(-2);
      const rolePrefix = prefix[role] || 'USR';
      
      // Find the highest existing ID for this role and year
      const lastUser = await User.findOne({
        where: {
          unique_id: {
            [sequelize.Sequelize.Op.like]: `${rolePrefix}${currentYear}%`
          }
        },
        order: [['unique_id', 'DESC']]
      });

      let nextNumber = 1;
      if (lastUser) {
        const lastNumber = parseInt(lastUser.unique_id.slice(-4));
        nextNumber = lastNumber + 1;
      }

      return `${rolePrefix}${currentYear}${nextNumber.toString().padStart(4, '0')}`;
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    unique_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(15),
      unique: true,
      validate: {
        is: /^[+]?[\d\s\-()]+$/
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('student', 'faculty', 'tutor', 'admin'),
      allowNull: false
    },
    profile_photo: {
      type: DataTypes.STRING(255),
      defaultValue: null
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['unique_id']
      },
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      }
    ]
  });

  return User;
};