@echo off
echo ========================================
echo VisionGrade Service Logs
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0..\.."

echo Select which service logs to view:
echo 1. All services
echo 2. Frontend
echo 3. Backend
echo 4. ML Service
echo 5. Database
echo 6. Redis
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    docker compose -f docker-compose.prod.yml logs -f
) else if "%choice%"=="2" (
    docker compose -f docker-compose.prod.yml logs -f frontend
) else if "%choice%"=="3" (
    docker compose -f docker-compose.prod.yml logs -f backend
) else if "%choice%"=="4" (
    docker compose -f docker-compose.prod.yml logs -f ml-service
) else if "%choice%"=="5" (
    docker compose -f docker-compose.prod.yml logs -f postgres
) else if "%choice%"=="6" (
    docker compose -f docker-compose.prod.yml logs -f redis
) else (
    echo Invalid choice. Showing all logs...
    docker compose -f docker-compose.prod.yml logs -f
)

pause