"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookLogModel = void 0;
const mongoose_1 = require("mongoose");
const WebhookLogSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    sender_name: { type: String, default: '' },
    sender_phone: { type: String, default: '' },
    message_id: { type: String, default: '' },
    message_type: { type: String, default: '' },
    direction: { type: String, enum: ['incoming', 'outgoing'], default: 'incoming' },
    delivery_status: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    processing_status: {
        type: String,
        enum: ['received', 'processing', 'ai_processing', 'task_created', 'worker_notified', 'completed', 'failed', 'ignored'],
        default: 'received',
    },
    payload: { type: mongoose_1.Schema.Types.Mixed, required: true },
}, { timestamps: true });
exports.WebhookLogModel = (0, mongoose_1.model)('WebhookLog', WebhookLogSchema);
exports.default = exports.WebhookLogModel;
