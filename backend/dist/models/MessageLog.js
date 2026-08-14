"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageLogModel = void 0;
const mongoose_1 = require("mongoose");
const MessageLogSchema = new mongoose_1.Schema({
    message_id: { type: String, required: true, unique: true, index: true },
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    direction: { type: String, enum: ['incoming', 'outgoing'], required: true },
    type: { type: String, required: true, default: 'text' },
    message: { type: String, default: '' },
    status: { type: String, default: 'sent' },
    timestamp: { type: Date, default: Date.now },
    task_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Task' },
}, { timestamps: true });
exports.MessageLogModel = (0, mongoose_1.model)('MessageLog', MessageLogSchema);
exports.default = exports.MessageLogModel;
