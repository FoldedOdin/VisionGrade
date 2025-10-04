const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Mark extends Model {
    static associate(models) {
      // Mark belongs to Student
      Mark.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student'
      });

      // Mark belongs to Subject
      Mark.belongsTo(models.Subject, {
        foreignKey: 'subject_id',
        as: 'subject'
      });

      // Mark belongs to Faculty (who entered the marks)
      Mark.belongsTo(models.Faculty, {
        foreignKey: 'faculty_id',
        as: 'faculty'
      });
    }

    // Instance method to calculate percentage
    getPercentage() {
      return this.max_marks > 0 ? (this.marks_obtained / this.max_marks) * 100 : 0;
    }

    // Instance method to check if passed
    isPassed() {
      return this.getPercentage() >= 40;
    }

    // Instance method to get grade
    getGrade() {
      const percentage = this.getPercentage();
      
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B+';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C+';
      if (percentage >= 40) return 'C';
      return 'F';
    }

    // Static method to validate marks based on exam type
    static validateMarks(examType, marksObtained, maxMarks) {
      const validationRules = {
        'series_test_1': { min: 0, max: 50 },
        'series_test_2': { min: 0, max: 50 },
        'lab_internal': { min: 0, max: 50 },
        'university': { min: 0, max: 100 }
      };

      const rule = validationRules[examType];
      if (!rule) {
        throw new Error(`Invalid exam type: ${examType}`);
      }

      if (maxMarks !== rule.max) {
        throw new Error(`Max marks for ${examType} should be ${rule.max}, got ${maxMarks}`);
      }

      if (marksObtained < rule.min || marksObtained > rule.max) {
        throw new Error(`Marks obtained for ${examType} should be between ${rule.min} and ${rule.max}, got ${marksObtained}`);
      }

      return true;
    }

    // Static method to get marks summary for a student
    static async getStudentMarksSummary(studentId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const marks = await Mark.findAll({
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
        ],
        order: [
          [{ model: sequelize.models.Subject, as: 'subject' }, 'semester', 'ASC'],
          [{ model: sequelize.models.Subject, as: 'subject' }, 'subject_name', 'ASC'],
          ['exam_type', 'ASC']
        ]
      });

      const summary = {};
      marks.forEach(mark => {
        const subjectId = mark.subject_id;
        if (!summary[subjectId]) {
          summary[subjectId] = {
            subject: mark.subject,
            marks: {},
            totalMarks: 0,
            averagePercentage: 0
          };
        }

        summary[subjectId].marks[mark.exam_type] = {
          marks_obtained: mark.marks_obtained,
          max_marks: mark.max_marks,
          percentage: mark.getPercentage(),
          grade: mark.getGrade(),
          created_at: mark.created_at
        };
      });

      // Calculate averages and totals
      Object.keys(summary).forEach(subjectId => {
        const subjectMarks = summary[subjectId].marks;
        const percentages = Object.values(subjectMarks).map(m => m.percentage);
        
        summary[subjectId].averagePercentage = percentages.length > 0 
          ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length 
          : 0;
        
        summary[subjectId].totalMarks = Object.values(subjectMarks)
          .reduce((sum, m) => sum + m.marks_obtained, 0);
      });

      return summary;
    }

    // Static method to get subject-wise performance statistics
    static async getSubjectPerformanceStats(subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const marks = await Mark.findAll({
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

      const stats = {
        totalStudents: 0,
        examTypeStats: {}
      };

      const studentMarks = {};
      marks.forEach(mark => {
        const studentId = mark.student_id;
        const examType = mark.exam_type;

        if (!studentMarks[studentId]) {
          studentMarks[studentId] = {};
        }
        studentMarks[studentId][examType] = mark;

        if (!stats.examTypeStats[examType]) {
          stats.examTypeStats[examType] = {
            totalMarks: 0,
            studentsAppeared: 0,
            passedStudents: 0,
            averageMarks: 0,
            highestMarks: 0,
            lowestMarks: Infinity
          };
        }

        const examStats = stats.examTypeStats[examType];
        const percentage = mark.getPercentage();
        
        examStats.totalMarks += mark.marks_obtained;
        examStats.studentsAppeared++;
        
        if (mark.isPassed()) {
          examStats.passedStudents++;
        }

        examStats.highestMarks = Math.max(examStats.highestMarks, percentage);
        examStats.lowestMarks = Math.min(examStats.lowestMarks, percentage);
      });

      // Calculate averages
      Object.keys(stats.examTypeStats).forEach(examType => {
        const examStats = stats.examTypeStats[examType];
        examStats.averageMarks = examStats.studentsAppeared > 0 
          ? examStats.totalMarks / examStats.studentsAppeared 
          : 0;
        examStats.passPercentage = examStats.studentsAppeared > 0 
          ? (examStats.passedStudents / examStats.studentsAppeared) * 100 
          : 0;
        
        if (examStats.lowestMarks === Infinity) {
          examStats.lowestMarks = 0;
        }
      });

      stats.totalStudents = Object.keys(studentMarks).length;
      return stats;
    }
  }

  Mark.init({
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
    exam_type: {
      type: DataTypes.ENUM('series_test_1', 'series_test_2', 'lab_internal', 'university'),
      allowNull: false
    },
    marks_obtained: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        isInt: true
      }
    },
    max_marks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        isInt: true
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
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Mark',
    tableName: 'marks',
    timestamps: false,
    validate: {
      validMarksRange() {
        Mark.validateMarks(this.exam_type, this.marks_obtained, this.max_marks);
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'subject_id', 'exam_type']
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
        fields: ['exam_type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return Mark;
};