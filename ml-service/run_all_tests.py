#!/usr/bin/env python3
"""
Comprehensive test runner for ML service
"""

import subprocess
import sys
import os
import time
from pathlib import Path

def run_command(command, description):
    """Run a command and return success status"""
    print(f"\n🧪 {description}")
    print("─" * 50)
    
    start_time = time.time()
    try:
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=False, text=True)
        duration = time.time() - start_time
        print(f"✅ {description} completed in {duration:.2f}s")
        return True
    except subprocess.CalledProcessError as e:
        duration = time.time() - start_time
        print(f"❌ {description} failed after {duration:.2f}s")
        return False

def main():
    """Run all ML service tests"""
    print("🚀 Starting ML Service Test Suite")
    print("=" * 60)
    
    # Change to ML service directory
    os.chdir(Path(__file__).parent)
    
    test_commands = [
        ("python -m pytest tests/test_prediction_service.py -v", "Unit Tests - Prediction Service"),
        ("python -m pytest tests/test_api.py -v", "Unit Tests - API"),
        ("python -m pytest tests/test_integration.py -v", "Integration Tests"),
        ("python -m pytest tests/test_prediction_algorithm.py -v", "Algorithm Tests"),
        ("python -m pytest tests/test_model_performance.py -v", "Performance Tests"),
    ]
    
    results = []
    total_start = time.time()
    
    for command, description in test_commands:
        success = run_command(command, description)
        results.append((description, success))
    
    total_duration = time.time() - total_start
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST EXECUTION SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for description, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {description}")
    
    print("─" * 60)
    print(f"📈 Results: {passed}/{total} test suites passed")
    print(f"⏱️  Total Duration: {total_duration:.2f}s")
    print(f"📅 Completed: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()