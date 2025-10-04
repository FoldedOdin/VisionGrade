#!/usr/bin/env python3
"""
Test runner for ML Service
"""

import os
import sys
import subprocess
import argparse

def run_tests(test_type='all', verbose=False):
    """
    Run ML service tests
    
    Args:
        test_type: Type of tests to run ('unit', 'integration', 'all')
        verbose: Whether to run in verbose mode
    """
    
    # Change to ML service directory
    ml_service_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(ml_service_dir)
    
    # Base pytest command
    cmd = ['python', '-m', 'pytest']
    
    if verbose:
        cmd.append('-v')
    
    # Add coverage reporting
    cmd.extend(['--cov=services', '--cov-report=term-missing'])
    
    # Select test files based on type
    if test_type == 'unit':
        cmd.append('tests/test_prediction_service.py')
        cmd.append('tests/test_api.py')
    elif test_type == 'integration':
        cmd.append('tests/test_integration.py')
        cmd.append('-m')
        cmd.append('integration')
    elif test_type == 'all':
        cmd.append('tests/')
    else:
        print(f"Unknown test type: {test_type}")
        return False
    
    print(f"Running {test_type} tests...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True)
        print(f"\n✅ {test_type.title()} tests passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {test_type.title()} tests failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print("❌ pytest not found. Please install pytest:")
        print("pip install pytest pytest-cov pytest-flask")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'pytest',
        'pytest-cov', 
        'pytest-flask',
        'flask',
        'scikit-learn',
        'pandas',
        'numpy',
        'xgboost'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"  - {package}")
        print("\nInstall missing packages with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All required dependencies are installed")
    return True

def main():
    parser = argparse.ArgumentParser(description='Run ML Service tests')
    parser.add_argument('--type', choices=['unit', 'integration', 'all'], 
                       default='all', help='Type of tests to run')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='Run tests in verbose mode')
    parser.add_argument('--check-deps', action='store_true',
                       help='Check if dependencies are installed')
    
    args = parser.parse_args()
    
    if args.check_deps:
        if not check_dependencies():
            sys.exit(1)
        return
    
    # Check dependencies first
    if not check_dependencies():
        sys.exit(1)
    
    # Run tests
    success = run_tests(args.type, args.verbose)
    
    if not success:
        sys.exit(1)

if __name__ == '__main__':
    main()