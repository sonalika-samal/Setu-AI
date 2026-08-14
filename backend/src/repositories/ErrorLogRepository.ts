import { ErrorLogModel } from '../models/ErrorLog';

export class ErrorLogRepository {
  async create(data: {
    code: string;
    message: string;
    status: number;
    timestamp?: Date;
  }) {
    const doc = new ErrorLogModel(data);
    return doc.save();
  }

  async findAll(limit: number = 100) {
    return ErrorLogModel.find()
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async countErrors(): Promise<number> {
    return ErrorLogModel.countDocuments();
  }

  async clearAll() {
    return ErrorLogModel.deleteMany({});
  }
}
