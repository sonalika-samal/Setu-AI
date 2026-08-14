"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const TaskRepository_1 = require("../repositories/TaskRepository");
const TaskTimelineRepository_1 = require("../repositories/TaskTimelineRepository");
const Task_1 = require("../models/Task");
const User_1 = require("../models/User");
const TaskTimeline_1 = require("../models/TaskTimeline");
const MessageLog_1 = require("../models/MessageLog");
const ActivityLog_1 = require("../models/ActivityLog");
const AILog_1 = require("../models/AILog");
const logger_1 = require("../utils/logger");
const ReminderService_1 = require("./ReminderService");
const WhatsAppService_1 = require("./whatsapp/WhatsAppService");
const whatsAppService = new WhatsAppService_1.WhatsAppService();
class TaskService {
    taskRepo = new TaskRepository_1.TaskRepository();
    timelineRepo = new TaskTimelineRepository_1.TaskTimelineRepository();
    async getTasks() {
        return this.taskRepo.findAll();
    }
    async generateNextTaskId() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateStr = `${day}${month}${year}`;
        const tasksToday = await Task_1.TaskModel.find({
            taskId: new RegExp(`^${dateStr}T`)
        }).select('taskId').lean();
        let maxNumber = 0;
        for (const t of tasksToday) {
            if (t.taskId) {
                const parts = t.taskId.split('T');
                const num = parseInt(parts[1], 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        }
        const nextNumber = maxNumber + 1;
        return `${dateStr}T${nextNumber}`;
    }
    async createTask(taskData, performedBy) {
        logger_1.logger.info(`Creating task with message: ${taskData.task_msg}`);
        const taskIdGenerated = await this.generateNextTaskId();
        // Set Phase 3 default tracking fields if not set
        const mergedData = {
            taskId: taskIdGenerated,
            task_status: 'Open',
            owner_name: performedBy,
            priority: 'Medium',
            processing_status: 'success',
            ...taskData
        };
        const task = await this.taskRepo.create(mergedData);
        // Log timeline event
        await this.timelineRepo.create({
            task_id: task._id.toString(),
            action: 'Task Created',
            description: `Task was initially registered by ${performedBy}.`,
            performed_by: performedBy,
        });
        // Schedule smart reminders
        try {
            await ReminderService_1.ReminderService.scheduleTaskReminders(task);
        }
        catch (reminderErr) {
            logger_1.logger.error(`Failed to schedule task reminders: ${reminderErr.message}`);
        }
        return task;
    }
    async getStats() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const total = await Task_1.TaskModel.countDocuments({});
        const open = await Task_1.TaskModel.countDocuments({ task_status: 'Open' });
        const started = await Task_1.TaskModel.countDocuments({ task_status: 'Started' });
        const details = await Task_1.TaskModel.countDocuments({ task_status: 'More Details Asked' });
        const completed = await Task_1.TaskModel.countDocuments({ task_status: 'Completed' });
        const closed = await Task_1.TaskModel.countDocuments({ task_status: 'Closed' });
        // Overdue tasks: status is not Completed/Closed and (is_overdue is true OR deadline has passed)
        const overdue = await Task_1.TaskModel.countDocuments({
            task_status: { $nin: ['Completed', 'Closed'] },
            $or: [
                { is_overdue: true },
                { deadline: { $lt: new Date() } }
            ]
        });
        // Escalated tasks: status is not Completed/Closed and is_escalated is true
        const escalated = await Task_1.TaskModel.countDocuments({
            task_status: { $nin: ['Completed', 'Closed'] },
            is_escalated: true
        });
        // Workers online (Active) vs offline (Inactive)
        const online = await User_1.UserModel.countDocuments({ role: 'Worker', status: 'Active' });
        const offline = await User_1.UserModel.countDocuments({ role: 'Worker', status: 'Inactive' });
        // Active today: tasks updated since start of today
        const activeToday = await Task_1.TaskModel.countDocuments({
            updatedAt: { $gte: startOfToday }
        });
        const activeWorkersCount = await User_1.UserModel.countDocuments({ role: 'Worker', worker_status: 'Enabled', availability_status: 'Available' });
        const totalWorkersCount = await User_1.UserModel.countDocuments({ role: 'Worker' });
        const completedTasks = await Task_1.TaskModel.find({
            task_status: { $in: ['Completed', 'Closed'] },
            started_time: { $exists: true },
            completed_time: { $exists: true }
        }).select('started_time completed_time').lean();
        let totalDurationMs = 0;
        let durationCount = 0;
        for (const t of completedTasks) {
            if (t.started_time && t.completed_time) {
                const diff = t.completed_time.getTime() - t.started_time.getTime();
                if (diff > 0) {
                    totalDurationMs += diff;
                    durationCount++;
                }
            }
        }
        const avgCompletionMinutes = durationCount > 0
            ? Math.round((totalDurationMs / durationCount) / (1000 * 60))
            : 0;
        const { ActivityLogModel } = require('../models/ActivityLog');
        const remindersCount = await ActivityLogModel.countDocuments({
            action: { $regex: /Reminder/i }
        });
        return {
            total,
            open,
            started,
            details,
            completed,
            closed,
            overdue,
            escalated,
            online,
            offline,
            activeToday,
            activeWorkersCount,
            totalWorkersCount,
            avgCompletionMinutes,
            remindersCount
        };
    }
    async updateTaskStatus(id, status, performedBy) {
        logger_1.logger.info(`Updating task ${id} status to ${status} by ${performedBy}`);
        const updates = { task_status: status };
        if (status === 'Started') {
            updates.started_time = new Date();
        }
        if (status === 'Completed') {
            updates.completed_time = new Date();
        }
        if (status === 'Closed') {
            updates.closed_by = performedBy;
            updates.closed_time = new Date();
            updates.is_overdue = false;
            updates.is_escalated = false;
        }
        const task = await Task_1.TaskModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
        if (!task)
            return null;
        // Cancel dynamic reminders if status is Completed or Closed
        if (status === 'Completed' || status === 'Closed') {
            try {
                ReminderService_1.ReminderService.cancelTaskReminders(task._id.toString());
            }
            catch (reminderErr) {
                logger_1.logger.error(`Failed to cancel task reminders: ${reminderErr.message}`);
            }
        }
        let action = 'Task Updated';
        if (status === 'Started')
            action = 'Task Started';
        if (status === 'Completed')
            action = 'Task Completed';
        if (status === 'More Details Asked')
            action = 'More Details Asked';
        if (status === 'Closed')
            action = 'Task Closed by Owner';
        // Log timeline event
        await this.timelineRepo.create({
            task_id: id,
            action,
            description: status === 'Closed' ? `Task officially closed by ${performedBy}.` : `Task status transitioned to ${status}.`,
            performed_by: performedBy,
        });
        if (status === 'Closed') {
            const { ActivityLogModel } = require('../models/ActivityLog');
            await ActivityLogModel.create({
                username: performedBy,
                action: 'Task Closed',
                description: `Task officially closed by ${performedBy}`,
            });
        }
        return task;
    }
    async updateTask(id, updateData, performedBy) {
        logger_1.logger.info(`Updating task details for task ${id} by ${performedBy}`);
        const task = await Task_1.TaskModel.findById(id);
        if (!task)
            return null;
        const previousStatus = task.task_status;
        const oldDeadline = task.deadline;
        const oldWorkerPhone = task.worker_phone;
        const oldWorkerName = task.worker_name;
        const oldWorkerId = task.worker_id;
        // Check if worker reassignment or details changed
        const isReassigned = updateData.worker_phone !== undefined && updateData.worker_phone !== oldWorkerPhone;
        const isDetailsEdited = (updateData.task_msg !== undefined && updateData.task_msg !== task.task_msg) ||
            (updateData.location !== undefined && updateData.location !== task.location) ||
            (updateData.deadline !== undefined && new Date(updateData.deadline).getTime() !== new Date(task.deadline || 0).getTime());
        const isStatusClosing = updateData.task_status === 'Closed' && previousStatus !== 'Closed';
        // Apply updates
        if (updateData.task_msg !== undefined)
            task.task_msg = updateData.task_msg;
        if (updateData.location !== undefined)
            task.location = updateData.location;
        if (updateData.priority !== undefined)
            task.priority = updateData.priority;
        if (updateData.notes !== undefined)
            task.notes = updateData.notes;
        if (updateData.worker_name !== undefined)
            task.worker_name = updateData.worker_name;
        if (updateData.worker_phone !== undefined)
            task.worker_phone = updateData.worker_phone;
        if (updateData.worker_id !== undefined)
            task.worker_id = updateData.worker_id;
        if (updateData.task_status !== undefined) {
            task.task_status = updateData.task_status;
            if (updateData.task_status === 'Started' && !task.started_time) {
                task.started_time = new Date();
            }
            if (updateData.task_status === 'Completed' && !task.completed_time) {
                task.completed_time = new Date();
            }
            if (isStatusClosing) {
                task.closed_by = performedBy;
                task.closed_time = new Date();
                task.closing_notes = updateData.closing_notes || '';
                task.is_overdue = false;
                task.is_escalated = false;
            }
        }
        if (updateData.deadline !== undefined) {
            task.deadline = new Date(updateData.deadline);
        }
        await task.save();
        // 1. Reschedule or cancel reminders if needed
        if (task.task_status === 'Completed' || task.task_status === 'Closed') {
            try {
                ReminderService_1.ReminderService.cancelTaskReminders(id);
            }
            catch (reminderErr) {
                logger_1.logger.error(`Failed to cancel reminders: ${reminderErr.message}`);
            }
        }
        else if (updateData.deadline !== undefined && oldDeadline && new Date(oldDeadline).getTime() !== new Date(updateData.deadline).getTime()) {
            // Deadline changed! Cancel all and reschedule automatically
            logger_1.logger.info(`[TaskService]: Task ${task.taskId || task._id} deadline updated. Recalculating smart reminders.`);
            try {
                await ReminderService_1.ReminderService.scheduleTaskReminders(task);
            }
            catch (reminderErr) {
                logger_1.logger.error(`Failed to reschedule reminders: ${reminderErr.message}`);
            }
        }
        // 2. Timeline and Activity logs
        if (isStatusClosing) {
            await this.timelineRepo.create({
                task_id: id,
                action: 'Task Closed by Owner',
                description: `Task officially closed by ${performedBy}. ${updateData.closing_notes ? 'Notes: ' + updateData.closing_notes : ''}`,
                performed_by: performedBy,
            });
            const { ActivityLogModel } = require('../models/ActivityLog');
            await ActivityLogModel.create({
                username: performedBy,
                action: 'Task Closed',
                description: `Task officially closed by ${performedBy}`,
            });
        }
        else {
            await this.timelineRepo.create({
                task_id: id,
                action: 'Task Details Modified',
                description: `Task properties updated by ${performedBy}.`,
                performed_by: performedBy,
            });
            const { ActivityLogModel } = require('../models/ActivityLog');
            await ActivityLogModel.create({
                username: performedBy,
                action: 'Task Modified',
                description: `Task details modified by ${performedBy}.`,
            });
        }
        // 3. Send WABA Notifications to Workers
        try {
            const { CredentialRepository } = require('../repositories/CredentialRepository');
            const credentialRepo = new CredentialRepository();
            const creds = await credentialRepo.getCredentials();
            if (creds && creds.meta?.accessToken && creds.meta?.phoneNumberId) {
                const taskIdGenerated = task.taskId || task._id.toString();
                if (isReassigned) {
                    // A. Notify old worker of cancellation (if any)
                    if (oldWorkerPhone) {
                        const oldCancelMsg = `Task ID: *${'```'}${taskIdGenerated}${'```'}*\n\nHello ${oldWorkerName},\n\nThis task has been unassigned from you and reassigned to another worker. You do not need to work on it anymore. Thank you!`;
                        await whatsAppService.sendMessage(oldWorkerPhone, oldCancelMsg);
                        logger_1.logger.info(`WhatsApp cancellation dispatched to old worker ${oldWorkerPhone}`);
                    }
                    // B. Notify new worker of assignment
                    if (task.worker_phone) {
                        const newWorkerUser = await User_1.UserModel.findOne({ phone: task.worker_phone });
                        const isNewWorkerUnavailable = newWorkerUser?.availability_status === 'Unavailable';
                        const defaultTemplate = 'Task ID: *```{{task_id}}```*\n\nHello {{worker_name}},\n\nYou have been assigned a new task.\n\nTask:\n{{task_msg}}\n\nLocation:\n{{location}}\n\nDeadline:\n{{deadline}}\n\nPlease reply using the Task ID.\n\nExamples:\n{{task_id}} Started\n{{task_id}} Completed\n{{task_id}} Need more details';
                        let dispatchMsg = creds.settings.taskAssignmentTemplate || defaultTemplate;
                        dispatchMsg = dispatchMsg.replace(/{{task_id}}/g, taskIdGenerated);
                        dispatchMsg = dispatchMsg.replace(/{{worker_name}}/g, task.worker_name);
                        dispatchMsg = dispatchMsg.replace(/{{task_msg}}/g, task.task_msg);
                        dispatchMsg = dispatchMsg.replace(/{{location}}/g, task.location || 'N/A');
                        dispatchMsg = dispatchMsg.replace(/{{deadline}}/g, task.deadline ? new Date(task.deadline).toLocaleString('en-IN', { timeZone: creds.settings.timezone || 'Asia/Kolkata' }) : 'N/A');
                        dispatchMsg = dispatchMsg.replace(/{{company_name}}/g, creds.settings.businessName || 'Sahayak AI');
                        dispatchMsg = dispatchMsg.replace(/{{instructions}}/g, 'Please reply using the Task ID.');
                        if (!dispatchMsg.startsWith('Task ID:')) {
                            dispatchMsg = `Task ID: *${'```'}${taskIdGenerated}${'```'}*\n\n${dispatchMsg}`;
                        }
                        if (isNewWorkerUnavailable) {
                            dispatchMsg += '\n\n⚠️ Our records indicate that you are currently marked as unavailable.\n\nIf you are available to perform this task, simply reply and continue as normal.\n\nIf you are unavailable today, please contact the Owner immediately.';
                        }
                        await whatsAppService.sendMessage(task.worker_phone, dispatchMsg);
                        logger_1.logger.info(`WhatsApp dispatch message sent to new worker ${task.worker_phone}`);
                        // Notify Owner if worker is unavailable
                        if (isNewWorkerUnavailable && task.owner_phone) {
                            const ownerAlertMsg = `⚠️ Worker Availability Alert\n\nTask ID: *${'```'}${taskIdGenerated}${'```'}*\n\nWorker: ${task.worker_name}\n\nThe assigned worker is currently marked as unavailable.\n\nThe task has still been assigned, and a notification has been sent to the worker informing them of their unavailable status.\n\nIf required, please contact the worker directly or reassign the task.`;
                            try {
                                await whatsAppService.sendMessage(task.owner_phone, ownerAlertMsg);
                                logger_1.logger.info(`Dispatched worker unavailability alert to Owner ${task.owner_phone}`);
                            }
                            catch (alertErr) {
                                logger_1.logger.error(`Failed to send availability alert to owner: ${alertErr.message}`);
                            }
                        }
                    }
                }
                else if (isDetailsEdited && task.worker_phone && task.task_status !== 'Completed' && task.task_status !== 'Closed') {
                    // Check if current worker is unavailable
                    const currentWorkerUser = await User_1.UserModel.findOne({ phone: task.worker_phone });
                    const isCurrentWorkerUnavailable = currentWorkerUser?.availability_status === 'Unavailable';
                    // C. Notify currently assigned worker of details update
                    let updateMsg = `Task ID: *${'```'}${taskIdGenerated}${'```'}*\n\nHello ${task.worker_name},\n\nYour assigned task details have been updated by the Owner.\n\nUpdated Details:\nTask:\n${task.task_msg}\n\nLocation:\n${task.location || 'N/A'}\n\nDeadline:\n${task.deadline ? new Date(task.deadline).toLocaleString('en-IN', { timeZone: creds.settings.timezone || 'Asia/Kolkata' }) : 'N/A'}\n\nPlease reply using the Task ID.`;
                    if (isCurrentWorkerUnavailable) {
                        updateMsg += '\n\n⚠️ Our records indicate that you are currently marked as unavailable.\n\nIf you are available to perform this task, simply reply and continue as normal.\n\nIf you are unavailable today, please contact the Owner immediately.';
                    }
                    await whatsAppService.sendMessage(task.worker_phone, updateMsg);
                    logger_1.logger.info(`WhatsApp details update message sent to worker ${task.worker_phone}`);
                }
            }
        }
        catch (notifyErr) {
            logger_1.logger.error(`Failed to send WhatsApp task update/reassignment notification: ${notifyErr.message}`);
        }
        return task;
    }
    async getTaskDetails(id) {
        const task = await Task_1.TaskModel.findById(id).lean();
        if (!task)
            return null;
        // 1. Get timeline entries for this task
        const timeline = await TaskTimeline_1.TaskTimelineModel.find({ task_id: id }).sort({ timestamp: 1 }).lean();
        // 2. Get complete messages (incoming/outgoing) associated with this task or worker
        const messages = await MessageLog_1.MessageLogModel.find({
            $or: [
                { task_id: id },
                { sender: task.worker_phone },
                { receiver: task.worker_phone }
            ]
        }).sort({ timestamp: 1 }).lean();
        // 3. Get activity logs associated with this task or worker
        const activityLogs = await ActivityLog_1.ActivityLogModel.find({
            $or: [
                { description: new RegExp(id, 'i') },
                { description: new RegExp(task.worker_name, 'i') },
                { username: task.worker_name }
            ]
        }).sort({ timestamp: -1 }).lean();
        // 4. Get AI logs associated with this task or worker
        const aiLogs = await AILog_1.AILogModel.find({
            $or: [
                { prompt: new RegExp(task.worker_name, 'i') },
                { response: new RegExp(task.worker_name, 'i') },
                { prompt: new RegExp(id, 'i') }
            ]
        }).sort({ timestamp: -1 }).lean();
        return {
            task,
            timeline,
            messages,
            activityLogs,
            aiLogs
        };
    }
    async deleteTask(id, performedBy) {
        const task = await Task_1.TaskModel.findById(id);
        if (!task)
            return false;
        // Delete the task document
        await Task_1.TaskModel.deleteOne({ _id: id });
        // Log action in activity logs
        const { LoggingService } = require('./LoggingService');
        const loggingService = new LoggingService();
        await loggingService.logActivity(performedBy, 'Task Deleted', `Task ID: ${task.taskId || task._id.toString()} assigned to ${task.worker_name} was deleted.`);
        // Clean up timeline entries for this task
        await TaskTimeline_1.TaskTimelineModel.deleteMany({ task_id: id });
        return true;
    }
}
exports.TaskService = TaskService;
exports.default = TaskService;
