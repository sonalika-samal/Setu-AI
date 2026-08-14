import { Schema, model } from 'mongoose';

const TaskTimelineSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    action: { type: String, required: true }, // e.g., 'Task Created', 'Task Assigned', 'Worker Accepted', 'Reminder Sent', 'Task Completed'
    description: { type: String, default: '' },
    performed_by: { type: String, required: true }, // username or 'System'
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const TaskTimelineModel = model('TaskTimeline', TaskTimelineSchema);
export default TaskTimelineModel;
