# VisionGrade - Student Performance Analysis System (SPAS)

A comprehensive web application for managing student academic data, providing ML-powered performance predictions, and facilitating communication between students, faculty, and administrators.

## 🚀 Features

- **Multi-role Authentication**: Students, Faculty, Tutors, and Administrators
- **Performance Tracking**: Real-time marks and attendance monitoring
- **ML Predictions**: University exam performance predictions using internal assessments
- **Automated Notifications**: Smart alerts for low attendance and at-risk students
- **Report Generation**: PDF/DOC report cards and performance insights
- **Modern UI/UX**: Responsive design with glassmorphism styling and smooth animations

## 🔐 Security Notice

**Administrator accounts cannot be created through public registration for security reasons.**

### Quick Setup (Development/Testing)
For quick setup with default credentials:
```bash
cd backend
node scripts/create-default-admin.js
```
**Default Credentials**: `admin@visiongrade.com` / `Admin@123`

### Production Setup
For production environments, use the interactive script:
```bash
cd backend
node scripts/create-first-admin.js
```

Additional administrators can only be created by existing administrators through the admin dashboard or API. See [Admin Setup Guide](backend/docs/ADMIN_SETUP.md) and [Default Admin Setup](DEFAULT_ADMIN_SETUP.md) for details.

## 🏗️ Architecture

- **Frontend**: React.js with Vite, Tailwind CSS
- **Backend**: Node.js with Express.js, PostgreSQL, Sequelize ORM
- **ML Service**: Python with Flask, Scikit-learn/XGBoost
- **Authentication**: JWT-based with role-based access control
- **Caching**: Redis for session management

## 📋 Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- PostgreSQL (v12 or higher)
- Redis (optional, for caching)

## 🛠️ Installation

### 1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd vision-grade
\`\`\`

### 2. Install all dependencies
\`\`\`bash
npm run install:all
\`\`\`

### 3. Set up environment variables
\`\`\`bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# ML Service
cp ml-service/.env.example ml-service/.env
# Edit ml-service/.env with your configuration
\`\`\`

### 4. Set up the database
\`\`\`bash
# Create PostgreSQL database
createdb visiongrade_db

# Run migrations (after implementing them)
cd backend
npm run migrate
\`\`\`

## 🚀 Development

### Start all services
\`\`\`bash
npm run dev
\`\`\`

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:5000
- ML Service on http://localhost:8000

### Start individual services
\`\`\`bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# ML Service only
npm run dev:ml
\`\`\`

## 📁 Project Structure

\`\`\`
vision-grade/
├── frontend/                 # React.js frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── backend/                 # Node.js/Express backend
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Custom middleware
│   ├── models/            # Sequelize models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── package.json
├── ml-service/             # Python ML service
│   ├── models/            # Trained ML models
│   ├── services/          # ML logic
│   ├── utils/             # ML utilities
│   └── requirements.txt
└── package.json           # Root package.json
\`\`\`

## 🧪 Testing

\`\`\`bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# ML service tests
cd ml-service && pytest
\`\`\`

## 📦 Building for Production

\`\`\`bash
# Build frontend
npm run build

# Start production server
npm start
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions, please open an issue in the repository or contact the development team.