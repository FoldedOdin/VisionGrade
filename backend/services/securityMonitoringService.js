const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const { getSecuritySetting } = require('../config/security');

/**
 * Security Monitoring Service
 * Monitors security events and triggers alerts when thresholds are exceeded
 */

class SecurityMonitoringService {
  constructor() {
    this.alertThresholds = getSecuritySetting('monitoring.alertThresholds');
    this.enableAlerts = getSecuritySetting('monitoring.enableSecurityAlerts');
    this.alertChannels = getSecuritySetting('monitoring.alertChannels');
    
    // Initialize monitoring counters
    this.initializeCounters();
  }

  /**
   * Initialize monitoring counters
   */
  async initializeCounters() {
    try {
      const counters = [
        'failed_logins',
        'rate_limit_exceeded',
        'suspicious_activity',
        'unauthorized_access',
        'file_upload_violations',
        'sql_injection_attempts',
        'xss_attempts'
      ];

      for (const counter of counters) {
        const exists = await cacheService.exists(`security_counter:${counter}`);
        if (!exists) {
          await cacheService.set(`security_counter:${counter}`, 0, 3600); // 1 hour TTL
        }
      }
    } catch (error) {
      logger.error('Failed to initialize security counters:', error);
    }
  }

  /**
   * Record security event
   */
  async recordSecurityEvent(eventType, details = {}) {
    try {
      const timestamp = new Date().toISOString();
      const eventData = {
        type: eventType,
        timestamp,
        details,
        severity: this.getEventSeverity(eventType)
      };

      // Log the security event
      logger.warn('Security event recorded', eventData);

      // Increment counter
      await this.incrementCounter(eventType);

      // Check if alert threshold is exceeded
      await this.checkAlertThresholds(eventType);

      // Store event for analysis
      await this.storeSecurityEvent(eventData);

    } catch (error) {
      logger.error('Failed to record security event:', error);
    }
  }

  /**
   * Increment security event counter
   */
  async incrementCounter(eventType) {
    try {
      const counterKey = `security_counter:${eventType}`;
      const currentCount = await cacheService.incrementRateLimit(counterKey, 3600);
      
      return currentCount;
    } catch (error) {
      logger.error('Failed to increment security counter:', error);
      return 1;
    }
  }

  /**
   * Check if alert thresholds are exceeded
   */
  async checkAlertThresholds(eventType) {
    try {
      if (!this.enableAlerts) {
        return;
      }

      const counterKey = `security_counter:${eventType}`;
      const currentCount = await cacheService.get(counterKey) || 0;
      
      let threshold = null;
      
      switch (eventType) {
        case 'failed_logins':
          threshold = this.alertThresholds.failedLogins;
          break;
        case 'rate_limit_exceeded':
          threshold = this.alertThresholds.rateLimitExceeded;
          break;
        case 'suspicious_activity':
        case 'sql_injection_attempts':
        case 'xss_attempts':
          threshold = this.alertThresholds.suspiciousActivity;
          break;
        default:
          threshold = 5; // Default threshold
      }

      if (currentCount >= threshold) {
        await this.triggerSecurityAlert(eventType, currentCount, threshold);
      }

    } catch (error) {
      logger.error('Failed to check alert thresholds:', error);
    }
  }

  /**
   * Trigger security alert
   */
  async triggerSecurityAlert(eventType, currentCount, threshold) {
    try {
      const alertData = {
        type: 'SECURITY_THRESHOLD_EXCEEDED',
        eventType,
        currentCount,
        threshold,
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
      };

      logger.error('SECURITY ALERT: Threshold exceeded', alertData);

      // Send alerts through configured channels
      for (const channel of this.alertChannels) {
        await this.sendAlert(channel, alertData);
      }

      // Reset counter after alert
      await cacheService.set(`security_counter:${eventType}`, 0, 3600);

    } catch (error) {
      logger.error('Failed to trigger security alert:', error);
    }
  }

  /**
   * Send alert through specified channel
   */
  async sendAlert(channel, alertData) {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alertData);
          break;
        case 'log':
          logger.error('SECURITY_ALERT', alertData);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alertData);
          break;
        default:
          logger.warn('Unknown alert channel:', channel);
      }
    } catch (error) {
      logger.error(`Failed to send alert via ${channel}:`, error);
    }
  }

  /**
   * Send email alert (placeholder implementation)
   */
  async sendEmailAlert(alertData) {
    // This would integrate with your email service
    logger.info('Email alert would be sent:', {
      to: process.env.SECURITY_ALERT_EMAIL,
      subject: `Security Alert: ${alertData.eventType}`,
      body: JSON.stringify(alertData, null, 2)
    });
  }

  /**
   * Send webhook alert (placeholder implementation)
   */
  async sendWebhookAlert(alertData) {
    // This would send to a webhook endpoint (Slack, Teams, etc.)
    logger.info('Webhook alert would be sent:', {
      url: process.env.SECURITY_WEBHOOK_URL,
      payload: alertData
    });
  }

  /**
   * Store security event for analysis
   */
  async storeSecurityEvent(eventData) {
    try {
      const eventKey = `security_event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      await cacheService.set(eventKey, eventData, 7 * 24 * 3600); // 7 days retention
    } catch (error) {
      logger.error('Failed to store security event:', error);
    }
  }

  /**
   * Get event severity level
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'failed_logins': 'MEDIUM',
      'rate_limit_exceeded': 'MEDIUM',
      'suspicious_activity': 'HIGH',
      'unauthorized_access': 'HIGH',
      'sql_injection_attempts': 'CRITICAL',
      'xss_attempts': 'HIGH',
      'file_upload_violations': 'MEDIUM',
      'session_hijack': 'CRITICAL',
      'privilege_escalation': 'CRITICAL'
    };

    return severityMap[eventType] || 'LOW';
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(timeframe = '1h') {
    try {
      const stats = {
        timeframe,
        timestamp: new Date().toISOString(),
        events: {}
      };

      const eventTypes = [
        'failed_logins',
        'rate_limit_exceeded',
        'suspicious_activity',
        'unauthorized_access',
        'sql_injection_attempts',
        'xss_attempts'
      ];

      for (const eventType of eventTypes) {
        const count = await cacheService.get(`security_counter:${eventType}`) || 0;
        stats.events[eventType] = count;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get security stats:', error);
      return null;
    }
  }

  /**
   * Reset security counters
   */
  async resetCounters() {
    try {
      const eventTypes = [
        'failed_logins',
        'rate_limit_exceeded',
        'suspicious_activity',
        'unauthorized_access',
        'sql_injection_attempts',
        'xss_attempts'
      ];

      for (const eventType of eventTypes) {
        await cacheService.set(`security_counter:${eventType}`, 0, 3600);
      }

      logger.info('Security counters reset');
      return true;
    } catch (error) {
      logger.error('Failed to reset security counters:', error);
      return false;
    }
  }

  /**
   * Analyze security trends
   */
  async analyzeSecurityTrends() {
    try {
      const stats = await this.getSecurityStats();
      const analysis = {
        timestamp: new Date().toISOString(),
        riskLevel: 'LOW',
        recommendations: [],
        alerts: []
      };

      if (!stats) {
        return analysis;
      }

      // Analyze failed logins
      if (stats.events.failed_logins > 5) {
        analysis.riskLevel = 'MEDIUM';
        analysis.recommendations.push('Consider implementing additional authentication measures');
      }

      // Analyze injection attempts
      if (stats.events.sql_injection_attempts > 0 || stats.events.xss_attempts > 0) {
        analysis.riskLevel = 'HIGH';
        analysis.alerts.push('Active injection attacks detected');
        analysis.recommendations.push('Review and strengthen input validation');
      }

      // Analyze rate limiting
      if (stats.events.rate_limit_exceeded > 3) {
        analysis.recommendations.push('Consider adjusting rate limiting thresholds');
      }

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze security trends:', error);
      return null;
    }
  }
}

// Create singleton instance
const securityMonitoringService = new SecurityMonitoringService();

module.exports = securityMonitoringService;