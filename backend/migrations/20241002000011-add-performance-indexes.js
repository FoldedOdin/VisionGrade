'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes for frequently queried columns
    
    // Users table indexes
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true
    });
    
    await queryInterface.addIndex('users', ['phone'], {
      name: 'idx_users_phone',
      unique: true
    });
    
    await queryInterface.addIndex('users', ['unique_id'], {
      name: 'idx_users_unique_id',
      unique: true
    });
    
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role'
    });

    // Students table indexes
    await queryInterface.addIndex('students', ['user_id'], {
      name: 'idx_students_user_id'
    });
    
    await queryInterface.addIndex('students', ['semester'], {
      name: 'idx_students_semester'
    });
    
    await queryInterface.addIndex('students', ['batch_year'], {
      name: 'idx_students_batch_year'
    });
    
    await queryInterface.addIndex('students', ['graduation_status'], {
      name: 'idx_students_graduation_status'
    });

    // Faculty table indexes
    await queryInterface.addIndex('faculty', ['user_id'], {
      name: 'idx_faculty_user_id'
    });
    
    await queryInterface.addIndex('faculty', ['is_tutor'], {
      name: 'idx_faculty_is_tutor'
    });
    
    await queryInterface.addIndex('faculty', ['tutor_semester'], {
      name: 'idx_faculty_tutor_semester'
    });

    // Subjects table indexes
    await queryInterface.addIndex('subjects', ['subject_code'], {
      name: 'idx_subjects_code',
      unique: true
    });
    
    await queryInterface.addIndex('subjects', ['semester'], {
      name: 'idx_subjects_semester'
    });
    
    await queryInterface.addIndex('subjects', ['subject_type'], {
      name: 'idx_subjects_type'
    });

    // Faculty-Subject assignments indexes
    await queryInterface.addIndex('faculty_subjects', ['faculty_id'], {
      name: 'idx_faculty_subjects_faculty_id'
    });
    
    await queryInterface.addIndex('faculty_subjects', ['subject_id'], {
      name: 'idx_faculty_subjects_subject_id'
    });
    
    await queryInterface.addIndex('faculty_subjects', ['academic_year'], {
      name: 'idx_faculty_subjects_academic_year'
    });
    
    // Composite index for faculty-subject lookup
    await queryInterface.addIndex('faculty_subjects', ['faculty_id', 'subject_id'], {
      name: 'idx_faculty_subjects_composite'
    });

    // Student-Subject enrollments indexes
    await queryInterface.addIndex('student_subjects', ['student_id'], {
      name: 'idx_student_subjects_student_id'
    });
    
    await queryInterface.addIndex('student_subjects', ['subject_id'], {
      name: 'idx_student_subjects_subject_id'
    });
    
    await queryInterface.addIndex('student_subjects', ['academic_year'], {
      name: 'idx_student_subjects_academic_year'
    });
    
    // Composite index for student-subject lookup
    await queryInterface.addIndex('student_subjects', ['student_id', 'subject_id'], {
      name: 'idx_student_subjects_composite'
    });

    // Marks table indexes
    await queryInterface.addIndex('marks', ['student_id'], {
      name: 'idx_marks_student_id'
    });
    
    await queryInterface.addIndex('marks', ['subject_id'], {
      name: 'idx_marks_subject_id'
    });
    
    await queryInterface.addIndex('marks', ['exam_type'], {
      name: 'idx_marks_exam_type'
    });
    
    await queryInterface.addIndex('marks', ['faculty_id'], {
      name: 'idx_marks_faculty_id'
    });
    
    await queryInterface.addIndex('marks', ['created_at'], {
      name: 'idx_marks_created_at'
    });
    
    // Composite indexes for common queries
    await queryInterface.addIndex('marks', ['student_id', 'subject_id'], {
      name: 'idx_marks_student_subject'
    });
    
    await queryInterface.addIndex('marks', ['student_id', 'exam_type'], {
      name: 'idx_marks_student_exam_type'
    });
    
    await queryInterface.addIndex('marks', ['subject_id', 'exam_type'], {
      name: 'idx_marks_subject_exam_type'
    });

    // Attendance table indexes
    await queryInterface.addIndex('attendance', ['student_id'], {
      name: 'idx_attendance_student_id'
    });
    
    await queryInterface.addIndex('attendance', ['subject_id'], {
      name: 'idx_attendance_subject_id'
    });
    
    await queryInterface.addIndex('attendance', ['faculty_id'], {
      name: 'idx_attendance_faculty_id'
    });
    
    await queryInterface.addIndex('attendance', ['updated_at'], {
      name: 'idx_attendance_updated_at'
    });
    
    // Composite index for student-subject attendance lookup
    await queryInterface.addIndex('attendance', ['student_id', 'subject_id'], {
      name: 'idx_attendance_student_subject'
    });
    
    // Note: attendance_percentage is a virtual column, so we can't index it directly
    // Instead, we can create a functional index or use the actual columns for queries

    // ML Predictions table indexes
    await queryInterface.addIndex('ml_predictions', ['student_id'], {
      name: 'idx_ml_predictions_student_id'
    });
    
    await queryInterface.addIndex('ml_predictions', ['subject_id'], {
      name: 'idx_ml_predictions_subject_id'
    });
    
    await queryInterface.addIndex('ml_predictions', ['is_visible_to_student'], {
      name: 'idx_ml_predictions_visibility'
    });
    
    await queryInterface.addIndex('ml_predictions', ['created_at'], {
      name: 'idx_ml_predictions_created_at'
    });
    
    // Composite index for student-subject predictions
    await queryInterface.addIndex('ml_predictions', ['student_id', 'subject_id'], {
      name: 'idx_ml_predictions_student_subject'
    });

    // Notifications table indexes
    await queryInterface.addIndex('notifications', ['recipient_id'], {
      name: 'idx_notifications_recipient_id'
    });
    
    await queryInterface.addIndex('notifications', ['sender_id'], {
      name: 'idx_notifications_sender_id'
    });
    
    await queryInterface.addIndex('notifications', ['notification_type'], {
      name: 'idx_notifications_type'
    });
    
    await queryInterface.addIndex('notifications', ['is_read'], {
      name: 'idx_notifications_is_read'
    });
    
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'idx_notifications_created_at'
    });
    
    // Composite index for user notifications
    await queryInterface.addIndex('notifications', ['recipient_id', 'is_read'], {
      name: 'idx_notifications_recipient_read'
    });
    
    await queryInterface.addIndex('notifications', ['recipient_id', 'created_at'], {
      name: 'idx_notifications_recipient_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all indexes in reverse order
    const indexes = [
      'idx_notifications_recipient_date',
      'idx_notifications_recipient_read',
      'idx_notifications_created_at',
      'idx_notifications_is_read',
      'idx_notifications_type',
      'idx_notifications_sender_id',
      'idx_notifications_recipient_id',
      'idx_ml_predictions_student_subject',
      'idx_ml_predictions_created_at',
      'idx_ml_predictions_visibility',
      'idx_ml_predictions_subject_id',
      'idx_ml_predictions_student_id',
      'idx_attendance_percentage',
      'idx_attendance_student_subject',
      'idx_attendance_updated_at',
      'idx_attendance_faculty_id',
      'idx_attendance_subject_id',
      'idx_attendance_student_id',
      'idx_marks_subject_exam_type',
      'idx_marks_student_exam_type',
      'idx_marks_student_subject',
      'idx_marks_created_at',
      'idx_marks_faculty_id',
      'idx_marks_exam_type',
      'idx_marks_subject_id',
      'idx_marks_student_id',
      'idx_student_subjects_composite',
      'idx_student_subjects_academic_year',
      'idx_student_subjects_subject_id',
      'idx_student_subjects_student_id',
      'idx_faculty_subjects_composite',
      'idx_faculty_subjects_academic_year',
      'idx_faculty_subjects_subject_id',
      'idx_faculty_subjects_faculty_id',
      'idx_subjects_type',
      'idx_subjects_semester',
      'idx_subjects_code',
      'idx_faculty_tutor_semester',
      'idx_faculty_is_tutor',
      'idx_faculty_user_id',
      'idx_students_graduation_status',
      'idx_students_batch_year',
      'idx_students_semester',
      'idx_students_user_id',
      'idx_users_role',
      'idx_users_unique_id',
      'idx_users_phone',
      'idx_users_email'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('users', indexName);
      } catch (error) {
        // Index might not exist or be on a different table
        console.log(`Could not remove index ${indexName}:`, error.message);
      }
    }
  }
};