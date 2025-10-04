# VisionGrade Installation Guide

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start (Windows)](#quick-start-windows)
3. [Manual Installation](#manual-installation)
4. [Configuration](#configuration)
5. [First-Time Setup](#first-time-setup)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11, Ubuntu 18.04+, macOS 10.15+
- **RAM**: 4GB (8GB recommended)
- **Storage**: 10GB free space
- **CPU**: 2 cores (4 cores recommended)
- **Network**: Internet connection for initial setup

### Software Dependencies
- **Docker Desktop**: Latest version
- **Web Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Hardware Recommendations
- **Production Environment**:
  - 16GB RAM
  - 4+ CPU cores
  - SSD storage
  - Dedicated server or VPS

---

## Quick Start (Windows)

### Step 1: Download VisionGrade
1. Download the VisionGrade ZIP package
2. Extract to a folder (e.g., `C:\VisionGrade`)
3. Open the extracted folder

### Step 2: Install Docker Desktop
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run the installer and follow the setup wizard
3. Restart your computer when prompted
4. Launch Docker Desktop and wait for it to start

### Step 3: Run VisionGrade
1. Navigate to the `deployment\windows` folder
2. Double-click `start-visiongrade.bat`
3. Wait for the services to start (first time may take 10-15 minutes)
4. Open your browser and go to http://localhost

### Step 4: Initial Setup
1. The system will prompt you to set up the database
2. Run `setup-database.bat` from the `deployment\windows` folder
3. Choose whether to seed demo data
4. Access the system at http://localhost

**Default Admin Credentials** (if demo data is seeded):
- Username: `admin@visiongrade.com`
- Password: `admin123`

---

## Manual Installation

### Step 1: Install Docker

#### Windows
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run installer as administrator
3. Enable WSL 2 integration if prompted
4. Restart computer
5. Verify installation:
   ```cmd
   docker --version
   docker compose version
   ```

#### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### macOS
1. Download Docker Desktop for Mac
2. Drag Docker.app to Applications folder
3. Launch Docker Desktop
4. Follow setup instructions
5. Verify installation in Terminal:
   ```bash
   docker --version
   docker compose version
   ```

### Step 2: Download and Extract VisionGrade

#### Option A: Download ZIP Package
1. Download the VisionGrade package
2. Extract to desired location
3. Navigate to the extracted folder

#### Option B: Clone Repository (if available)
```bash
git clone https://github.com/your-org/visiongrade.git
cd visiongrade
```

### Step 3: Configure Environment

1. **Copy environment file**:
   ```bash
   cp .env.production .env
   ```

2. **Edit configuration** (see [Configuration](#configuration) section):
   ```bash
   # Windows
   notepad .env
   
   # Linux/macOS
   nano .env
   ```

### Step 4: Start Services

#### Using Docker Compose
```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

#### Using Windows Scripts
```cmd
# Navigate to deployment\windows folder
cd deployment\windows

# Start services
start-visiongrade.bat
```

### Step 5: Database Setup

#### Automatic Setup (Windows)
```cmd
# Run from deployment\windows folder
setup-database.bat
```

#### Manual Setup
```bash
# Wait for database to be ready
sleep 30

# Run migrations
docker compose -f docker-compose.prod.yml exec backend npm run migrate

# Seed demo data (optional)
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

---

## Configuration

### Environment Variables

Edit the `.env` file to configure your installation:

```bash
# Database Configuration
DB_NAME=visiongrade_db
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_HOST=postgres
DB_PORT=5432

# Application Ports
FRONTEND_PORT=80
BACKEND_PORT=5000
ML_PORT=8000

# Security
JWT_SECRET=your_very_secure_jwt_secret_minimum_32_characters
SESSION_SECRET=your_session_secret

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=VisionGrade <noreply@visiongrade.com>

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Performance
CACHE_TTL=3600
MAX_CONCURRENT_REQUESTS=100
```

### Security Configuration

1. **Change default passwords**:
   - Database password
   - JWT secret (minimum 32 characters)
   - Session secret

2. **Email setup** (required for password reset):
   - Configure SMTP settings
   - Use app passwords for Gmail
   - Test email delivery

3. **SSL/HTTPS** (recommended for production):
   - Obtain SSL certificates
   - Configure nginx for HTTPS
   - Update environment variables

### Advanced Configuration

#### Custom Ports
If default ports are in use, modify `.env`:
```bash
FRONTEND_PORT=8080
BACKEND_PORT=5001
ML_PORT=8001
```

#### External Database
To use external PostgreSQL:
```bash
DB_HOST=your-database-server.com
DB_PORT=5432
DB_NAME=visiongrade
DB_USER=visiongrade_user
DB_PASSWORD=secure_password
```

#### Redis Configuration
For external Redis:
```bash
REDIS_HOST=your-redis-server.com
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
```

---

## First-Time Setup

### Step 1: Access the System
1. Open web browser
2. Navigate to http://localhost (or your configured URL)
3. You should see the VisionGrade login screen

### Step 2: Create Admin Account

#### Option A: Use Demo Data
If you seeded demo data, use:
- Email: `admin@visiongrade.com`
- Password: `admin123`

#### Option B: Create New Admin
```bash
# Connect to backend container
docker compose -f docker-compose.prod.yml exec backend npm run create-admin

# Follow prompts to create admin account
```

### Step 3: Initial Configuration

1. **Login as administrator**
2. **Update admin profile**:
   - Change default password
   - Update contact information
   - Upload profile photo

3. **Configure system settings**:
   - Set academic calendar
   - Configure notification settings
   - Set up email templates

4. **Create subjects**:
   - Add subjects for each semester
   - Set subject codes and names
   - Configure credit hours

### Step 4: Add Users

1. **Create faculty accounts**:
   - Go to Admin Dashboard → User Management
   - Click "Add New User"
   - Fill in faculty details
   - Assign subjects to faculty

2. **Create student accounts**:
   - Bulk import from CSV (recommended)
   - Or create individual accounts
   - Assign students to semesters

3. **Set up tutors**:
   - Assign tutor roles to faculty
   - Configure prediction controls

### Step 5: Test System

1. **Test login** with different user types
2. **Verify email delivery** (password reset)
3. **Test file uploads** (profile photos)
4. **Check notifications** system
5. **Generate test reports**

---

## Verification

### Health Checks

#### Service Status
```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Expected output: All services should show "Up" status
```

#### Application Health
```bash
# Test backend API
curl http://localhost:5000/health

# Test ML service
curl http://localhost:8000/health

# Test frontend
curl http://localhost/health
```

#### Database Connection
```bash
# Connect to database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d visiongrade_db

# List tables
\dt

# Check user count
SELECT COUNT(*) FROM users;

# Exit
\q
```

### Functional Testing

#### Login Test
1. Open http://localhost
2. Try logging in with admin credentials
3. Verify dashboard loads correctly
4. Test logout functionality

#### User Management Test
1. Login as admin
2. Create a test user
3. Verify user receives email with credentials
4. Test login with new user account

#### Data Entry Test
1. Login as faculty
2. Add test marks for students
3. Verify students can see the marks
4. Test attendance entry

#### ML Predictions Test
1. Ensure sufficient test data exists
2. Login as tutor
3. Enable predictions for a subject
4. Verify students can see predictions

### Performance Testing

#### Load Test
```bash
# Install Apache Bench (if not available)
# Ubuntu/Debian: sudo apt install apache2-utils
# macOS: brew install httpie

# Test frontend
ab -n 100 -c 10 http://localhost/

# Test API
ab -n 100 -c 10 http://localhost:5000/api/health
```

#### Resource Usage
```bash
# Monitor resource usage
docker stats --no-stream

# Check disk usage
df -h

# Check memory usage
free -h
```

---

## Troubleshooting

### Common Installation Issues

#### Docker Not Starting
**Problem**: Docker Desktop won't start or shows errors
**Solutions**:
1. Restart Docker Desktop
2. Check system requirements (virtualization enabled)
3. Run as administrator (Windows)
4. Check for Windows updates
5. Reinstall Docker Desktop

#### Port Conflicts
**Problem**: "Port already in use" errors
**Solutions**:
1. Check what's using the ports:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Linux/macOS
   lsof -i :5000
   ```
2. Stop conflicting services
3. Change ports in `.env` file

#### Database Connection Failed
**Problem**: Cannot connect to database
**Solutions**:
1. Check if PostgreSQL container is running:
   ```bash
   docker compose -f docker-compose.prod.yml ps postgres
   ```
2. Check database logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs postgres
   ```
3. Verify environment variables in `.env`
4. Restart database container:
   ```bash
   docker compose -f docker-compose.prod.yml restart postgres
   ```

#### Services Won't Start
**Problem**: One or more services fail to start
**Solutions**:
1. Check service logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs [service-name]
   ```
2. Common issues:
   - Missing environment variables
   - Port conflicts
   - Insufficient resources
   - File permission issues

#### Frontend Not Loading
**Problem**: Browser shows error or blank page
**Solutions**:
1. Check if frontend container is running
2. Verify nginx configuration
3. Check browser console for errors
4. Try different browser
5. Clear browser cache

### Performance Issues

#### Slow Startup
**Problem**: Services take long time to start
**Solutions**:
1. Increase Docker memory allocation
2. Use SSD storage
3. Close unnecessary applications
4. Check internet connection (for image downloads)

#### High Memory Usage
**Problem**: System uses too much memory
**Solutions**:
1. Reduce Docker memory limits
2. Optimize database configuration
3. Reduce number of worker processes
4. Add more system RAM

### Network Issues

#### Cannot Access from Other Devices
**Problem**: VisionGrade only accessible from localhost
**Solutions**:
1. Configure firewall to allow ports 80, 5000, 8000
2. Update nginx configuration for external access
3. Use actual IP address instead of localhost
4. Check network security settings

#### SSL/HTTPS Issues
**Problem**: SSL certificate errors or HTTPS not working
**Solutions**:
1. Verify SSL certificate files exist
2. Check certificate validity
3. Update nginx SSL configuration
4. Use proper domain name (not IP address)

---

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor system health and performance
- Check error logs for issues
- Verify backup completion

#### Weekly
- Review user activity and performance
- Update system if patches available
- Clean up old log files
- Test backup restoration

#### Monthly
- Full system backup
- Security audit and updates
- Performance optimization
- User account cleanup

### Backup Procedures

#### Automated Backup (Windows)
```cmd
# Schedule backup-database.bat to run daily
# Use Windows Task Scheduler
```

#### Manual Backup
```bash
# Create backup directory
mkdir -p backup

# Backup database
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres visiongrade_db > backup/visiongrade_$(date +%Y%m%d_%H%M%S).sql

# Backup uploaded files
tar -czf backup/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Backup configuration
cp .env backup/env_$(date +%Y%m%d_%H%M%S).backup
```

#### Restore from Backup
```bash
# Stop services
docker compose -f docker-compose.prod.yml stop backend ml-service

# Restore database
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS visiongrade_db;"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "CREATE DATABASE visiongrade_db;"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres visiongrade_db < backup/your_backup_file.sql

# Restart services
docker compose -f docker-compose.prod.yml start backend ml-service
```

### Updates and Upgrades

#### Update Process
1. **Backup current system**
2. **Download new version**
3. **Stop services**:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```
4. **Replace files** (keep .env and data directories)
5. **Start services**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
6. **Run migrations** if needed:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend npm run migrate
   ```
7. **Verify system** functionality

#### Rollback Procedure
If update fails:
1. **Stop new services**
2. **Restore previous version files**
3. **Restore database from backup**
4. **Start previous version**
5. **Verify functionality**

### Monitoring and Logs

#### Log Locations
- **Application logs**: `./logs/`
- **Docker logs**: `docker compose logs`
- **Database logs**: Inside PostgreSQL container
- **Web server logs**: Inside nginx container

#### Monitoring Commands
```bash
# Real-time resource usage
docker stats

# Service status
docker compose -f docker-compose.prod.yml ps

# Recent logs
docker compose -f docker-compose.prod.yml logs --tail=100 -f

# Disk usage
du -sh uploads/ logs/ backup/
```

### Security Maintenance

#### Regular Security Tasks
1. **Update passwords** regularly
2. **Review user accounts** and remove inactive users
3. **Monitor failed login attempts**
4. **Update SSL certificates** before expiration
5. **Apply security patches** promptly

#### Security Monitoring
```bash
# Check failed login attempts
docker compose -f docker-compose.prod.yml logs backend | grep "login failed"

# Monitor unusual activity
docker compose -f docker-compose.prod.yml logs | grep -i "error\|warning\|failed"
```

---

## Support and Resources

### Documentation
- **User Manual**: `docs/USER_MANUAL.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Troubleshooting Guide**: `docs/TROUBLESHOOTING_FAQ.md`

### Community Support
- **GitHub Issues**: [Repository URL]
- **Community Forum**: [Forum URL]
- **Documentation Wiki**: [Wiki URL]

### Professional Support
- **Email**: support@visiongrade.com
- **Emergency Support**: Available for critical issues
- **Training**: Available for administrators and users

### Additional Resources
- **Docker Documentation**: https://docs.docker.com/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/

---

**Document Version**: 1.0  
**Last Updated**: October 2024  
**Next Review**: January 2025

For the latest version of this guide, visit [documentation URL] or contact support@visiongrade.com.