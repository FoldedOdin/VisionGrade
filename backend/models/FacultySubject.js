const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FacultySubject extends Model {
    static associate(models) {
      // FacultySubject belongs to Faculty
      FacultySubject.belongsTo(models.Faculty, {
        foreignKey: 'faculty_id',
        as: 'faculty'
      });

      // FacultySubject belongs to Subject
      FacultySubject.belongsTo(models.Subject, {
        foreignKey: 'subject_id',
        as: 'subject'
      });
    }

    // Static method to assign faculty to subject
    static async assignFacultyToSubject(facultyId, subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const [assignment, created] = await FacultySubject.findOrCreate({
        where: {
          faculty_id: facultyId,
          subject_id: subjectId,
          academic_year: currentYear
        },
        defaults: {
          faculty_id: facultyId,
          subject_id: subjectId,
          academic_year: currentYear
        }
      });

      return { assignment, created };
    }

    // Static method to remove faculty assignment
    static async removeFacultyAssignment(facultyId, subjectId, academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      const result = await FacultySubject.destroy({
        where: {
          faculty_id: facultyId,
          subject_id: subjectId,
          academic_year: currentYear
        }
      });

      return result > 0;
    }

    // Static method to get faculty assignments for academic year
    static async getFacultyAssignments(academicYear = null) {
      const currentYear = academicYear || new Date().getFullYear();
      
      return await FacultySubject.findAll({
        where: {
          academic_year: currentYear
        },
        include: [
          {
            model: sequelize.models.Faculty,
            as: 'faculty',
            include: [{
              model: sequelize.models.User,
              as: 'user'
            }]
          },
          {
            model: sequelize.models.Subject,
            as: 'subject'
          }
        ]
      });
    }
  }

  FacultySubject.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    faculty_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'faculty',
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
    modelName: 'FacultySubject',
    tableName: 'faculty_subjects',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['faculty_id', 'subject_id', 'academic_year']
      },
      {
        fields: ['faculty_id']
      },
      {
        fields: ['subject_id']
      },
      {
        fields: ['academic_year']
      }
    ]
  });

  return FacultySubject;
};