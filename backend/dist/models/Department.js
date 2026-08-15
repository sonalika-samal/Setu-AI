"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentModel = void 0;
const mongoose_1 = require("mongoose");
const DepartmentSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    name: { type: String, required: true, index: true },
    code: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    created_by: { type: String, default: 'system' }
}, { timestamps: true });
DepartmentSchema.index({ name: 1, orgId: 1 }, { unique: true });
DepartmentSchema.index({ code: 1, orgId: 1 }, { unique: true });
exports.DepartmentModel = (0, mongoose_1.model)('Department', DepartmentSchema);
exports.default = exports.DepartmentModel;
