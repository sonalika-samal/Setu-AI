"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InactivityChecker = void 0;
const User_1 = require("../models/User");
const ActivityLog_1 = require("../models/ActivityLog");
const logger_1 = require("../utils/logger");
class InactivityChecker {
    static startupTimeout = null;
    static checkInterval = null;
    static async checkWorkerInactivity(io) {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        try {
            const inactiveWorkers = await User_1.UserModel.find({
                role: 'Worker',
                availability_status: 'Available',
                $or: [
                    { last_seen: { $lt: cutoff } },
                    { last_seen: { $exists: false } }
                ]
            });
            for (const worker of inactiveWorkers) {
                const workerDoc = worker;
                const prevStatus = workerDoc.availability_status;
                workerDoc.availability_status = 'Unavailable';
                workerDoc.availability_reason = 'No activity detected in the last 24 hours.';
                if (!workerDoc.availability_history)
                    workerDoc.availability_history = [];
                workerDoc.availability_history.push({
                    previous_status: prevStatus,
                    new_status: 'Unavailable',
                    changed_by: 'AI',
                    timestamp: new Date(),
                    reason: 'No activity detected in the last 24 hours.'
                });
                await workerDoc.save();
                await ActivityLog_1.ActivityLogModel.create({
                    username: workerDoc.name,
                    action: 'Worker Checked Out',
                    description: `Worker ${workerDoc.name} automatically marked Unavailable (Inactivity).`,
                });
                logger_1.logger.info(`[InactivityChecker]: Automatically marked worker ${workerDoc.name} Unavailable due to 24h inactivity.`);
            }
            if (inactiveWorkers.length > 0 && io) {
                io.emit('task:updated', { type: 'workers_refresh' });
                io.emit('message:received', { type: 'workers_refresh' });
            }
        }
        catch (err) {
            logger_1.logger.error(`[InactivityChecker]: Inactivity check failed: ${err.message}`);
        }
    }
    static startScheduler(io) {
        logger_1.logger.info('[InactivityChecker]: Initializing automatic 24h worker inactivity scheduler (hourly checks).');
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
        logger_1.logger.info('[InactivityChecker]: Stopped worker inactivity scheduler.');
    }
}
exports.InactivityChecker = InactivityChecker;
exports.default = InactivityChecker;
