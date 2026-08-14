"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineService = void 0;
const TaskTimelineRepository_1 = require("../repositories/TaskTimelineRepository");
class TimelineService {
    timelineRepo = new TaskTimelineRepository_1.TaskTimelineRepository();
    async getTimelineForTask(taskId) {
        return this.timelineRepo.findByTaskId(taskId);
    }
    async getAllTimelines() {
        return this.timelineRepo.findAll();
    }
    async createTimelineEntry(data) {
        return this.timelineRepo.create(data);
    }
}
exports.TimelineService = TimelineService;
