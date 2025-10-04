const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { generalLimiter } = require('./middleware/rateLimiter');
const { 
  sanitizeInput, 
  preventSQLInjection, 
  securityHeaders, 
  requestSizeLimiter 
} = require('./middleware/security');
const { auditUnauthorizedAccess } = require('./middleware/auditLogger');
const SchedulerService = require('./services/schedulerService');
const redisClient = require('./config/redis');
const logger = require('./utils/logger');

// Import comprehensive error handling
const { 
  errorHandler, 
  notFoundHandler, 
  setupGlobalErrorHandlers,
  gracefulShutdown 
} = require('./middleware/errorHandler');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup global error handlers for unhandled rejections and exceptions
setupGlobalErrorHandlers();

// Security Middleware (order is important)
app.use(securityHeaders); // Enhanced security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(morgan('combined'));
app.use(requestSizeLimiter); // Request size limiting
app.use(generalLimiter); // Apply rate limiting to all requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput); // Input sanitization
app.use(preventSQLInjection); // SQL injection prevention
app.use(auditUnauthorizedAccess); // Audit unauthorized access attempts

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const facultyRoutes = require('./routes/faculty');
const marksRoutes = require('./routes/marks');
const attendanceRoutes = require('./routes/attendance');
const subjectsRoutes = require('./routes/subjects');
const mlRoutes = require('./routes/ml');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'VisionGrade Backend API',
    status: 'Server running successfully',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Comprehensive error handling middleware
app.use(notFoundHandler); // Handle 404 errors
app.use(errorHandler); // Handle all other errors

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    logger.info(`🚀 VisionGrade Backend Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize Redis connection
    try {
      await redisClient.connect();
      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache:', error.message);
    }
    
    // Initialize notification scheduler
    try {
      SchedulerService.init();
      logger.info('Notification scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification scheduler:', error);
    }
  });

  // Setup graceful shutdown
  gracefulShutdown(server, async () => {
    // Cleanup Redis connection
    try {
      await redisClient.disconnect();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      logger.error('Server error:', error);
    }
  });
}

module.exports = app;