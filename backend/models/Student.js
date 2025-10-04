const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Student extends Model {
    static associate(models) {
      // Student belongs to User
      Student.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Student has many subject enrollments
      Student.hasMany(models.StudentSubject, {
        foreignKey: 'student_id',
        as: 'enrollments'
      });

      // Student has many marks
      Student.hasMany(models.Mark, {
        foreignKey: 'student_id',
        as: 'marks'
      });

      // Student has many attendance records
      Student.hasMany(models.Attendance, {
        foreignKey: 'student_id',
        as: 'attendanceRecords'
      });

      // Student has many ML predictions
      Student.hasMany(models.MLPrediction, {
        foreignKey: 'student_id',
        as: 'predictions'
      });

      // Many-to-many relationship with subjects through StudentSubject
      Student.belongsToMany(models.Subject, {
        through: models.StudentSubject,
        foreignKey: 'student_id',
        otherKey: 'subject_id',
        as: 'subjects'
      });
    }

    // Instance method to get current semester subjects
    async getCurrentSemesterSubjects() {
      return await this.getSubjects({
        where: {
          semester: this.semester
        }
      });
    }

    // Instance method to calculate overall attendance
    async getOverallAttendance() {
      const attendanceRecords = await this.getAttendanceRecords();
      if (attendanceRecords.length === 0) return 0;

      const totalClasses = attendanceRecords.reduce((sum, record) => sum + record.total_classes, 0);
      const attendedClasses = attendanceRecords.reduce((sum, record) => sum + record.attended_classes, 0);

      return totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
    }

    // Instance method to get academic performance summary
    async getPerformanceSummary() {
      const marks = await this.getMarks({
        include: [{
          model: sequelize.models.Subject,
          as: 'subject'
        }]
      });

      const summary = {
        totalSubjects: 0,
        averageMarks: 0,
        passedSubjects: 0,
        failedSubjects: 0
      };

      if (marks.length === 0) return summary;

      const subjectMarks = {};
      marks.forEach(mark => {
        if (!subjectMarks[mark.subject_id]) {
          subjectMarks[mark.subject_id] = {
            subject: mark.subject,
            marks: []
          };
        }
        subjectMarks[mark.subject_id].marks.push(mark);
      });

      summary.totalSubjects = Object.keys(subjectMarks).length;
      let totalMarks = 0;
      let subjectCount = 0;

      Object.values(subjectMarks).forEach(subjectData => {
        const universityMark = subjectData.marks.find(m => m.exam_type === 'university');
        if (universityMark) {
          totalMarks += (universityMark.marks_obtained / universityMark.max_marks) * 100;
          subjectCount++;
          
          if ((universityMark.marks_obtained / universityMark.max_marks) * 100 >= 40) {
            summary.passedSubjects++;
          } else {
            summary.failedSubjects++;
          }
        }
      });

      summary.averageMarks = subjectCount > 0 ? totalMarks / subjectCount : 0;
      return summary;
    }
  }

  Student.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    student_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 8
      }
    },
    batch_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2020,
        max: new Date().getFullYear() + 5
      }
    },
    graduation_status: {
      type: DataTypes.ENUM('active', 'graduated', 'dropped'),
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'Student',
    tableName: 'students',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['semester']
      },
      {
        fields: ['batch_year']
      },
      {
        fields: ['graduation_status']
      }
    ]
  });

  return Student;
};