import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    username: { type: String, required: true, index: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Owner', 'Worker', 'SuperAdmin'], default: 'Owner' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },

    // Phase 5 Enterprise attributes
    department_id: { type: Schema.Types.ObjectId, ref: 'Department' },
    department_name: { type: String, default: '' },
    worker_status: { type: String, enum: ['Enabled', 'Disabled'], default: 'Enabled' },
    account_status: { type: String, enum: ['Enabled', 'Disabled'], default: 'Enabled' },
    token_version: { type: Number, default: 0 },

    // Attendance & Availability
    availability_status: { type: String, enum: ['Available', 'Unavailable'], default: 'Unavailable' },
    check_in_time: { type: Date },
    check_out_time: { type: Date },
    last_seen: { type: Date },
    last_activity: { type: String, default: '' },
    availability_reason: { type: String, default: '' },
    availability_history: [
      {
        previous_status: { type: String },
        new_status: { type: String },
        changed_by: { type: String },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: '' }
      }
    ],
    pending_proof: {
      media_url: { type: String },
      media_type: { type: String },
      file_name: { type: String },
      uploaded_at: { type: Date }
    }
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password helper method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Indexes
UserSchema.index({ username: 1, orgId: 1 }, { unique: true });
UserSchema.index({ phone: 1, orgId: 1 });
UserSchema.index({ role: 1, orgId: 1 });
UserSchema.index({ availability_status: 1, last_seen: 1 });

export const UserModel = model('User', UserSchema);
export default UserModel;
