import { TaskModel } from '../models/Task';

export interface ITask {
  id?: string;
  worker_name?: string;
  task_msg: string;
  location?: string;
  deadline?: Date;
  deadline_exact?: boolean;
  task_status: 'Open' | 'Started' | 'More Details Asked' | 'Completed';
  timestamp?: Date;
  from_number?: string;
  worker_id?: string;
  worker_phone?: string;
  reminder_time?: Date;
  reminder_sent?: boolean;
  message_id?: string;
  owner_name?: string;
  owner_phone?: string;
  priority?: string;
  started_time?: Date;
  completed_time?: Date;
  last_worker_reply?: string;
  processing_status?: string;
}

export class TaskRepository {
  async create(taskData: Partial<ITask> & { orgId?: string }) {
    const doc = new TaskModel({ orgId: taskData.orgId || 'default', ...taskData });
    return doc.save();
  }

  async findById(id: string, orgId?: string) {
    const query: any = { _id: id };
    if (orgId) query.orgId = orgId;
    return TaskModel.findOne(query);
  }

  async findAll(orgId: string = 'default') {
    return TaskModel.find({ orgId }).sort({ timestamp: -1 });
  }

  async countByStatus(task_status: 'Open' | 'Started' | 'More Details Asked' | 'Completed', orgId: string = 'default'): Promise<number> {
    return TaskModel.countDocuments({ orgId, task_status });
  }

  async countTotal(orgId: string = 'default'): Promise<number> {
    return TaskModel.countDocuments({ orgId });
  }

  async updateStatus(id: string, task_status: 'Open' | 'Started' | 'More Details Asked' | 'Completed', orgId?: string) {
    const query: any = { _id: id };
    if (orgId) query.orgId = orgId;
    return TaskModel.findOneAndUpdate(query, { $set: { task_status } }, { new: true });
  }

  async delete(id: string, orgId?: string) {
    const query: any = { _id: id };
    if (orgId) query.orgId = orgId;
    return TaskModel.findOneAndDelete(query);
  }
}
