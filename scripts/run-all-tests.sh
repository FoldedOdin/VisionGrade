#!/bin/bash

echo "========================================"
echo "VisionGrade - Comprehensive Test Suite"
echo "========================================"

TOTAL_TESTS=0
PASSED_TESTS=0
START_TIME=$(date)

echo ""
echo "🧪 Running Frontend Tests..."
echo "----------------------------------------"
cd frontend
if npm test -- --ci --coverage --watchAll=false; then
    echo "✅ Frontend tests passed"
    ((PASSED_TESTS++))
else
    echo "❌ Frontend tests failed"
fi
((TOTAL_TESTS++))
cd ..

echo ""
echo "🧪 Running Backend Tests..."
echo "----------------------------------------"
cd backend
if npm run test; then
    echo "✅ Backend tests passed"
    ((PASSED_TESTS++))
else
    echo "❌ Backend tests failed"
fi
((TOTAL_TESTS++))
cd ..

echo ""
echo "🧪 Running ML Service Tests..."
echo "----------------------------------------"
cd ml-service
if python run_all_tests.py; then
    echo "✅ ML Service tests passed"
    ((PASSED_TESTS++))
else
    echo "❌ ML Service tests failed"
fi
((TOTAL_TESTS++))
cd ..

echo ""
echo "========================================"
echo "📊 COMPREHENSIVE TEST SUMMARY"
echo "========================================"
echo "Results: $PASSED_TESTS/$TOTAL_TESTS test suites passed"
echo "Start Time: $START_TIME"
echo "End Time: $(date)"
echo "========================================"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo "✅ All tests passed successfully!"
    exit 0
else
    echo "❌ Some tests failed. Please check the output above."
    exit 1
fi