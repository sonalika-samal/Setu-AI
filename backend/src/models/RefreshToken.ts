import { Schema, model } from 'mongoose';

const RefreshTokenSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true, index: true },
    expires_at: { type: Date, required: true, index: true },
    ip_address: { type: String, default: '127.0.0.1' },
    user_agent: { type: String, default: 'Unknown Browser' },
    created_at: { type: Date, default: Date.now }
  }
);

export const RefreshTokenModel = model('RefreshToken', RefreshTokenSchema);
export default RefreshTokenModel;
