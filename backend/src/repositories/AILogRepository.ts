import { AILogModel } from '../models/AILog';

export class AILogRepository {
  async create(data: {
    prompt: string;
    response: string;
    provider: string;
    model: string;
    execution_time: number;
    timestamp?: Date;
  }) {
    const doc = new AILogModel(data);
    return doc.save();
  }

  async findAll(limit: number = 100) {
    return AILogModel.find()
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}
