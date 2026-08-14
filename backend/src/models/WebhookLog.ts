import { Schema, model } from 'mongoose';

const WebhookLogSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    sender_name: { type: String, default: '' },
    sender_phone: { type: String, default: '' },
    message_id: { type: String, default: '' },
    message_type: { type: String, default: '' },
    direction: { type: String, enum: ['incoming', 'outgoing'], default: 'incoming' },
    delivery_status: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    processing_status: {
      type: String,
      enum: ['received', 'processing', 'ai_processing', 'task_created', 'worker_notified', 'completed', 'failed', 'ignored'],
      default: 'received',
    },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const WebhookLogModel = model('WebhookLog', WebhookLogSchema);
export default WebhookLogModel;
