"""
Database Service for ML Service
Handles database connections and data retrieval for ML predictions
"""

import psycopg2
import psycopg2.extras
import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class DatabaseService:
    """
    Service for database operations related to ML predictions
    """
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.connection = None
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
    
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(self.database_url)
            self.connection.autocommit = False
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
            logger.info("Database connection closed")
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """
        Execute a SELECT query and return results
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            List of dictionaries representing query results
        """
        if not self.connection:
            self.connect()
        
        try:
            with self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()
                return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            self.connection.rollback()
            raise
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """
        Execute an INSERT/UPDATE/DELETE query
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            Number of affected rows
        """
        if not self.connection:
            self.connect()
        
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(query, params)
                affected_rows = cursor.rowcount
                self.connection.commit()
                return affected_rows
        except Exception as e:
            logger.error(f"Update execution failed: {str(e)}")
            self.connection.rollback()
            raise
    
    def get_training_data(self, subject_id: Optional[int] = None, academic_year: Optional[int] = None) -> List[Dict]:
        """
        Get training data for ML model
        
        Args:
            subject_id: Optional subject ID to filter data
            academic_year: Optional academic year filter
            
        Returns:
            List of training records with marks and subject information
        """
        current_year = academic_year or datetime.now().year
        
        base_query = """
        SELECT 
            m.student_id,
            m.subject_id,
            m.exam_type,
            m.marks_obtained,
            m.max_marks,
            s.subject_type,
            s.semester,
            s.subject_name,
            s.subject_code,
            st.student_name,
            st.semester as student_semester
        FROM marks m
        JOIN subjects s ON m.subject_id = s.id
        JOIN students st ON m.student_id = st.id
        JOIN student_subjects ss ON (m.student_id = ss.student_id AND m.subject_id = ss.subject_id)
        WHERE ss.academic_year = %s
        """
        
        params = [current_year]
        
        if subject_id:
            base_query += " AND m.subject_id = %s"
            params.append(subject_id)
        
        base_query += " ORDER BY m.student_id, m.subject_id, m.exam_type"
        
        return self.execute_query(base_query, tuple(params))
    
    def get_student_marks_for_prediction(self, student_id: int, subject_id: int, academic_year: Optional[int] = None) -> Dict:
        """
        Get student's marks for prediction
        
        Args:
            student_id: Student ID
            subject_id: Subject ID
            academic_year: Optional academic year
            
        Returns:
            Dictionary with student's marks and subject information
        """
        current_year = academic_year or datetime.now().year
        
        query = """
        SELECT 
            m.student_id,
            m.subject_id,
            m.exam_type,
            m.marks_obtained,
            m.max_marks,
            s.subject_type,
            s.semester,
            s.subject_name,
            s.subject_code,
            st.student_name,
            st.semester as student_semester
        FROM marks m
        JOIN subjects s ON m.subject_id = s.id
        JOIN students st ON m.student_id = st.id
        JOIN student_subjects ss ON (m.student_id = ss.student_id AND m.subject_id = ss.subject_id)
        WHERE m.student_id = %s 
        AND m.subject_id = %s 
        AND ss.academic_year = %s
        AND m.exam_type IN ('series_test_1', 'series_test_2', 'lab_internal')
        ORDER BY m.exam_type
        """
        
        results = self.execute_query(query, (student_id, subject_id, current_year))
        
        if not results:
            return None
        
        # Structure the data
        student_data = {
            'student_id': student_id,
            'subject_id': subject_id,
            'student_name': results[0]['student_name'],
            'subject_name': results[0]['subject_name'],
            'subject_code': results[0]['subject_code'],
            'subject_type': results[0]['subject_type'],
            'semester': results[0]['semester'],
            'marks': {}
        }
        
        for result in results:
            exam_type = result['exam_type']
            percentage = (result['marks_obtained'] / result['max_marks']) * 100
            student_data['marks'][exam_type] = percentage
        
        return student_data
    
    def get_students_for_prediction(self, subject_id: int, academic_year: Optional[int] = None) -> List[Dict]:
        """
        Get all students enrolled in a subject for batch prediction
        
        Args:
            subject_id: Subject ID
            academic_year: Optional academic year
            
        Returns:
            List of student data for prediction
        """
        current_year = academic_year or datetime.now().year
        
        query = """
        SELECT DISTINCT
            ss.student_id,
            ss.subject_id,
            st.student_name,
            s.subject_name,
            s.subject_code,
            s.subject_type,
            s.semester
        FROM student_subjects ss
        JOIN students st ON ss.student_id = st.id
        JOIN subjects s ON ss.subject_id = s.id
        WHERE ss.subject_id = %s 
        AND ss.academic_year = %s
        AND st.graduation_status = 'active'
        ORDER BY st.student_name
        """
        
        students = self.execute_query(query, (subject_id, current_year))
        
        # Get marks for each student
        student_data_list = []
        for student in students:
            student_data = self.get_student_marks_for_prediction(
                student['student_id'], 
                subject_id, 
                academic_year
            )
            if student_data:
                student_data_list.append(student_data)
        
        return student_data_list
    
    def save_prediction(self, student_id: int, subject_id: int, predicted_marks: float, 
                       confidence_score: float, input_features: Dict, model_version: str) -> int:
        """
        Save or update ML prediction in database
        
        Args:
            student_id: Student ID
            subject_id: Subject ID
            predicted_marks: Predicted marks percentage
            confidence_score: Confidence score (0-1)
            input_features: Input features used for prediction
            model_version: Model version used
            
        Returns:
            Prediction ID
        """
        # Check if prediction already exists
        check_query = """
        SELECT id FROM ml_predictions 
        WHERE student_id = %s AND subject_id = %s
        """
        
        existing = self.execute_query(check_query, (student_id, subject_id))
        
        if existing:
            # Update existing prediction
            update_query = """
            UPDATE ml_predictions 
            SET predicted_marks = %s, 
                confidence_score = %s, 
                input_features = %s, 
                model_version = %s, 
                created_at = CURRENT_TIMESTAMP
            WHERE student_id = %s AND subject_id = %s
            RETURNING id
            """
            
            result = self.execute_query(update_query, (
                predicted_marks, confidence_score, json.dumps(input_features), 
                model_version, student_id, subject_id
            ))
            return result[0]['id']
        else:
            # Insert new prediction
            insert_query = """
            INSERT INTO ml_predictions 
            (student_id, subject_id, predicted_marks, confidence_score, 
             input_features, model_version, is_visible_to_student, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING id
            """
            
            result = self.execute_query(insert_query, (
                student_id, subject_id, predicted_marks, confidence_score,
                json.dumps(input_features), model_version, False
            ))
            return result[0]['id']
    
    def toggle_prediction_visibility(self, subject_id: int, is_visible: bool, faculty_id: Optional[int] = None) -> int:
        """
        Toggle prediction visibility for a subject
        
        Args:
            subject_id: Subject ID
            is_visible: Whether predictions should be visible to students
            faculty_id: Optional faculty ID for authorization check
            
        Returns:
            Number of updated predictions
        """
        # Optional: Check if faculty has access to this subject
        if faculty_id:
            auth_query = """
            SELECT COUNT(*) as count FROM faculty_subjects fs
            WHERE fs.faculty_id = %s AND fs.subject_id = %s 
            AND fs.academic_year = %s
            """
            
            current_year = datetime.now().year
            auth_result = self.execute_query(auth_query, (faculty_id, subject_id, current_year))
            
            if auth_result[0]['count'] == 0:
                raise ValueError("Faculty does not have access to this subject")
        
        # Update visibility
        update_query = """
        UPDATE ml_predictions 
        SET is_visible_to_student = %s
        WHERE subject_id = %s
        """
        
        return self.execute_update(update_query, (is_visible, subject_id))
    
    def get_prediction_accuracy_stats(self, subject_id: Optional[int] = None, model_version: Optional[str] = None) -> Dict:
        """
        Get prediction accuracy statistics
        
        Args:
            subject_id: Optional subject ID filter
            model_version: Optional model version filter
            
        Returns:
            Dictionary with accuracy statistics
        """
        base_query = """
        SELECT 
            p.predicted_marks,
            p.confidence_score,
            p.model_version,
            p.subject_id,
            s.subject_name,
            m.marks_obtained as actual_marks,
            m.max_marks,
            (m.marks_obtained::float / m.max_marks * 100) as actual_percentage
        FROM ml_predictions p
        JOIN subjects s ON p.subject_id = s.id
        LEFT JOIN marks m ON (p.student_id = m.student_id 
                             AND p.subject_id = m.subject_id 
                             AND m.exam_type = 'university')
        WHERE 1=1
        """
        
        params = []
        
        if subject_id:
            base_query += " AND p.subject_id = %s"
            params.append(subject_id)
        
        if model_version:
            base_query += " AND p.model_version = %s"
            params.append(model_version)
        
        results = self.execute_query(base_query, tuple(params))
        
        # Calculate statistics
        total_predictions = len(results)
        predictions_with_actuals = len([r for r in results if r['actual_marks'] is not None])
        
        if predictions_with_actuals == 0:
            return {
                'total_predictions': total_predictions,
                'predictions_with_actuals': 0,
                'average_accuracy': 0,
                'accurate_predictions': 0,
                'accuracy_percentage': 0,
                'average_difference': 0
            }
        
        # Calculate accuracy for predictions with actual results
        accurate_count = 0
        total_difference = 0
        
        for result in results:
            if result['actual_marks'] is not None:
                predicted = result['predicted_marks']
                actual = result['actual_percentage']
                difference = abs(predicted - actual)
                total_difference += difference
                
                if difference <= 10:  # Within ±10%
                    accurate_count += 1
        
        return {
            'total_predictions': total_predictions,
            'predictions_with_actuals': predictions_with_actuals,
            'accurate_predictions': accurate_count,
            'accuracy_percentage': (accurate_count / predictions_with_actuals) * 100,
            'average_difference': total_difference / predictions_with_actuals,
            'model_versions': list(set(r['model_version'] for r in results if r['model_version']))
        }
    
    def get_subject_info(self, subject_id: int) -> Optional[Dict]:
        """
        Get subject information
        
        Args:
            subject_id: Subject ID
            
        Returns:
            Subject information dictionary or None
        """
        query = """
        SELECT id, subject_code, subject_name, subject_type, semester, credits
        FROM subjects
        WHERE id = %s
        """
        
        results = self.execute_query(query, (subject_id,))
        return results[0] if results else None
    
    def get_faculty_subjects(self, faculty_id: int, academic_year: Optional[int] = None) -> List[Dict]:
        """
        Get subjects assigned to a faculty member
        
        Args:
            faculty_id: Faculty ID
            academic_year: Optional academic year
            
        Returns:
            List of subject information
        """
        current_year = academic_year or datetime.now().year
        
        query = """
        SELECT s.id, s.subject_code, s.subject_name, s.subject_type, s.semester, s.credits
        FROM subjects s
        JOIN faculty_subjects fs ON s.id = fs.subject_id
        WHERE fs.faculty_id = %s AND fs.academic_year = %s
        ORDER BY s.semester, s.subject_name
        """
        
        return self.execute_query(query, (faculty_id, current_year))