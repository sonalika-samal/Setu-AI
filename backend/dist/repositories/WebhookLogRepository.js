"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookLogRepository = void 0;
const WebhookLog_1 = require("../models/WebhookLog");
class WebhookLogRepository {
    async create(data) {
        const doc = new WebhookLog_1.WebhookLogModel(data);
        return doc.save();
    }
    async findAll(limit = 100) {
        return WebhookLog_1.WebhookLogModel.find()
            .sort({ timestamp: -1 })
            .limit(limit);
    }
}
exports.WebhookLogRepository = WebhookLogRepository;
