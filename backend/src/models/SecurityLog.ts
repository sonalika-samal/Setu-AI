import { Schema, model } from 'mongoose';

const SecurityLogSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    user_id: { type: String, default: '' },
    username: { type: String, default: 'system', index: true },
    action: { type: String, required: true }, // e.g. Password Changed, Password Reset, Force Logout, Rate Limit Exceeded, Account Disabled, Account Enabled
    ip_address: { type: String, default: '' },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true }
  }
);

export const SecurityLogModel = model('SecurityLog', SecurityLogSchema);
export default SecurityLogModel;
