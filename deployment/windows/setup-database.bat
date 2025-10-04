@echo off
echo ========================================
echo VisionGrade Database Setup
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0..\.."

echo Setting up database and running migrations...
echo.

REM Wait for database to be ready
echo Waiting for database to be ready...
timeout /t 10 /nobreak >nul

REM Run database migrations
echo Running database migrations...
docker compose -f docker-compose.prod.yml exec backend npm run migrate

if %errorlevel% equ 0 (
    echo.
    echo Database migrations completed successfully!
    echo.
    
    REM Ask if user wants to seed demo data
    set /p seed="Do you want to seed demo data? (y/n): "
    if /i "%seed%"=="y" (
        echo Seeding demo data...
        docker compose -f docker-compose.prod.yml exec backend npm run seed
        
        if %errorlevel% equ 0 (
            echo Demo data seeded successfully!
        ) else (
            echo Warning: Failed to seed demo data
        )
    )
) else (
    echo ERROR: Database migration failed
    echo Please check the logs for more information
)

echo.
pause