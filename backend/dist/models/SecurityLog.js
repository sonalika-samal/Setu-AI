"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLogModel = void 0;
const mongoose_1 = require("mongoose");
const SecurityLogSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    user_id: { type: String, default: '' },
    username: { type: String, default: 'system', index: true },
    action: { type: String, required: true }, // e.g. Password Changed, Password Reset, Force Logout, Rate Limit Exceeded, Account Disabled, Account Enabled
    ip_address: { type: String, default: '' },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true }
});
exports.SecurityLogModel = (0, mongoose_1.model)('SecurityLog', SecurityLogSchema);
exports.default = exports.SecurityLogModel;
