const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Subject extends Model {
    static associate(models) {
      // Subject has many faculty assignments
      Subject.hasMany(models.FacultySubject, {
        foreignKey: 'subject_id',
        as: 'facultyAssignments'
      });

      // Subject has many student enrollments
      Subject.hasMany(models.StudentSubject, {
        foreignKey: 'subject_id',
        as: 'studentEnrollments'
      });

      // Subject has many marks
      Subject.hasMany(models.Mark, {
        foreignKey: 'subject_id',
        as: 'marks'
      });

      // Subject has many attendance records
      Subject.hasMany(models.Attendance, {
        foreignKey: 'subject_id',
        as: 'attendanceRecords'
      });

      // Subject has many ML predictions
      Subject.hasMany(models.MLPrediction, {
        foreignKey: 'subject_id',
        as: 'predictions'
      });

      // Many-to-many relationship with faculty through FacultySubject
      Subject.belongsToMany(models.Faculty, {
        through: models.FacultySubject,
        foreignKey: 'subject_id',
        otherKey: 'faculty_id',
        as: 'faculty'
      });

      // Many-to-many relationship with students through StudentSubject
      Subject.belongsToMany(models.Student, {
        through: models.StudentSubject,
        foreignKey: 'subject_id',
        otherKey: 'student_id',
        as: 'students'
      });
    }

    // Instance method to get enrolled students for current academic year
    async getEnrolledStudents(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      return await this.getStudents({
        through: {
          where: {
            academic_year: currentYear
          }
        },
        include: [{
          model: sequelize.models.User,
          as: 'user'
        }]
      });
    }

    // Instance method to get assigned faculty for current academic year
    async getAssignedFaculty(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      return await this.getFaculty({
        through: {
          where: {
            academic_year: currentYear
          }
        },
        include: [{
          model: sequelize.models.User,
          as: 'user'
        }]
      });
    }

    // Instance method to get subject statistics
    async getSubjectStatistics(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const enrolledStudents = await this.getEnrolledStudents(currentYear);
      const totalStudents = enrolledStudents.length;

      // Get marks for university exams
      const universityMarks = await this.getMarks({
        where: {
          exam_type: 'university'
        },
        include: [{
          model: sequelize.models.Student,
          as: 'student',
          include: [{
            model: sequelize.models.StudentSubject,
            as: 'enrollments',
            where: {
              subject_id: this.id,
              academic_year: currentYear
            }
          }]
        }]
      });

      const passedStudents = universityMarks.filter(mark => 
        (mark.marks_obtained / mark.max_marks) * 100 >= 40
      ).length;

      const averageMarks = universityMarks.length > 0 
        ? universityMarks.reduce((sum, mark) => sum + (mark.marks_obtained / mark.max_marks) * 100, 0) / universityMarks.length
        : 0;

      // Get attendance statistics
      const attendanceRecords = await this.getAttendanceRecords();
      const averageAttendance = attendanceRecords.length > 0
        ? attendanceRecords.reduce((sum, record) => sum + record.attendance_percentage, 0) / attendanceRecords.length
        : 0;

      return {
        totalStudents,
        studentsWithMarks: universityMarks.length,
        passedStudents,
        failedStudents: universityMarks.length - passedStudents,
        passPercentage: universityMarks.length > 0 ? (passedStudents / universityMarks.length) * 100 : 0,
        averageMarks: Math.round(averageMarks * 100) / 100,
        averageAttendance: Math.round(averageAttendance * 100) / 100
      };
    }

    // Static method to get subjects by semester
    static async getSubjectsBySemester(semester) {
      return await Subject.findAll({
        where: {
          semester: semester
        },
        order: [['subject_type', 'ASC'], ['subject_name', 'ASC']]
      });
    }

    // Static method to get default subjects for a semester (6 theory + 2 lab)
    static async getDefaultSemesterSubjects(semester) {
      const theorySubjects = await Subject.findAll({
        where: {
          semester: semester,
          subject_type: 'theory'
        },
        limit: 6,
        order: [['subject_name', 'ASC']]
      });

      const labSubjects = await Subject.findAll({
        where: {
          semester: semester,
          subject_type: 'lab'
        },
        limit: 2,
        order: [['subject_name', 'ASC']]
      });

      return [...theorySubjects, ...labSubjects];
    }
  }

  Subject.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subject_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    subject_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    subject_type: {
      type: DataTypes.ENUM('theory', 'lab'),
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
    credits: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 6
      }
    }
  }, {
    sequelize,
    modelName: 'Subject',
    tableName: 'subjects',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['subject_code']
      },
      {
        fields: ['semester']
      },
      {
        fields: ['subject_type']
      },
      {
        fields: ['semester', 'subject_type']
      }
    ]
  });

  return Subject;
};