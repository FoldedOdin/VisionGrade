<div align="center">

# VISIONGRADE

**Student Performance Analysis System**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)
[![Last Commit](https://img.shields.io/github/last-commit/FoldedOdin/VisionGrade)](https://github.com/FoldedOdin/VisionGrade)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)](https://github.com/FoldedOdin/VisionGrade)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://github.com/FoldedOdin/VisionGrade)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/FoldedOdin/VisionGrade)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](https://github.com/FoldedOdin/VisionGrade)

</div>

<div align="center">

##  **VisionGrade Demo Video**

[![VisionGrade Demo Video](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://youtu.be/YOUR_VIDEO_ID)

*🎥 Click above to watch the full demo on YouTube*

---
</div>

##  About

A **comprehensive web application** for managing student academic data, providing ML-powered performance predictions, and facilitating communication between students, faculty, and administrators. Designed for educational institutions seeking intelligent performance analytics.

##  Features

###  Multi-Role System
- **Students** - Access grades, attendance, and performance predictions
- **Faculty** - Manage courses, grades, and student assessments
- **Tutors** - Support student learning and track progress
- **Administrators** - Full system control and analytics

###  Performance Tracking
- **Real-time Monitoring** - Track marks and attendance instantly
- **Historical Analysis** - View performance trends over time
- **Goal Setting** - Set and track academic targets
- **Mobile Responsive** - Access data anywhere, anytime

### ML-Powered Intelligence
- **Performance Predictions** - AI-powered exam score forecasting
- **Risk Detection** - Identify at-risk students early
- **Smart Recommendations** - Personalized improvement suggestions
- **Trend Analysis** - Advanced analytics and insights

### Automated Notifications
- **Low Attendance Alerts** - Automatic warnings for poor attendance
- **Performance Warnings** - Early intervention for struggling students
- **Email Integration** - Automated notification delivery
- **Real-time Updates** - Instant alerts for important events

### Report Generation
- **PDF Reports** - Professional report cards and transcripts
- **Performance Insights** - Detailed analytics and visualizations
- **Progress Reports** - Comprehensive academic summaries
- **Batch Processing** - Generate multiple reports efficiently

###  Modern UI/UX
- **Glassmorphism Design** - Beautiful, modern interface
- **Smooth Animations** - Polished user interactions
- **Dark Mode Support** - Easy on the eyes (coming soon)
- **Fully Responsive** - Perfect on all devices

## Tech Stack

<div align="center">

### Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

### Backend
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=Sequelize&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)

### ML Service
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)

### Infrastructure
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

</div>

##  Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- ![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white) (v18 or higher)
- ![Python](https://img.shields.io/badge/Python-v3.8+-3776AB?logo=python&logoColor=white) (v3.8 or higher)
- ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v12+-316192?logo=postgresql&logoColor=white) (v12 or higher)
- ![Redis](https://img.shields.io/badge/Redis-Optional-DC382D?logo=redis&logoColor=white) (optional, for caching)

###  Installation

```bash
# 1️⃣ Clone the repository
git clone <repository-url>
cd vision-grade

# 2️⃣ Install all dependencies
npm run install:all

# 3️⃣ Set up environment variables
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# ML Service
cp ml-service/.env.example ml-service/.env
# Edit ml-service/.env with your configuration

# 4️⃣ Set up the database
createdb visiongrade_db

# Run migrations
cd backend
npm run migrate

# 5️⃣ Create admin account (Choose one method)
# Quick setup with defaults (Development)
node scripts/create-default-admin.js
# Default Credentials: admin@visiongrade.com / Admin@123

# OR Interactive setup (Production)
node scripts/create-first-admin.js
```

###  Start Development Servers

```bash
# Start all services at once
npm run dev

# Or start individually:
npm run dev:frontend   # Frontend → http://localhost:3000
npm run dev:backend    # Backend  → http://localhost:5000
npm run dev:ml        # ML API   → http://localhost:8000
```

### Access Points

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **ML Service**: [http://localhost:8000](http://localhost:8000)

##  Security Notice

<div align="center">

![Security](https://img.shields.io/badge/Security-Grade%20A-success?style=for-the-badge)
![Authentication](https://img.shields.io/badge/Authentication-JWT-orange?style=for-the-badge)
![RBAC](https://img.shields.io/badge/RBAC-Enabled-blue?style=for-the-badge)

</div>

**⚠️ Important:** Administrator accounts cannot be created through public registration for security reasons.

###  Admin Setup Options

#### Development/Testing (Quick Setup)
```bash
cd backend
node scripts/create-default-admin.js
```
**Default Credentials:** `admin@visiongrade.com` / `Admin@123`

#### Production (Secure Setup)
```bash
cd backend
node scripts/create-first-admin.js
```
Follow the interactive prompts to create a secure admin account.

**📖 Documentation:**
- [Admin Setup Guide](backend/docs/ADMIN_SETUP.md)
- [Default Admin Setup](DEFAULT_ADMIN_SETUP.md)

##  Available Scripts

<div align="center">

| Script | Description | Status |
|--------|-------------|--------|
| `npm run dev` | Start all services | ![Status](https://img.shields.io/badge/Status-Active-success) |
| `npm run dev:frontend` | Start frontend only | ![Status](https://img.shields.io/badge/Status-Active-success) |
| `npm run dev:backend` | Start backend only | ![Status](https://img.shields.io/badge/Status-Active-success) |
| `npm run dev:ml` | Start ML service only | ![Status](https://img.shields.io/badge/Status-Active-success) |
| `npm run install:all` | Install all dependencies | ![Status](https://img.shields.io/badge/Status-Active-success) |
| `npm run build` | Build for production | ![Status](https://img.shields.io/badge/Status-Active-success) |
| `npm test` | Run all tests | ![Status](https://img.shields.io/badge/Status-Active-success) |

</div>

##  Project Structure

```
📦 vision-grade/
├── 📁 frontend/                 # React.js frontend
│   ├── 📁 src/
│   │   ├── 📁 components/      # Reusable components
│   │   │   ├── 📄 Dashboard.jsx       # Main dashboard
│   │   │   ├── 📄 StudentCard.jsx     # Student info cards
│   │   │   ├── 📄 GradeTable.jsx      # Grade display table
│   │   │   └── 📄 NotificationBell.jsx # Alert system
│   │   ├── 📁 pages/          # Page components
│   │   │   ├── 📄 Login.jsx          # Authentication page
│   │   │   ├── 📄 StudentDashboard.jsx
│   │   │   ├── 📄 FacultyDashboard.jsx
│   │   │   └── 📄 AdminPanel.jsx
│   │   ├── 📁 hooks/          # Custom hooks
│   │   │   ├── 📄 useAuth.js         # Authentication hook
│   │   │   └── 📄 usePerformance.js  # Performance data hook
│   │   ├── 📁 services/       # API services
│   │   │   ├── 📄 authService.js     # Auth API calls
│   │   │   ├── 📄 studentService.js  # Student API calls
│   │   │   └── 📄 mlService.js       # ML predictions
│   │   └── 📁 utils/          # Utility functions
│   │       ├── 📄 dateFormatter.js   # Date utilities
│   │       └── 📄 gradeCalculator.js # Grade calculations
│   └── 📄 package.json
├── 📁 backend/                 # Node.js/Express backend
│   ├── 📁 controllers/        # Route handlers
│   │   ├── 📄 authController.js      # Authentication logic
│   │   ├── 📄 studentController.js   # Student operations
│   │   └── 📄 gradeController.js     # Grade management
│   ├── 📁 middleware/         # Custom middleware
│   │   ├── 📄 authenticate.js        # JWT verification
│   │   ├── 📄 authorize.js           # Role-based access
│   │   └── 📄 errorHandler.js        # Error management
│   ├── 📁 models/            # Sequelize models
│   │   ├── 📄 User.js               # User model
│   │   ├── 📄 Student.js            # Student model
│   │   ├── 📄 Course.js             # Course model
│   │   └── 📄 Grade.js              # Grade model
│   ├── 📁 routes/            # API routes
│   │   ├── 📄 auth.js               # Auth endpoints
│   │   ├── 📄 students.js           # Student endpoints
│   │   └── 📄 grades.js             # Grade endpoints
│   ├── 📁 services/          # Business logic
│   │   ├── 📄 notificationService.js # Alert system
│   │   └── 📄 reportService.js      # Report generation
│   ├── 📁 scripts/           # Utility scripts
│   │   ├── 📄 create-default-admin.js
│   │   └── 📄 create-first-admin.js
│   ├── 📁 docs/              # Documentation
│   │   └── 📄 ADMIN_SETUP.md
│   └── 📄 package.json
├── 📁 ml-service/             # Python ML service
│   ├── 📁 models/            # Trained ML models
│   │   ├── 📄 performance_model.pkl  # Prediction model
│   │   └── 📄 risk_classifier.pkl    # Risk detection
│   ├── 📁 services/          # ML logic
│   │   ├── 📄 predictor.py          # Prediction service
│   │   └── 📄 analyzer.py           # Analysis service
│   ├── 📁 utils/             # ML utilities
│   │   ├── 📄 preprocessor.py       # Data preprocessing
│   │   └── 📄 feature_engineer.py   # Feature engineering
│   ├── 📄 app.py            # Flask application
│   └── 📄 requirements.txt
├── 📄 DEFAULT_ADMIN_SETUP.md
└── 📄 README.md               # You are here
```

##  Testing

<div align="center">

![Test Coverage](https://img.shields.io/badge/Coverage-85%25-brightgreen?style=for-the-badge)
![Unit Tests](https://img.shields.io/badge/Unit%20Tests-Passing-success?style=for-the-badge)
![Integration](https://img.shields.io/badge/Integration-Passing-success?style=for-the-badge)

</div>

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# ML service tests
cd ml-service && pytest

# Run all tests
npm test
```

##  Deployment

### Frontend Deployment
[![Deploy to Netlify](https://img.shields.io/badge/Deploy%20to-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://netlify.com)
[![Deploy to Vercel](https://img.shields.io/badge/Deploy%20to-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

### Backend Deployment
[![Deploy to Heroku](https://img.shields.io/badge/Deploy%20to-Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white)](https://heroku.com)
[![Deploy on Railway](https://img.shields.io/badge/Deploy%20on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)

```bash
# Build frontend for production
npm run build

# Start production server
npm start

# Environment variables required:
MONGODB_URI=your-postgresql-connection-string
JWT_SECRET=your-super-secure-jwt-secret
NODE_ENV=production
REDIS_URL=your-redis-url (optional)
```

##  Browser Support

<div align="center">

![Chrome](https://img.shields.io/badge/Chrome-90+-4285F4?logo=google-chrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-88+-FF7139?logo=firefox&logoColor=white)
![Safari](https://img.shields.io/badge/Safari-14+-000000?logo=safari&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-90+-0078D4?logo=microsoft-edge&logoColor=white)

</div>

## 🤝 Contributing

We love contributions! Please read our contributing guidelines before getting started.

<div align="center">

[![Contributors](https://img.shields.io/github/contributors/FoldedOdin/VisionGrade)](https://github.com/FoldedOdin/VisionGrade/graphs/contributors)
[![Issues](https://img.shields.io/github/issues/yourusername/visiongrade)](https://github.com/FoldedOdin/VisionGrade/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/FoldedOdin/VisionGrade)](https://github.com/FoldedOdin/VisionGrade/pulls)

</div>

### Development Process

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 🧪 Add tests for new functionality
5. 📤 Push to the branch (`git push origin feature/amazing-feature`)
6. 📥 Open a Pull Request

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE.md) file for details.

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## 🙏 Acknowledgments

<div align="center">

Special thanks to the amazing open source community and these fantastic projects:

[![React](https://img.shields.io/badge/Thanks-React%20Team-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
[![TailwindCSS](https://img.shields.io/badge/Thanks-Tailwind%20Team-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/Thanks-PostgreSQL%20Team-316192?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Thanks-Python%20Community-3776AB?logo=python&logoColor=white)](https://python.org)

</div>

## 📬 Connect With Me

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?logo=github&logoColor=white)](https://github.com/FoldedOdin)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?logo=linkedin&logoColor=white)](https://linkedin.com/in/karthikkpradeep)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?logo=gmail&logoColor=white)](mailto:karthikkpradeep123@gmail.com)

</div>

## 🆘 Support

For support and questions:
- 📧 Email: visiongrade.spas@gmail.com
- 💬 Open an [issue](https://github.com/FoldedOdin/VisionGrade/issues)
- 📖 Check our [documentation](https://github.com/FoldedOdin/VisionGrade/wiki)

---

<div align="center">

**🎯 Built with ❤️ for educational excellence**

![Made with Love](https://img.shields.io/badge/Made%20with-❤️-rose.svg)
![Open Source](https://img.shields.io/badge/Open%20Source-💙-blue.svg)
![ML Powered](https://img.shields.io/badge/ML%20Powered-🤖-purple.svg)

### ⭐ If you found this project helpful, please give it a star!

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/visiongrade&type=Timeline)](https://star-history.com/#yourusername/visiongrade&Timeline)

[![🚀 Return To TOP](https://img.shields.io/badge/🚀%20Return%20to-%20TOP-4ECDC4?style=for-the-badge&labelColor=5F27CD)](#visiongrade)

</div>
