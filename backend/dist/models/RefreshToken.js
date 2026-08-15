"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenModel = void 0;
const mongoose_1 = require("mongoose");
const RefreshTokenSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, default: 'default', index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true, index: true },
    expires_at: { type: Date, required: true, index: true },
    ip_address: { type: String, default: '127.0.0.1' },
    user_agent: { type: String, default: 'Unknown Browser' },
    created_at: { type: Date, default: Date.now }
});
exports.RefreshTokenModel = (0, mongoose_1.model)('RefreshToken', RefreshTokenSchema);
exports.default = exports.RefreshTokenModel;
