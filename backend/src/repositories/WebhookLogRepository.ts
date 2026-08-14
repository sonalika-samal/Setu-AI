import { WebhookLogModel } from '../models/WebhookLog';

export class WebhookLogRepository {
  async create(data: {
    sender_name?: string;
    sender_phone?: string;
    message_id?: string;
    message_type?: string;
    direction?: 'incoming' | 'outgoing';
    delivery_status?: string;
    timestamp?: Date;
    processing_status?: 'pending' | 'processed' | 'failed';
    payload: any;
  }) {
    const doc = new WebhookLogModel(data);
    return doc.save();
  }

  async findAll(limit: number = 100) {
    return WebhookLogModel.find()
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}
