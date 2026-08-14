"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const Task_1 = require("../models/Task");
class TaskRepository {
    async create(taskData) {
        const doc = new Task_1.TaskModel(taskData);
        return doc.save();
    }
    async findById(id) {
        return Task_1.TaskModel.findById(id);
    }
    async findAll() {
        return Task_1.TaskModel.find().sort({ timestamp: -1 });
    }
    async countByStatus(task_status) {
        return Task_1.TaskModel.countDocuments({ task_status });
    }
    async countTotal() {
        return Task_1.TaskModel.countDocuments({});
    }
    async updateStatus(id, task_status) {
        return Task_1.TaskModel.findByIdAndUpdate(id, { $set: { task_status } }, { new: true });
    }
    async delete(id) {
        return Task_1.TaskModel.findByIdAndDelete(id);
    }
}
exports.TaskRepository = TaskRepository;
