"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const Task_1 = require("../models/Task");
class TaskRepository {
    async create(taskData) {
        const doc = new Task_1.TaskModel({ orgId: taskData.orgId || 'default', ...taskData });
        return doc.save();
    }
    async findById(id, orgId) {
        const query = { _id: id };
        if (orgId)
            query.orgId = orgId;
        return Task_1.TaskModel.findOne(query);
    }
    async findAll(orgId = 'default') {
        return Task_1.TaskModel.find({ orgId }).sort({ timestamp: -1 });
    }
    async countByStatus(task_status, orgId = 'default') {
        return Task_1.TaskModel.countDocuments({ orgId, task_status });
    }
    async countTotal(orgId = 'default') {
        return Task_1.TaskModel.countDocuments({ orgId });
    }
    async updateStatus(id, task_status, orgId) {
        const query = { _id: id };
        if (orgId)
            query.orgId = orgId;
        return Task_1.TaskModel.findOneAndUpdate(query, { $set: { task_status } }, { new: true });
    }
    async delete(id, orgId) {
        const query = { _id: id };
        if (orgId)
            query.orgId = orgId;
        return Task_1.TaskModel.findOneAndDelete(query);
    }
}
exports.TaskRepository = TaskRepository;
