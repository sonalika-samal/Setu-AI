"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILogModel = void 0;
const mongoose_1 = require("mongoose");
const AILogSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    prompt: { type: String, required: true },
    response: { type: String, required: false },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    execution_time: { type: Number, required: true }, // in milliseconds
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
exports.AILogModel = (0, mongoose_1.model)('AILog', AILogSchema);
exports.default = exports.AILogModel;
