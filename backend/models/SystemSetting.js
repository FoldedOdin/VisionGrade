const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SystemSetting extends Model {
    static associate(models) {
      // SystemSetting belongs to User (who updated it)
      SystemSetting.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'updatedBy'
      });
    }

    // Instance method to get parsed value (for JSON settings)
    getParsedValue() {
      try {
        return JSON.parse(this.setting_value);
      } catch (error) {
        return this.setting_value;
      }
    }

    // Static method to get setting value by key
    static async getSetting(key, defaultValue = null) {
      const setting = await SystemSetting.findOne({
        where: { setting_key: key }
      });

      if (!setting) {
        return defaultValue;
      }

      try {
        return JSON.parse(setting.setting_value);
      } catch (error) {
        return setting.setting_value;
      }
    }

    // Static method to set setting value
    static async setSetting(key, value, updatedBy = null) {
      const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      const [setting, created] = await SystemSetting.findOrCreate({
        where: { setting_key: key },
        defaults: {
          setting_key: key,
          setting_value: settingValue,
          updated_by: updatedBy
        }
      });

      if (!created) {
        await setting.update({
          setting_value: settingValue,
          updated_by: updatedBy,
          updated_at: new Date()
        });
      }

      return setting;
    }

    // Static method to get multiple settings
    static async getMultipleSettings(keys) {
      const settings = await SystemSetting.findAll({
        where: {
          setting_key: keys
        }
      });

      const result = {};
      settings.forEach(setting => {
        try {
          result[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch (error) {
          result[setting.setting_key] = setting.setting_value;
        }
      });

      return result;
    }

    // Static method to get all settings
    static async getAllSettings() {
      const settings = await SystemSetting.findAll({
        include: [{
          model: sequelize.models.User,
          as: 'updatedBy',
          attributes: ['id', 'unique_id', 'role']
        }],
        order: [['setting_key', 'ASC']]
      });

      const result = {};
      settings.forEach(setting => {
        try {
          result[setting.setting_key] = {
            value: JSON.parse(setting.setting_value),
            updated_at: setting.updated_at,
            updated_by: setting.updatedBy
          };
        } catch (error) {
          result[setting.setting_key] = {
            value: setting.setting_value,
            updated_at: setting.updated_at,
            updated_by: setting.updatedBy
          };
        }
      });

      return result;
    }

    // Static method to initialize default settings
    static async initializeDefaultSettings() {
      const defaultSettings = {
        'attendance_threshold': 75,
        'ml_predictions_enabled': true,
        'notification_retention_days': 90,
        'max_file_upload_size': 5242880, // 5MB
        'academic_year': new Date().getFullYear(),
        'semester_promotion_enabled': true,
        'auto_attendance_alerts': true,
        'prediction_accuracy_threshold': 10,
        'system_maintenance_mode': false,
        'default_semester_subjects': {
          theory: 6,
          lab: 2
        },
        'grade_boundaries': {
          'A+': 90,
          'A': 80,
          'B+': 70,
          'B': 60,
          'C+': 50,
          'C': 40,
          'F': 0
        },
        'exam_marks_config': {
          'series_test_1': { min: 0, max: 50 },
          'series_test_2': { min: 0, max: 50 },
          'lab_internal': { min: 0, max: 50 },
          'university': { min: 0, max: 100 }
        }
      };

      const results = [];
      for (const [key, value] of Object.entries(defaultSettings)) {
        const existing = await SystemSetting.findOne({
          where: { setting_key: key }
        });

        if (!existing) {
          const setting = await SystemSetting.setSetting(key, value);
          results.push({ key, created: true, setting });
        } else {
          results.push({ key, created: false, setting: existing });
        }
      }

      return results;
    }

    // Static method to backup settings
    static async backupSettings() {
      const settings = await SystemSetting.findAll({
        attributes: ['setting_key', 'setting_value'],
        order: [['setting_key', 'ASC']]
      });

      const backup = {
        timestamp: new Date().toISOString(),
        settings: {}
      };

      settings.forEach(setting => {
        backup.settings[setting.setting_key] = setting.setting_value;
      });

      return backup;
    }

    // Static method to restore settings from backup
    static async restoreSettings(backupData, updatedBy = null) {
      if (!backupData.settings) {
        throw new Error('Invalid backup data format');
      }

      const results = [];
      for (const [key, value] of Object.entries(backupData.settings)) {
        try {
          const setting = await SystemSetting.setSetting(key, value, updatedBy);
          results.push({ key, success: true, setting });
        } catch (error) {
          results.push({ key, success: false, error: error.message });
        }
      }

      return results;
    }

    // Static method to get settings by category (based on key prefix)
    static async getSettingsByCategory(category) {
      const settings = await SystemSetting.findAll({
        where: {
          setting_key: {
            [sequelize.Sequelize.Op.like]: `${category}%`
          }
        },
        order: [['setting_key', 'ASC']]
      });

      const result = {};
      settings.forEach(setting => {
        try {
          result[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch (error) {
          result[setting.setting_key] = setting.setting_value;
        }
      });

      return result;
    }

    // Static method to delete setting
    static async deleteSetting(key) {
      const deletedCount = await SystemSetting.destroy({
        where: { setting_key: key }
      });

      return deletedCount > 0;
    }
  }

  SystemSetting.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    setting_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'SystemSetting',
    tableName: 'system_settings',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['setting_key']
      },
      {
        fields: ['updated_by']
      },
      {
        fields: ['updated_at']
      }
    ]
  });

  return SystemSetting;
};