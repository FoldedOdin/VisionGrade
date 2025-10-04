@echo off
echo ========================================
echo VisionGrade Database Restore
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0..\.."

echo Available backup files:
echo.
dir /b backup\*.sql 2>nul
if %errorlevel% neq 0 (
    echo No backup files found in backup directory
    pause
    exit /b 1
)

echo.
set /p backup_file="Enter backup filename (without path): "

if not exist "backup\%backup_file%" (
    echo ERROR: Backup file not found: backup\%backup_file%
    pause
    exit /b 1
)

echo.
echo WARNING: This will replace all existing data in the database!
set /p confirm="Are you sure you want to continue? (y/n): "

if /i not "%confirm%"=="y" (
    echo Operation cancelled
    pause
    exit /b 0
)

echo.
echo Restoring database from backup...
echo Backup file: backup\%backup_file%
echo.

REM Stop the backend service temporarily
docker compose -f docker-compose.prod.yml stop backend ml-service

REM Drop and recreate database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS visiongrade_db;"
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "CREATE DATABASE visiongrade_db;"

REM Restore from backup
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres visiongrade_db < "backup\%backup_file%"

if %errorlevel% equ 0 (
    echo.
    echo Database restored successfully!
    echo.
    
    REM Restart services
    echo Restarting services...
    docker compose -f docker-compose.prod.yml start backend ml-service
    
    echo Services restarted successfully!
) else (
    echo.
    echo ERROR: Failed to restore database
    echo.
    
    REM Try to restart services anyway
    echo Attempting to restart services...
    docker compose -f docker-compose.prod.yml start backend ml-service
)

pause