#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.testSuites = {
      unit: {
        name: 'Unit Tests',
        pattern: 'test/**/*.test.js',
        exclude: ['test/integration/**', 'test/performance/**'],
        timeout: 5000
      },
      integration: {
        name: 'Integration Tests',
        pattern: 'test/integration/**/*.test.js',
        timeout: 30000
      },
      models: {
        name: 'Database Model Tests',
        pattern: 'test/models/**/*.test.js',
        timeout: 10000
      },
      performance: {
        name: 'Performance Tests',
        pattern: 'test/performance/**/*.test.js',
        timeout: 60000
      },
      all: {
        name: 'All Tests',
        pattern: 'test/**/*.test.js',
        timeout: 60000
      }
    };

    this.results = {};
  }

  async runTestSuite(suiteName) {
    const suite = this.testSuites[suiteName];
    if (!suite) {
      console.error(`❌ Unknown test suite: ${suiteName}`);
      return false;
    }

    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`📁 Pattern: ${suite.pattern}`);
    console.log(`⏱️  Timeout: ${suite.timeout}ms`);
    console.log('─'.repeat(50));

    const startTime = Date.now();
    
    try {
      const success = await this.executeMocha(suite);
      const duration = Date.now() - startTime;
      
      this.results[suiteName] = {
        name: suite.name,
        success,
        duration,
        timestamp: new Date().toISOString()
      };

      if (success) {
        console.log(`\n✅ ${suite.name} completed successfully in ${duration}ms`);
      } else {
        console.log(`\n❌ ${suite.name} failed after ${duration}ms`);
      }

      return success;
    } catch (error) {
      console.error(`\n💥 ${suite.name} crashed:`, error.message);
      this.results[suiteName] = {
        name: suite.name,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async executeMocha(suite) {
    return new Promise((resolve) => {
      const mochaArgs = [
        '--recursive',
        '--timeout', suite.timeout.toString(),
        '--reporter', 'spec',
        '--colors'
      ];

      // Add grep pattern if specified
      if (suite.pattern && suite.pattern !== 'test/**/*.test.js') {
        mochaArgs.push(suite.pattern);
      } else {
        mochaArgs.push('test/');
      }

      // Add exclude patterns
      if (suite.exclude) {
        suite.exclude.forEach(excludePattern => {
          mochaArgs.push('--ignore', excludePattern);
        });
      }

      const mocha = spawn('npx', ['mocha', ...mochaArgs], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      mocha.on('close', (code) => {
        resolve(code === 0);
      });

      mocha.on('error', (error) => {
        console.error('Failed to start Mocha:', error);
        resolve(false);
      });
    });
  }

  async runMultipleSuites(suiteNames) {
    const results = [];
    
    for (const suiteName of suiteNames) {
      const success = await this.runTestSuite(suiteName);
      results.push({ suiteName, success });
    }

    return results;
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST EXECUTION REPORT');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;
    let totalDuration = 0;

    for (const [suiteName, result] of Object.entries(this.results)) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      
      console.log(`${status} ${result.name.padEnd(30)} ${duration.padStart(10)}`);
      
      totalTests++;
      if (result.success) passedTests++;
      totalDuration += result.duration;

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    console.log('─'.repeat(60));
    console.log(`📈 Summary: ${passedTests}/${totalTests} test suites passed`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📅 Completed: ${new Date().toLocaleString()}`);

    // Save report to file
    this.saveReportToFile();

    return passedTests === totalTests;
  }

  saveReportToFile() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites: Object.keys(this.results).length,
        passedSuites: Object.values(this.results).filter(r => r.success).length,
        totalDuration: Object.values(this.results).reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.results
    };

    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.join(reportDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    console.log(`📄 Report saved to: ${reportFile}`);
  }

  async checkEnvironment() {
    console.log('🔍 Checking test environment...');
    
    // Check if database is accessible
    try {
      const { sequelize } = require('../models');
      await sequelize.authenticate();
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    // Check if required environment variables are set
    const requiredEnvVars = ['NODE_ENV', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars.join(', '));
      return false;
    }

    console.log('✅ Environment check passed');
    return true;
  }

  printUsage() {
    console.log(`
🧪 VisionGrade Test Runner

Usage: node test-runner.js [suite]

Available test suites:
  unit         - Run unit tests only
  integration  - Run integration tests only
  models       - Run database model tests only
  performance  - Run performance tests only
  all          - Run all tests (default)

Examples:
  node test-runner.js unit
  node test-runner.js integration
  node test-runner.js all

Options:
  --help, -h   - Show this help message
  --list, -l   - List available test suites
    `);
  }

  listSuites() {
    console.log('\n📋 Available Test Suites:');
    console.log('─'.repeat(40));
    
    for (const [key, suite] of Object.entries(this.testSuites)) {
      console.log(`${key.padEnd(12)} - ${suite.name}`);
      console.log(`${''.padEnd(12)}   Pattern: ${suite.pattern}`);
      console.log(`${''.padEnd(12)}   Timeout: ${suite.timeout}ms`);
      console.log();
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  // Handle help and list options
  if (args.includes('--help') || args.includes('-h')) {
    runner.printUsage();
    return;
  }

  if (args.includes('--list') || args.includes('-l')) {
    runner.listSuites();
    return;
  }

  // Check environment before running tests
  const envOk = await runner.checkEnvironment();
  if (!envOk) {
    console.error('\n❌ Environment check failed. Please fix the issues above.');
    process.exit(1);
  }

  // Determine which test suite to run
  const suiteName = args[0] || 'all';
  
  if (!runner.testSuites[suiteName]) {
    console.error(`❌ Unknown test suite: ${suiteName}`);
    runner.printUsage();
    process.exit(1);
  }

  console.log(`\n🚀 Starting VisionGrade Test Suite: ${suiteName.toUpperCase()}`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);

  // Run the specified test suite
  const success = await runner.runTestSuite(suiteName);
  
  // Generate and display report
  const allPassed = runner.generateReport();

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;