const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class StudentSubject extends Model {
    static associate(models) {
      // StudentSubject belongs to Student
      StudentSubject.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student'
      });

      // StudentSubject belongs to Subject
      StudentSubject.belongsTo(models.Subject, {
        foreignKey: 'subject_id',
        as: 'subject'
      });
    }

    // Static method to enroll student in subject
    static async enrollStudentInSubject(studentId, subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const [enrollment, created] = await StudentSubject.findOrCreate({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          academic_year: currentYear
        },
        defaults: {
          student_id: studentId,
          subject_id: subjectId,
          academic_year: currentYear
        }
      });

      return { enrollment, created };
    }

    // Static method to bulk enroll student in semester subjects
    static async enrollStudentInSemesterSubjects(studentId, semester, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      // Get default subjects for the semester
      const subjects = await sequelize.models.Subject.getDefaultSemesterSubjects(semester);
      
      const enrollments = [];
      for (const subject of subjects) {
        const { enrollment, created } = await StudentSubject.enrollStudentInSubject(
          studentId, 
          subject.id, 
          currentYear
        );
        enrollments.push({ enrollment, created, subject });
      }

      return enrollments;
    }

    // Static method to remove student enrollment
    static async removeStudentEnrollment(studentId, subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const result = await StudentSubject.destroy({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          academic_year: currentYear
        }
      });

      return result > 0;
    }

    // Static method to promote students to next semester
    static async promoteStudentsToNextSemester(studentIds, fromSemester, toSemester, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const results = [];
      for (const studentId of studentIds) {
        // Remove current semester enrollments
        await StudentSubject.destroy({
          where: {
            student_id: studentId,
            academic_year: currentYear
          },
          include: [{
            model: sequelize.models.Subject,
            as: 'subject',
            where: {
              semester: fromSemester
            }
          }]
        });

        // Enroll in next semester subjects
        const enrollments = await StudentSubject.enrollStudentInSemesterSubjects(
          studentId, 
          toSemester, 
          currentYear
        );
        
        results.push({
          studentId,
          enrollments
        });
      }

      return results;
    }

    // Static method to get enrollment statistics
    static async getEnrollmentStatistics(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const enrollments = await StudentSubject.findAll({
        where: {
          academic_year: currentYear
        },
        include: [
          {
            model: sequelize.models.Student,
            as: 'student'
          },
          {
            model: sequelize.models.Subject,
            as: 'subject'
          }
        ]
      });

      const statistics = {};
      enrollments.forEach(enrollment => {
        const semester = enrollment.subject.semester;
        if (!statistics[semester]) {
          statistics[semester] = {
            semester,
            totalEnrollments: 0,
            uniqueStudents: new Set(),
            subjects: new Set()
          };
        }
        
        statistics[semester].totalEnrollments++;
        statistics[semester].uniqueStudents.add(enrollment.student_id);
        statistics[semester].subjects.add(enrollment.subject_id);
      });

      // Convert sets to counts
      Object.keys(statistics).forEach(semester => {
        statistics[semester].uniqueStudents = statistics[semester].uniqueStudents.size;
        statistics[semester].subjects = statistics[semester].subjects.size;
      });

      return statistics;
    }
  }

  StudentSubject.init({
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
    academic_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2020,
        max: new Date().getFullYear() + 5
      }
    }
  }, {
    sequelize,
    modelName: 'StudentSubject',
    tableName: 'student_subjects',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'subject_id', 'academic_year']
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['subject_id']
      },
      {
        fields: ['academic_year']
      }
    ]
  });

  return StudentSubject;
};