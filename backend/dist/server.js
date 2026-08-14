"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config/config");
const logger_1 = require("./utils/logger");
const UserRepository_1 = require("./repositories/UserRepository");
const CredentialRepository_1 = require("./repositories/CredentialRepository");
const Credential_1 = require("./models/Credential");
const Task_1 = require("./models/Task");
const User_1 = require("./models/User");
const Department_1 = require("./models/Department");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const LogCleanupService_1 = require("./services/LogCleanupService");
const ReminderService_1 = require("./services/ReminderService");
const InactivityChecker_1 = require("./services/InactivityChecker");
let server;
let io;
const PORT = config_1.config.port;
const userRepo = new UserRepository_1.UserRepository();
const credentialRepo = new CredentialRepository_1.CredentialRepository();
async function seedDatabase() {
    try {
        // 1. Seed default Credentials document if it doesn't exist
        const credentialsExists = await Credential_1.CredentialModel.findOne({ key: 'global_config' });
        if (!credentialsExists) {
            logger_1.logger.info('Seeding default credentials into MongoDB...');
            const defaultCreds = await credentialRepo.getCredentials();
            await credentialRepo.updateCredentials(defaultCreds);
        }
        else {
            // Synchronize key changes from .env to database in development
            const currentCreds = await credentialRepo.getCredentials();
            let hasUpdates = false;
            if (!currentCreds.sarvam.apiKey && config_1.config.sarvam.apiKey) {
                currentCreds.sarvam.apiKey = config_1.config.sarvam.apiKey;
                hasUpdates = true;
            }
            if (!currentCreds.meta.accessToken && config_1.config.meta.accessToken) {
                currentCreds.meta.accessToken = config_1.config.meta.accessToken;
                hasUpdates = true;
            }
            if (hasUpdates) {
                logger_1.logger.info('Syncing new secrets from .env into MongoDB credentials document...');
                await credentialRepo.updateCredentials(currentCreds);
            }
            else {
                logger_1.logger.info('Credentials config loaded and verified.');
            }
        }
        // 2. Seed default Administrator User (Username-based)
        const adminUsername = config_1.config.defaultAdmin.username || 'admin';
        const adminExists = await userRepo.exists({ username: adminUsername });
        if (!adminExists) {
            logger_1.logger.info(`Seeding default administrator user: ${adminUsername}`);
            await userRepo.create({
                username: adminUsername,
                password: config_1.config.defaultAdmin.password || 'AdminPassword123!',
                name: 'Sahayak Admin',
                phone: '+919999999999',
                role: 'Admin',
                status: 'Active',
            });
            logger_1.logger.info('Administrator user seeded successfully.');
        }
        else {
            logger_1.logger.info(`Administrator user already exists: ${adminUsername}`);
        }
        // 3. Seed default Owner User (Username-based)
        const ownerUsername = 'owner';
        const ownerExists = await userRepo.exists({ username: ownerUsername });
        if (!ownerExists) {
            logger_1.logger.info(`Seeding default owner user: ${ownerUsername}`);
            await userRepo.create({
                username: ownerUsername,
                password: 'OwnerPassword123!',
                name: 'Sahayak Owner',
                phone: '+918888888888',
                role: 'Owner',
                status: 'Active',
            });
            logger_1.logger.info('Owner user seeded successfully.');
        }
        else {
            logger_1.logger.info(`Owner user already exists: ${ownerUsername}`);
        }
    }
    catch (error) {
        logger_1.logger.error(`Error seeding database: ${error.message}`);
    }
}
async function migrateTaskIds() {
    try {
        const tasksWithoutId = await Task_1.TaskModel.find({ taskId: { $exists: false } });
        if (tasksWithoutId.length > 0) {
            logger_1.logger.info(`[Migration]: Found ${tasksWithoutId.length} tasks without taskId. Migrating...`);
            for (const task of tasksWithoutId) {
                const date = task.createdAt || task.timestamp || new Date();
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const dateStr = `${day}${month}${year}`;
                // Find existing tasks on that date to resolve next running suffix
                const tasksOnDate = await Task_1.TaskModel.find({
                    taskId: new RegExp(`^${dateStr}T`)
                }).select('taskId').lean();
                let maxNumber = 0;
                for (const t of tasksOnDate) {
                    if (t.taskId) {
                        const parts = t.taskId.split('T');
                        const num = parseInt(parts[1], 10);
                        if (!isNaN(num) && num > maxNumber) {
                            maxNumber = num;
                        }
                    }
                }
                const nextNum = maxNumber + 1;
                const generatedId = `${dateStr}T${nextNum}`;
                task.taskId = generatedId;
                await task.save();
                logger_1.logger.info(`[Migration]: Assigned taskId ${generatedId} to task ${task._id}`);
            }
            logger_1.logger.info('[Migration]: Task ID migration completed successfully.');
        }
    }
    catch (err) {
        logger_1.logger.error(`[Migration]: Task ID migration failed: ${err.message}`);
    }
}
async function normalizeDatabaseRecords() {
    try {
        logger_1.logger.info('[Migration]: Starting database records normalization...');
        // 0. Seed default "Other" department
        let otherDept = await Department_1.DepartmentModel.findOne({ code: 'OTHER' });
        if (!otherDept) {
            logger_1.logger.info('[Migration]: Seeding default "Other" department...');
            otherDept = await Department_1.DepartmentModel.create({
                name: 'Other',
                code: 'OTHER',
                description: 'Default System Department',
                status: 'Active',
                created_by: 'system'
            });
        }
        // 1. Find and normalize all users (Workers, Admins, Owners)
        const allUsers = await User_1.UserModel.find();
        for (const user of allUsers) {
            let updated = false;
            // Normalize role casing to match Mongoose enum values (Admin, Owner, Worker)
            const roleLower = user.role ? user.role.toLowerCase() : '';
            let correctRole = user.role;
            if (roleLower === 'owner')
                correctRole = 'Owner';
            else if (roleLower === 'admin')
                correctRole = 'Admin';
            else if (roleLower === 'worker')
                correctRole = 'Worker';
            if (user.role !== correctRole) {
                logger_1.logger.info(`[Migration]: Normalizing role for user ${user.name} from "${user.role}" to "${correctRole}"`);
                user.role = correctRole;
                updated = true;
            }
            if (user.role === 'Worker' && !user.department_id) {
                logger_1.logger.info(`[Migration]: Assigning worker ${user.name} to "Other" department`);
                user.department_id = otherDept._id;
                user.department_name = otherDept.name;
                updated = true;
            }
            if (user.phone) {
                let cleaned = user.phone.replace(/[^0-9+]/g, '');
                let cleanPhone = cleaned;
                if (!cleaned.startsWith('+')) {
                    if (cleaned.startsWith('0') && cleaned.length === 11) {
                        cleanPhone = '+91' + cleaned.substring(1);
                    }
                    else if (cleaned.length === 10) {
                        cleanPhone = '+91' + cleaned;
                    }
                    else if (cleaned.length === 12 && cleaned.startsWith('91')) {
                        cleanPhone = '+' + cleaned;
                    }
                    else {
                        cleanPhone = '+' + cleaned;
                    }
                }
                if (user.phone !== cleanPhone) {
                    logger_1.logger.info(`[Migration]: Normalizing phone for ${user.role} ${user.name} from "${user.phone}" to "${cleanPhone}"`);
                    user.phone = cleanPhone;
                    if (user.role === 'Worker') {
                        user.username = cleanPhone;
                    }
                    updated = true;
                }
            }
            if (!user.username) {
                if (user.role === 'Worker') {
                    user.username = user.phone;
                }
                else {
                    user.username = user.name ? user.name.toLowerCase().replace(/\s+/g, '') : 'user_' + user._id;
                }
                logger_1.logger.info(`[Migration]: Auto-assigning missing username for ${user.name} to "${user.username}"`);
                updated = true;
            }
            // If user doesn't have password, set a default hashed password
            if (!user.password) {
                logger_1.logger.info(`[Migration]: Setting default password for user ${user.name}`);
                const salt = await bcryptjs_1.default.genSalt(10);
                user.password = await bcryptjs_1.default.hash(user.role + 'Password123!', salt);
                updated = true;
            }
            if (updated) {
                await user.save();
            }
        }
        // 2. Normalize task statuses to 'Open' (capitalized) instead of 'open'
        const lowercaseTasks = await Task_1.TaskModel.find({ task_status: 'open' });
        if (lowercaseTasks.length > 0) {
            logger_1.logger.info(`[Migration]: Found ${lowercaseTasks.length} tasks with lowercase status 'open'. Fixing...`);
            for (const task of lowercaseTasks) {
                task.task_status = 'Open';
                await task.save();
                logger_1.logger.info(`[Migration]: Normalized task ${task.taskId || task._id} status to 'Open'`);
            }
        }
        logger_1.logger.info('[Migration]: Database records normalization completed successfully.');
    }
    catch (err) {
        logger_1.logger.error(`[Migration]: Database records normalization failed: ${err.message}`);
    }
}
async function startServer() {
    try {
        logger_1.logger.info('Connecting to MongoDB...');
        await mongoose_1.default.connect(config_1.config.mongo.uri, {
            dbName: config_1.config.mongo.dbName,
        });
        logger_1.logger.info('MongoDB connected successfully.');
        // Seed config and default user
        await seedDatabase();
        // Migrate empty Task IDs
        await migrateTaskIds();
        // Normalize user and task records
        await normalizeDatabaseRecords();
        // Initialize Log Cleanup Retention (7 days)
        try {
            LogCleanupService_1.LogCleanupService.pruneOldLogs();
            LogCleanupService_1.LogCleanupService.startCleanupScheduler();
        }
        catch (err) {
            logger_1.logger.error(`Failed to initialize LogCleanupService: ${err.message}`);
        }
        // Create HTTP Server
        server = http_1.default.createServer(app_1.default);
        // Initialize Socket.IO
        io = new socket_io_1.Server(server, {
            cors: {
                origin: '*', // Allow all origins for dev/testing
                methods: ['GET', 'POST'],
            },
        });
        // Share Socket.IO server with routers
        app_1.default.set('io', io);
        // Initialize Reminder Service
        try {
            ReminderService_1.ReminderService.init(io);
        }
        catch (err) {
            logger_1.logger.error(`Failed to initialize ReminderService: ${err.message}`);
        }
        // Initialize Inactivity Checker
        try {
            InactivityChecker_1.InactivityChecker.startScheduler(io);
        }
        catch (err) {
            logger_1.logger.error(`Failed to initialize InactivityChecker: ${err.message}`);
        }
        io.on('connection', (socket) => {
            logger_1.logger.info(`Socket.IO client connected: ${socket.id}`);
            socket.on('disconnect', () => {
                logger_1.logger.info(`Socket.IO client disconnected: ${socket.id}`);
            });
        });
        server.listen(PORT, () => {
            logger_1.logger.info(`===============================================`);
            logger_1.logger.info(`Sahayak AI Backend running on port ${PORT}`);
            logger_1.logger.info(`Swagger API Documentation: http://localhost:${PORT}/api-docs`);
            logger_1.logger.info(`===============================================`);
        });
        // Setup signal handlers for graceful shutdown
        let isShuttingDown = false;
        const gracefulShutdown = async (signal) => {
            if (isShuttingDown)
                return;
            isShuttingDown = true;
            logger_1.logger.info(`[Server]: Received ${signal}. Starting graceful shutdown sequence...`);
            // 1. Stop background schedulers
            try {
                InactivityChecker_1.InactivityChecker.stopScheduler();
                ReminderService_1.ReminderService.stopScheduler();
                LogCleanupService_1.LogCleanupService.stopCleanupScheduler();
            }
            catch (err) {
                logger_1.logger.error(`[Server]: Error stopping schedulers: ${err.message}`);
            }
            // 2. Close Socket.IO server
            if (io) {
                logger_1.logger.info('[Server]: Closing Socket.IO server...');
                io.close();
            }
            // 3. Close HTTP Server
            if (server) {
                logger_1.logger.info('[Server]: Closing HTTP server...');
                server.close(() => {
                    logger_1.logger.info('[Server]: HTTP server closed.');
                });
            }
            // 4. Close Mongoose / MongoDB connection
            try {
                logger_1.logger.info('[Server]: Closing MongoDB connection...');
                await mongoose_1.default.connection.close();
                logger_1.logger.info('[Server]: MongoDB connection closed.');
            }
            catch (err) {
                logger_1.logger.error(`[Server]: Error closing MongoDB: ${err.message}`);
            }
            logger_1.logger.info('[Server]: Graceful shutdown completed successfully.');
            process.exit(0);
        };
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }
    catch (error) {
        logger_1.logger.error(`Server failed to start: ${error.message}`);
        process.exit(1);
    }
}
// Environment validation
if (!config_1.config.mongo.uri) {
    logger_1.logger.error('CRITICAL STARTUP ERROR: MONGO_URI env variable is missing.');
    process.exit(1);
}
if (!config_1.config.jwtSecret || config_1.config.jwtSecret === 'sahayak_jwt_secret_token_123!') {
    logger_1.logger.warn('WARNING: JWT_SECRET is using default placeholder. Please update in production.');
}
if (!config_1.config.encryptionKey || config_1.config.encryptionKey === 'sahayak_aes_key_32_chars_secret_!!') {
    logger_1.logger.warn('WARNING: ENCRYPTION_KEY is using default placeholder. Please update in production.');
}
if (!config_1.config.meta.verifyToken) {
    logger_1.logger.warn('WARNING: META_VERIFY_TOKEN env variable is missing.');
}
startServer();
