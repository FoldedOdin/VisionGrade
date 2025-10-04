const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class QueryOptimizationService {
    constructor() {
        this.queryCache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Get optimized student dashboard data with caching
     */
    async getStudentDashboardData(studentId) {
        const cacheKey = `dashboard:student:${studentId}`;
        
        // Try cache first
        let cachedData = await cacheService.getDashboardData(studentId, 'student');
        if (cachedData) {
            return cachedData;
        }

        try {
            // Optimized query using joins instead of multiple queries
            const dashboardData = await sequelize.query(`
                SELECT 
                    s.id as student_id,
                    s.student_name,
                    s.semester,
                    s.batch_year,
                    
                    -- Marks data
                    m.id as mark_id,
                    m.exam_type,
                    m.marks_obtained,
                    m.max_marks,
                    
                    -- Subject data
                    sub.id as subject_id,
                    sub.subject_code,
                    sub.subject_name,
                    sub.subject_type,
                    sub.credits,
                    
                    -- Attendance data
                    att.total_classes,
                    att.attended_classes,
                    att.attendance_percentage,
                    
                    -- ML Predictions (if visible)
                    pred.predicted_marks,
                    pred.confidence_score,
                    pred.is_visible_to_student
                    
                FROM students s
                LEFT JOIN student_subjects ss ON s.id = ss.student_id
                LEFT JOIN subjects sub ON ss.subject_id = sub.id
                LEFT JOIN marks m ON s.id = m.student_id AND sub.id = m.subject_id
                LEFT JOIN attendance att ON s.id = att.student_id AND sub.id = att.subject_id
                LEFT JOIN ml_predictions pred ON s.id = pred.student_id AND sub.id = pred.subject_id
                WHERE s.id = :studentId
                ORDER BY sub.subject_type, sub.subject_name, m.exam_type
            `, {
                replacements: { studentId },
                type: QueryTypes.SELECT
            });

            // Process and structure the data
            const processedData = this.processStudentDashboardData(dashboardData);
            
            // Cache the result
            await cacheService.setDashboardData(studentId, 'student', processedData);
            
            return processedData;
        } catch (error) {
            logger.error('Error fetching student dashboard data:', error);
            throw error;
        }
    }

    /**
     * Get optimized faculty dashboard data with caching
     */
    async getFacultyDashboardData(facultyId) {
        const cacheKey = `dashboard:faculty:${facultyId}`;
        
        // Try cache first
        let cachedData = await cacheService.getDashboardData(facultyId, 'faculty');
        if (cachedData) {
            return cachedData;
        }

        try {
            // Optimized query for faculty dashboard
            const dashboardData = await sequelize.query(`
                SELECT 
                    f.id as faculty_id,
                    f.faculty_name,
                    f.department,
                    f.is_tutor,
                    
                    -- Subject data
                    sub.id as subject_id,
                    sub.subject_code,
                    sub.subject_name,
                    sub.subject_type,
                    sub.semester,
                    
                    -- Student count per subject
                    COUNT(DISTINCT ss.student_id) as student_count,
                    
                    -- Average marks per subject
                    AVG(CASE WHEN m.exam_type = 'series_test_1' THEN m.marks_obtained END) as avg_series_1,
                    AVG(CASE WHEN m.exam_type = 'series_test_2' THEN m.marks_obtained END) as avg_series_2,
                    AVG(CASE WHEN m.exam_type = 'university' THEN m.marks_obtained END) as avg_university,
                    
                    -- Attendance statistics
                    AVG(att.attended_classes * 100.0 / att.total_classes) as avg_attendance,
                    COUNT(CASE WHEN (att.attended_classes * 100.0 / att.total_classes) < 75 THEN 1 END) as low_attendance_count
                    
                FROM faculty f
                LEFT JOIN faculty_subjects fs ON f.id = fs.faculty_id
                LEFT JOIN subjects sub ON fs.subject_id = sub.id
                LEFT JOIN student_subjects ss ON sub.id = ss.subject_id
                LEFT JOIN marks m ON ss.student_id = m.student_id AND sub.id = m.subject_id
                LEFT JOIN attendance att ON ss.student_id = att.student_id AND sub.id = att.subject_id
                WHERE f.id = :facultyId
                GROUP BY f.id, f.faculty_name, f.department, f.is_tutor, sub.id, sub.subject_code, sub.subject_name, sub.subject_type, sub.semester
                ORDER BY sub.subject_name
            `, {
                replacements: { facultyId },
                type: QueryTypes.SELECT
            });

            // Process and structure the data
            const processedData = this.processFacultyDashboardData(dashboardData);
            
            // Cache the result
            await cacheService.setDashboardData(facultyId, 'faculty', processedData);
            
            return processedData;
        } catch (error) {
            logger.error('Error fetching faculty dashboard data:', error);
            throw error;
        }
    }

    /**
     * Get paginated marks with optimized query
     */
    async getPaginatedMarks(filters = {}, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        
        try {
            let whereClause = '';
            let replacements = { limit, offset };
            
            // Build dynamic where clause
            if (filters.studentId) {
                whereClause += ' AND m.student_id = :studentId';
                replacements.studentId = filters.studentId;
            }
            
            if (filters.subjectId) {
                whereClause += ' AND m.subject_id = :subjectId';
                replacements.subjectId = filters.subjectId;
            }
            
            if (filters.examType) {
                whereClause += ' AND m.exam_type = :examType';
                replacements.examType = filters.examType;
            }
            
            if (filters.facultyId) {
                whereClause += ' AND m.faculty_id = :facultyId';
                replacements.facultyId = filters.facultyId;
            }

            const query = `
                SELECT 
                    m.id,
                    m.marks_obtained,
                    m.max_marks,
                    m.exam_type,
                    m.created_at,
                    
                    s.student_name,
                    u.unique_id as student_id,
                    
                    sub.subject_code,
                    sub.subject_name,
                    
                    f.faculty_name
                    
                FROM marks m
                JOIN students s ON m.student_id = s.id
                JOIN users u ON s.user_id = u.id
                JOIN subjects sub ON m.subject_id = sub.id
                JOIN faculty f ON m.faculty_id = f.id
                WHERE 1=1 ${whereClause}
                ORDER BY m.created_at DESC
                LIMIT :limit OFFSET :offset
            `;

            const countQuery = `
                SELECT COUNT(*) as total
                FROM marks m
                WHERE 1=1 ${whereClause}
            `;

            const [results, countResult] = await Promise.all([
                sequelize.query(query, { replacements, type: QueryTypes.SELECT }),
                sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT })
            ]);

            return {
                data: results,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult[0].total),
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };
        } catch (error) {
            logger.error('Error fetching paginated marks:', error);
            throw error;
        }
    }

    /**
     * Get at-risk students with optimized query
     */
    async getAtRiskStudents(facultyId) {
        const cacheKey = `at-risk-students:${facultyId}`;
        
        // Try cache first
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const atRiskStudents = await sequelize.query(`
                SELECT DISTINCT
                    s.id as student_id,
                    s.student_name,
                    u.unique_id,
                    sub.subject_name,
                    sub.subject_code,
                    
                    -- Attendance data
                    (att.attended_classes * 100.0 / att.total_classes) as attendance_percentage,
                    
                    -- Latest marks
                    MAX(CASE WHEN m.exam_type = 'series_test_1' THEN m.marks_obtained END) as series_1_marks,
                    MAX(CASE WHEN m.exam_type = 'series_test_2' THEN m.marks_obtained END) as series_2_marks,
                    
                    -- Risk factors
                    CASE 
                        WHEN (att.attended_classes * 100.0 / att.total_classes) < 75 THEN 'Low Attendance'
                        WHEN MAX(CASE WHEN m.exam_type = 'series_test_1' THEN m.marks_obtained END) < 20 THEN 'Poor Series 1'
                        WHEN MAX(CASE WHEN m.exam_type = 'series_test_2' THEN m.marks_obtained END) < 20 THEN 'Poor Series 2'
                        ELSE 'Multiple Factors'
                    END as risk_factor
                    
                FROM students s
                JOIN users u ON s.user_id = u.id
                JOIN student_subjects ss ON s.id = ss.student_id
                JOIN subjects sub ON ss.subject_id = sub.id
                JOIN faculty_subjects fs ON sub.id = fs.subject_id
                LEFT JOIN attendance att ON s.id = att.student_id AND sub.id = att.subject_id
                LEFT JOIN marks m ON s.id = m.student_id AND sub.id = m.subject_id
                WHERE fs.faculty_id = :facultyId
                AND (
                    (att.attended_classes * 100.0 / att.total_classes) < 75 
                    OR MAX(CASE WHEN m.exam_type = 'series_test_1' THEN m.marks_obtained END) < 20
                    OR MAX(CASE WHEN m.exam_type = 'series_test_2' THEN m.marks_obtained END) < 20
                )
                GROUP BY s.id, s.student_name, u.unique_id, sub.subject_name, sub.subject_code, att.attended_classes, att.total_classes
                ORDER BY (att.attended_classes * 100.0 / att.total_classes) ASC, s.student_name
            `, {
                replacements: { facultyId },
                type: QueryTypes.SELECT
            });

            // Cache for 15 minutes
            await cacheService.set(cacheKey, atRiskStudents, 900);
            
            return atRiskStudents;
        } catch (error) {
            logger.error('Error fetching at-risk students:', error);
            throw error;
        }
    }

    /**
     * Process student dashboard data into structured format
     */
    processStudentDashboardData(rawData) {
        const subjects = {};
        
        rawData.forEach(row => {
            if (!subjects[row.subject_id]) {
                subjects[row.subject_id] = {
                    id: row.subject_id,
                    code: row.subject_code,
                    name: row.subject_name,
                    type: row.subject_type,
                    credits: row.credits,
                    marks: {},
                    attendance: {
                        total: row.total_classes || 0,
                        attended: row.attended_classes || 0,
                        percentage: row.attendance_percentage || 0
                    },
                    prediction: row.is_visible_to_student ? {
                        predicted_marks: row.predicted_marks,
                        confidence: row.confidence_score
                    } : null
                };
            }
            
            if (row.mark_id && row.exam_type) {
                subjects[row.subject_id].marks[row.exam_type] = {
                    obtained: row.marks_obtained,
                    max: row.max_marks,
                    percentage: ((row.marks_obtained / row.max_marks) * 100).toFixed(2)
                };
            }
        });

        return {
            student: {
                id: rawData[0]?.student_id,
                name: rawData[0]?.student_name,
                semester: rawData[0]?.semester,
                batch_year: rawData[0]?.batch_year
            },
            subjects: Object.values(subjects)
        };
    }

    /**
     * Process faculty dashboard data into structured format
     */
    processFacultyDashboardData(rawData) {
        const subjects = {};
        
        rawData.forEach(row => {
            if (!subjects[row.subject_id]) {
                subjects[row.subject_id] = {
                    id: row.subject_id,
                    code: row.subject_code,
                    name: row.subject_name,
                    type: row.subject_type,
                    semester: row.semester,
                    studentCount: row.student_count || 0,
                    averageMarks: {
                        series1: row.avg_series_1 ? parseFloat(row.avg_series_1).toFixed(2) : null,
                        series2: row.avg_series_2 ? parseFloat(row.avg_series_2).toFixed(2) : null,
                        university: row.avg_university ? parseFloat(row.avg_university).toFixed(2) : null
                    },
                    attendance: {
                        average: row.avg_attendance ? parseFloat(row.avg_attendance).toFixed(2) : null,
                        lowAttendanceCount: row.low_attendance_count || 0
                    }
                };
            }
        });

        return {
            faculty: {
                id: rawData[0]?.faculty_id,
                name: rawData[0]?.faculty_name,
                department: rawData[0]?.department,
                isTutor: rawData[0]?.is_tutor
            },
            subjects: Object.values(subjects)
        };
    }

    /**
     * Clear query cache
     */
    clearCache() {
        this.queryCache.clear();
    }

    /**
     * Get database performance statistics
     */
    async getPerformanceStats() {
        try {
            const stats = await sequelize.query(`
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats 
                WHERE schemaname = 'public'
                ORDER BY tablename, attname
            `, {
                type: QueryTypes.SELECT
            });

            return stats;
        } catch (error) {
            logger.error('Error fetching performance stats:', error);
            return [];
        }
    }
}

module.exports = new QueryOptimizationService();