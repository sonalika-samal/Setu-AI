"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const User_1 = require("../models/User");
class UserRepository {
    async findByUsername(username) {
        return User_1.UserModel.findOne({ username });
    }
    async findById(id) {
        return User_1.UserModel.findById(id);
    }
    async create(userData) {
        const user = new User_1.UserModel(userData);
        return user.save();
    }
    async exists(query) {
        const count = await User_1.UserModel.countDocuments(query);
        return count > 0;
    }
    async findAll() {
        return User_1.UserModel.find().sort({ createdAt: -1 });
    }
    async find(query) {
        return User_1.UserModel.find(query).sort({ name: 1 });
    }
    async delete(id) {
        return User_1.UserModel.findByIdAndDelete(id);
    }
}
exports.UserRepository = UserRepository;
