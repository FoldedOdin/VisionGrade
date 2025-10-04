#!/usr/bin/env python3
"""
Startup script for VisionGrade ML Service
"""

import os
import sys
import subprocess
import time

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_environment():
    """Check environment configuration"""
    env_file = '.env'
    env_example = '.env.example'
    
    if not os.path.exists(env_file):
        if os.path.exists(env_example):
            print(f"⚠️  {env_file} not found, copying from {env_example}")
            try:
                with open(env_example, 'r') as src, open(env_file, 'w') as dst:
                    dst.write(src.read())
                print(f"✅ Created {env_file} from template")
            except Exception as e:
                print(f"❌ Failed to create {env_file}: {e}")
                return False
        else:
            print(f"❌ Neither {env_file} nor {env_example} found")
            return False
    
    print(f"✅ Environment file {env_file} exists")
    return True

def create_directories():
    """Create necessary directories"""
    directories = ['models', 'logs']
    
    for directory in directories:
        if not os.path.exists(directory):
            try:
                os.makedirs(directory)
                print(f"✅ Created directory: {directory}")
            except Exception as e:
                print(f"❌ Failed to create directory {directory}: {e}")
                return False
        else:
            print(f"✅ Directory exists: {directory}")
    
    return True

def test_imports():
    """Test if all required modules can be imported"""
    print("🧪 Testing imports...")
    
    required_modules = [
        'flask',
        'flask_cors',
        'sklearn',
        'pandas',
        'numpy',
        'xgboost',
        'psycopg2',
        'dotenv'
    ]
    
    failed_imports = []
    
    for module in required_modules:
        try:
            __import__(module)
            print(f"  ✅ {module}")
        except ImportError as e:
            print(f"  ❌ {module}: {e}")
            failed_imports.append(module)
    
    if failed_imports:
        print(f"\n❌ Failed to import: {', '.join(failed_imports)}")
        print("Try running: pip install -r requirements.txt")
        return False
    
    print("✅ All imports successful")
    return True

def start_service():
    """Start the ML service"""
    print("🚀 Starting VisionGrade ML Service...")
    
    try:
        # Import and run the Flask app
        from app import app, Config
        
        print(f"🌐 Service will be available at: http://{Config.HOST}:{Config.PORT}")
        print("📊 Health check: http://localhost:8000/health")
        print("📖 API documentation: See README.md")
        print("\n🔄 Starting server... (Press Ctrl+C to stop)")
        
        app.run(
            host=Config.HOST,
            port=Config.PORT,
            debug=Config.DEBUG
        )
        
    except KeyboardInterrupt:
        print("\n👋 Service stopped by user")
    except Exception as e:
        print(f"❌ Failed to start service: {e}")
        return False
    
    return True

def main():
    """Main startup function"""
    print("🤖 VisionGrade ML Service Startup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Create necessary directories
    if not create_directories():
        sys.exit(1)
    
    # Check environment configuration
    if not check_environment():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Test imports
    if not test_imports():
        sys.exit(1)
    
    print("\n✅ All checks passed!")
    print("=" * 40)
    
    # Start the service
    start_service()

if __name__ == '__main__':
    main()