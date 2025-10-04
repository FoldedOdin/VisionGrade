const { MLPrediction, Student, Subject, StudentSubject } = require('../models');

/**
 * Script to create sample ML predictions for testing
 * This addresses the issue where ML predictions are missing, causing 500 errors
 */

async function createSamplePredictions() {
  try {
    console.log('Creating sample ML predictions...');
    
    const currentYear = new Date().getFullYear();
    
    // Get all active students
    const students = await Student.findAll({
      where: { graduation_status: 'active' }
    });
    
    if (students.length === 0) {
      console.log('No active students found');
      return;
    }
    
    console.log(`Found ${students.length} active students`);
    
    // Get all subjects for enrolled students
    const enrollments = await StudentSubject.findAll({
      where: { academic_year: currentYear },
      include: [
        {
          model: Student,
          as: 'student',
          where: { graduation_status: 'active' }
        },
        {
          model: Subject,
          as: 'subject'
        }
      ]
    });
    
    console.log(`Found ${enrollments.length} student-subject enrollments`);
    
    let createdCount = 0;
    
    for (const enrollment of enrollments) {
      const student = enrollment.student;
      const subject = enrollment.subject;
      
      // Check if prediction already exists
      const existingPrediction = await MLPrediction.findOne({
        where: {
          student_id: student.id,
          subject_id: subject.id
        }
      });
      
      if (existingPrediction) {
        console.log(`- Prediction already exists for ${student.student_name} in ${subject.subject_code}`);
        continue;
      }
      
      // Generate realistic prediction data
      const basePrediction = generateRealisticPrediction(student, subject);
      
      const inputFeatures = {
        student_id: student.id,
        subject_id: subject.id,
        semester: student.semester,
        subject_type: subject.subject_type,
        credits: subject.credits,
        batch_year: student.batch_year,
        // Mock internal assessment scores
        series_test_1: Math.floor(Math.random() * 40) + 10, // 10-50
        series_test_2: Math.floor(Math.random() * 40) + 10, // 10-50
        lab_internal: subject.subject_type === 'lab' ? Math.floor(Math.random() * 40) + 10 : null,
        attendance_percentage: Math.floor(Math.random() * 30) + 70, // 70-100%
        previous_semester_avg: Math.floor(Math.random() * 40) + 50 // 50-90%
      };
      
      try {
        await MLPrediction.create({
          student_id: student.id,
          subject_id: subject.id,
          predicted_marks: basePrediction.predicted_marks,
          confidence_score: basePrediction.confidence_score,
          input_features: inputFeatures,
          model_version: 'v1.0.0-mock',
          is_visible_to_student: false // Hidden by default
        });
        
        console.log(`✓ Created prediction for ${student.student_name} in ${subject.subject_code}: ${basePrediction.predicted_marks}%`);
        createdCount++;
        
      } catch (error) {
        console.error(`✗ Failed to create prediction for ${student.student_name} in ${subject.subject_code}:`, error.message);
      }
    }
    
    console.log(`\nSample predictions creation completed!`);
    console.log(`- Total enrollments processed: ${enrollments.length}`);
    console.log(`- New predictions created: ${createdCount}`);
    console.log(`- Existing predictions skipped: ${enrollments.length - createdCount}`);
    
    // Show summary by subject
    console.log('\nPredictions by subject:');
    const predictionsBySubject = await MLPrediction.findAll({
      attributes: [
        'subject_id',
        [MLPrediction.sequelize.fn('COUNT', MLPrediction.sequelize.col('id')), 'count']
      ],
      include: [{
        model: Subject,
        as: 'subject',
        attributes: ['subject_code', 'subject_name']
      }],
      group: ['subject_id', 'subject.id'],
      raw: false
    });
    
    predictionsBySubject.forEach(p => {
      console.log(`- ${p.subject.subject_code} (${p.subject.subject_name}): ${p.dataValues.count} predictions`);
    });
    
  } catch (error) {
    console.error('Error creating sample predictions:', error.message);
    throw error;
  }
}

function generateRealisticPrediction(student, subject) {
  // Generate predictions based on student semester and subject type
  let basePrediction;
  
  if (student.semester <= 2) {
    // Early semesters - generally higher scores
    basePrediction = Math.floor(Math.random() * 30) + 60; // 60-90%
  } else if (student.semester <= 4) {
    // Mid semesters - moderate scores
    basePrediction = Math.floor(Math.random() * 35) + 55; // 55-90%
  } else {
    // Advanced semesters - more varied scores
    basePrediction = Math.floor(Math.random() * 40) + 45; // 45-85%
  }
  
  // Adjust based on subject type
  if (subject.subject_type === 'lab') {
    // Lab subjects typically have slightly higher scores
    basePrediction = Math.min(95, basePrediction + 5);
  }
  
  // Add some randomness for realism
  const variation = Math.floor(Math.random() * 10) - 5; // -5 to +5
  const finalPrediction = Math.max(25, Math.min(95, basePrediction + variation));
  
  // Generate confidence score (higher for more "certain" predictions)
  let confidenceScore;
  if (finalPrediction < 40 || finalPrediction > 80) {
    // More confident about very low or high predictions
    confidenceScore = Math.random() * 0.2 + 0.75; // 0.75-0.95
  } else {
    // Less confident about middle-range predictions
    confidenceScore = Math.random() * 0.3 + 0.6; // 0.6-0.9
  }
  
  return {
    predicted_marks: Math.round(finalPrediction * 100) / 100, // Round to 2 decimal places
    confidence_score: Math.round(confidenceScore * 100) / 100
  };
}

async function togglePredictionVisibility(subjectId, isVisible) {
  try {
    console.log(`Toggling prediction visibility for subject ${subjectId} to ${isVisible}...`);
    
    const [updatedCount] = await MLPrediction.update(
      { is_visible_to_student: isVisible },
      {
        where: { subject_id: subjectId }
      }
    );
    
    console.log(`Updated ${updatedCount} predictions`);
    return updatedCount;
    
  } catch (error) {
    console.error('Error toggling prediction visibility:', error.message);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    createSamplePredictions()
      .then(() => {
        console.log('\nScript completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\nScript failed:', error.message);
        process.exit(1);
      });
  } else if (args[0] === 'toggle' && args.length === 3) {
    const subjectId = parseInt(args[1]);
    const isVisible = args[2] === 'true';
    
    if (isNaN(subjectId)) {
      console.error('Error: subjectId must be a number');
      process.exit(1);
    }
    
    togglePredictionVisibility(subjectId, isVisible)
      .then((count) => {
        console.log(`\nToggled visibility for ${count} predictions`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('\nToggle failed:', error.message);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node create-sample-predictions.js                    # Create sample predictions');
    console.log('  node create-sample-predictions.js toggle <id> <bool> # Toggle visibility');
    console.log('');
    console.log('Examples:');
    console.log('  node create-sample-predictions.js');
    console.log('  node create-sample-predictions.js toggle 49 true');
    process.exit(1);
  }
}

module.exports = { createSamplePredictions, togglePredictionVisibility };