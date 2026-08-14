"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryService = void 0;
const Task_1 = require("../models/Task");
const User_1 = require("../models/User");
const ActivityLog_1 = require("../models/ActivityLog");
const logger_1 = require("../utils/logger");
function escapeRegex(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
class QueryService {
    async executeQuery(operation, parameters = {}) {
        logger_1.logger.info(`QueryService: Executing predefined operation: ${operation} with parameters: ${JSON.stringify(parameters)}`);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        try {
            switch (operation.toUpperCase()) {
                case 'GET_OPEN_TASKS':
                    return await Task_1.TaskModel.find({ task_status: 'Open' }).sort({ createdAt: -1 }).lean();
                case 'GET_COMPLETED_TASKS':
                    return await Task_1.TaskModel.find({ task_status: 'Completed' }).sort({ completed_time: -1 }).lean();
                case 'GET_STARTED_TASKS':
                    return await Task_1.TaskModel.find({ task_status: 'Started' }).sort({ started_time: -1 }).lean();
                case 'GET_WORKER_STATUS':
                case 'GET_WORKER_TASKS': {
                    const workerName = parameters.workerName || '';
                    if (!workerName) {
                        return { error: 'No worker name specified.' };
                    }
                    // First, find the worker to get correct name
                    const worker = await User_1.UserModel.findOne({
                        name: { $regex: new RegExp(escapeRegex(workerName), 'i') },
                        role: 'Worker'
                    }).lean();
                    const queryFilter = {};
                    if (worker) {
                        queryFilter.worker_id = worker._id.toString();
                    }
                    else {
                        queryFilter.worker_name = { $regex: new RegExp(escapeRegex(workerName), 'i') };
                    }
                    if (parameters.status) {
                        queryFilter.task_status = parameters.status;
                    }
                    const tasks = await Task_1.TaskModel.find(queryFilter).sort({ updatedAt: -1 }).lean();
                    return {
                        worker: worker || { name: workerName },
                        availabilityStatus: worker ? worker.availability_status : 'Unknown',
                        checkInTime: worker ? worker.check_in_time : null,
                        checkOutTime: worker ? worker.check_out_time : null,
                        lastSeen: worker ? worker.last_seen : null,
                        lastActivity: worker ? worker.last_activity : null,
                        availabilityReason: worker ? worker.availability_reason : null,
                        availabilityHistory: worker ? worker.availability_history : [],
                        tasks
                    };
                }
                case 'GET_OVERDUE_TASKS':
                    return await Task_1.TaskModel.find({
                        task_status: { $nin: ['Completed', 'Closed'] },
                        $or: [
                            { is_overdue: true },
                            { deadline: { $lt: new Date() } }
                        ]
                    }).sort({ deadline: 1 }).lean();
                case 'GET_CLOSED_TASKS':
                    return await Task_1.TaskModel.find({ task_status: 'Closed' }).sort({ closed_time: -1 }).lean();
                case 'GET_TODAY_TASKS':
                    return await Task_1.TaskModel.find({
                        createdAt: { $gte: startOfToday }
                    }).sort({ createdAt: -1 }).lean();
                case 'GET_PENDING_TASKS':
                    return await Task_1.TaskModel.find({
                        task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
                    }).sort({ createdAt: -1 }).lean();
                case 'GET_MORE_DETAILS_TASKS':
                    return await Task_1.TaskModel.find({
                        task_status: 'More Details Asked'
                    }).sort({ updatedAt: -1 }).lean();
                case 'GET_ACTIVITY_LOGS':
                    return await ActivityLog_1.ActivityLogModel.find().sort({ timestamp: -1 }).limit(20).lean();
                case 'GET_TASK_DETAILS': {
                    const taskId = parameters.taskId;
                    if (taskId) {
                        const task = await Task_1.TaskModel.findOne({ taskId }).lean();
                        if (task)
                            return task;
                        const mongoose = require('mongoose');
                        if (mongoose.Types.ObjectId.isValid(taskId)) {
                            return await Task_1.TaskModel.findById(taskId).lean();
                        }
                        return null;
                    }
                    const workerName = parameters.workerName || '';
                    return await Task_1.TaskModel.findOne({
                        worker_name: { $regex: new RegExp(escapeRegex(workerName), 'i') }
                    }).sort({ createdAt: -1 }).lean();
                }
                case 'GET_WORKER_SUMMARY': {
                    const workers = await User_1.UserModel.find({ role: 'Worker' }).lean();
                    const summary = [];
                    for (const worker of workers) {
                        const workerObj = worker;
                        const activeCount = await Task_1.TaskModel.countDocuments({
                            worker_id: worker._id.toString(),
                            task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
                        });
                        const completedCount = await Task_1.TaskModel.countDocuments({
                            worker_id: worker._id.toString(),
                            task_status: 'Completed'
                        });
                        summary.push({
                            name: workerObj.name,
                            phone: workerObj.phone,
                            status: workerObj.status, // Active/Inactive
                            availabilityStatus: workerObj.availability_status || 'Unavailable',
                            checkInTime: workerObj.check_in_time,
                            checkOutTime: workerObj.check_out_time,
                            lastSeen: workerObj.last_seen,
                            lastActivity: workerObj.last_activity,
                            availabilityReason: workerObj.availability_reason,
                            activeTasks: activeCount,
                            completedTasks: completedCount
                        });
                    }
                    return summary;
                }
                case 'GET_DASHBOARD_SUMMARY': {
                    const total = await Task_1.TaskModel.countDocuments({});
                    const open = await Task_1.TaskModel.countDocuments({ task_status: 'Open' });
                    const started = await Task_1.TaskModel.countDocuments({ task_status: 'Started' });
                    const details = await Task_1.TaskModel.countDocuments({ task_status: 'More Details Asked' });
                    const completed = await Task_1.TaskModel.countDocuments({ task_status: 'Completed' });
                    const closed = await Task_1.TaskModel.countDocuments({ task_status: 'Closed' });
                    const overdue = await Task_1.TaskModel.countDocuments({
                        task_status: { $nin: ['Completed', 'Closed'] },
                        $or: [
                            { is_overdue: true },
                            { deadline: { $lt: new Date() } }
                        ]
                    });
                    const escalated = await Task_1.TaskModel.countDocuments({
                        task_status: { $nin: ['Completed', 'Closed'] },
                        is_escalated: true
                    });
                    const online = await User_1.UserModel.countDocuments({ role: 'Worker', status: 'Active' });
                    const offline = await User_1.UserModel.countDocuments({ role: 'Worker', status: 'Inactive' });
                    const activeToday = await Task_1.TaskModel.countDocuments({
                        updatedAt: { $gte: startOfToday }
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
                        activeToday
                    };
                }
                case 'GET_DEPARTMENTS': {
                    const { DepartmentModel } = require('../models/Department');
                    return await DepartmentModel.find().sort({ name: 1 }).lean();
                }
                case 'GET_NOTIFICATIONS': {
                    const { NotificationModel } = require('../models/Notification');
                    return await NotificationModel.find().sort({ timestamp: -1 }).limit(10).lean();
                }
                case 'GET_PROOF_OF_WORK': {
                    const taskId = parameters.taskId;
                    if (taskId) {
                        const task = await Task_1.TaskModel.findOne({ taskId }).select('taskId worker_name proof_of_work').lean();
                        return task ? task.proof_of_work : [];
                    }
                    const tasksWithProof = await Task_1.TaskModel.find({ 'proof_of_work.0': { $exists: true } })
                        .select('taskId worker_name proof_of_work')
                        .sort({ updatedAt: -1 })
                        .lean();
                    const allProofs = [];
                    for (const t of tasksWithProof) {
                        for (const p of t.proof_of_work) {
                            allProofs.push({
                                taskId: t.taskId,
                                worker_name: t.worker_name,
                                ...p
                            });
                        }
                    }
                    return allProofs;
                }
                case 'GET_SECURITY_LOGS': {
                    const { SecurityLogModel } = require('../models/SecurityLog');
                    return await SecurityLogModel.find().sort({ timestamp: -1 }).limit(20).lean();
                }
                case 'GET_REPORTS': {
                    const totalTasks = await Task_1.TaskModel.countDocuments({});
                    const completed = await Task_1.TaskModel.countDocuments({ task_status: 'Completed' });
                    const open = await Task_1.TaskModel.countDocuments({ task_status: 'Open' });
                    const started = await Task_1.TaskModel.countDocuments({ task_status: 'Started' });
                    const details = await Task_1.TaskModel.countDocuments({ task_status: 'More Details Asked' });
                    const closed = await Task_1.TaskModel.countDocuments({ task_status: 'Closed' });
                    const overdue = await Task_1.TaskModel.countDocuments({
                        task_status: { $nin: ['Completed', 'Closed'] },
                        deadline: { $lt: new Date() }
                    });
                    const activeWorkers = await User_1.UserModel.countDocuments({ role: 'Worker', worker_status: 'Enabled' });
                    const disabledWorkers = await User_1.UserModel.countDocuments({ role: 'Worker', worker_status: 'Disabled' });
                    return {
                        totalTasks,
                        completed,
                        open,
                        started,
                        details,
                        closed,
                        overdue,
                        activeWorkers,
                        disabledWorkers
                    };
                }
                default:
                    logger_1.logger.warn(`QueryService: Unknown operation ${operation}`);
                    return { error: `Operation ${operation} is not supported.` };
            }
        }
        catch (err) {
            logger_1.logger.error(`QueryService Error for operation ${operation}: ${err.message}`);
            return { error: err.message };
        }
    }
}
exports.QueryService = QueryService;
exports.default = QueryService;
