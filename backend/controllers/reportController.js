const reportService = require('../services/reportService');
const db = require('../models');
const { Student, Faculty, Subject } = db;
const path = require('path');
const fs = require('fs').promises;

class ReportController {
  // Generate student report card
  async generateStudentReportCard(req, res) {
    try {
      const { studentId } = req.params;
      const { format = 'pdf', academicYear } = req.query;

      // Validate student exists and user has permission
      const student = await Student.findByPk(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      // Check permissions - students can only access their own reports
      if (req.user.role === 'student') {
        const userStudent = await Student.findOne({ where: { user_id: req.user.id } });
        if (!userStudent || userStudent.id !== parseInt(studentId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own report card'
            }
          });
        }
      }

      let report;
      if (format.toLowerCase() === 'doc' || format.toLowerCase() === 'docx') {
        report = await reportService.generateStudentReportCardDOC(studentId, academicYear);
      } else {
        report = await reportService.generateStudentReportCardPDF(studentId, academicYear);
      }

      res.json({
        success: true,
        data: {
          report,
          message: 'Report card generated successfully'
        }
      });

    } catch (error) {
      console.error('Error generating student report card:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_GENERATION_ERROR',
          message: 'Failed to generate report card',
          details: error.message
        }
      });
    }
  }

  // Generate faculty report
  async generateFacultyReport(req, res) {
    try {
      const { facultyId } = req.params;
      const { 
        format = 'pdf', 
        academicYear, 
        semester, 
        minAttendance,
        subjectId 
      } = req.query;

      // Validate faculty exists and user has permission
      const faculty = await Faculty.findByPk(facultyId);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FACULTY_NOT_FOUND',
            message: 'Faculty not found'
          }
        });
      }

      // Check permissions - faculty can only access their own reports
      if (req.user.role === 'faculty' || req.user.role === 'tutor') {
        const userFaculty = await Faculty.findOne({ where: { user_id: req.user.id } });
        if (!userFaculty || userFaculty.id !== parseInt(facultyId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own reports'
            }
          });
        }
      }

      const filters = {
        academicYear: academicYear ? parseInt(academicYear) : null,
        semester: semester ? parseInt(semester) : null,
        minAttendance: minAttendance ? parseFloat(minAttendance) : null,
        subjectId: subjectId ? parseInt(subjectId) : null
      };

      const report = await reportService.generateFacultyReport(facultyId, filters, format);

      res.json({
        success: true,
        data: {
          report,
          message: 'Faculty report generated successfully'
        }
      });

    } catch (error) {
      console.error('Error generating faculty report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_GENERATION_ERROR',
          message: 'Failed to generate faculty report',
          details: error.message
        }
      });
    }
  }

  // Generate graphical insights
  async generateGraphicalInsights(req, res) {
    try {
      const { subjectId } = req.params;
      const { academicYear } = req.query;

      // Validate subject exists
      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBJECT_NOT_FOUND',
            message: 'Subject not found'
          }
        });
      }

      // Check permissions - faculty can only access their assigned subjects
      if (req.user.role === 'faculty' || req.user.role === 'tutor') {
        const userFaculty = await Faculty.findOne({ where: { user_id: req.user.id } });
        if (userFaculty) {
          const assignedSubjects = await userFaculty.getSubjects({
            where: { id: subjectId }
          });
          if (assignedSubjects.length === 0) {
            return res.status(403).json({
              success: false,
              error: {
                code: 'ACCESS_DENIED',
                message: 'You can only access insights for your assigned subjects'
              }
            });
          }
        }
      }

      const insights = await reportService.generateGraphicalInsights(subjectId, academicYear);

      res.json({
        success: true,
        data: {
          insights,
          message: 'Graphical insights generated successfully'
        }
      });

    } catch (error) {
      console.error('Error generating graphical insights:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INSIGHTS_GENERATION_ERROR',
          message: 'Failed to generate graphical insights',
          details: error.message
        }
      });
    }
  }

  // Download report file
  async downloadReport(req, res) {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILENAME',
            message: 'Invalid filename'
          }
        });
      }

      const filepath = path.join(__dirname, '../uploads/reports', filename);
      
      // Check if file exists
      try {
        await fs.access(filepath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Report file not found'
          }
        });
      }

      // Set appropriate headers based on file type
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      let disposition = 'attachment';

      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
      
      // Stream the file
      const fileStream = require('fs').createReadStream(filepath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_ERROR',
          message: 'Failed to download report',
          details: error.message
        }
      });
    }
  }

  // Get available report templates
  async getReportTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'student_report_card',
          name: 'Student Report Card',
          description: 'Comprehensive report card with marks, attendance, and performance summary',
          formats: ['pdf', 'docx'],
          requiredRole: ['student', 'faculty', 'tutor', 'admin']
        },
        {
          id: 'faculty_report',
          name: 'Faculty Report',
          description: 'Subject-wise performance report with filtering options',
          formats: ['pdf', 'docx'],
          requiredRole: ['faculty', 'tutor', 'admin']
        },
        {
          id: 'graphical_insights',
          name: 'Graphical Insights',
          description: 'Visual charts for pass/fail, attendance, and grade distribution',
          formats: ['json'],
          requiredRole: ['faculty', 'tutor', 'admin']
        }
      ];

      // Filter templates based on user role
      const userRole = req.user.role;
      const availableTemplates = templates.filter(template => 
        template.requiredRole.includes(userRole)
      );

      res.json({
        success: true,
        data: {
          templates: availableTemplates,
          message: 'Report templates retrieved successfully'
        }
      });

    } catch (error) {
      console.error('Error getting report templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATES_ERROR',
          message: 'Failed to retrieve report templates',
          details: error.message
        }
      });
    }
  }

  // Get report generation status
  async getReportStatus(req, res) {
    try {
      const { reportId } = req.params;
      
      // For now, return a simple status since we generate reports synchronously
      // In a production system, you might want to implement async report generation
      res.json({
        success: true,
        data: {
          reportId,
          status: 'completed',
          message: 'Report generation completed'
        }
      });

    } catch (error) {
      console.error('Error getting report status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to get report status',
          details: error.message
        }
      });
    }
  }

  // Bulk generate reports
  async bulkGenerateReports(req, res) {
    try {
      const { reportType, targets, format = 'pdf', filters = {} } = req.body;

      // Validate admin permission for bulk operations
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can perform bulk report generation'
          }
        });
      }

      const results = [];
      
      for (const target of targets) {
        try {
          let report;
          
          if (reportType === 'student_report_card') {
            if (format === 'docx') {
              report = await reportService.generateStudentReportCardDOC(target.id, filters.academicYear);
            } else {
              report = await reportService.generateStudentReportCardPDF(target.id, filters.academicYear);
            }
          } else if (reportType === 'faculty_report') {
            report = await reportService.generateFacultyReport(target.id, filters, format);
          }
          
          results.push({
            success: true,
            target,
            report
          });
          
        } catch (error) {
          results.push({
            success: false,
            target,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount
          },
          message: `Bulk report generation completed. ${successCount} successful, ${failureCount} failed.`
        }
      });

    } catch (error) {
      console.error('Error in bulk report generation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_GENERATION_ERROR',
          message: 'Failed to perform bulk report generation',
          details: error.message
        }
      });
    }
  }

  // Clean up old reports
  async cleanupReports(req, res) {
    try {
      // Only admin can cleanup reports
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can cleanup reports'
          }
        });
      }

      const { daysOld = 30 } = req.query;
      await reportService.cleanupOldReports(parseInt(daysOld));

      res.json({
        success: true,
        data: {
          message: `Successfully cleaned up reports older than ${daysOld} days`
        }
      });

    } catch (error) {
      console.error('Error cleaning up reports:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Failed to cleanup old reports',
          details: error.message
        }
      });
    }
  }
}

module.exports = new ReportController();