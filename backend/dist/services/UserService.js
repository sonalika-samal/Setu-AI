"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const UserRepository_1 = require("../repositories/UserRepository");
const logger_1 = require("../utils/logger");
function sanitizePhone(phone) {
    if (!phone)
        return '';
    // Remove all spaces, dashes, brackets, and non-digit/non-plus characters
    let cleaned = phone.replace(/[^0-9+]/g, '');
    // Standardize to +91XXXXXXXXXX format (E.164 for India)
    if (cleaned.startsWith('+')) {
        return cleaned;
    }
    if (cleaned.startsWith('0') && cleaned.length === 11) {
        return '+91' + cleaned.substring(1);
    }
    if (cleaned.length === 10) {
        return '+91' + cleaned;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return '+' + cleaned;
    }
    return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}
class UserService {
    userRepo = new UserRepository_1.UserRepository();
    async authenticate(username, pass) {
        logger_1.logger.info(`Authenticating user: ${username}`);
        const user = await this.userRepo.findByUsername(username);
        if (!user) {
            logger_1.logger.warn(`User not found: ${username}`);
            return null;
        }
        const isMatch = await user.comparePassword(pass);
        if (!isMatch) {
            logger_1.logger.warn(`Password mismatch for user: ${username}`);
            return null;
        }
        return {
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            phone: user.phone,
            role: user.role,
            status: user.status,
        };
    }
    async createUser(data) {
        logger_1.logger.info(`Creating user: ${data.username}`);
        const exists = await this.userRepo.exists({ username: data.username });
        if (exists) {
            throw new Error('User already exists');
        }
        return this.userRepo.create(data);
    }
    async getAllUsers() {
        return this.userRepo.findAll();
    }
    async getAllWorkers() {
        const workers = await this.userRepo.find({ role: 'Worker' });
        const { TaskModel } = require('../models/Task');
        const enrichedWorkers = [];
        for (const worker of workers) {
            const workerObj = worker.toObject ? worker.toObject() : worker;
            const activeTasksCount = await TaskModel.countDocuments({
                worker_phone: worker.phone,
                task_status: { $in: ['Open', 'Started', 'More Details Asked'] }
            });
            const completedTasksCount = await TaskModel.countDocuments({
                worker_phone: worker.phone,
                task_status: 'Completed'
            });
            enrichedWorkers.push({
                ...workerObj,
                activeTasksCount,
                completedTasksCount
            });
        }
        return enrichedWorkers;
    }
    async deleteWorker(id, performedBy) {
        const user = await this.userRepo.findById(id);
        if (!user)
            return false;
        // Delete user from DB
        await this.userRepo.delete(id);
        // Log action in activity logs
        const { LoggingService } = require('./LoggingService');
        const loggingService = new LoggingService();
        await loggingService.logActivity(performedBy, 'User Deleted', `Worker ${user.name} (${user.phone}) was deleted.`);
        return true;
    }
    async createWorker(data) {
        logger_1.logger.info(`Creating worker: ${data.name}`);
        const cleanPhone = sanitizePhone(data.phone);
        const exists = await this.userRepo.exists({
            $or: [
                { username: cleanPhone },
                { phone: cleanPhone }
            ]
        });
        if (exists) {
            throw new Error('User with this phone number already exists.');
        }
        return this.userRepo.create({
            username: cleanPhone,
            password: data.password || 'WorkerPassword123!',
            name: data.name,
            phone: cleanPhone,
            role: 'Worker',
            status: 'Active',
            availability_status: 'Unavailable'
        });
    }
    async updateWorker(id, data, performedBy) {
        const user = await this.userRepo.findById(id);
        if (!user || user.role !== 'Worker')
            return false;
        if (data.phone) {
            const cleanPhone = sanitizePhone(data.phone);
            if (cleanPhone !== user.phone) {
                const exists = await this.userRepo.exists({
                    _id: { $ne: id },
                    $or: [
                        { username: cleanPhone },
                        { phone: cleanPhone }
                    ]
                });
                if (exists) {
                    throw new Error('User with this phone number already exists.');
                }
                user.phone = cleanPhone;
                user.username = cleanPhone;
            }
        }
        if (data.name) {
            user.name = data.name;
        }
        await user.save();
        const { LoggingService } = require('./LoggingService');
        const loggingService = new LoggingService();
        await loggingService.logActivity(performedBy, 'User Updated', `Worker ${user.name} details were updated.`);
        return true;
    }
    async getAdminsOwners() {
        return this.userRepo.find({ role: { $in: ['Admin', 'Owner'] } });
    }
    async createAdminOwner(data) {
        logger_1.logger.info(`Creating admin/owner: ${data.username}`);
        const exists = await this.userRepo.exists({ username: data.username });
        if (exists) {
            throw new Error('User with this username already exists.');
        }
        return this.userRepo.create({
            username: data.username,
            password: data.password,
            name: data.name,
            phone: sanitizePhone(data.phone),
            role: data.role,
            status: 'Active'
        });
    }
    async updateAdminOwner(id, data, performedBy) {
        const user = await this.userRepo.findById(id);
        if (!user || !['Admin', 'Owner'].includes(user.role))
            return false;
        if (data.username && data.username !== user.username) {
            const exists = await this.userRepo.exists({
                _id: { $ne: id },
                username: data.username
            });
            if (exists) {
                throw new Error('Username is already taken.');
            }
            user.username = data.username;
        }
        if (data.phone) {
            user.phone = sanitizePhone(data.phone);
        }
        if (data.name)
            user.name = data.name;
        if (data.role)
            user.role = data.role;
        if (data.password)
            user.password = data.password;
        if (data.googleEmail !== undefined) {
            user.googleEmail = data.googleEmail.trim().toLowerCase();
        }
        await user.save();
        const { LoggingService } = require('./LoggingService');
        const loggingService = new LoggingService();
        await loggingService.logActivity(performedBy, 'User Updated', `${user.role} ${user.name} details were updated.`);
        return true;
    }
    async deleteAdminOwner(id, performedBy) {
        const user = await this.userRepo.findById(id);
        if (!user || !['Admin', 'Owner'].includes(user.role))
            return false;
        const currentUser = await this.userRepo.findByUsername(performedBy);
        if (currentUser && currentUser._id.toString() === id) {
            throw new Error('You cannot delete your own account.');
        }
        await this.userRepo.delete(id);
        const { LoggingService } = require('./LoggingService');
        const loggingService = new LoggingService();
        await loggingService.logActivity(performedBy, 'User Deleted', `${user.role} ${user.name} was deleted.`);
        return true;
    }
}
exports.UserService = UserService;
