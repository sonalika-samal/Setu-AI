"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLogRepository = void 0;
const ErrorLog_1 = require("../models/ErrorLog");
class ErrorLogRepository {
    async create(data) {
        const doc = new ErrorLog_1.ErrorLogModel(data);
        return doc.save();
    }
    async findAll(limit = 100) {
        return ErrorLog_1.ErrorLogModel.find()
            .sort({ timestamp: -1 })
            .limit(limit);
    }
    async countErrors() {
        return ErrorLog_1.ErrorLogModel.countDocuments();
    }
    async clearAll() {
        return ErrorLog_1.ErrorLogModel.deleteMany({});
    }
}
exports.ErrorLogRepository = ErrorLogRepository;
