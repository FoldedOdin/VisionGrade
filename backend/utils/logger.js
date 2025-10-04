const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple logger utility
class Logger {
  constructor() {
    this.logFile = path.join(logsDir, 'app.log');
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\n`;
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, meta = {}) {
    const logMessage = this.formatMessage('info', message, meta);
    console.log(`ℹ️  ${message}`, meta);
    this.writeToFile(logMessage);
  }

  error(message, meta = {}) {
    const logMessage = this.formatMessage('error', message, meta);
    console.error(`❌ ${message}`, meta);
    this.writeToFile(logMessage);
  }

  warn(message, meta = {}) {
    const logMessage = this.formatMessage('warn', message, meta);
    console.warn(`⚠️  ${message}`, meta);
    this.writeToFile(logMessage);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('debug', message, meta);
      console.debug(`🐛 ${message}`, meta);
      this.writeToFile(logMessage);
    }
  }
}

module.exports = new Logger();