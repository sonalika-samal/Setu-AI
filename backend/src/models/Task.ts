import { Schema, model } from 'mongoose';

const TaskSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    worker_name: { type: String, default: '' },
    task_msg: { type: String, required: true },
    location: { type: String, default: '' },
    deadline: { type: Date },
    deadline_exact: { type: Boolean, default: false },
    task_status: {
      type: String,
      enum: ['Open', 'Started', 'More Details Asked', 'Completed', 'Closed'],
      default: 'Open',
    },
    timestamp: { type: Date, default: Date.now },
    from_number: { type: String, default: '' },
    worker_id: { type: String, default: '' },
    worker_phone: { type: String, default: '' },
    reminder_time: { type: Date },
    reminder_sent: { type: Boolean, default: false },
    message_id: { type: String, default: '' },
    taskId: { type: String, sparse: true, index: true },
    is_overdue: { type: Boolean, default: false },
    is_escalated: { type: Boolean, default: false },
    
    // Phase 3 tracking fields
    owner_name: { type: String, default: '' },
    owner_phone: { type: String, default: '' },
    priority: { type: String, default: 'Medium' }, // Low, Medium, High
    started_time: { type: Date },
    completed_time: { type: Date },
    last_worker_reply: { type: String, default: '' },
    processing_status: { type: String, default: 'pending' },
    closed_by: { type: String, default: '' },
    closed_time: { type: Date },
    closing_notes: { type: String, default: '' },
    notes: { type: String, default: '' },

    // Status history
    status_history: [
      {
        previous_status: { type: String },
        new_status: { type: String },
        changed_by: { type: String },
        timestamp: { type: Date, default: Date.now },
        remarks: { type: String, default: '' }
      }
    ],

    // Phase 5: Proof of Work Gallery
    proof_of_work: [
      {
        media_url: { type: String, required: true },
        media_type: { type: String, required: true },
        file_name: { type: String },
        uploaded_by: { type: String },
        uploaded_at: { type: Date, default: Date.now },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        review_notes: { type: String, default: '' },
        reviewed_by: { type: String },
        reviewed_at: { type: Date },
        approval_history: [
          {
            status: { type: String },
            changed_by: { type: String },
            timestamp: { type: Date, default: Date.now },
            remarks: { type: String }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

// Indexes
TaskSchema.index({ taskId: 1, orgId: 1 }, { unique: true, sparse: true });
TaskSchema.index({ orgId: 1, task_status: 1 });
TaskSchema.index({ worker_id: 1, task_status: 1 });
TaskSchema.index({ task_status: 1, deadline: 1 });
TaskSchema.index({ task_status: 1, createdAt: -1 });
TaskSchema.index({ task_status: 1, updatedAt: -1 });
TaskSchema.index({ "proof_of_work._id": 1 });
TaskSchema.index({ deadline_exact: 1 });
TaskSchema.index({ reminder_time: 1 });
TaskSchema.index({ timestamp: 1 });
TaskSchema.index({ is_overdue: 1, is_escalated: 1 });
TaskSchema.index({ worker_phone: 1, task_status: 1 });

export const TaskModel = model('Task', TaskSchema);
export default TaskModel;
