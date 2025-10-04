const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Faculty extends Model {
    static associate(models) {
      // Faculty belongs to User
      Faculty.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Faculty has many subject assignments
      Faculty.hasMany(models.FacultySubject, {
        foreignKey: 'faculty_id',
        as: 'subjectAssignments'
      });

      // Faculty has many marks entries
      Faculty.hasMany(models.Mark, {
        foreignKey: 'faculty_id',
        as: 'marksEntered'
      });

      // Faculty has many attendance entries
      Faculty.hasMany(models.Attendance, {
        foreignKey: 'faculty_id',
        as: 'attendanceRecords'
      });

      // Many-to-many relationship with subjects through FacultySubject
      Faculty.belongsToMany(models.Subject, {
        through: models.FacultySubject,
        foreignKey: 'faculty_id',
        otherKey: 'subject_id',
        as: 'subjects'
      });
    }

    // Instance method to get assigned subjects for current academic year
    async getAssignedSubjects(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      return await this.getSubjects({
        through: {
          where: {
            academic_year: currentYear
          }
        }
      });
    }

    // Instance method to get students for assigned subjects
    async getAssignedStudents(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const subjects = await this.getAssignedSubjects(currentYear);
      const subjectIds = subjects.map(subject => subject.id);

      if (subjectIds.length === 0) return [];

      const students = await sequelize.models.Student.findAll({
        include: [{
          model: sequelize.models.StudentSubject,
          as: 'enrollments',
          where: {
            subject_id: subjectIds,
            academic_year: currentYear
          },
          include: [{
            model: sequelize.models.Subject,
            as: 'subject'
          }]
        }, {
          model: sequelize.models.User,
          as: 'user'
        }]
      });

      return students;
    }

    // Instance method to check if faculty can access a subject
    async canAccessSubject(subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const assignment = await sequelize.models.FacultySubject.findOne({
        where: {
          faculty_id: this.id,
          subject_id: subjectId,
          academic_year: currentYear
        }
      });

      return !!assignment;
    }

    // Instance method to get performance insights for assigned subjects
    async getPerformanceInsights(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      const subjects = await this.getAssignedSubjects(currentYear);
      
      const insights = [];

      for (const subject of subjects) {
        const marks = await sequelize.models.Mark.findAll({
          where: {
            subject_id: subject.id,
            exam_type: 'university'
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

        const totalStudents = marks.length;
        const passedStudents = marks.filter(mark => 
          (mark.marks_obtained / mark.max_marks) * 100 >= 40
        ).length;
        const failedStudents = totalStudents - passedStudents;

        const averageMarks = totalStudents > 0 
          ? marks.reduce((sum, mark) => sum + (mark.marks_obtained / mark.max_marks) * 100, 0) / totalStudents
          : 0;

        insights.push({
          subject: subject,
          totalStudents,
          passedStudents,
          failedStudents,
          passPercentage: totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0,
          averageMarks: Math.round(averageMarks * 100) / 100
        });
      }

      return insights;
    }
  }

  Faculty.init({
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
    faculty_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_tutor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    tutor_semester: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 8
      }
    }
  }, {
    sequelize,
    modelName: 'Faculty',
    tableName: 'faculty',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_tutor']
      },
      {
        fields: ['tutor_semester']
      },
      {
        fields: ['department']
      }
    ]
  });

  return Faculty;
};