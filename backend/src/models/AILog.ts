import { Schema, model } from 'mongoose';

const AILogSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    prompt: { type: String, required: true },
    response: { type: String, required: false },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    execution_time: { type: Number, required: true }, // in milliseconds
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AILogModel = model('AILog', AILogSchema);
export default AILogModel;
