@echo off
echo ========================================
echo VisionGrade Database Backup
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0..\.."

REM Create backup directory if it doesn't exist
if not exist "backup" mkdir backup

REM Generate timestamp for backup filename
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

set "backup_file=backup\visiongrade_backup_%timestamp%.sql"

echo Creating database backup...
echo Backup file: %backup_file%
echo.

REM Create database backup
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres visiongrade_db > "%backup_file%"

if %errorlevel% equ 0 (
    echo.
    echo Database backup created successfully!
    echo Location: %backup_file%
    echo.
) else (
    echo.
    echo ERROR: Failed to create database backup
    echo Please check if the database is running
)

pause