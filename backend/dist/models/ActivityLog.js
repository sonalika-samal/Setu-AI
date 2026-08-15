"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogModel = void 0;
const mongoose_1 = require("mongoose");
const ActivityLogSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    username: { type: String, required: true, index: true },
    action: { type: String, required: true },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
// Indexes
ActivityLogSchema.index({ orgId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ timestamp: -1 });
exports.ActivityLogModel = (0, mongoose_1.model)('ActivityLog', ActivityLogSchema);
exports.default = exports.ActivityLogModel;
