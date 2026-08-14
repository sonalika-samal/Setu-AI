import { MessageLogModel } from '../models/MessageLog';

export class MessageLogRepository {
  async create(data: {
    orgId?: string;
    message_id: string;
    sender: string;
    receiver: string;
    direction: 'incoming' | 'outgoing';
    type: string;
    message: string;
    status?: string;
    timestamp?: Date;
    task_id?: string;
  }) {
    const doc = new MessageLogModel({ orgId: data.orgId || 'default', ...data });
    return doc.save();
  }

  async findAll(limit: number = 100, orgId: string = 'default') {
    return MessageLogModel.find({ orgId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}
