@echo off
echo 🚀 Setting up VisionGrade development environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...

REM Install root dependencies
call npm install

REM Install frontend dependencies
echo 📱 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Install backend dependencies
echo 🔧 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install ML service dependencies
echo 🤖 Installing ML service dependencies...
cd ml-service
call pip install -r requirements.txt
cd ..

REM Copy environment files
echo ⚙️ Setting up environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo ✅ Created backend/.env - Please update with your database credentials
)

if not exist ml-service\.env (
    copy ml-service\.env.example ml-service\.env
    echo ✅ Created ml-service/.env - Please update with your configuration
)

echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Update backend/.env with your PostgreSQL credentials
echo 2. Create the database using PostgreSQL tools
echo 3. Start development: npm run dev
echo.
echo Services will be available at:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo - ML Service: http://localhost:8000
pause