"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentController = void 0;
const Department_1 = require("../models/Department");
const User_1 = require("../models/User");
const Task_1 = require("../models/Task");
const ActivityLog_1 = require("../models/ActivityLog");
const LoggingService_1 = require("../services/LoggingService");
const loggingService = new LoggingService_1.LoggingService();
class DepartmentController {
    async list(req, res, next) {
        try {
            const orgId = req.orgId || 'default';
            const depts = await Department_1.DepartmentModel.find({ orgId }).sort({ name: 1 });
            res.status(200).json(depts);
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { name, code, description } = req.body;
            const user = req.user;
            const orgId = req.orgId || 'default';
            if (!name || !code) {
                res.status(400).json({ message: 'Name and Code are required.' });
                return;
            }
            const existingName = await Department_1.DepartmentModel.findOne({ orgId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
            const existingCode = await Department_1.DepartmentModel.findOne({ orgId, code: { $regex: new RegExp(`^${code}$`, 'i') } });
            if (existingName || existingCode) {
                res.status(400).json({ message: 'Department with this name or code already exists in your organisation.' });
                return;
            }
            const dept = await Department_1.DepartmentModel.create({
                orgId,
                name,
                code: code.toUpperCase(),
                description,
                created_by: user?.username || 'system'
            });
            // Socket.IO broadcast
            const io = req.app.get('io');
            if (io) {
                io.emit('message:received', { type: 'departments_refresh' });
            }
            // Bell notification
            const { NotificationModel } = require('../models/Notification');
            const notification = await NotificationModel.create({
                orgId,
                title: 'Department Created',
                description: `Department "${name}" (${code.toUpperCase()}) was created by "${user?.username || 'system'}".`,
                type: 'Department Alert',
                related_department: dept._id,
                read_status: 'Unread',
                timestamp: new Date()
            });
            if (io) {
                io.emit('notification:received', notification);
            }
            // Log Activity
            await loggingService.logActivity(user?.username || 'system', 'Department Created', `Department ${name} (${code.toUpperCase()}) was created.`);
            res.status(201).json(dept);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, code, description, status } = req.body;
            const user = req.user;
            const dept = await Department_1.DepartmentModel.findById(id);
            if (!dept) {
                res.status(404).json({ message: 'Department not found.' });
                return;
            }
            // Prevent renaming "Other" default department
            if (dept.code === 'OTHER' && (name !== dept.name || code !== dept.code)) {
                res.status(400).json({ message: 'The default "Other" department cannot be renamed or have its code changed.' });
                return;
            }
            if (name) {
                const existingName = await Department_1.DepartmentModel.findOne({ _id: { $ne: id }, name: { $regex: new RegExp(`^${name}$`, 'i') } });
                if (existingName) {
                    res.status(400).json({ message: 'Department with this name already exists.' });
                    return;
                }
                dept.name = name;
            }
            if (code) {
                const existingCode = await Department_1.DepartmentModel.findOne({ _id: { $ne: id }, code: { $regex: new RegExp(`^${code}$`, 'i') } });
                if (existingCode) {
                    res.status(400).json({ message: 'Department with this code already exists.' });
                    return;
                }
                dept.code = code.toUpperCase();
            }
            if (description !== undefined)
                dept.description = description;
            if (status !== undefined)
                dept.status = status;
            await dept.save();
            // Update workers' cached department names
            if (name) {
                await User_1.UserModel.updateMany({ department_id: id }, { department_name: name });
            }
            // Socket.IO broadcast
            const io = req.app.get('io');
            if (io) {
                io.emit('message:received', { type: 'departments_refresh' });
                io.emit('message:received', { type: 'workers_refresh' });
            }
            // Bell notification
            const { NotificationModel } = require('../models/Notification');
            const notification = await NotificationModel.create({
                title: 'Department Updated',
                description: `Department "${dept.name}" was modified by "${user?.username || 'system'}".`,
                type: 'Department Alert',
                related_department: dept._id,
                read_status: 'Unread',
                timestamp: new Date()
            });
            if (io) {
                io.emit('notification:received', notification);
            }
            // Log Activity
            await loggingService.logActivity(user?.username || 'system', 'Department Updated', `Department ${dept.name} details were updated.`);
            res.status(200).json(dept);
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const user = req.user;
            const dept = await Department_1.DepartmentModel.findById(id);
            if (!dept) {
                res.status(404).json({ message: 'Department not found.' });
                return;
            }
            if (dept.code === 'OTHER') {
                res.status(400).json({ message: 'The default "Other" department is permanent and cannot be deleted.' });
                return;
            }
            // Find the "Other" department
            const otherDept = await Department_1.DepartmentModel.findOne({ code: 'OTHER' });
            if (!otherDept) {
                res.status(500).json({ message: 'System default "Other" department is missing.' });
                return;
            }
            // Move workers assigned to this department to "Other"
            await User_1.UserModel.updateMany({ department_id: id }, {
                department_id: otherDept._id,
                department_name: otherDept.name
            });
            await Department_1.DepartmentModel.findByIdAndDelete(id);
            // Socket.IO broadcast
            const io = req.app.get('io');
            if (io) {
                io.emit('message:received', { type: 'departments_refresh' });
                io.emit('message:received', { type: 'workers_refresh' });
            }
            // Bell notification
            const { NotificationModel } = require('../models/Notification');
            const notification = await NotificationModel.create({
                title: 'Department Deleted',
                description: `Department "${dept.name}" was deleted by "${user?.username || 'system'}".`,
                type: 'Department Alert',
                read_status: 'Unread',
                timestamp: new Date()
            });
            if (io) {
                io.emit('notification:received', notification);
            }
            // Log Activity
            await loggingService.logActivity(user?.username || 'system', 'Department Deleted', `Department ${dept.name} was deleted. Assigned workers were moved to "Other".`);
            res.status(200).json({ message: 'Department deleted successfully. Workers moved to "Other".' });
        }
        catch (error) {
            next(error);
        }
    }
    async moveWorkers(req, res, next) {
        try {
            const { workerIds, targetDepartmentId } = req.body;
            const user = req.user;
            if (!Array.isArray(workerIds) || !targetDepartmentId) {
                res.status(400).json({ message: 'workerIds (array) and targetDepartmentId are required.' });
                return;
            }
            const targetDept = await Department_1.DepartmentModel.findById(targetDepartmentId);
            if (!targetDept) {
                res.status(404).json({ message: 'Target department not found.' });
                return;
            }
            await User_1.UserModel.updateMany({ _id: { $in: workerIds } }, {
                department_id: targetDept._id,
                department_name: targetDept.name
            });
            // Socket.IO broadcast
            const io = req.app.get('io');
            if (io) {
                io.emit('message:received', { type: 'workers_refresh' });
                io.emit('message:received', { type: 'departments_refresh' });
            }
            // Bell notification
            const { NotificationModel } = require('../models/Notification');
            const notification = await NotificationModel.create({
                title: 'Workforce Relocated',
                description: `Moved ${workerIds.length} workers to department "${targetDept.name}" by "${user?.username || 'system'}".`,
                type: 'Department Alert',
                related_department: targetDept._id,
                read_status: 'Unread',
                timestamp: new Date()
            });
            if (io) {
                io.emit('notification:received', notification);
            }
            // Log Activity
            await loggingService.logActivity(user?.username || 'system', 'Workers Moved', `Moved ${workerIds.length} workers to department ${targetDept.name}.`);
            res.status(200).json({ message: 'Workers successfully relocated.' });
        }
        catch (error) {
            next(error);
        }
    }
    async getSummaryStats(req, res, next) {
        try {
            const depts = await Department_1.DepartmentModel.find().lean();
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const summaries = await Promise.all(depts.map(async (dept) => {
                const workers = await User_1.UserModel.find({ department_id: dept._id, role: 'Worker' }).lean();
                const workerIds = workers.map(w => w._id.toString());
                const totalWorkers = workers.length;
                const availableWorkers = workers.filter(w => w.availability_status === 'Available').length;
                const unavailableWorkers = totalWorkers - availableWorkers;
                const activeTasks = await Task_1.TaskModel.countDocuments({
                    worker_id: { $in: workerIds },
                    task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
                });
                const completedToday = await Task_1.TaskModel.countDocuments({
                    worker_id: { $in: workerIds },
                    task_status: 'Completed',
                    completed_time: { $gte: startOfToday }
                });
                return {
                    departmentId: dept._id,
                    name: dept.name,
                    code: dept.code,
                    status: dept.status,
                    totalWorkers,
                    availableWorkers,
                    unavailableWorkers,
                    activeTasks,
                    completedToday
                };
            }));
            res.status(200).json(summaries);
        }
        catch (error) {
            next(error);
        }
    }
    async getDepartmentDetails(req, res, next) {
        try {
            const { id } = req.params;
            const dept = await Department_1.DepartmentModel.findById(id).lean();
            if (!dept) {
                res.status(404).json({ message: 'Department not found.' });
                return;
            }
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const workers = await User_1.UserModel.find({ department_id: id, role: 'Worker' }).sort({ name: 1 }).lean();
            const workerIds = workers.map(w => w._id.toString());
            const workerUsernames = workers.map(w => w.username).filter(Boolean);
            const activeTasks = await Task_1.TaskModel.find({
                worker_id: { $in: workerIds },
                task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
            }).sort({ createdAt: -1 }).lean();
            // Recent activities: match activity logs generated by workers in this department
            const recentActivities = await ActivityLog_1.ActivityLogModel.find({
                username: { $in: workerUsernames }
            }).sort({ timestamp: -1 }).limit(15).lean();
            const totalCompleted = await Task_1.TaskModel.countDocuments({
                worker_id: { $in: workerIds },
                task_status: 'Completed'
            });
            const completedToday = await Task_1.TaskModel.countDocuments({
                worker_id: { $in: workerIds },
                task_status: 'Completed',
                completed_time: { $gte: startOfToday }
            });
            const totalAssigned = await Task_1.TaskModel.countDocuments({
                worker_id: { $in: workerIds }
            });
            res.status(200).json({
                department: dept,
                workers,
                activeTasks,
                recentActivities,
                performance: {
                    totalCompleted,
                    completedToday,
                    totalAssigned
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DepartmentController = DepartmentController;
