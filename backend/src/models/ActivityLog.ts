import { Schema, model } from 'mongoose';

const ActivityLogSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    username: { type: String, required: true, index: true },
    action: { type: String, required: true },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
ActivityLogSchema.index({ orgId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ timestamp: -1 });

export const ActivityLogModel = model('ActivityLog', ActivityLogSchema);
export default ActivityLogModel;
