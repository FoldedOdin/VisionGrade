@echo off
echo ========================================
echo VisionGrade - Student Performance Analysis System
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose is not available
    echo Please ensure Docker Desktop is running
    pause
    exit /b 1
)

echo Starting VisionGrade services...
echo.

REM Navigate to the project directory
cd /d "%~dp0..\.."

REM Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "logs" mkdir logs
if not exist "ml-models" mkdir ml-models
if not exist "ml-logs" mkdir ml-logs
if not exist "backup" mkdir backup

REM Copy environment file if it doesn't exist
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo Created .env file from .env.example
        echo Please edit .env file with your configuration before continuing
        pause
    )
)

REM Start services
echo Starting services in production mode...
docker compose -f docker-compose.prod.yml up -d

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo VisionGrade started successfully!
    echo ========================================
    echo.
    echo Frontend: http://localhost
    echo Backend API: http://localhost:5000
    echo ML Service: http://localhost:8000
    echo.
    echo To stop the services, run: stop-visiongrade.bat
    echo To view logs, run: view-logs.bat
    echo.
) else (
    echo.
    echo ERROR: Failed to start VisionGrade services
    echo Check the logs for more information
    pause
)

pause