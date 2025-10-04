const { Faculty, Subject, FacultySubject, User } = require('../models');

/**
 * Script to assign faculty to subjects
 * This addresses the issue where faculty need to be assigned to subjects to see students
 */

async function assignFacultyToSubjects(facultyId, semester = null, subjectIds = null, academicYear = null) {
  try {
    const currentYear = academicYear || new Date().getFullYear();
    
    console.log(`Assigning faculty ID ${facultyId} to subjects...`);
    
    // Verify faculty exists
    const faculty = await Faculty.findByPk(facultyId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['unique_id', 'email']
      }]
    });
    
    if (!faculty) {
      throw new Error(`Faculty with ID ${facultyId} not found`);
    }
    
    console.log(`Faculty: ${faculty.faculty_name} (${faculty.user.unique_id})`);
    
    // Get subjects to assign
    let subjects;
    if (subjectIds) {
      subjects = await Subject.findAll({
        where: { id: subjectIds }
      });
    } else if (semester) {
      subjects = await Subject.findAll({
        where: { semester: semester },
        order: [['subject_code', 'ASC']]
      });
    } else {
      throw new Error('Either semester or subjectIds must be provided');
    }
    
    if (subjects.length === 0) {
      console.log('No subjects found matching criteria');
      return;
    }
    
    console.log(`Found ${subjects.length} subjects to assign`);
    
    // Check existing assignments
    const existingAssignments = await FacultySubject.findAll({
      where: {
        faculty_id: facultyId,
        subject_id: subjects.map(s => s.id),
        academic_year: currentYear
      }
    });
    
    console.log(`Existing assignments: ${existingAssignments.length}`);
    
    // Create new assignments
    let newAssignments = 0;
    for (const subject of subjects) {
      const exists = existingAssignments.find(a => a.subject_id === subject.id);
      if (!exists) {
        await FacultySubject.create({
          faculty_id: facultyId,
          subject_id: subject.id,
          academic_year: currentYear
        });
        console.log(`✓ Assigned to ${subject.subject_code} - ${subject.subject_name}`);
        newAssignments++;
      } else {
        console.log(`- Already assigned to ${subject.subject_code}`);
      }
    }
    
    console.log('\nAssignment completed!');
    console.log(`- New assignments: ${newAssignments}`);
    console.log(`- Total assignments: ${existingAssignments.length + newAssignments}`);
    
    return {
      facultyId,
      facultyName: faculty.faculty_name,
      totalSubjects: subjects.length,
      newAssignments,
      existingAssignments: existingAssignments.length,
      academicYear: currentYear
    };
    
  } catch (error) {
    console.error('Error assigning faculty to subjects:', error.message);
    throw error;
  }
}

async function assignAllFacultyToTheirSemesters() {
  try {
    console.log('=== Auto-assigning faculty to subjects ===');
    
    // Get all faculty
    const faculty = await Faculty.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['unique_id', 'email']
      }]
    });
    
    console.log(`Found ${faculty.length} faculty members`);
    
    for (const f of faculty) {
      console.log(`\nProcessing ${f.faculty_name} (${f.user.unique_id})...`);
      
      // For tutors, assign to their tutor semester
      if (f.is_tutor && f.tutor_semester) {
        await assignFacultyToSubjects(f.id, f.tutor_semester);
      } else {
        // For regular faculty, you might want to assign based on department or other criteria
        // For now, let's skip non-tutors or add manual assignment logic
        console.log('- Skipping (not a tutor or no tutor semester specified)');
      }
    }
    
  } catch (error) {
    console.error('Error in auto-assignment:', error.message);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node assign-faculty-to-subjects.js <facultyId> <semester>');
    console.log('  node assign-faculty-to-subjects.js auto');
    console.log('');
    console.log('Examples:');
    console.log('  node assign-faculty-to-subjects.js 1 7    # Assign faculty ID 1 to all semester 7 subjects');
    console.log('  node assign-faculty-to-subjects.js auto   # Auto-assign all tutors to their semesters');
    process.exit(1);
  }
  
  if (args[0] === 'auto') {
    assignAllFacultyToTheirSemesters()
      .then(() => {
        console.log('\nAuto-assignment completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\nAuto-assignment failed:', error.message);
        process.exit(1);
      });
  } else {
    const facultyId = parseInt(args[0]);
    const semester = parseInt(args[1]);
    
    if (isNaN(facultyId) || isNaN(semester)) {
      console.error('Error: facultyId and semester must be numbers');
      process.exit(1);
    }
    
    assignFacultyToSubjects(facultyId, semester)
      .then((result) => {
        console.log('\nAssignment completed successfully');
        console.log('Result:', result);
        process.exit(0);
      })
      .catch((error) => {
        console.error('\nAssignment failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = { assignFacultyToSubjects, assignAllFacultyToTheirSemesters };