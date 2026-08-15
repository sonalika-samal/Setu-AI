"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLogModel = void 0;
const mongoose_1 = require("mongoose");
const ErrorLogSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    code: { type: String, required: true, default: 'RESOURCE_NOT_FOUND' },
    message: { type: String, required: true },
    status: { type: Number, required: true, default: 500 },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
exports.ErrorLogModel = (0, mongoose_1.model)('ErrorLog', ErrorLogSchema);
exports.default = exports.ErrorLogModel;
