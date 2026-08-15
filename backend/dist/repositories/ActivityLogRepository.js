"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogRepository = void 0;
const ActivityLog_1 = require("../models/ActivityLog");
class ActivityLogRepository {
    async create(data) {
        const doc = new ActivityLog_1.ActivityLogModel({ orgId: data.orgId || 'default', ...data });
        return doc.save();
    }
    async findAll(limit = 100, orgId = 'default') {
        return ActivityLog_1.ActivityLogModel.find({ orgId })
            .sort({ timestamp: -1 })
            .limit(limit);
    }
}
exports.ActivityLogRepository = ActivityLogRepository;
