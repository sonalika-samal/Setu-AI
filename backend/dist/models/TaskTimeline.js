"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTimelineModel = void 0;
const mongoose_1 = require("mongoose");
const TaskTimelineSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    task_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    action: { type: String, required: true }, // e.g., 'Task Created', 'Task Assigned', 'Worker Accepted', 'Reminder Sent', 'Task Completed'
    description: { type: String, default: '' },
    performed_by: { type: String, required: true }, // username or 'System'
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
exports.TaskTimelineModel = (0, mongoose_1.model)('TaskTimeline', TaskTimelineSchema);
exports.default = exports.TaskTimelineModel;
