import { TaskTimelineRepository } from '../repositories/TaskTimelineRepository';

export class TimelineService {
  private timelineRepo = new TaskTimelineRepository();

  async getTimelineForTask(taskId: string) {
    return this.timelineRepo.findByTaskId(taskId);
  }

  async getAllTimelines() {
    return this.timelineRepo.findAll();
  }

  async createTimelineEntry(data: {
    task_id: string;
    action: string;
    description?: string;
    performed_by: string;
  }) {
    return this.timelineRepo.create(data);
  }
}
