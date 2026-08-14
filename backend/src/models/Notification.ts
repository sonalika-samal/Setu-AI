import { Schema, model } from 'mongoose';

const NotificationSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true }, // e.g. Task Assigned, Task Completed, Task Started, Proof Uploaded, Reminder Sent, Reminder Failed, Task Escalated
    related_task: { type: Schema.Types.ObjectId, ref: 'Task' },
    related_worker: { type: Schema.Types.ObjectId, ref: 'User' },
    related_department: { type: Schema.Types.ObjectId, ref: 'Department' },
    read_status: { type: String, enum: ['Unread', 'Read'], default: 'Unread', index: true },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export const NotificationModel = model('Notification', NotificationSchema);
export default NotificationModel;
