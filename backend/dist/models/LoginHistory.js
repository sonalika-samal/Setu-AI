"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginHistoryModel = void 0;
const mongoose_1 = require("mongoose");
const LoginHistorySchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, index: true },
    ip_address: { type: String, default: '' },
    user_agent: { type: String, default: '' },
    status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    timestamp: { type: Date, default: Date.now, index: true }
});
exports.LoginHistoryModel = (0, mongoose_1.model)('LoginHistory', LoginHistorySchema);
exports.default = exports.LoginHistoryModel;
