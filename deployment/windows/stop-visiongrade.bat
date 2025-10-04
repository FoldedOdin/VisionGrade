@echo off
echo ========================================
echo Stopping VisionGrade Services
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0..\.."

echo Stopping all VisionGrade services...
docker compose -f docker-compose.prod.yml down

if %errorlevel% equ 0 (
    echo.
    echo VisionGrade services stopped successfully!
    echo.
) else (
    echo.
    echo ERROR: Failed to stop some services
    echo You may need to stop them manually using Docker Desktop
)

pause