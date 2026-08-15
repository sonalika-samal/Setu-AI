"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTimelineRepository = void 0;
const TaskTimeline_1 = require("../models/TaskTimeline");
class TaskTimelineRepository {
    async create(data) {
        const doc = new TaskTimeline_1.TaskTimelineModel({ orgId: data.orgId || 'default', ...data });
        return doc.save();
    }
    async findByTaskId(taskId) {
        return TaskTimeline_1.TaskTimelineModel.find({ task_id: taskId }).sort({ timestamp: -1 });
    }
    async findAll(orgId = 'default') {
        return TaskTimeline_1.TaskTimelineModel.find({ orgId }).sort({ timestamp: -1 });
    }
}
exports.TaskTimelineRepository = TaskTimelineRepository;
