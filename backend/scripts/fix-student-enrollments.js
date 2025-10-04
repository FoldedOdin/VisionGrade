const { Student, StudentSubject, Subject } = require('../models');

/**
 * Script to fix student enrollments for students who were created but not enrolled in subjects
 * This addresses the issue where students created through admin interface weren't auto-enrolled
 */

async function fixStudentEnrollments() {
  try {
    console.log('Starting student enrollment fix...');

    // Get all active students
    const students = await Student.findAll({
      where: {
        graduation_status: 'active'
      }
    });

    console.log(`Found ${students.length} active students`);

    let fixedCount = 0;
    const currentYear = new Date().getFullYear();

    for (const student of students) {
      // Check if student is already enrolled in subjects for their semester
      const existingEnrollments = await StudentSubject.count({
        where: {
          student_id: student.id,
          academic_year: currentYear
        },
        include: [{
          model: Subject,
          as: 'subject',
          where: {
            semester: student.semester
          }
        }]
      });

      // If no enrollments exist for their current semester, enroll them
      if (existingEnrollments === 0) {
        console.log(`Enrolling student ${student.student_name} (ID: ${student.id}) in semester ${student.semester} subjects...`);
        
        try {
          await StudentSubject.enrollStudentInSemesterSubjects(student.id, student.semester, currentYear);
          fixedCount++;
          console.log(`✓ Successfully enrolled student ${student.student_name}`);
        } catch (error) {
          console.error(`✗ Failed to enroll student ${student.student_name}:`, error.message);
        }
      } else {
        console.log(`Student ${student.student_name} already has ${existingEnrollments} enrollments for semester ${student.semester}`);
      }
    }

    console.log(`\nEnrollment fix completed!`);
    console.log(`- Total students processed: ${students.length}`);
    console.log(`- Students enrolled: ${fixedCount}`);
    console.log(`- Students already enrolled: ${students.length - fixedCount}`);

  } catch (error) {
    console.error('Error fixing student enrollments:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  fixStudentEnrollments()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixStudentEnrollments };