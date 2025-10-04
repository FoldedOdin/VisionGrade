#!/usr/bin/env python3
"""
Training Readiness Checker
Analyzes database to determine if ML training is possible
"""

import sys
import os
import logging
from datetime import datetime
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.database_service import DatabaseService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TrainingReadinessChecker:
    def __init__(self, database_url=None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        
        if not self.database_url:
            raise ValueError("Database URL is required")
        
        self.db_service = DatabaseService(self.database_url)
    
    def check_database_connection(self):
        """Test database connectivity"""
        try:
            # Try a simple query
            subjects = self.db_service.get_all_subjects()
            logger.info(f"✅ Database connection successful ({len(subjects)} subjects found)")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {str(e)}")
            return False
    
    def analyze_subjects(self):
        """Analyze all subjects for training readiness"""
        try:
            subjects = self.db_service.get_all_subjects()
            analysis = []
            
            for subject in subjects:
                subject_analysis = self.analyze_subject(subject)
                analysis.append(subject_analysis)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze subjects: {str(e)}")
            return []
    
    def analyze_subject(self, subject):
        """Analyze a specific subject for training readiness"""
        subject_id = subject['id']
        
        try:
            # Get all marks for this subject
            training_data = self.db_service.get_training_data(subject_id)
            
            # Analyze the data
            total_students = len(set(record['student_id'] for record in training_data))
            
            # Count students with different types of marks
            students_with_university = len(set(
                record['student_id'] for record in training_data 
                if record['exam_type'] == 'university'
            ))
            
            students_with_series1 = len(set(
                record['student_id'] for record in training_data 
                if record['exam_type'] == 'series_test_1'
            ))
            
            students_with_series2 = len(set(
                record['student_id'] for record in training_data 
                if record['exam_type'] == 'series_test_2'
            ))
            
            students_with_lab = len(set(
                record['student_id'] for record in training_data 
                if record['exam_type'] == 'lab_internal'
            ))
            
            # Count complete records (students with university + at least 2 internals)
            complete_students = 0
            student_marks = {}
            
            # Group marks by student
            for record in training_data:
                student_id = record['student_id']
                if student_id not in student_marks:
                    student_marks[student_id] = {}
                student_marks[student_id][record['exam_type']] = record
            
            # Check completeness
            for student_id, marks in student_marks.items():
                has_university = 'university' in marks
                internal_count = sum(1 for exam in ['series_test_1', 'series_test_2', 'lab_internal'] 
                                   if exam in marks)
                
                if has_university and internal_count >= 2:
                    complete_students += 1
            
            # Determine training readiness
            can_train = complete_students >= 10
            readiness_level = self.get_readiness_level(complete_students)
            
            analysis = {
                'subject_id': subject_id,
                'subject_name': subject['subject_name'],
                'subject_code': subject['subject_code'],
                'subject_type': subject.get('subject_type', 'theory'),
                'semester': subject.get('semester', 'N/A'),
                'total_students': total_students,
                'students_with_university': students_with_university,
                'students_with_series1': students_with_series1,
                'students_with_series2': students_with_series2,
                'students_with_lab': students_with_lab,
                'complete_training_records': complete_students,
                'can_train': can_train,
                'readiness_level': readiness_level,
                'recommendations': self.get_recommendations(complete_students, student_marks)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze subject {subject_id}: {str(e)}")
            return {
                'subject_id': subject_id,
                'subject_name': subject.get('subject_name', 'Unknown'),
                'error': str(e)
            }
    
    def get_readiness_level(self, complete_records):
        """Determine readiness level based on complete records"""
        if complete_records >= 50:
            return "EXCELLENT"
        elif complete_records >= 25:
            return "GOOD"
        elif complete_records >= 10:
            return "MINIMUM"
        elif complete_records >= 5:
            return "INSUFFICIENT"
        else:
            return "POOR"
    
    def get_recommendations(self, complete_records, student_marks):
        """Generate recommendations for improving training readiness"""
        recommendations = []
        
        if complete_records < 10:
            recommendations.append(f"Need {10 - complete_records} more complete records for training")
        
        # Analyze what's missing
        students_missing_university = 0
        students_missing_internals = 0
        
        for student_id, marks in student_marks.items():
            has_university = 'university' in marks
            internal_count = sum(1 for exam in ['series_test_1', 'series_test_2', 'lab_internal'] 
                               if exam in marks)
            
            if not has_university:
                students_missing_university += 1
            if internal_count < 2:
                students_missing_internals += 1
        
        if students_missing_university > 0:
            recommendations.append(f"{students_missing_university} students missing university exam marks")
        
        if students_missing_internals > 0:
            recommendations.append(f"{students_missing_internals} students missing sufficient internal marks")
        
        if complete_records >= 10:
            recommendations.append("Ready for training! Consider training a model for this subject")
        
        return recommendations
    
    def generate_summary_report(self, analysis):
        """Generate a summary report of training readiness"""
        total_subjects = len(analysis)
        trainable_subjects = len([s for s in analysis if s.get('can_train', False)])
        
        readiness_counts = {}
        for subject in analysis:
            level = subject.get('readiness_level', 'UNKNOWN')
            readiness_counts[level] = readiness_counts.get(level, 0) + 1
        
        summary = {
            'timestamp': datetime.now().isoformat(),
            'total_subjects': total_subjects,
            'trainable_subjects': trainable_subjects,
            'training_ready_percentage': (trainable_subjects / total_subjects * 100) if total_subjects > 0 else 0,
            'readiness_distribution': readiness_counts,
            'subjects': analysis
        }
        
        return summary
    
    def print_summary(self, summary):
        """Print a formatted summary to console"""
        print(f"\n📊 TRAINING READINESS SUMMARY")
        print(f"============================")
        print(f"Total Subjects: {summary['total_subjects']}")
        print(f"Trainable Subjects: {summary['trainable_subjects']}")
        print(f"Training Ready: {summary['training_ready_percentage']:.1f}%")
        
        print(f"\n📈 READINESS DISTRIBUTION")
        print(f"========================")
        for level, count in summary['readiness_distribution'].items():
            print(f"{level}: {count} subjects")
        
        print(f"\n📋 SUBJECT DETAILS")
        print(f"==================")
        
        for subject in summary['subjects']:
            if 'error' in subject:
                print(f"❌ {subject['subject_code']}: ERROR - {subject['error']}")
                continue
            
            status_icon = "✅" if subject['can_train'] else "❌"
            print(f"{status_icon} {subject['subject_code']} - {subject['subject_name']}")
            print(f"   Complete Records: {subject['complete_training_records']}")
            print(f"   Readiness: {subject['readiness_level']}")
            
            if subject['recommendations']:
                print(f"   Recommendations:")
                for rec in subject['recommendations']:
                    print(f"   • {rec}")
            print()

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Check ML Training Readiness')
    parser.add_argument('--database-url', 
                       help='Database URL (overrides environment variable)')
    parser.add_argument('--report-file', 
                       help='Save detailed report to JSON file')
    parser.add_argument('--subject-id', type=int,
                       help='Check specific subject only')
    
    args = parser.parse_args()
    
    try:
        # Initialize checker
        checker = TrainingReadinessChecker(database_url=args.database_url)
        
        # Check database connection
        if not checker.check_database_connection():
            sys.exit(1)
        
        # Analyze subjects
        if args.subject_id:
            # Analyze specific subject
            subjects = checker.db_service.get_all_subjects()
            target_subject = next((s for s in subjects if s['id'] == args.subject_id), None)
            
            if not target_subject:
                logger.error(f"Subject with ID {args.subject_id} not found")
                sys.exit(1)
            
            analysis = [checker.analyze_subject(target_subject)]
        else:
            # Analyze all subjects
            analysis = checker.analyze_subjects()
        
        if not analysis:
            logger.error("❌ No analysis results obtained")
            sys.exit(1)
        
        # Generate summary
        summary = checker.generate_summary_report(analysis)
        
        # Print summary
        checker.print_summary(summary)
        
        # Save report if requested
        if args.report_file:
            with open(args.report_file, 'w') as f:
                json.dump(summary, f, indent=2)
            logger.info(f"📄 Detailed report saved to: {args.report_file}")
        
        # Exit with appropriate code
        if summary['trainable_subjects'] > 0:
            print(f"\n🎉 {summary['trainable_subjects']} subjects are ready for ML training!")
            print(f"💡 Run: python initial_training.py")
        else:
            print(f"\n⚠️  No subjects are ready for training yet.")
            print(f"💡 Add more student marks (especially university exam results)")
            
    except Exception as e:
        logger.error(f"❌ Readiness check failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()