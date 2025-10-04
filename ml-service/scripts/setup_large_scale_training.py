#!/usr/bin/env python3
"""
Setup Script for Large-Scale ML Training
Installs requirements and prepares environment for 70M+ record training
"""

import subprocess
import sys
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def install_requirements():
    """Install required packages for large-scale training"""
    logger.info("📦 Installing large-scale training requirements...")
    
    requirements_file = os.path.join(os.path.dirname(__file__), 'requirements_large_scale.txt')
    
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', requirements_file
        ])
        logger.info("✅ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install requirements: {e}")
        return False

def check_system_resources():
    """Check system resources for large-scale training"""
    try:
        import psutil
        
        # Check memory
        memory = psutil.virtual_memory()
        memory_gb = memory.total / (1024**3)
        
        # Check disk space
        disk = psutil.disk_usage('.')
        disk_gb = disk.free / (1024**3)
        
        # Check CPU cores
        cpu_cores = psutil.cpu_count()
        
        logger.info(f"💾 Available Memory: {memory_gb:.1f} GB")
        logger.info(f"💿 Available Disk: {disk_gb:.1f} GB")
        logger.info(f"🖥️  CPU Cores: {cpu_cores}")
        
        # Recommendations
        recommendations = []
        
        if memory_gb < 8:
            recommendations.append("⚠️  Consider reducing dataset size (memory < 8GB)")
        elif memory_gb < 16:
            recommendations.append("💡 Recommended: Use --sample-size for training")
        
        if disk_gb < 50:
            recommendations.append("⚠️  Low disk space - consider cleanup or external storage")
        
        if cpu_cores < 4:
            recommendations.append("💡 Consider using fewer processes (--processes 2)")
        
        if recommendations:
            logger.info("📋 System Recommendations:")
            for rec in recommendations:
                logger.info(f"   {rec}")
        else:
            logger.info("✅ System resources look good for large-scale training!")
        
        return {
            'memory_gb': memory_gb,
            'disk_gb': disk_gb,
            'cpu_cores': cpu_cores,
            'suitable_for_large_scale': memory_gb >= 8 and disk_gb >= 20
        }
        
    except ImportError:
        logger.warning("⚠️  psutil not available - cannot check system resources")
        return None

def create_directories():
    """Create necessary directories"""
    directories = ['./synthetic_data', './models', './logs']
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"📁 Created directory: {directory}")

def run_quick_test():
    """Run a quick test with small dataset"""
    logger.info("🧪 Running quick test with 100K records...")
    
    script_path = os.path.join(os.path.dirname(__file__), 'generate_large_synthetic_dataset.py')
    
    try:
        subprocess.check_call([
            sys.executable, script_path,
            '--records', '100000',
            '--processes', '2'
        ])
        logger.info("✅ Quick test completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Quick test failed: {e}")
        return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Setup Large-Scale ML Training Environment')
    parser.add_argument('--install-requirements', action='store_true',
                       help='Install required packages')
    parser.add_argument('--check-system', action='store_true',
                       help='Check system resources')
    parser.add_argument('--quick-test', action='store_true',
                       help='Run quick test with 100K records')
    parser.add_argument('--full-setup', action='store_true',
                       help='Run full setup (install + check + test)')
    
    args = parser.parse_args()
    
    logger.info("🚀 VisionGrade Large-Scale ML Training Setup")
    logger.info("=" * 50)
    
    success = True
    
    if args.full_setup or args.install_requirements:
        if not install_requirements():
            success = False
    
    if args.full_setup or args.check_system:
        create_directories()
        system_info = check_system_resources()
        
        if system_info and not system_info['suitable_for_large_scale']:
            logger.warning("⚠️  System may not be suitable for full 70M+ record training")
            logger.info("💡 Consider using smaller datasets or cloud resources")
    
    if args.full_setup or args.quick_test:
        if not run_quick_test():
            success = False
    
    if success:
        print(f"\n🎉 SETUP COMPLETED SUCCESSFULLY!")
        print(f"=" * 40)
        print(f"✅ Environment is ready for large-scale ML training")
        print(f"")
        print(f"🚀 Next Steps:")
        print(f"1. Generate large dataset:")
        print(f"   python scripts/generate_large_synthetic_dataset.py --records 75000000")
        print(f"")
        print(f"2. Or start with smaller dataset:")
        print(f"   python scripts/generate_large_synthetic_dataset.py --records 5000000")
        print(f"")
        print(f"3. Load and test models:")
        print(f"   python scripts/production_model_loader.py --load-best --test-prediction")
        print(f"")
        print(f"💡 Tip: Use --sample-size to train on subset of generated data")
    else:
        print(f"\n❌ SETUP FAILED!")
        print(f"Please check the error messages above and try again.")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())