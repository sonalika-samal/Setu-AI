import { TaskTimelineModel } from '../models/TaskTimeline';

export class TaskTimelineRepository {
  async create(data: {
    orgId?: string;
    task_id: string;
    action: string;
    description?: string;
    performed_by: string;
    timestamp?: Date;
  }) {
    const doc = new TaskTimelineModel({ orgId: data.orgId || 'default', ...data });
    return doc.save();
  }

  async findByTaskId(taskId: string) {
    return TaskTimelineModel.find({ task_id: taskId }).sort({ timestamp: -1 });
  }

  async findAll(orgId: string = 'default') {
    return TaskTimelineModel.find({ orgId }).sort({ timestamp: -1 });
  }
}
