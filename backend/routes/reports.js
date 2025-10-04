const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const rateLimiter = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticateToken);

// Apply rate limiting to report generation endpoints
const reportGenerationLimiter = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each user to 10 report generations per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many report generation requests. Please try again later.'
    }
  }
});

// Get available report templates
router.get('/templates', reportController.getReportTemplates);

// Generate student report card
router.post('/student/:studentId/report-card', 
  reportGenerationLimiter,
  requireRole(['student', 'faculty', 'tutor', 'admin']),
  reportController.generateStudentReportCard
);

// Generate faculty report
router.post('/faculty/:facultyId/report',
  reportGenerationLimiter,
  requireRole(['faculty', 'tutor', 'admin']),
  reportController.generateFacultyReport
);

// Generate graphical insights
router.get('/insights/subject/:subjectId',
  requireRole(['faculty', 'tutor', 'admin']),
  reportController.generateGraphicalInsights
);

// Download report file
router.get('/download/:filename',
  reportController.downloadReport
);

// Get report generation status
router.get('/status/:reportId',
  reportController.getReportStatus
);

// Bulk generate reports (admin only)
router.post('/bulk-generate',
  reportGenerationLimiter,
  requireRole(['admin']),
  reportController.bulkGenerateReports
);

// Clean up old reports (admin only)
router.delete('/cleanup',
  requireRole(['admin']),
  reportController.cleanupReports
);

module.exports = router;