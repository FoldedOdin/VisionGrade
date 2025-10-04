@echo off
echo ========================================
echo VisionGrade - Comprehensive Test Suite
echo ========================================

set TOTAL_TESTS=0
set PASSED_TESTS=0
set START_TIME=%time%

echo.
echo 🧪 Running Frontend Tests...
echo ----------------------------------------
cd frontend
call npm test -- --ci --coverage --watchAll=false
if %errorlevel% equ 0 (
    echo ✅ Frontend tests passed
    set /a PASSED_TESTS+=1
) else (
    echo ❌ Frontend tests failed
)
set /a TOTAL_TESTS+=1
cd ..

echo.
echo 🧪 Running Backend Tests...
echo ----------------------------------------
cd backend
call npm run test
if %errorlevel% equ 0 (
    echo ✅ Backend tests passed
    set /a PASSED_TESTS+=1
) else (
    echo ❌ Backend tests failed
)
set /a TOTAL_TESTS+=1
cd ..

echo.
echo 🧪 Running ML Service Tests...
echo ----------------------------------------
cd ml-service
python run_all_tests.py
if %errorlevel% equ 0 (
    echo ✅ ML Service tests passed
    set /a PASSED_TESTS+=1
) else (
    echo ❌ ML Service tests failed
)
set /a TOTAL_TESTS+=1
cd ..

echo.
echo ========================================
echo 📊 COMPREHENSIVE TEST SUMMARY
echo ========================================
echo Results: %PASSED_TESTS%/%TOTAL_TESTS% test suites passed
echo Start Time: %START_TIME%
echo End Time: %time%
echo ========================================

if %PASSED_TESTS% equ %TOTAL_TESTS% (
    echo ✅ All tests passed successfully!
    exit /b 0
) else (
    echo ❌ Some tests failed. Please check the output above.
    exit /b 1
)