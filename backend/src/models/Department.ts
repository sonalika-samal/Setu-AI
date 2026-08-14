import { Schema, model } from 'mongoose';

const DepartmentSchema = new Schema(
  {
    orgId: { type: String, required: true, default: 'default', index: true },
    name: { type: String, required: true, index: true },
    code: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    created_by: { type: String, default: 'system' }
  },
  { timestamps: true }
);

DepartmentSchema.index({ name: 1, orgId: 1 }, { unique: true });
DepartmentSchema.index({ code: 1, orgId: 1 }, { unique: true });

export const DepartmentModel = model('Department', DepartmentSchema);
export default DepartmentModel;
