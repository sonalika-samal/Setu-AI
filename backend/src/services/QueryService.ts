import { TaskModel } from '../models/Task';
import { UserModel } from '../models/User';
import { ActivityLogModel } from '../models/ActivityLog';
import { logger } from '../utils/logger';

function escapeRegex(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export class QueryService {
  async executeQuery(operation: string, parameters: any = {}, orgId: string = 'default'): Promise<any> {
    logger.info(`QueryService: Executing operation ${operation} for org ${orgId} with params: ${JSON.stringify(parameters)}`);
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    try {
      switch (operation.toUpperCase()) {
        case 'GET_OPEN_TASKS':
          return await TaskModel.find({ orgId, task_status: 'Open' }).sort({ createdAt: -1 }).lean();

        case 'GET_COMPLETED_TASKS':
          return await TaskModel.find({ orgId, task_status: 'Completed' }).sort({ completed_time: -1 }).lean();

        case 'GET_STARTED_TASKS':
          return await TaskModel.find({ orgId, task_status: 'Started' }).sort({ started_time: -1 }).lean();

        case 'GET_WORKER_STATUS':
        case 'GET_WORKER_TASKS': {
          const workerName = parameters.workerName || '';
          if (!workerName) {
            return { error: 'No worker name specified.' };
          }
          
          // First, find the worker to get correct name
          const worker = await UserModel.findOne({
            orgId,
            name: { $regex: new RegExp(escapeRegex(workerName), 'i') },
            role: 'Worker'
          }).lean();

          const queryFilter: any = { orgId };
          if (worker) {
            queryFilter.worker_id = worker._id.toString();
          } else {
            queryFilter.worker_name = { $regex: new RegExp(escapeRegex(workerName), 'i') };
          }

          if (parameters.status) {
            queryFilter.task_status = parameters.status;
          }

          const tasks = await TaskModel.find(queryFilter).sort({ updatedAt: -1 }).lean();
          return {
            worker: worker || { name: workerName },
            availabilityStatus: worker ? (worker as any).availability_status : 'Unknown',
            checkInTime: worker ? (worker as any).check_in_time : null,
            checkOutTime: worker ? (worker as any).check_out_time : null,
            lastSeen: worker ? (worker as any).last_seen : null,
            lastActivity: worker ? (worker as any).last_activity : null,
            availabilityReason: worker ? (worker as any).availability_reason : null,
            availabilityHistory: worker ? (worker as any).availability_history : [],
            tasks
          };
        }

        case 'GET_OVERDUE_TASKS':
          return await TaskModel.find({
            orgId,
            task_status: { $nin: ['Completed', 'Closed'] },
            $or: [
              { is_overdue: true },
              { deadline: { $lt: new Date() } }
            ]
          }).sort({ deadline: 1 }).lean();

        case 'GET_CLOSED_TASKS':
          return await TaskModel.find({ orgId, task_status: 'Closed' }).sort({ closed_time: -1 }).lean();

        case 'GET_TODAY_TASKS':
          return await TaskModel.find({
            orgId,
            createdAt: { $gte: startOfToday }
          }).sort({ createdAt: -1 }).lean();

        case 'GET_PENDING_TASKS':
          return await TaskModel.find({
            orgId,
            task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
          }).sort({ createdAt: -1 }).lean();

        case 'GET_MORE_DETAILS_TASKS':
          return await TaskModel.find({
            orgId,
            task_status: 'More Details Asked'
          }).sort({ updatedAt: -1 }).lean();

        case 'GET_ACTIVITY_LOGS':
          return await ActivityLogModel.find({ orgId }).sort({ timestamp: -1 }).limit(20).lean();

        case 'GET_TASK_DETAILS': {
          const taskId = parameters.taskId;
          if (taskId) {
            const task = await TaskModel.findOne({ orgId, taskId }).lean();
            if (task) return task;

            const mongoose = require('mongoose');
            if (mongoose.Types.ObjectId.isValid(taskId)) {
              return await TaskModel.findOne({ orgId, _id: taskId }).lean();
            }
            return null;
          }
          const workerName = parameters.workerName || '';
          return await TaskModel.findOne({
            orgId,
            worker_name: { $regex: new RegExp(escapeRegex(workerName), 'i') }
          }).sort({ createdAt: -1 }).lean();
        }

        case 'GET_WORKER_SUMMARY': {
          const workers = await UserModel.find({ orgId, role: 'Worker' }).lean();
          const summary = [];
          for (const worker of workers) {
            const workerObj = worker as any;
            const activeCount = await TaskModel.countDocuments({
              orgId,
              worker_id: worker._id.toString(),
              task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
            });
            const completedCount = await TaskModel.countDocuments({
              orgId,
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
          const total = await TaskModel.countDocuments({ orgId });
          const open = await TaskModel.countDocuments({ orgId, task_status: 'Open' });
          const started = await TaskModel.countDocuments({ orgId, task_status: 'Started' });
          const details = await TaskModel.countDocuments({ orgId, task_status: 'More Details Asked' });
          const completed = await TaskModel.countDocuments({ orgId, task_status: 'Completed' });
          const closed = await TaskModel.countDocuments({ orgId, task_status: 'Closed' });
          const overdue = await TaskModel.countDocuments({
            orgId,
            task_status: { $nin: ['Completed', 'Closed'] },
            $or: [
              { is_overdue: true },
              { deadline: { $lt: new Date() } }
            ]
          });
          const escalated = await TaskModel.countDocuments({
            orgId,
            task_status: { $nin: ['Completed', 'Closed'] },
            is_escalated: true
          });
          const online = await UserModel.countDocuments({ orgId, role: 'Worker', status: 'Active' });
          const offline = await UserModel.countDocuments({ orgId, role: 'Worker', status: 'Inactive' });
          const activeToday = await TaskModel.countDocuments({
            orgId,
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
          return await DepartmentModel.find({ orgId }).sort({ name: 1 }).lean();
        }

        case 'GET_NOTIFICATIONS': {
          const { NotificationModel } = require('../models/Notification');
          return await NotificationModel.find({ orgId }).sort({ timestamp: -1 }).limit(10).lean();
        }

        case 'GET_PROOF_OF_WORK': {
          const taskId = parameters.taskId;
          if (taskId) {
            const task = await TaskModel.findOne({ orgId, taskId }).select('taskId worker_name proof_of_work').lean();
            return task ? (task as any).proof_of_work : [];
          }
          const tasksWithProof = await TaskModel.find({ orgId, 'proof_of_work.0': { $exists: true } })
            .select('taskId worker_name proof_of_work')
            .sort({ updatedAt: -1 })
            .lean();
          
          const allProofs = [];
          for (const t of tasksWithProof) {
            for (const p of (t as any).proof_of_work) {
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
          return await SecurityLogModel.find({ orgId }).sort({ timestamp: -1 }).limit(20).lean();
        }

        case 'GET_REPORTS': {
          const totalTasks = await TaskModel.countDocuments({ orgId });
          const completed = await TaskModel.countDocuments({ orgId, task_status: 'Completed' });
          const open = await TaskModel.countDocuments({ orgId, task_status: 'Open' });
          const started = await TaskModel.countDocuments({ orgId, task_status: 'Started' });
          const details = await TaskModel.countDocuments({ orgId, task_status: 'More Details Asked' });
          const closed = await TaskModel.countDocuments({ orgId, task_status: 'Closed' });
          const overdue = await TaskModel.countDocuments({
            orgId,
            task_status: { $nin: ['Completed', 'Closed'] },
            deadline: { $lt: new Date() }
          });
          const activeWorkers = await UserModel.countDocuments({ orgId, role: 'Worker', worker_status: 'Enabled' });
          const disabledWorkers = await UserModel.countDocuments({ orgId, role: 'Worker', worker_status: 'Disabled' });
          
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
          logger.warn(`QueryService: Unknown operation ${operation}`);
          return { error: `Operation ${operation} is not supported.` };
      }
    } catch (err: any) {
      logger.error(`QueryService Error for operation ${operation}: ${err.message}`);
      return { error: err.message };
    }
  }
}

export default QueryService;
