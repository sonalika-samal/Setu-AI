"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILogRepository = void 0;
const AILog_1 = require("../models/AILog");
class AILogRepository {
    async create(data) {
        const doc = new AILog_1.AILogModel(data);
        return doc.save();
    }
    async findAll(limit = 100) {
        return AILog_1.AILogModel.find()
            .sort({ timestamp: -1 })
            .limit(limit);
    }
}
exports.AILogRepository = AILogRepository;
