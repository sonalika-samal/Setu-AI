import { Schema, model } from 'mongoose';

const MessageLogSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    message_id: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    direction: { type: String, enum: ['incoming', 'outgoing'], required: true },
    type: { type: String, required: true, default: 'text' },
    message: { type: String, default: '' },
    status: { type: String, default: 'sent' },
    timestamp: { type: Date, default: Date.now },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task' },
  },
  { timestamps: true }
);

MessageLogSchema.index({ message_id: 1, orgId: 1 }, { unique: true });

export const MessageLogModel = model('MessageLog', MessageLogSchema);
export default MessageLogModel;
