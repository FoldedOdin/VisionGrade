const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Attendance extends Model {
    static associate(models) {
      // Attendance belongs to Student
      Attendance.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student'
      });

      // Attendance belongs to Subject
      Attendance.belongsTo(models.Subject, {
        foreignKey: 'subject_id',
        as: 'subject'
      });

      // Attendance belongs to Faculty (who updated the attendance)
      Attendance.belongsTo(models.Faculty, {
        foreignKey: 'faculty_id',
        as: 'faculty'
      });
    }

    // Instance method to check if attendance is below threshold
    isBelowThreshold(threshold = 75) {
      return this.attendance_percentage < threshold;
    }

    // Instance method to calculate required classes to reach threshold
    getRequiredClassesToReachThreshold(threshold = 75) {
      if (this.attendance_percentage >= threshold) {
        return 0;
      }

      // Formula: (attended + x) / (total + x) = threshold/100
      // Solving for x: x = (threshold * total - 100 * attended) / (100 - threshold)
      const numerator = (threshold * this.total_classes) - (100 * this.attended_classes);
      const denominator = 100 - threshold;
      
      return denominator > 0 ? Math.ceil(numerator / denominator) : 0;
    }

    // Instance method to calculate maximum classes that can be missed
    getMaxClassesToMiss(threshold = 75) {
      if (this.attendance_percentage < threshold) {
        return 0;
      }

      // Formula: (attended) / (total + x) = threshold/100
      // Solving for x: x = (100 * attended / threshold) - total
      const maxTotal = (100 * this.attended_classes) / threshold;
      const maxMissable = Math.floor(maxTotal - this.total_classes);
      
      return Math.max(0, maxMissable);
    }

    // Static method to update attendance for a student-subject
    static async updateAttendance(studentId, subjectId, totalClasses, attendedClasses, facultyId) {
      if (attendedClasses > totalClasses) {
        throw new Error('Attended classes cannot be more than total classes');
      }

      if (totalClasses < 0 || attendedClasses < 0) {
        throw new Error('Classes count cannot be negative');
      }

      const [attendance, created] = await Attendance.findOrCreate({
        where: {
          student_id: studentId,
          subject_id: subjectId
        },
        defaults: {
          student_id: studentId,
          subject_id: subjectId,
          total_classes: totalClasses,
          attended_classes: attendedClasses,
          faculty_id: facultyId
        }
      });

      if (!created) {
        await attendance.update({
          total_classes: totalClasses,
          attended_classes: attendedClasses,
          faculty_id: facultyId,
          updated_at: new Date()
        });
      }

      return attendance;
    }

    // Static method to bulk update attendance for multiple students
    static async bulkUpdateAttendance(attendanceData, facultyId) {
      const results = [];
      
      for (const data of attendanceData) {
        try {
          const attendance = await Attendance.updateAttendance(
            data.student_id,
            data.subject_id,
            data.total_classes,
            data.attended_classes,
            facultyId
          );
          results.push({ success: true, attendance, data });
        } catch (error) {
          results.push({ success: false, error: error.message, data });
        }
      }

      return results;
    }

    // Static method to get students with low attendance
    static async getStudentsWithLowAttendance(threshold = 75, subjectId = null) {
      const whereClause = {
        [sequelize.Sequelize.Op.and]: [
          sequelize.literal(`(attended_classes * 100.0 / total_classes) < ${threshold}`)
        ]
      };

      if (subjectId) {
        whereClause.subject_id = subjectId;
      }

      return await Attendance.findAll({
        where: whereClause,
        include: [
          {
            model: sequelize.models.Student,
            as: 'student',
            include: [{
              model: sequelize.models.User,
              as: 'user'
            }]
          },
          {
            model: sequelize.models.Subject,
            as: 'subject'
          }
        ],
        order: [['attendance_percentage', 'ASC']]
      });
    }

    // Static method to get attendance statistics for a subject
    static async getSubjectAttendanceStats(subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const attendanceRecords = await Attendance.findAll({
        where: {
          subject_id: subjectId
        },
        include: [
          {
            model: sequelize.models.Student,
            as: 'student',
            include: [{
              model: sequelize.models.StudentSubject,
              as: 'enrollments',
              where: {
                subject_id: subjectId,
                academic_year: currentYear
              }
            }]
          }
        ]
      });

      if (attendanceRecords.length === 0) {
        return {
          totalStudents: 0,
          averageAttendance: 0,
          studentsAboveThreshold: 0,
          studentsBelowThreshold: 0,
          highestAttendance: 0,
          lowestAttendance: 0
        };
      }

      const totalStudents = attendanceRecords.length;
      const totalAttendance = attendanceRecords.reduce((sum, record) => sum + record.attendance_percentage, 0);
      const averageAttendance = totalAttendance / totalStudents;
      
      const studentsAboveThreshold = attendanceRecords.filter(record => record.attendance_percentage >= 75).length;
      const studentsBelowThreshold = totalStudents - studentsAboveThreshold;
      
      const attendancePercentages = attendanceRecords.map(record => record.attendance_percentage);
      const highestAttendance = Math.max(...attendancePercentages);
      const lowestAttendance = Math.min(...attendancePercentages);

      return {
        totalStudents,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        studentsAboveThreshold,
        studentsBelowThreshold,
        thresholdPassPercentage: (studentsAboveThreshold / totalStudents) * 100,
        highestAttendance,
        lowestAttendance
      };
    }

    // Static method to get student's overall attendance across all subjects
    static async getStudentOverallAttendance(studentId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const attendanceRecords = await Attendance.findAll({
        where: {
          student_id: studentId
        },
        include: [
          {
            model: sequelize.models.Subject,
            as: 'subject'
          },
          {
            model: sequelize.models.StudentSubject,
            as: 'enrollment',
            where: {
              student_id: studentId,
              academic_year: currentYear
            },
            required: false
          }
        ]
      });

      if (attendanceRecords.length === 0) {
        return {
          overallPercentage: 0,
          totalClasses: 0,
          attendedClasses: 0,
          subjectWiseAttendance: []
        };
      }

      const totalClasses = attendanceRecords.reduce((sum, record) => sum + record.total_classes, 0);
      const attendedClasses = attendanceRecords.reduce((sum, record) => sum + record.attended_classes, 0);
      const overallPercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

      const subjectWiseAttendance = attendanceRecords.map(record => ({
        subject: record.subject,
        attendance_percentage: record.attendance_percentage,
        total_classes: record.total_classes,
        attended_classes: record.attended_classes,
        is_below_threshold: record.isBelowThreshold(),
        required_classes_to_reach_threshold: record.getRequiredClassesToReachThreshold(),
        max_classes_to_miss: record.getMaxClassesToMiss()
      }));

      return {
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        totalClasses,
        attendedClasses,
        subjectWiseAttendance
      };
    }
  }

  Attendance.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      }
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    total_classes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        isInt: true
      }
    },
    attended_classes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        isInt: true
      }
    },
    attendance_percentage: {
      type: DataTypes.VIRTUAL(DataTypes.DECIMAL(5, 2)),
      get() {
        const total = this.getDataValue('total_classes');
        const attended = this.getDataValue('attended_classes');
        return total > 0 ? Math.round(((attended / total) * 100) * 100) / 100 : 0;
      }
    },
    faculty_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'faculty',
        key: 'id'
      }
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Attendance',
    tableName: 'attendance',
    timestamps: false,
    validate: {
      attendedNotMoreThanTotal() {
        if (this.attended_classes > this.total_classes) {
          throw new Error('Attended classes cannot be more than total classes');
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'subject_id']
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['subject_id']
      },
      {
        fields: ['faculty_id']
      },
      {
        fields: ['updated_at']
      }
    ]
  });

  return Attendance;
};