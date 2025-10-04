# VisionGrade Quick Start Guide

## 🚀 **Get VisionGrade Running in 15 Minutes**

### **Prerequisites**
- Node.js 16+ and npm
- Python 3.8+ and pip
- PostgreSQL 12+
- Redis (optional but recommended)

### **Step 1: Clone and Setup (2 minutes)**
```bash
# Clone the repository
git clone <your-repository-url>
cd visiongrade

# Quick setup script (if available)
./setup.sh
```

### **Step 2: Database Setup (3 minutes)**
```bash
# Create database
createdb visiongrade_db

# Setup backend and run migrations
cd backend
npm install
cp .env.example .env

# Edit .env file with your database credentials
# Then run migrations
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

### **Step 3: ML Models Setup (5 minutes)**
```bash
cd ../ml-service

# Install ML dependencies
pip install -r requirements.txt
pip install -r scripts/requirements_large_scale.txt

# Quick training with sample data (for immediate testing)
cd scripts
python initial_training.py --sample

# OR use pre-trained production models (if available)
python production_model_loader.py --load-best --test-prediction
```

### **Step 4: Start All Services (2 minutes)**
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: ML Service  
cd ml-service
python app.py

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

### **Step 5: Access VisionGrade (1 minute)**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **ML Service**: http://localhost:8000

### **Step 6: Login and Test (2 minutes)**
```bash
# Default admin credentials (change these!)
Username: admin
Password: admin123

# Or create new admin user via signup
```

---

## 🎯 **What You Get Immediately**

### **✅ Functional Features**
- **Student Dashboard**: View marks, attendance, predictions
- **Faculty Dashboard**: Enter marks, manage attendance, view insights  
- **Admin Dashboard**: User management, system configuration
- **ML Predictions**: University exam predictions based on internal marks
- **Report Generation**: PDF/DOC report cards and analytics
- **Notification System**: Automated alerts and announcements

### **✅ Sample Data Included**
- **Demo subjects** (Computer Science courses)
- **Sample users** (students, faculty, admin)
- **Test marks data** (for ML training)
- **Realistic predictions** (±10% accuracy)

---

## 🔧 **Quick Configuration**

### **Essential Settings (backend/.env)**
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visiongrade_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT (generate secure secrets!)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# ML Service
ML_SERVICE_URL=http://localhost:8000

# Email (optional for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### **Frontend Configuration**
```bash
# frontend/.env
VITE_API_URL=http://localhost:5000/api
VITE_ML_SERVICE_URL=http://localhost:8000
```

---

## 🧪 **Quick Tests**

### **Test 1: Authentication**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "password": "admin123"}'
```

### **Test 2: ML Prediction**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "subject_id": 1,
    "academic_year": 2025
  }'
```

### **Test 3: Frontend Access**
- Open http://localhost:3000
- Login with admin/admin123
- Navigate through dashboards

---

## 🎓 **User Workflows**

### **Student Workflow**
1. **Login** → Student Dashboard
2. **View Marks** → See Series Tests, Lab Internals
3. **Check Attendance** → Monitor attendance percentage
4. **View Predictions** → See predicted university marks
5. **Download Reports** → Generate PDF report cards

### **Faculty Workflow**
1. **Login** → Faculty Dashboard
2. **Select Subject** → Choose assigned subject
3. **Enter Marks** → Add Series Test/Lab Internal marks
4. **Update Attendance** → Record student attendance
5. **View Insights** → See class performance analytics
6. **Send Alerts** → Notify at-risk students

### **Admin Workflow**
1. **Login** → Admin Dashboard
2. **Manage Users** → Add/edit students, faculty
3. **Assign Subjects** → Link faculty to subjects
4. **System Settings** → Configure notifications, reports
5. **Monitor System** → View usage and performance

---

## 🔥 **Production Deployment (Advanced)**

### **Docker Deployment**
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps
```

### **Manual Production**
```bash
# Set production environment
export NODE_ENV=production
export FLASK_ENV=production

# Build frontend
cd frontend && npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Setup Nginx
sudo cp nginx.prod.conf /etc/nginx/sites-available/visiongrade
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🆘 **Troubleshooting**

### **Common Issues**

**❌ Database Connection Failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d visiongrade_db
```

**❌ ML Service Not Starting**
```bash
# Check Python dependencies
pip install -r ml-service/requirements.txt

# Test model loading
cd ml-service/scripts
python production_model_loader.py --load-best
```

**❌ Frontend Build Errors**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**❌ Authentication Issues**
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Update JWT_SECRET in backend/.env
```

### **Getting Help**
- **Documentation**: Check `/docs` folder
- **API Reference**: http://localhost:5000/api-docs (if available)
- **Logs**: Check console output for error messages
- **Health Checks**: 
  - Backend: http://localhost:5000/api/health
  - ML Service: http://localhost:8000/health

---

## 🎉 **Success Indicators**

### **✅ You're Ready When:**
- All three services start without errors
- You can login to the frontend
- Student dashboard shows sample data
- ML predictions are working
- Reports can be generated
- No console errors in browser

### **🎯 Next Steps:**
1. **Customize** subjects and academic structure
2. **Add real users** (students and faculty)
3. **Configure** email notifications
4. **Train models** with real academic data
5. **Deploy** to production environment
6. **Monitor** system performance

---

**🚀 Congratulations! VisionGrade is now running and ready for use!**

For detailed configuration and advanced features, see the full documentation in the `/docs` folder.