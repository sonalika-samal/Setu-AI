import { Schema, model } from 'mongoose';

const LoginHistorySchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, index: true },
    ip_address: { type: String, default: '' },
    user_agent: { type: String, default: '' },
    status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    timestamp: { type: Date, default: Date.now, index: true }
  }
);

export const LoginHistoryModel = model('LoginHistory', LoginHistorySchema);
export default LoginHistoryModel;
