import { ActivityLogModel } from '../models/ActivityLog';

export class ActivityLogRepository {
  async create(data: {
    orgId?: string;
    username: string;
    action: string;
    description?: string;
    timestamp?: Date;
  }) {
    const doc = new ActivityLogModel({ orgId: data.orgId || 'default', ...data });
    return doc.save();
  }

  async findAll(limit: number = 100, orgId: string = 'default') {
    return ActivityLogModel.find({ orgId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}
