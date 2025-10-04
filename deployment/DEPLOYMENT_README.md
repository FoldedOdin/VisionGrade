# VisionGrade Deployment Package

## Overview

This deployment package contains everything needed to run VisionGrade - Student Performance Analysis System on Windows systems using Docker containers.

## Package Contents

```
VisionGrade-v1.0-Windows/
├── backend/                    # Node.js backend application
├── frontend/                   # React.js frontend application
├── ml-service/                 # Python ML prediction service
├── deployment/
│   └── windows/               # Windows deployment scripts
│       ├── start-visiongrade.bat
│       ├── stop-visiongrade.bat
│       ├── setup-database.bat
│       ├── backup-database.bat
│       ├── restore-database.bat
│       └── view-logs.bat
├── docs/                      # Complete documentation
│   ├── INSTALLATION_GUIDE.md
│   ├── USER_MANUAL.md
│   ├── API_DOCUMENTATION.md
│   └── TROUBLESHOOTING_FAQ.md
├── docker-compose.yml         # Development configuration
├── docker-compose.prod.yml    # Production configuration
├── .env.example              # Environment configuration template
├── QUICK_START.md            # Quick installation guide
├── VERSION.txt               # Version information
└── README.md                 # This file
```

## System Requirements

### Minimum Requirements
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 10GB free space
- **CPU**: 2 cores (4 cores recommended)
- **Network**: Internet connection for initial setup

### Software Requirements
- **Docker Desktop**: Latest version (required)
- **Web Browser**: Chrome, Firefox, Safari, or Edge

## Quick Installation

### Step 1: Install Docker Desktop
1. Download from https://www.docker.com/products/docker-desktop
2. Run installer as administrator
3. Restart computer when prompted
4. Launch Docker Desktop and wait for it to start

### Step 2: Extract and Run VisionGrade
1. Extract this ZIP file to `C:\VisionGrade` (or preferred location)
2. Open the extracted folder
3. Navigate to `deployment\windows`
4. Double-click `start-visiongrade.bat`
5. Wait for services to start (10-15 minutes first time)

### Step 3: Setup Database
1. Run `setup-database.bat` from `deployment\windows`
2. Choose to seed demo data when prompted
3. Wait for setup to complete

### Step 4: Access VisionGrade
1. Open web browser
2. Go to http://localhost
3. Login with demo credentials (if seeded):
   - Email: `admin@visiongrade.com`
   - Password: `admin123`

## Detailed Installation

For complete installation instructions, see `docs/INSTALLATION_GUIDE.md`

## Configuration

### Environment Configuration
1. Copy `.env.example` to `.env`
2. Edit `.env` with your settings:
   ```
   DB_PASSWORD=your_secure_password
   JWT_SECRET=your_jwt_secret_32_chars_minimum
   EMAIL_HOST=your_smtp_server
   EMAIL_USER=your_email@domain.com
   EMAIL_PASS=your_email_password
   ```

### Security Settings
- Change default database password
- Set strong JWT secret (minimum 32 characters)
- Configure email settings for password reset
- Update admin password after first login

## Management Scripts

All management scripts are located in `deployment\windows\`:

- **start-visiongrade.bat**: Start all VisionGrade services
- **stop-visiongrade.bat**: Stop all services
- **setup-database.bat**: Initialize database and run migrations
- **backup-database.bat**: Create database backup
- **restore-database.bat**: Restore from database backup
- **view-logs.bat**: View service logs for troubleshooting

## Default Ports

- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:5000
- **ML Service**: http://localhost:8000
- **Database**: localhost:5432 (internal)
- **Redis**: localhost:6379 (internal)

## User Roles and Access

### Administrator
- Complete system management
- User creation and management
- Subject and curriculum management
- System configuration
- Reports and analytics

### Faculty
- Marks entry for assigned subjects
- Attendance management
- Student performance insights
- Announcements to students
- At-risk student identification

### Tutor
- ML prediction control
- Student mentoring
- Prediction accuracy monitoring
- Faculty coordination

### Student
- View marks and attendance
- Access ML predictions (if enabled)
- Download report cards
- Receive notifications
- Profile management

## Features

### Core Features
- **Multi-role Authentication**: Secure login for all user types
- **Academic Data Management**: Marks, attendance, subjects
- **ML Predictions**: AI-powered university exam predictions
- **Notification System**: Automated alerts and announcements
- **Report Generation**: PDF/DOC report cards and analytics
- **Responsive Design**: Works on desktop, tablet, and mobile

### Advanced Features
- **Real-time Updates**: Live notifications and data updates
- **Performance Analytics**: Graphical insights and trends
- **Bulk Operations**: Import/export data, batch operations
- **Security**: Role-based access, audit logging, data encryption
- **Scalability**: Supports 500+ concurrent users

## Troubleshooting

### Common Issues

#### Services Won't Start
1. Ensure Docker Desktop is running
2. Check if ports 80, 5000, 8000 are available
3. Run `view-logs.bat` to check error messages
4. Restart Docker Desktop and try again

#### Cannot Access Website
1. Verify services are running: `docker compose -f docker-compose.prod.yml ps`
2. Check Windows Firewall settings
3. Try http://127.0.0.1 instead of localhost
4. Ensure no other web server is using port 80

#### Database Connection Failed
1. Wait 2-3 minutes for database to fully start
2. Run `setup-database.bat` again
3. Check database logs: `view-logs.bat` → option 5
4. Restart database: `docker compose -f docker-compose.prod.yml restart postgres`

#### Performance Issues
1. Allocate more memory to Docker (8GB recommended)
2. Close unnecessary applications
3. Use SSD storage if available
4. Check internet connection speed

For detailed troubleshooting, see `docs/TROUBLESHOOTING_FAQ.md`

## Backup and Maintenance

### Regular Backups
- Run `backup-database.bat` weekly
- Keep multiple backup copies
- Test backup restoration periodically

### System Maintenance
- Monitor system performance
- Update Docker Desktop regularly
- Review user accounts monthly
- Clean up old log files

### Updates
1. Stop VisionGrade services
2. Backup current installation
3. Extract new version
4. Copy `.env` file to new installation
5. Start services and run migrations

## Security Considerations

### Production Deployment
- Change all default passwords
- Use strong JWT secrets
- Enable HTTPS with SSL certificates
- Configure firewall rules
- Regular security updates
- Monitor access logs

### Data Protection
- Regular database backups
- Secure file storage
- User data encryption
- Access logging and monitoring

## Support and Documentation

### Documentation
- **Installation Guide**: `docs/INSTALLATION_GUIDE.md`
- **User Manual**: `docs/USER_MANUAL.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING_FAQ.md`

### Support Channels
- **Email**: support@visiongrade.com
- **Documentation**: [Online documentation URL]
- **Community**: [Community forum URL]
- **Emergency**: [Emergency contact for critical issues]

### Getting Help
1. Check documentation first
2. Review troubleshooting guide
3. Check system logs
4. Contact support with detailed information

## License and Legal

### Software License
This software is provided under [License Type]. See LICENSE file for details.

### Third-Party Components
- Node.js and npm packages
- React.js and related libraries
- PostgreSQL database
- Python and ML libraries
- Docker containers

### Data Privacy
- User data is stored locally
- No data transmitted to external servers
- Comply with local data protection regulations
- Implement appropriate data retention policies

## Version Information

- **Version**: 1.0
- **Release Date**: October 2024
- **Build**: Production Release
- **Compatibility**: Windows 10/11, Docker Desktop

### System Components
- **Frontend**: React.js 18+ with Vite
- **Backend**: Node.js 18+ with Express
- **Database**: PostgreSQL 15
- **ML Service**: Python 3.11 with Flask
- **Cache**: Redis 7
- **Web Server**: Nginx (Alpine)

## Changelog

### Version 1.0 (October 2024)
- Initial production release
- Complete user management system
- Academic data management
- ML prediction engine
- Notification system
- Report generation
- Responsive web interface
- Docker containerization
- Windows deployment scripts
- Comprehensive documentation

## Contact Information

**VisionGrade Development Team**
- **Website**: [Company website]
- **Email**: info@visiongrade.com
- **Support**: support@visiongrade.com
- **Sales**: sales@visiongrade.com

**Technical Support**
- **Email**: support@visiongrade.com
- **Response Time**: 24-48 hours
- **Emergency Support**: Available for critical issues
- **Documentation**: [Online docs URL]

---

**Thank you for choosing VisionGrade!**

For the latest updates and documentation, visit our website or contact our support team.