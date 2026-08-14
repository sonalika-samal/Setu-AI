import { Request, Response, NextFunction } from 'express';
import { TaskModel } from '../models/Task';
import { TaskService } from '../services/TaskService';
import { AuthRequest } from '../middlewares/auth';

const taskService = new TaskService();

export class TaskController {
  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const tasks = await taskService.getTasks(orgId);
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskData = req.body;
      const user = (req as AuthRequest).user;
      const orgId = (req as AuthRequest).orgId || 'default';
      
      const task = await taskService.createTask(
        taskData,
        user?.username || 'system',
        orgId
      );

      // Emit live creation event
      const io = req.app.get('io');
      if (io) {
        io.emit('task:created', {
          id: task._id.toString(),
          worker_name: task.worker_name,
          task_msg: task.task_msg,
          task_status: task.task_status,
          timestamp: task.timestamp.toISOString(),
        });
      }

      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const stats = await taskService.getStats(orgId);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  async updateTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = (req as AuthRequest).user;

      const validStatuses = ['Open', 'Started', 'More Details Asked', 'Completed', 'Closed'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({ message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` });
        return;
      }

      const task = await taskService.updateTaskStatus(
        id,
        status as 'Open' | 'Started' | 'More Details Asked' | 'Completed' | 'Closed',
        user?.username || 'system'
      );

      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Emit live update event
      const io = req.app.get('io');
      if (io) {
        io.emit('task:updated', {
          id: task._id.toString(),
          taskId: task.taskId || task._id.toString(),
          worker_name: task.worker_name,
          task_msg: task.task_msg,
          task_status: task.task_status,
          is_overdue: task.is_overdue,
          is_escalated: task.is_escalated,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = (req as AuthRequest).user;

      const task = await taskService.updateTask(
        id,
        updateData,
        user?.username || 'system'
      );

      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Emit live update event
      const io = req.app.get('io');
      if (io) {
        io.emit('task:updated', {
          id: task._id.toString(),
          taskId: task.taskId || task._id.toString(),
          worker_name: task.worker_name,
          task_msg: task.task_msg,
          task_status: task.task_status,
          is_overdue: task.is_overdue,
          is_escalated: task.is_escalated,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async getTaskDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const details = await taskService.getTaskDetails(id);
      
      if (!details) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  }

  async updateWorkerAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const user = (req as AuthRequest).user;

      if (!status || !['Available', 'Unavailable'].includes(status)) {
        res.status(400).json({ message: 'Invalid status. Must be Available or Unavailable.' });
        return;
      }

      const { UserModel } = require('../models/User');
      const worker = await UserModel.findById(id);

      if (!worker || worker.role !== 'Worker') {
        res.status(404).json({ message: 'Worker not found.' });
        return;
      }

      const prevStatus = worker.availability_status || 'Unavailable';
      worker.availability_status = status;
      worker.availability_reason = reason || '';
      
      if (status === 'Available') {
        worker.check_in_time = new Date();
      } else {
        worker.check_out_time = new Date();
      }

      if (!worker.availability_history) worker.availability_history = [];
      worker.availability_history.push({
        previous_status: prevStatus,
        new_status: status,
        changed_by: user?.username || 'system',
        timestamp: new Date(),
        reason: reason || 'Manual override by administrator'
      });

      await worker.save();

      // Log activity
      const { ActivityLogModel } = require('../models/ActivityLog');
      await ActivityLogModel.create({
        username: user?.username || 'system',
        action: status === 'Available' ? 'Worker Checked In' : 'Worker Checked Out',
        description: `Worker ${worker.name} status manually set to ${status} by ${user?.username || 'system'}. ${reason ? 'Reason: ' + reason : ''}`,
      });

      // Emit live updates
      const io = req.app.get('io');
      if (io) {
        io.emit('task:updated', { type: 'workers_refresh' });
        io.emit('message:received', { type: 'workers_refresh' });
      }

      res.status(200).json(worker);
    } catch (error) {
      next(error);
    }
  }

  async manualUpdateTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      const user = (req as AuthRequest).user;

      const validStatuses = ['Open', 'Started', 'More Details Asked', 'Completed', 'Closed'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        return;
      }

      const { TaskModel } = require('../models/Task');
      const task = await TaskModel.findById(id);

      if (!task) {
        res.status(404).json({ message: 'Task not found.' });
        return;
      }

      const previousStatus = task.task_status;
      if (['Completed', 'Closed'].includes(previousStatus)) {
        res.status(400).json({ message: 'Cannot modify task status from a completed or closed state.' });
        return;
      }

      // Set updates
      task.task_status = status;
      if (status === 'Started' && !task.started_time) {
        task.started_time = new Date();
      }
      if (status === 'Completed') {
        task.completed_time = new Date();
      }
      if (status === 'Closed') {
        task.closed_by = user?.username || 'system';
        task.closed_time = new Date();
        task.closing_notes = remarks || '';
        task.is_overdue = false;
        task.is_escalated = false;
      }

      // Cancel reminders if completed/closed
      if (status === 'Completed' || status === 'Closed') {
        try {
          const { ReminderService } = require('../services/ReminderService');
          ReminderService.cancelTaskReminders(task._id.toString());
        } catch (remErr: any) {
          req.app.get('logger')?.error(`Failed to cancel reminders: ${remErr.message}`);
        }
      }

      if (!task.status_history) task.status_history = [];
      task.status_history.push({
        previous_status: previousStatus,
        new_status: status,
        changed_by: user?.username || 'system',
        timestamp: new Date(),
        remarks: remarks || 'Manual dashboard override'
      });

      await task.save();

      // Timeline log
      const { TaskTimelineModel } = require('../models/TaskTimeline');
      await TaskTimelineModel.create({
        task_id: task._id,
        action: status === 'Closed' ? 'Task Closed by Owner' : 'Task Status Updated',
        description: `Task status manually changed from ${previousStatus} to ${status} by ${user?.username || 'system'}.`,
        performed_by: user?.username || 'system',
      });

      // Activity log
      const { ActivityLogModel } = require('../models/ActivityLog');
      await ActivityLogModel.create({
        username: user?.username || 'system',
        action: status === 'Closed' ? 'Task Closed' : 'Task Updated',
        description: `Task ${task.taskId || task._id} status manually changed to ${status} by ${user?.username || 'system'}.`,
      });

      // Emit live updates
      const io = req.app.get('io');
      if (io) {
        io.emit('task:updated', {
          id: task._id.toString(),
          taskId: task.taskId || task._id.toString(),
          worker_name: task.worker_name,
          task_msg: task.task_msg,
          task_status: task.task_status,
          is_overdue: task.is_overdue,
          is_escalated: task.is_escalated,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const io = req.app.get('io');
      // Enforce 24h inactivity status check before returning counts
      try {
        const { InactivityChecker } = require('../services/InactivityChecker');
        await InactivityChecker.checkWorkerInactivity(io);
      } catch (checkerErr) {
        req.app.get('logger')?.error(`Failed to run inactivity checker: ${(checkerErr as Error).message}`);
      }

      const { UserModel } = require('../models/User');
      
      const totalWorkers = await UserModel.countDocuments({ role: 'Worker' });
      const available = await UserModel.countDocuments({ role: 'Worker', availability_status: 'Available' });
      const unavailable = await UserModel.countDocuments({ role: 'Worker', availability_status: 'Unavailable' });
      
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);

      const checkedInToday = await UserModel.countDocuments({
        role: 'Worker',
        check_in_time: { $gte: startOfToday }
      });

      const checkedOutToday = await UserModel.countDocuments({
        role: 'Worker',
        check_out_time: { $gte: startOfToday }
      });

      res.status(200).json({
        totalWorkers,
        available,
        unavailable,
        checkedInToday,
        checkedOutToday
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user;

      const success = await taskService.deleteTask(id, user?.username || 'system');
      if (!success) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Emit live deletion event
      const io = req.app.get('io');
      if (io) {
        io.emit('task:deleted', {
          id: id,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async reviewProof(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, proofId } = req.params;
      const { status, remarks } = req.body;
      const user = (req as AuthRequest).user;

      if (!status || !['Approved', 'Rejected'].includes(status)) {
        res.status(400).json({ message: 'Valid status ("Approved" or "Rejected") is required.' });
        return;
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        res.status(404).json({ message: 'Task not found.' });
        return;
      }

      const proof = (task as any).proof_of_work.id(proofId);
      if (!proof) {
        res.status(404).json({ message: 'Proof attachment not found.' });
        return;
      }

      proof.status = status;
      proof.review_notes = remarks || '';
      proof.reviewed_by = user?.username || 'system';
      proof.reviewed_at = new Date();

      if (!proof.approval_history) proof.approval_history = [];
      proof.approval_history.push({
        status,
        changed_by: user?.username || 'system',
        timestamp: new Date(),
        remarks: remarks || ''
      });

      await task.save();

      const { LoggingService } = require('../services/LoggingService');
      const loggingService = new LoggingService();
      await loggingService.logActivity(
        user?.username || 'system',
        'Proof Reviewed',
        `Proof of work ${proofId} on task ${task.taskId || task._id} was ${status.toLowerCase()} by ${user?.username || 'system'}.`
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('task:updated', { id: task._id.toString() });
      }

      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async reviewProofById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { proofId } = req.params;
      const { status, remarks } = req.body;
      const user = (req as AuthRequest).user;

      if (!status || !['Approved', 'Rejected'].includes(status)) {
        res.status(400).json({ message: 'Valid status ("Approved" or "Rejected") is required.' });
        return;
      }

      const task = await TaskModel.findOne({ "proof_of_work._id": proofId });
      if (!task) {
        res.status(404).json({ message: 'Task containing this proof not found.' });
        return;
      }

      const proof = (task as any).proof_of_work.id(proofId);
      if (!proof) {
        res.status(404).json({ message: 'Proof attachment not found.' });
        return;
      }

      proof.status = status;
      proof.review_notes = remarks || '';
      proof.reviewed_by = user?.username || 'system';
      proof.reviewed_at = new Date();

      if (!proof.approval_history) proof.approval_history = [];
      proof.approval_history.push({
        status,
        changed_by: user?.username || 'system',
        timestamp: new Date(),
        remarks: remarks || ''
      });

      await task.save();

      const { LoggingService } = require('../services/LoggingService');
      const loggingService = new LoggingService();
      await loggingService.logActivity(
        user?.username || 'system',
        'Proof Reviewed',
        `Proof of work ${proofId} on task ${task.taskId || task._id} was ${status.toLowerCase()} by ${user?.username || 'system'}.`
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('task:updated', { id: task._id.toString() });
      }

      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async getAllProofs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasksWithProof = await TaskModel.find({ 'proof_of_work.0': { $exists: true } })
        .select('taskId worker_name worker_phone proof_of_work')
        .sort({ updatedAt: -1 })
        .lean();
      
      const allProofs = [];
      for (const t of tasksWithProof) {
        for (const p of (t as any).proof_of_work) {
          allProofs.push({
            taskId: t.taskId,
            worker_name: t.worker_name,
            worker_phone: t.worker_phone,
            ...p
          });
        }
      }

      // Sort by uploaded_at descending
      allProofs.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

      res.status(200).json(allProofs);
    } catch (error) {
      next(error);
    }
  }
}

export default TaskController;
