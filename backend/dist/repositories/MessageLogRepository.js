"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageLogRepository = void 0;
const MessageLog_1 = require("../models/MessageLog");
class MessageLogRepository {
    async create(data) {
        const doc = new MessageLog_1.MessageLogModel(data);
        return doc.save();
    }
    async findAll(limit = 100) {
        return MessageLog_1.MessageLogModel.find()
            .sort({ timestamp: -1 })
            .limit(limit);
    }
}
exports.MessageLogRepository = MessageLogRepository;
