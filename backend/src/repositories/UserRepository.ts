import { UserModel } from '../models/User';

export class UserRepository {
  async findByUsername(username: string) {
    return UserModel.findOne({ username });
  }

  async findById(id: string) {
    return UserModel.findById(id);
  }

  async create(userData: any) {
    const user = new UserModel(userData);
    return user.save();
  }

  async exists(query: any): Promise<boolean> {
    const count = await UserModel.countDocuments(query);
    return count > 0;
  }

  async findAll() {
    return UserModel.find().sort({ createdAt: -1 });
  }

  async find(query: any) {
    return UserModel.find(query).sort({ name: 1 });
  }

  async delete(id: string) {
    return UserModel.findByIdAndDelete(id);
  }
}
