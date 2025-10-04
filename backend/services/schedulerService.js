const cron = require('node-cron');
const NotificationService = require('./notificationService');

/**
 * Scheduler Service
 * Handles automated tasks and periodic notifications
 */

class SchedulerService {
  
  static init() {
    console.log('🕐 Initializing notification scheduler...');
    
    // Schedule low attendance alerts - Daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily low attendance alert check...');
      try {
        const result = await NotificationService.checkAndSendLowAttendanceAlerts();
        console.log(`Low attendance alerts completed: ${result.alerts_sent} sent, ${result.errors_count} errors`);
      } catch (error) {
        console.error('Error in scheduled low attendance alerts:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Schedule at-risk student alerts - Weekly on Monday at 10:00 AM
    cron.schedule('0 10 * * 1', async () => {
      console.log('Running weekly at-risk student alert check...');
      try {
        const result = await NotificationService.checkAndSendAtRiskStudentAlerts();
        console.log(`At-risk student alerts completed: ${result.alerts_sent} sent, ${result.errors_count} errors`);
      } catch (error) {
        console.error('Error in scheduled at-risk student alerts:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Schedule notification cleanup - Weekly on Sunday at 2:00 AM
    cron.schedule('0 2 * * 0', async () => {
      console.log('Running weekly notification cleanup...');
      try {
        const result = await NotificationService.cleanupOldNotifications(90);
        console.log(`Notification cleanup completed: ${result.deleted_count} notifications deleted`);
      } catch (error) {
        console.error('Error in scheduled notification cleanup:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Schedule delivery stats logging - Daily at 11:59 PM
    cron.schedule('59 23 * * *', async () => {
      console.log('Generating daily notification delivery stats...');
      try {
        const stats = await NotificationService.getDeliveryStats(1); // Last 24 hours
        if (stats) {
          console.log('Daily Notification Stats:', JSON.stringify(stats, null, 2));
        }
      } catch (error) {
        console.error('Error generating notification stats:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    console.log('✅ Notification scheduler initialized successfully');
    console.log('📅 Scheduled tasks:');
    console.log('   - Low attendance alerts: Daily at 9:00 AM');
    console.log('   - At-risk student alerts: Weekly on Monday at 10:00 AM');
    console.log('   - Notification cleanup: Weekly on Sunday at 2:00 AM');
    console.log('   - Delivery stats: Daily at 11:59 PM');
  }

  /**
   * Get scheduler status and next run times
   */
  static getSchedulerStatus() {
    const tasks = cron.getTasks();
    const status = {
      total_tasks: tasks.size,
      tasks: []
    };

    let taskIndex = 0;
    const taskNames = [
      'Low Attendance Alerts (Daily 9:00 AM)',
      'At-Risk Student Alerts (Weekly Monday 10:00 AM)',
      'Notification Cleanup (Weekly Sunday 2:00 AM)',
      'Delivery Stats (Daily 11:59 PM)'
    ];

    tasks.forEach((task, key) => {
      status.tasks.push({
        name: taskNames[taskIndex] || `Task ${taskIndex + 1}`,
        running: task.running,
        destroyed: task.destroyed
      });
      taskIndex++;
    });

    return status;
  }

  /**
   * Manually trigger low attendance alerts
   */
  static async triggerLowAttendanceAlerts(threshold = 75) {
    console.log('Manually triggering low attendance alerts...');
    try {
      const result = await NotificationService.checkAndSendLowAttendanceAlerts(threshold);
      console.log(`Manual low attendance alerts completed: ${result.alerts_sent} sent, ${result.errors_count} errors`);
      return result;
    } catch (error) {
      console.error('Error in manual low attendance alerts:', error);
      throw error;
    }
  }

  /**
   * Manually trigger at-risk student alerts
   */
  static async triggerAtRiskAlerts(academicYear = null) {
    console.log('Manually triggering at-risk student alerts...');
    try {
      const result = await NotificationService.checkAndSendAtRiskStudentAlerts(academicYear);
      console.log(`Manual at-risk alerts completed: ${result.alerts_sent} sent, ${result.errors_count} errors`);
      return result;
    } catch (error) {
      console.error('Error in manual at-risk alerts:', error);
      throw error;
    }
  }

  /**
   * Manually trigger notification cleanup
   */
  static async triggerCleanup(daysOld = 90) {
    console.log('Manually triggering notification cleanup...');
    try {
      const result = await NotificationService.cleanupOldNotifications(daysOld);
      console.log(`Manual cleanup completed: ${result.deleted_count} notifications deleted`);
      return result;
    } catch (error) {
      console.error('Error in manual cleanup:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled tasks
   */
  static stopAll() {
    console.log('Stopping all scheduled notification tasks...');
    const tasks = cron.getTasks();
    tasks.forEach((task) => {
      task.stop();
    });
    console.log('All scheduled tasks stopped');
  }

  /**
   * Start all scheduled tasks
   */
  static startAll() {
    console.log('Starting all scheduled notification tasks...');
    const tasks = cron.getTasks();
    tasks.forEach((task) => {
      task.start();
    });
    console.log('All scheduled tasks started');
  }

  /**
   * Destroy all scheduled tasks
   */
  static destroyAll() {
    console.log('Destroying all scheduled notification tasks...');
    const tasks = cron.getTasks();
    tasks.forEach((task) => {
      task.destroy();
    });
    console.log('All scheduled tasks destroyed');
  }
}

module.exports = SchedulerService;