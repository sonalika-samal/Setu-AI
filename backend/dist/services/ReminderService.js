"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const Task_1 = require("../models/Task");
const TaskTimeline_1 = require("../models/TaskTimeline");
const ActivityLog_1 = require("../models/ActivityLog");
const CredentialRepository_1 = require("../repositories/CredentialRepository");
const WhatsAppService_1 = require("./whatsapp/WhatsAppService");
const logger_1 = require("../utils/logger");
const credentialRepo = new CredentialRepository_1.CredentialRepository();
const whatsAppService = new WhatsAppService_1.WhatsAppService();
class ReminderService {
    static io = null;
    // Map of taskId (MongoDB ObjectId as string) -> array of NodeJS.Timeout objects
    static activeTimeouts = new Map();
    /**
     * Initializes the Reminder Service and schedules reminders for all active tasks.
     */
    static init(io) {
        this.io = io;
        logger_1.logger.info('[ReminderService]: Initializing Reminder Engine...');
        this.rescheduleAllActiveTasks();
    }
    /**
     * Scans MongoDB for any active (non-completed) tasks and reschedules their future reminders.
     */
    static async rescheduleAllActiveTasks() {
        try {
            const activeTasks = await Task_1.TaskModel.find({ task_status: { $nin: ['Completed', 'Closed'] } });
            logger_1.logger.info(`[ReminderService]: Found ${activeTasks.length} active tasks to reschedule.`);
            for (const task of activeTasks) {
                await this.scheduleTaskReminders(task);
            }
        }
        catch (err) {
            logger_1.logger.error(`[ReminderService]: Error rescheduling active tasks: ${err.message}`);
        }
    }
    /**
     * Dynamically schedules Reminder 1, 2, 3, and Escalation timeouts for a task based on its deadline.
     */
    static async scheduleTaskReminders(task) {
        const taskId = task._id.toString();
        const taskHumanId = task.taskId || taskId;
        // Clear any existing timeouts first
        this.cancelTaskReminders(taskId);
        if (task.task_status === 'Completed' || task.task_status === 'Closed') {
            logger_1.logger.info(`[ReminderService]: Task ${taskHumanId} is already ${task.task_status}. Skipping reminder scheduling.`);
            return;
        }
        try {
            const creds = await credentialRepo.getCredentials();
            // Timings in minutes before deadline (loaded dynamically from database settings)
            const r1Mins = creds.settings.reminderOffset1 ?? 180; // default 3 hours
            const r2Mins = creds.settings.reminderOffset2 ?? 90; // default 1.5 hours
            const r3Mins = creds.settings.reminderOffset3 ?? 30; // default 30 minutes
            if (!task.deadline) {
                logger_1.logger.warn(`[ReminderService]: Task ${taskHumanId} has no deadline. Skipping reminder scheduling.`);
                return;
            }
            const deadlineTime = new Date(task.deadline).getTime();
            const now = Date.now();
            const timeouts = [];
            // Helper to schedule a specific reminder
            const scheduleOffset = (offsetMins, reminderNumber) => {
                const triggerTime = deadlineTime - offsetMins * 60 * 1000;
                const delay = triggerTime - now;
                if (delay > 0) {
                    logger_1.logger.info(`[ReminderService]: Scheduling Reminder ${reminderNumber} for Task ${taskHumanId} in ${(delay / 1000).toFixed(0)}s`);
                    const timeout = setTimeout(async () => {
                        await this.triggerReminder(taskId, reminderNumber);
                    }, delay);
                    timeouts.push(timeout);
                }
                else {
                    logger_1.logger.info(`[ReminderService]: Skipping Reminder ${reminderNumber} for Task ${taskHumanId} (past due)`);
                }
            };
            // Schedule all three reminders
            scheduleOffset(r1Mins, 1);
            scheduleOffset(r2Mins, 2);
            scheduleOffset(r3Mins, 3);
            // Schedule escalation (exactly at deadline)
            const escalationDelay = deadlineTime - now;
            if (escalationDelay > 0) {
                logger_1.logger.info(`[ReminderService]: Scheduling Escalation for Task ${taskHumanId} in ${(escalationDelay / 1000).toFixed(0)}s`);
                const timeout = setTimeout(async () => {
                    await this.triggerEscalation(taskId);
                }, escalationDelay);
                timeouts.push(timeout);
            }
            else {
                // If deadline is already in the past, trigger overdue check immediately
                if (!task.is_overdue || !task.is_escalated) {
                    logger_1.logger.warn(`[ReminderService]: Task ${taskHumanId} deadline has already passed. Checking status now...`);
                    setImmediate(async () => {
                        await this.triggerEscalation(taskId);
                    });
                }
            }
            if (timeouts.length > 0) {
                this.activeTimeouts.set(taskId, timeouts);
            }
        }
        catch (err) {
            logger_1.logger.error(`[ReminderService]: Failed to schedule reminders for Task ${taskHumanId}: ${err.message}`);
        }
    }
    /**
     * Cancels all remaining reminder/escalation timeouts for a task.
     */
    static cancelTaskReminders(taskId) {
        const timeouts = this.activeTimeouts.get(taskId);
        if (timeouts) {
            logger_1.logger.info(`[ReminderService]: Cancelling ${timeouts.length} pending timeouts for task ${taskId}`);
            for (const t of timeouts) {
                clearTimeout(t);
            }
            this.activeTimeouts.delete(taskId);
        }
    }
    /**
     * Triggers a reminder WhatsApp dispatch.
     */
    static async triggerReminder(taskId, reminderNumber) {
        try {
            const task = await Task_1.TaskModel.findById(taskId);
            if (!task)
                return;
            const taskHumanId = task.taskId || taskId;
            if (task.task_status === 'Completed' || task.task_status === 'Closed') {
                logger_1.logger.info(`Reminder Cancelled - Task ${task.task_status}`);
                this.cancelTaskReminders(taskId);
                return;
            }
            logger_1.logger.info(`[ReminderService]: Triggering Reminder ${reminderNumber} for Task ${taskHumanId}`);
            const creds = await credentialRepo.getCredentials();
            const formattedDeadline = new Date(task.deadline).toLocaleString('en-IN', { timeZone: creds.settings.timezone || 'Asia/Kolkata' });
            // Check if worker is unavailable
            const { UserModel } = require('../models/User');
            const workerUser = await UserModel.findOne({ phone: task.worker_phone });
            const isWorkerUnavailable = workerUser?.availability_status === 'Unavailable';
            let reminderText = `Task ID: *${'```'}${taskHumanId}${'```'}*

Reminder

Task:
${task.task_msg}

Deadline:
${formattedDeadline}

Current Status:
${task.task_status}

Please reply using the Task ID.

Examples:
${taskHumanId} Started
${taskHumanId} Completed
${taskHumanId} Need more details`;
            if (isWorkerUnavailable) {
                reminderText += '\n\n⚠️ You are currently marked as unavailable.\n\nIf you are available, simply continue with this task.\n\nOtherwise, please contact the Owner immediately.';
            }
            // Dispatch WhatsApp message to Worker
            try {
                await whatsAppService.sendMessage(task.worker_phone, reminderText);
                logger_1.logger.info(`[ReminderService]: WhatsApp reminder dispatched to ${task.worker_phone}`);
            }
            catch (err) {
                logger_1.logger.error(`[ReminderService]: Failed to send WhatsApp reminder: ${err.message}`);
            }
            // Add timeline entry
            await TaskTimeline_1.TaskTimelineModel.create({
                task_id: taskId,
                action: 'Reminder Sent',
                description: `Automated Reminder #${reminderNumber} sent to worker.`,
                performed_by: 'system',
            });
            // Update task flag
            task.reminder_sent = true;
            await task.save();
            // Emit live socket.io message sent event
            if (this.io) {
                this.io.emit('message:sent', {
                    message_id: `rem_${Date.now()}`,
                    sender: 'system',
                    receiver: task.worker_phone,
                    message: reminderText,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (err) {
            logger_1.logger.error(`[ReminderService]: Error triggering reminder for Task ${taskId}: ${err.message}`);
        }
    }
    /**
     * Triggers the Escalation flow exactly at the task deadline.
     */
    static async triggerEscalation(taskId) {
        try {
            const task = await Task_1.TaskModel.findById(taskId);
            if (!task)
                return;
            const taskHumanId = task.taskId || taskId;
            if (task.task_status === 'Completed' || task.task_status === 'Closed') {
                logger_1.logger.info(`[ReminderService]: Escalation Cancelled - Task ${task.task_status} for ID ${taskHumanId}`);
                this.cancelTaskReminders(taskId);
                return;
            }
            logger_1.logger.warn(`[ReminderService]: Escalating Task ${taskHumanId} (Deadline missed)`);
            // 1. Mark task as Overdue and Escalated
            task.is_overdue = true;
            task.is_escalated = true;
            await task.save();
            // 2. Notify the Owner via WhatsApp
            const creds = await credentialRepo.getCredentials();
            const ownerPhone = task.owner_phone || creds.meta.phoneNumberId;
            if (ownerPhone) {
                const formattedDeadline = new Date(task.deadline).toLocaleString('en-IN', { timeZone: creds.settings.timezone || 'Asia/Kolkata' });
                const escalationText = `⚠️ *Escalation Alert*:\nThe task "${task.task_msg}" assigned to *${task.worker_name}* has missed its deadline of ${formattedDeadline}.\nStatus: ${task.task_status}.`;
                try {
                    await whatsAppService.sendMessage(ownerPhone, escalationText);
                    logger_1.logger.info(`[ReminderService]: Escalation WhatsApp dispatched to owner ${ownerPhone}`);
                }
                catch (err) {
                    logger_1.logger.error(`[ReminderService]: Failed to send WhatsApp escalation: ${err.message}`);
                }
            }
            // 3. Create Timeline entry
            await TaskTimeline_1.TaskTimelineModel.create({
                task_id: taskId,
                action: 'Task Escalated',
                description: 'Task missed its deadline and has been escalated.',
                performed_by: 'system',
            });
            // 4. Create Activity Log
            await ActivityLog_1.ActivityLogModel.create({
                username: 'system',
                action: 'Task Escalated',
                description: `Task ${taskHumanId} assigned to ${task.worker_name} has missed its deadline and has been escalated.`,
            });
            // 5. Emit Socket.IO events for live dashboard update
            if (this.io) {
                this.io.emit('task:updated', {
                    id: task._id.toString(),
                    taskId: taskHumanId,
                    worker_name: task.worker_name,
                    task_msg: task.task_msg,
                    task_status: task.task_status,
                    is_overdue: true,
                    is_escalated: true,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (err) {
            logger_1.logger.error(`[ReminderService]: Error triggering escalation for Task ${taskId}: ${err.message}`);
        }
    }
    /**
     * Stops the reminder engine and clears all active timeouts.
     */
    static stopScheduler() {
        logger_1.logger.info('[ReminderService]: Stopping Reminder Engine and clearing timeouts...');
        for (const [taskId, timeouts] of this.activeTimeouts.entries()) {
            for (const t of timeouts) {
                clearTimeout(t);
            }
        }
        this.activeTimeouts.clear();
    }
}
exports.ReminderService = ReminderService;
