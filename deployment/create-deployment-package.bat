@echo off
echo ========================================
echo VisionGrade Deployment Package Creator
echo ========================================
echo.

REM Set variables
set PACKAGE_NAME=VisionGrade-v1.0-Windows
set PACKAGE_DIR=deployment\package
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo Creating deployment package: %PACKAGE_NAME%
echo Timestamp: %TIMESTAMP%
echo.

REM Create package directory
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%\%PACKAGE_NAME%"

REM Copy core application files
echo Copying application files...
xcopy /E /I /H /Y "backend" "%PACKAGE_DIR%\%PACKAGE_NAME%\backend\"
xcopy /E /I /H /Y "frontend" "%PACKAGE_DIR%\%PACKAGE_NAME%\frontend\"
xcopy /E /I /H /Y "ml-service" "%PACKAGE_DIR%\%PACKAGE_NAME%\ml-service\"

REM Copy Docker configuration
echo Copying Docker configuration...
copy "docker-compose.yml" "%PACKAGE_DIR%\%PACKAGE_NAME%\"
copy "docker-compose.prod.yml" "%PACKAGE_DIR%\%PACKAGE_NAME%\"

REM Copy environment configuration
echo Copying environment files...
copy ".env.production" "%PACKAGE_DIR%\%PACKAGE_NAME%\.env.example"
if exist ".env" copy ".env" "%PACKAGE_DIR%\%PACKAGE_NAME%\.env.backup"

REM Copy deployment scripts
echo Copying deployment scripts...
xcopy /E /I /Y "deployment\windows" "%PACKAGE_DIR%\%PACKAGE_NAME%\deployment\windows\"

REM Copy documentation
echo Copying documentation...
xcopy /E /I /Y "docs" "%PACKAGE_DIR%\%PACKAGE_NAME%\docs\"

REM Copy additional files
echo Copying additional files...
copy "README.md" "%PACKAGE_DIR%\%PACKAGE_NAME%\"
copy "package.json" "%PACKAGE_DIR%\%PACKAGE_NAME%\"
if exist "LICENSE" copy "LICENSE" "%PACKAGE_DIR%\%PACKAGE_NAME%\"

REM Create necessary directories
echo Creating directory structure...
mkdir "%PACKAGE_DIR%\%PACKAGE_NAME%\uploads"
mkdir "%PACKAGE_DIR%\%PACKAGE_NAME%\logs"
mkdir "%PACKAGE_DIR%\%PACKAGE_NAME%\backup"
mkdir "%PACKAGE_DIR%\%PACKAGE_NAME%\ml-models"
mkdir "%PACKAGE_DIR%\%PACKAGE_NAME%\ml-logs"
mkdir "%PACKAGE_DIR%\%PACKAGE_NAME%\ssl"

REM Create quick start guide
echo Creating quick start guide...
echo # VisionGrade Quick Start Guide > "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo. >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo ## Prerequisites >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 1. Install Docker Desktop from https://www.docker.com/products/docker-desktop >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 2. Restart your computer after Docker installation >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo. >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo ## Installation >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 1. Extract this ZIP file to a folder (e.g., C:\VisionGrade) >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 2. Navigate to deployment\windows folder >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 3. Double-click start-visiongrade.bat >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 4. Wait for services to start (first time may take 10-15 minutes) >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 5. Run setup-database.bat to initialize the database >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo 6. Open http://localhost in your browser >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo. >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo ## Default Admin Login (if demo data is seeded) >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo - Email: admin@visiongrade.com >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo - Password: admin123 >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo. >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"
echo For detailed instructions, see docs\INSTALLATION_GUIDE.md >> "%PACKAGE_DIR%\%PACKAGE_NAME%\QUICK_START.md"

REM Create version info
echo Creating version information...
echo VisionGrade v1.0 > "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo Build Date: %date% %time% >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo Package: %PACKAGE_NAME% >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo. >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo Components: >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo - Frontend: React.js with Vite >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo - Backend: Node.js with Express >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo - Database: PostgreSQL 15 >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo - ML Service: Python with Flask >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"
echo - Cache: Redis 7 >> "%PACKAGE_DIR%\%PACKAGE_NAME%\VERSION.txt"

REM Create ZIP package
echo Creating ZIP package...
cd "%PACKAGE_DIR%"
powershell -command "Compress-Archive -Path '%PACKAGE_NAME%' -DestinationPath '%PACKAGE_NAME%_%TIMESTAMP%.zip' -Force"
cd ..\..

if exist "%PACKAGE_DIR%\%PACKAGE_NAME%_%TIMESTAMP%.zip" (
    echo.
    echo ========================================
    echo Package created successfully!
    echo ========================================
    echo.
    echo Package location: %PACKAGE_DIR%\%PACKAGE_NAME%_%TIMESTAMP%.zip
    echo Package size: 
    dir "%PACKAGE_DIR%\%PACKAGE_NAME%_%TIMESTAMP%.zip" | find ".zip"
    echo.
    echo The package includes:
    echo - Complete VisionGrade application
    echo - Docker configuration files
    echo - Windows deployment scripts
    echo - Complete documentation
    echo - Quick start guide
    echo.
    echo To deploy:
    echo 1. Extract the ZIP file on target system
    echo 2. Install Docker Desktop
    echo 3. Run deployment\windows\start-visiongrade.bat
    echo.
) else (
    echo.
    echo ERROR: Failed to create ZIP package
    echo Please check if PowerShell is available and try again
)

REM Clean up temporary directory (optional)
set /p cleanup="Remove temporary files? (y/n): "
if /i "%cleanup%"=="y" (
    rmdir /s /q "%PACKAGE_DIR%\%PACKAGE_NAME%"
    echo Temporary files cleaned up.
)

pause