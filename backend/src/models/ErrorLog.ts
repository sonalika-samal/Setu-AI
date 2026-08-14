import { Schema, model } from 'mongoose';

const ErrorLogSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    code: { type: String, required: true, default: 'RESOURCE_NOT_FOUND' },
    message: { type: String, required: true },
    status: { type: Number, required: true, default: 500 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ErrorLogModel = model('ErrorLog', ErrorLogSchema);
export default ErrorLogModel;
