"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true }, // e.g. Task Assigned, Task Completed, Task Started, Proof Uploaded, Reminder Sent, Reminder Failed, Task Escalated
    related_task: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Task' },
    related_worker: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    related_department: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Department' },
    read_status: { type: String, enum: ['Unread', 'Read'], default: 'Unread', index: true },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });
exports.NotificationModel = (0, mongoose_1.model)('Notification', NotificationSchema);
exports.default = exports.NotificationModel;
