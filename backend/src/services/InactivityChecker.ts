import { UserModel } from '../models/User';
import { ActivityLogModel } from '../models/ActivityLog';
import { logger } from '../utils/logger';

export class InactivityChecker {
  private static startupTimeout: NodeJS.Timeout | null = null;
  private static checkInterval: NodeJS.Timeout | null = null;

  static async checkWorkerInactivity(io?: any) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      const inactiveWorkers = await UserModel.find({
        role: 'Worker',
        availability_status: 'Available',
        $or: [
          { last_seen: { $lt: cutoff } },
          { last_seen: { $exists: false } }
        ]
      });

      for (const worker of inactiveWorkers) {
        const workerDoc = worker as any;
        const prevStatus = workerDoc.availability_status;
        workerDoc.availability_status = 'Unavailable';
        workerDoc.availability_reason = 'No activity detected in the last 24 hours.';
        
        if (!workerDoc.availability_history) workerDoc.availability_history = [];
        workerDoc.availability_history.push({
          previous_status: prevStatus,
          new_status: 'Unavailable',
          changed_by: 'AI',
          timestamp: new Date(),
          reason: 'No activity detected in the last 24 hours.'
        });

        await workerDoc.save();

        await ActivityLogModel.create({
          username: workerDoc.name,
          action: 'Worker Checked Out',
          description: `Worker ${workerDoc.name} automatically marked Unavailable (Inactivity).`,
        });
        
        logger.info(`[InactivityChecker]: Automatically marked worker ${workerDoc.name} Unavailable due to 24h inactivity.`);
      }

      if (inactiveWorkers.length > 0 && io) {
        io.emit('task:updated', { type: 'workers_refresh' });
        io.emit('message:received', { type: 'workers_refresh' });
      }
    } catch (err: any) {
      logger.error(`[InactivityChecker]: Inactivity check failed: ${err.message}`);
    }
  }

  static startScheduler(io: any) {
    logger.info('[InactivityChecker]: Initializing automatic 24h worker inactivity scheduler (hourly checks).');
    
    // Initial run on startup (wait 5s)
    this.startupTimeout = setTimeout(() => {
      this.checkWorkerInactivity(io);
    }, 5000);

    // Run every 1 hour (3600000 ms)
    this.checkInterval = setInterval(() => {
      this.checkWorkerInactivity(io);
    }, 60 * 60 * 1000);
  }

  static stopScheduler() {
    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout);
      this.startupTimeout = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('[InactivityChecker]: Stopped worker inactivity scheduler.');
  }
}
export default InactivityChecker;
