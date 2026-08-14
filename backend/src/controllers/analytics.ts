import { Request, Response, NextFunction } from 'express';
import { TaskModel } from '../models/Task';
import { UserModel } from '../models/User';
import { DepartmentModel } from '../models/Department';
import { AuthRequest } from '../middlewares/auth';

export class AnalyticsController {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const now = new Date();

      // 1. Task counts
      const totalTasks = await TaskModel.countDocuments({ orgId });
      const open = await TaskModel.countDocuments({ orgId, task_status: 'Open' });
      const started = await TaskModel.countDocuments({ orgId, task_status: 'Started' });
      const details = await TaskModel.countDocuments({ orgId, task_status: 'More Details Asked' });
      const completed = await TaskModel.countDocuments({ orgId, task_status: 'Completed' });
      const closed = await TaskModel.countDocuments({ orgId, task_status: 'Closed' });
      
      const overdue = await TaskModel.countDocuments({
        orgId,
        task_status: { $nin: ['Completed', 'Closed'] },
        deadline: { $lt: now }
      });
      const escalated = await TaskModel.countDocuments({
        orgId,
        task_status: { $nin: ['Completed', 'Closed'] },
        is_escalated: true
      });

      // 2. Worker metrics
      const enabledWorkers = await UserModel.countDocuments({ orgId, role: 'Worker', worker_status: 'Enabled' });
      const disabledWorkers = await UserModel.countDocuments({ orgId, role: 'Worker', worker_status: 'Disabled' });
      const availableWorkers = await UserModel.countDocuments({ orgId, role: 'Worker', worker_status: 'Enabled', availability_status: 'Available' });
      const unavailableWorkers = await UserModel.countDocuments({ orgId, role: 'Worker', worker_status: 'Enabled', availability_status: 'Unavailable' });

      // 3. Department Performance
      const departments = await DepartmentModel.find({ orgId }).lean();
      const departmentPerformance = [];

      for (const dept of departments) {
        const workersInDept = await UserModel.find({ orgId, department_id: dept._id }).select('_id').lean();
        const workerIds = workersInDept.map(w => w._id.toString());
        
        // Find tasks assigned to these workers
        const tasksCount = await TaskModel.countDocuments({ orgId, worker_id: { $in: workerIds } });
        const completedTasksCount = await TaskModel.countDocuments({ 
          orgId,
          worker_id: { $in: workerIds }, 
          task_status: { $in: ['Completed', 'Closed'] } 
        });

        departmentPerformance.push({
          departmentName: dept.name,
          departmentCode: dept.code,
          totalTasks: tasksCount,
          completedTasks: completedTasksCount,
          workersCount: workerIds.length
        });
      }

      // 4. Average Completion Time (in minutes) for completed tasks
      const completedTasks = await TaskModel.find({
        orgId,
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

      // 5. Worker Productivity
      const workers = await UserModel.find({ orgId, role: 'Worker' }).lean();
      const workerProductivity = [];
      for (const w of workers) {
        const completedCount = await TaskModel.countDocuments({
          orgId,
          worker_id: w._id.toString(),
          task_status: { $in: ['Completed', 'Closed'] }
        });
        const activeCount = await TaskModel.countDocuments({
          orgId,
          worker_id: w._id.toString(),
          task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
        });
        workerProductivity.push({
          name: w.name,
          phone: w.phone,
          completed: completedCount,
          active: activeCount
        });
      }
      workerProductivity.sort((a, b) => b.completed - a.completed);
      const topWorkers = workerProductivity.slice(0, 5);

      // 6. 7-Day Completion & Creation Trends
      const tasksCreatedTrend = [];
      const tasksCompletedTrend = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date();
        dayEnd.setDate(dayEnd.getDate() - i);
        dayEnd.setHours(23, 59, 59, 999);

        const createdCount = await TaskModel.countDocuments({
          orgId,
          createdAt: { $gte: dayStart, $lte: dayEnd }
        });

        const completedCount = await TaskModel.countDocuments({
          orgId,
          task_status: { $in: ['Completed', 'Closed'] },
          completed_time: { $gte: dayStart, $lte: dayEnd }
        });

        const label = dayStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        tasksCreatedTrend.push({ label, count: createdCount });
        tasksCompletedTrend.push({ label, count: completedCount });
      }

      // 7. Reminders and Escalations stats
      const { ActivityLogModel } = require('../models/ActivityLog');
      const remindersSent = await ActivityLogModel.countDocuments({
        orgId,
        action: { $regex: /Reminder/i }
      });
      const escalationsCount = await ActivityLogModel.countDocuments({
        orgId,
        action: { $regex: /Escalat/i }
      });

      res.status(200).json({
        tasks: {
          total: totalTasks,
          open,
          started,
          details,
          completed,
          closed,
          overdue,
          escalated
        },
        workers: {
          enabled: enabledWorkers,
          disabled: disabledWorkers,
          available: availableWorkers,
          unavailable: unavailableWorkers
        },
        departmentPerformance,
        avgCompletionMinutes,
        topWorkers,
        tasksCreatedTrend,
        tasksCompletedTrend,
        remindersSent,
        escalationsCount
      });
    } catch (error) {
      next(error);
    }
  }

  async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = (req as AuthRequest).orgId || 'default';
      const tasks = await TaskModel.find({ orgId }).sort({ createdAt: -1 }).lean();

      // Formulate CSV header & content
      const headers = ['Task ID', 'Worker Name', 'Task Message', 'Location', 'Deadline', 'Status', 'Overdue', 'Escalated', 'Created At', 'Completed At'];
      const rows = tasks.map(t => [
        t.taskId || t._id.toString(),
        t.worker_name || 'N/A',
        `"${(t.task_msg || '').replace(/"/g, '""')}"`,
        `"${(t.location || 'N/A').replace(/"/g, '""')}"`,
        t.deadline ? new Date(t.deadline).toLocaleString('en-IN') : 'N/A',
        t.task_status,
        t.is_overdue ? 'Yes' : 'No',
        t.is_escalated ? 'Yes' : 'No',
        t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN') : 'N/A',
        t.completed_time ? new Date(t.completed_time).toLocaleString('en-IN') : 'N/A'
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=setu_ai_analytics_report.csv');
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
