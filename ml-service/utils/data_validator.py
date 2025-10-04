"""
Data validation utilities for ML service with comprehensive error handling
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import traceback
from datetime import datetime

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, details: Dict = None, error_code: str = "VALIDATION_ERROR"):
        self.message = message
        self.details = details or {}
        self.error_code = error_code
        self.timestamp = datetime.utcnow().isoformat()
        super().__init__(self.message)

class DataValidationError(ValidationError):
    """Specific exception for data validation errors"""
    pass

class ModelValidationError(ValidationError):
    """Specific exception for model validation errors"""
    pass

class DataValidator:
    """
    Validates data for ML predictions and training
    """
    
    @staticmethod
    def validate_marks_data(marks_data: List[Dict]) -> Dict[str, Any]:
        """
        Validate marks data for training
        
        Args:
            marks_data: List of mark records
            
        Returns:
            Validation result dictionary
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'stats': {
                'total_records': len(marks_data),
                'unique_students': 0,
                'unique_subjects': 0,
                'exam_type_counts': {},
                'missing_fields': []
            }
        }
        
        if not marks_data:
            validation_result['is_valid'] = False
            validation_result['errors'].append("No marks data provided")
            return validation_result
        
        required_fields = ['student_id', 'subject_id', 'exam_type', 'marks_obtained', 'max_marks']
        students = set()
        subjects = set()
        exam_types = {}
        
        for i, record in enumerate(marks_data):
            # Check required fields
            missing_fields = [field for field in required_fields if field not in record or record[field] is None]
            if missing_fields:
                validation_result['errors'].append(f"Record {i}: Missing fields {missing_fields}")
                validation_result['stats']['missing_fields'].extend(missing_fields)
                continue
            
            # Validate data types and ranges
            try:
                student_id = int(record['student_id'])
                subject_id = int(record['subject_id'])
                marks_obtained = float(record['marks_obtained'])
                max_marks = float(record['max_marks'])
                exam_type = str(record['exam_type'])
                
                students.add(student_id)
                subjects.add(subject_id)
                exam_types[exam_type] = exam_types.get(exam_type, 0) + 1
                
                # Validate mark ranges
                if marks_obtained < 0:
                    validation_result['errors'].append(f"Record {i}: Negative marks obtained: {marks_obtained}")
                
                if max_marks <= 0:
                    validation_result['errors'].append(f"Record {i}: Invalid max marks: {max_marks}")
                
                if marks_obtained > max_marks:
                    validation_result['errors'].append(f"Record {i}: Marks obtained ({marks_obtained}) exceeds max marks ({max_marks})")
                
                # Validate exam type specific ranges
                if exam_type in ['series_test_1', 'series_test_2', 'lab_internal'] and max_marks != 50:
                    validation_result['warnings'].append(f"Record {i}: Expected max marks 50 for {exam_type}, got {max_marks}")
                
                if exam_type == 'university' and max_marks != 100:
                    validation_result['warnings'].append(f"Record {i}: Expected max marks 100 for university exam, got {max_marks}")
                
            except (ValueError, TypeError) as e:
                validation_result['errors'].append(f"Record {i}: Data type error - {str(e)}")
        
        # Update stats
        validation_result['stats']['unique_students'] = len(students)
        validation_result['stats']['unique_subjects'] = len(subjects)
        validation_result['stats']['exam_type_counts'] = exam_types
        validation_result['stats']['missing_fields'] = list(set(validation_result['stats']['missing_fields']))
        
        # Check if we have enough data for training
        if len(students) < 5:
            validation_result['warnings'].append(f"Low number of unique students: {len(students)}. Recommend at least 5 for training.")
        
        if 'university' not in exam_types:
            validation_result['warnings'].append("No university exam marks found. Cannot train prediction model without target values.")
        
        # Set overall validity
        validation_result['is_valid'] = len(validation_result['errors']) == 0
        
        return validation_result
    
    @staticmethod
    def validate_student_data(student_data: Dict) -> Dict[str, Any]:
        """
        Validate student data for prediction
        
        Args:
            student_data: Student data dictionary
            
        Returns:
            Validation result dictionary
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'completeness_score': 0.0
        }
        
        required_fields = ['student_id', 'subject_id', 'marks']
        
        # Check required fields
        missing_fields = [field for field in required_fields if field not in student_data]
        if missing_fields:
            validation_result['is_valid'] = False
            validation_result['errors'].append(f"Missing required fields: {missing_fields}")
            return validation_result
        
        # Validate marks data
        marks = student_data.get('marks', {})
        internal_exams = ['series_test_1', 'series_test_2', 'lab_internal']
        available_marks = [exam for exam in internal_exams if exam in marks and marks[exam] > 0]
        
        if not available_marks:
            validation_result['is_valid'] = False
            validation_result['errors'].append("No internal assessment marks available for prediction")
            return validation_result
        
        # Calculate completeness score
        validation_result['completeness_score'] = len(available_marks) / len(internal_exams)
        
        # Validate mark values
        for exam_type, mark_value in marks.items():
            try:
                mark_float = float(mark_value)
                if mark_float < 0 or mark_float > 100:
                    validation_result['errors'].append(f"Invalid mark percentage for {exam_type}: {mark_float}")
            except (ValueError, TypeError):
                validation_result['errors'].append(f"Invalid mark value for {exam_type}: {mark_value}")
        
        # Warnings for missing data
        missing_internals = [exam for exam in internal_exams if exam not in marks or marks[exam] == 0]
        if missing_internals:
            validation_result['warnings'].append(f"Missing internal marks: {missing_internals}. Prediction accuracy may be reduced.")
        
        # Check for consistency in marks
        if len(available_marks) >= 2:
            mark_values = [marks[exam] for exam in available_marks]
            variance = np.var(mark_values)
            if variance > 400:  # High variance (>20% standard deviation)
                validation_result['warnings'].append("High variance in internal marks detected. Prediction may be less reliable.")
        
        validation_result['is_valid'] = len(validation_result['errors']) == 0
        
        return validation_result
    
    @staticmethod
    def validate_prediction_request(request_data: Dict) -> Dict[str, Any]:
        """
        Validate prediction request data
        
        Args:
            request_data: Request data dictionary
            
        Returns:
            Validation result dictionary
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        if not request_data:
            validation_result['is_valid'] = False
            validation_result['errors'].append("Request data is required")
            return validation_result
        
        # Check required fields
        required_fields = ['student_id', 'subject_id']
        missing_fields = [field for field in required_fields if field not in request_data]
        
        if missing_fields:
            validation_result['is_valid'] = False
            validation_result['errors'].append(f"Missing required fields: {missing_fields}")
        
        # Validate field types
        try:
            if 'student_id' in request_data:
                int(request_data['student_id'])
            if 'subject_id' in request_data:
                int(request_data['subject_id'])
            if 'academic_year' in request_data:
                year = int(request_data['academic_year'])
                current_year = 2025  # Based on system date
                if year < 2020 or year > current_year + 1:
                    validation_result['warnings'].append(f"Academic year {year} seems unusual")
        except (ValueError, TypeError) as e:
            validation_result['is_valid'] = False
            validation_result['errors'].append(f"Invalid field type: {str(e)}")
        
        return validation_result
    
    @staticmethod
    def validate_training_request(request_data: Dict) -> Dict[str, Any]:
        """
        Validate training request data
        
        Args:
            request_data: Request data dictionary
            
        Returns:
            Validation result dictionary
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Training request can be empty (will use all available data)
        if not request_data:
            return validation_result
        
        # Validate optional fields
        if 'subject_id' in request_data:
            try:
                int(request_data['subject_id'])
            except (ValueError, TypeError):
                validation_result['is_valid'] = False
                validation_result['errors'].append("Invalid subject_id type")
        
        if 'academic_year' in request_data:
            try:
                year = int(request_data['academic_year'])
                current_year = 2025
                if year < 2020 or year > current_year + 1:
                    validation_result['warnings'].append(f"Academic year {year} seems unusual")
            except (ValueError, TypeError):
                validation_result['is_valid'] = False
                validation_result['errors'].append("Invalid academic_year type")
        
        return validation_result
    
    @staticmethod
    def validate_toggle_request(request_data: Dict) -> Dict[str, Any]:
        """
        Validate prediction visibility toggle request
        
        Args:
            request_data: Request data dictionary
            
        Returns:
            Validation result dictionary
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        if not request_data:
            validation_result['is_valid'] = False
            validation_result['errors'].append("Request data is required")
            return validation_result
        
        # Check required fields
        if 'is_visible' not in request_data:
            validation_result['is_valid'] = False
            validation_result['errors'].append("is_visible field is required")
        else:
            if not isinstance(request_data['is_visible'], bool):
                validation_result['is_valid'] = False
                validation_result['errors'].append("is_visible must be a boolean value")
        
        # Validate optional faculty_id
        if 'faculty_id' in request_data:
            try:
                int(request_data['faculty_id'])
            except (ValueError, TypeError):
                validation_result['is_valid'] = False
                validation_result['errors'].append("Invalid faculty_id type")
        
        return validation_result