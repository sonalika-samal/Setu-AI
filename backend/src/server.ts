import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config/config';
import { logger } from './utils/logger';
import { UserRepository } from './repositories/UserRepository';
import { CredentialRepository } from './repositories/CredentialRepository';
import { CredentialModel } from './models/Credential';
import { TaskModel } from './models/Task';
import { UserModel } from './models/User';
import { DepartmentModel } from './models/Department';
import bcrypt from 'bcryptjs';
import { LogCleanupService } from './services/LogCleanupService';
import { ReminderService } from './services/ReminderService';
import { InactivityChecker } from './services/InactivityChecker';

import { OrganisationModel } from './models/Organisation';

let server: http.Server;
let io: Server;

const PORT = config.port;

const userRepo = new UserRepository();
const credentialRepo = new CredentialRepository();

async function backfillOrgIds() {
  try {
    const modelsToBackfill = [
      UserModel, TaskModel, DepartmentModel, CredentialModel,
      require('./models/MessageLog').MessageLogModel,
      require('./models/AILog').AILogModel,
      require('./models/ActivityLog').ActivityLogModel,
      require('./models/ErrorLog').ErrorLogModel,
      require('./models/LoginHistory').LoginHistoryModel,
      require('./models/RefreshToken').RefreshTokenModel,
      require('./models/SecurityLog').SecurityLogModel,
      require('./models/Notification').NotificationModel,
      require('./models/TaskTimeline').TaskTimelineModel,
      require('./models/WebhookLog').WebhookLogModel,
    ];

    for (const model of modelsToBackfill) {
      if (model) {
        await model.updateMany({ orgId: { $exists: false } }, { $set: { orgId: 'default' } });
      }
    }
    logger.info('[Migration]: Successfully backfilled missing orgId="default" on all legacy records.');
  } catch (err: any) {
    logger.error(`[Migration]: Failed to backfill orgId: ${err.message}`);
  }
}

async function seedDatabase() {
  try {
    // 0. Seed default Organisation
    const defaultOrgExists = await OrganisationModel.findOne({ orgId: 'default' });
    if (!defaultOrgExists) {
      logger.info('Seeding default organisation into MongoDB...');
      await OrganisationModel.create({
        orgId: 'default',
        name: 'Default Organisation',
        plan: 'enterprise',
        isActive: true,
        adminEmail: 'admin@setuai.com',
      });
      logger.info('Default organisation seeded successfully.');
    }

    // 0.1 Seed SuperAdmin User
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123!';
    const superAdminExists = await UserModel.findOne({ username: superAdminUsername, role: 'SuperAdmin' });
    if (!superAdminExists) {
      logger.info(`Seeding SuperAdmin user: ${superAdminUsername}`);
      await UserModel.create({
        orgId: 'platform',
        username: superAdminUsername,
        password: superAdminPassword,
        name: 'Platform Super Admin',
        phone: '+910000000000',
        role: 'SuperAdmin',
        status: 'Active',
        account_status: 'Enabled'
      });
      logger.info('SuperAdmin user seeded successfully.');
    }

    // 1. Seed default Credentials document if it doesn't exist
    const credentialsExists = await CredentialModel.findOne({ orgId: 'default' }) || await CredentialModel.findOne({ key: 'global_config' });
    if (!credentialsExists) {
      logger.info('Seeding default credentials into MongoDB...');
      const defaultCreds = await credentialRepo.getCredentials('default');
      await credentialRepo.updateCredentials(defaultCreds, 'default');
    }

    // 2. Seed default Administrator User (Username-based)
    const adminUsername = config.defaultAdmin.username || 'admin';
    const adminExists = await UserModel.findOne({ username: adminUsername, orgId: 'default' });
    if (!adminExists) {
      logger.info(`Seeding default administrator user: ${adminUsername}`);
      await UserModel.create({
        orgId: 'default',
        username: adminUsername,
        password: config.defaultAdmin.password || 'AdminPassword123!',
        name: 'Setu AI Admin',
        phone: '+919999999999',
        role: 'Admin',
        status: 'Active',
      });
      logger.info('Administrator user seeded successfully.');
    }

    // 3. Seed default Owner User (Username-based)
    const ownerUsername = 'owner';
    const ownerExists = await UserModel.findOne({ username: ownerUsername, orgId: 'default' });
    if (!ownerExists) {
      logger.info(`Seeding default owner user: ${ownerUsername}`);
      await UserModel.create({
        orgId: 'default',
        username: ownerUsername,
        password: 'OwnerPassword123!',
        name: 'Setu AI Owner',
        phone: '+918888888888',
        role: 'Owner',
        status: 'Active',
      });
      logger.info('Owner user seeded successfully.');
    }

    // 4. Update any existing users with name containing "Sahayak" to "Setu AI"
    try {
      await UserModel.updateMany(
        { name: /Sahayak/i },
        [
          { 
            $set: { 
              name: { 
                $replaceAll: { input: "$name", find: "Sahayak", replacement: "Setu AI" } 
              } 
            } 
          }
        ]
      );
      logger.info('Existing user records containing "Sahayak" normalized to "Setu AI" successfully.');
    } catch (err) {
      logger.error(`Failed to normalize existing user names: ${(err as Error).message}`);
    }
  } catch (error) {
    logger.error(`Error seeding database: ${(error as Error).message}`);
  }
}

async function migrateTaskIds() {
  try {
    const tasksWithoutId = await TaskModel.find({ taskId: { $exists: false } });
    if (tasksWithoutId.length > 0) {
      logger.info(`[Migration]: Found ${tasksWithoutId.length} tasks without taskId. Migrating...`);
      for (const task of tasksWithoutId) {
        const date = task.createdAt || task.timestamp || new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = `${day}${month}${year}`;
        
        // Find existing tasks on that date to resolve next running suffix
        const tasksOnDate = await TaskModel.find({
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
        logger.info(`[Migration]: Assigned taskId ${generatedId} to task ${task._id}`);
      }
      logger.info('[Migration]: Task ID migration completed successfully.');
    }
  } catch (err: any) {
    logger.error(`[Migration]: Task ID migration failed: ${err.message}`);
  }
}

async function normalizeDatabaseRecords() {
  try {
    logger.info('[Migration]: Starting database records normalization...');

    // 0. Seed default "Other" department
    let otherDept = await DepartmentModel.findOne({ code: 'OTHER' });
    if (!otherDept) {
      logger.info('[Migration]: Seeding default "Other" department...');
      otherDept = await DepartmentModel.create({
        name: 'Other',
        code: 'OTHER',
        description: 'Default System Department',
        status: 'Active',
        created_by: 'system'
      });
    }

    // 1. Find and normalize all users (Workers, Admins, Owners)
    const allUsers = await UserModel.find();
    for (const user of allUsers) {
      let updated = false;

      // Normalize role casing to match Mongoose enum values (Admin, Owner, Worker)
      const roleLower = user.role ? user.role.toLowerCase() : '';
      let correctRole = user.role;
      if (roleLower === 'owner') correctRole = 'Owner';
      else if (roleLower === 'admin') correctRole = 'Admin';
      else if (roleLower === 'worker') correctRole = 'Worker';
      
      if (user.role !== correctRole) {
        logger.info(`[Migration]: Normalizing role for user ${user.name} from "${user.role}" to "${correctRole}"`);
        user.role = correctRole;
        updated = true;
      }

      if (user.role === 'Worker' && !user.department_id) {
        logger.info(`[Migration]: Assigning worker ${user.name} to "Other" department`);
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
          } else if (cleaned.length === 10) {
            cleanPhone = '+91' + cleaned;
          } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
            cleanPhone = '+' + cleaned;
          } else {
            cleanPhone = '+' + cleaned;
          }
        }
        if (user.phone !== cleanPhone) {
          logger.info(`[Migration]: Normalizing phone for ${user.role} ${user.name} from "${user.phone}" to "${cleanPhone}"`);
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
        } else {
          user.username = user.name ? user.name.toLowerCase().replace(/\s+/g, '') : 'user_' + user._id;
        }
        logger.info(`[Migration]: Auto-assigning missing username for ${user.name} to "${user.username}"`);
        updated = true;
      }

      // If user doesn't have password, set a default hashed password
      if (!user.password) {
        logger.info(`[Migration]: Setting default password for user ${user.name}`);
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.role + 'Password123!', salt);
        updated = true;
      }

      if (updated) {
        await user.save();
      }
    }

    // 2. Normalize task statuses to 'Open' (capitalized) instead of 'open'
    const lowercaseTasks = await TaskModel.find({ task_status: 'open' });
    if (lowercaseTasks.length > 0) {
      logger.info(`[Migration]: Found ${lowercaseTasks.length} tasks with lowercase status 'open'. Fixing...`);
      for (const task of lowercaseTasks) {
        task.task_status = 'Open';
        await task.save();
        logger.info(`[Migration]: Normalized task ${task.taskId || task._id} status to 'Open'`);
      }
    }

    logger.info('[Migration]: Database records normalization completed successfully.');
  } catch (err: any) {
    logger.error(`[Migration]: Database records normalization failed: ${err.message}`);
  }
}

async function startServer() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongo.uri, {
      dbName: config.mongo.dbName,
    });
    logger.info('MongoDB connected successfully.');

    // Backfill missing orgIds on legacy records
    await backfillOrgIds();

    // Seed config and default user
    await seedDatabase();

    // Migrate empty Task IDs
    await migrateTaskIds();

    // Normalize user and task records
    await normalizeDatabaseRecords();

    // Initialize Log Cleanup Retention (7 days)
    try {
      LogCleanupService.pruneOldLogs();
      LogCleanupService.startCleanupScheduler();
    } catch (err) {
      logger.error(`Failed to initialize LogCleanupService: ${(err as Error).message}`);
    }

    // Create HTTP Server
    server = http.createServer(app);

    // Initialize Socket.IO
    io = new Server(server, {
      cors: {
        origin: '*', // Allow all origins for dev/testing
        methods: ['GET', 'POST'],
      },
    });

    // Share Socket.IO server with routers
    app.set('io', io);

    // Initialize Reminder Service
    try {
      ReminderService.init(io);
    } catch (err) {
      logger.error(`Failed to initialize ReminderService: ${(err as Error).message}`);
    }

    // Initialize Inactivity Checker
    try {
      InactivityChecker.startScheduler(io);
    } catch (err) {
      logger.error(`Failed to initialize InactivityChecker: ${(err as Error).message}`);
    }

    io.on('connection', (socket) => {
      logger.info(`Socket.IO client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Socket.IO client disconnected: ${socket.id}`);
      });
    });

    server.listen(PORT, () => {
      logger.info(`===============================================`);
      logger.info(`Setu AI Backend running on port ${PORT}`);
      logger.info(`Swagger API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`===============================================`);
    });

    // Setup signal handlers for graceful shutdown
    let isShuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info(`[Server]: Received ${signal}. Starting graceful shutdown sequence...`);

      // 1. Stop background schedulers
      try {
        InactivityChecker.stopScheduler();
        ReminderService.stopScheduler();
        LogCleanupService.stopCleanupScheduler();
      } catch (err: any) {
        logger.error(`[Server]: Error stopping schedulers: ${err.message}`);
      }

      // 2. Close Socket.IO server
      if (io) {
        logger.info('[Server]: Closing Socket.IO server...');
        io.close();
      }

      // 3. Close HTTP Server
      if (server) {
        logger.info('[Server]: Closing HTTP server...');
        server.close(() => {
          logger.info('[Server]: HTTP server closed.');
        });
      }

      // 4. Close Mongoose / MongoDB connection
      try {
        logger.info('[Server]: Closing MongoDB connection...');
        await mongoose.connection.close();
        logger.info('[Server]: MongoDB connection closed.');
      } catch (err: any) {
        logger.error(`[Server]: Error closing MongoDB: ${err.message}`);
      }

      logger.info('[Server]: Graceful shutdown completed successfully.');
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logger.error(`Server failed to start: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Environment validation
if (!config.mongo.uri) {
  logger.error('CRITICAL STARTUP ERROR: MONGO_URI env variable is missing.');
  process.exit(1);
}
if (!config.jwtSecret || config.jwtSecret === 'sahayak_jwt_secret_token_123!') {
  logger.warn('WARNING: JWT_SECRET is using default placeholder. Please update in production.');
}
if (!config.encryptionKey || config.encryptionKey === 'sahayak_aes_key_32_chars_secret_!!') {
  logger.warn('WARNING: ENCRYPTION_KEY is using default placeholder. Please update in production.');
}
if (!config.meta.verifyToken) {
  logger.warn('WARNING: META_VERIFY_TOKEN env variable is missing.');
}

startServer();
