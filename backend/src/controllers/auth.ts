import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserService } from '../services/UserService';
import { LoggingService } from '../services/LoggingService';
import { config } from '../config/config';
import { AuthRequest } from '../middlewares/auth';
import { UserModel } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';
import { LoginHistoryModel } from '../models/LoginHistory';
import { SecurityLogModel } from '../models/SecurityLog';

const userService = new UserService();
const loggingService = new LoggingService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // 1. Validate Request
      if (!username || !password) {
        res.status(400).json({ message: 'Username and password are required.' });
        return;
      }

      // 2. Call Service
      const user = await userService.authenticate(username, password);
      if (!user) {
        const failedUser = await UserModel.findOne({ username });
        if (failedUser) {
          await LoginHistoryModel.create({
            user_id: failedUser._id,
            username,
            ip_address: ip,
            user_agent: userAgent,
            status: 'Failed'
          });
          await SecurityLogModel.create({
            user_id: failedUser._id.toString(),
            username,
            action: 'Login Failed',
            ip_address: ip,
            details: 'Incorrect password supplied.'
          });
        }
        res.status(401).json({ message: 'Invalid username or password.' });
        return;
      }

      // Enforce role check: block workers from logging in to the dashboard
      if (user.role === 'Worker') {
        res.status(403).json({ message: 'Access denied. Workers are not permitted to log in to the dashboard.' });
        return;
      }

      // Check account enablement
      const dbUser = await UserModel.findById(user.id);
      if (dbUser && dbUser.account_status === 'Disabled') {
        res.status(403).json({ message: 'Access Denied: This account has been disabled.' });
        return;
      }

      const userOrgId = dbUser?.orgId || 'default';

      // 3. Generate response token (including token_version and orgId)
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, orgId: userOrgId, token_version: dbUser?.token_version || 0 },
        config.jwtSecret as jwt.Secret,
        { expiresIn: '15m' }
      );

      // 4. Generate and save Refresh Token
      const refreshTokenValue = crypto.randomBytes(40).toString('hex');
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

      await RefreshTokenModel.create({
        orgId: userOrgId,
        user_id: user.id,
        token: refreshTokenValue,
        expires_at: refreshTokenExpiry,
        ip_address: ip,
        user_agent: userAgent
      });

      // Log successful login
      await LoginHistoryModel.create({
        orgId: userOrgId,
        user_id: user.id,
        username: user.username,
        ip_address: ip,
        user_agent: userAgent,
        status: 'Success'
      });
      await SecurityLogModel.create({
        orgId: userOrgId,
        user_id: user.id,
        username: user.username,
        action: 'Login Success',
        ip_address: ip,
        details: 'User authenticated successfully.'
      });

      // Log action in activity logs
      await loggingService.logActivity(user.username, 'Login Success', 'User successfully authenticated via dashboard.', userOrgId);

      // 5. Return Response
      res.status(200).json({
        token,
        refreshToken: refreshTokenValue,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          role: user.role,
          orgId: userOrgId,
          status: user.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, name, phone, role } = req.body;

      // 1. Validate Request
      if (!username || !password || !name || !phone) {
        res.status(400).json({ message: 'Username, password, name, and phone are required.' });
        return;
      }

      // 2. Call Service
      const newUser = await userService.createUser({
        username,
        password,
        name,
        phone,
        role: role || 'Owner',
      });

      // Log action in activity logs
      await loggingService.logActivity(username, 'User Registration', `A new ${role || 'Owner'} account was registered.`);

      // 3. Return Response
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workers = await userService.getAllWorkers();
      res.status(200).json(workers);
    } catch (error) {
      next(error);
    }
  }

  async deleteWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user;

      const success = await userService.deleteWorker(id, user?.username || 'system');
      if (!success) {
        res.status(404).json({ message: 'Worker not found' });
        return;
      }

      res.status(200).json({ message: 'Worker deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async addWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, phone } = req.body;

      if (!name || !phone) {
        res.status(400).json({ message: 'Name and Phone are required.' });
        return;
      }

      const newWorker = await userService.createWorker({ name, phone });
      res.status(201).json({
        message: 'Worker registered successfully',
        worker: newWorker
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone } = req.body;
      const user = (req as AuthRequest).user;

      const success = await userService.updateWorker(id, { name, phone }, user?.username || 'system');
      if (!success) {
        res.status(404).json({ message: 'Worker not found' });
        return;
      }

      res.status(200).json({ message: 'Worker updated successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getAdminsOwners(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getAdminsOwners();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async addAdminOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, name, phone, role } = req.body;
      if (!username || !password || !name || !phone || !role) {
        res.status(400).json({ message: 'Username, password, name, phone, and role are required.' });
        return;
      }
      if (!['Admin', 'Owner'].includes(role)) {
        res.status(400).json({ message: 'Invalid role.' });
        return;
      }

      const newUser = await userService.createAdminOwner({ username, password, name, phone, role });
      res.status(201).json({
        message: `${role} registered successfully`,
        user: newUser
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateAdminOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { username, name, phone, password, role } = req.body;
      const user = (req as AuthRequest).user;

      if (role && !['Admin', 'Owner'].includes(role)) {
        res.status(400).json({ message: 'Invalid role.' });
        return;
      }

      const success = await userService.updateAdminOwner(id, { username, name, phone, password, role }, user?.username || 'system');
      if (!success) {
        res.status(404).json({ message: 'Admin/Owner not found' });
        return;
      }

      res.status(200).json({ message: 'User updated successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteAdminOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user;

      const success = await userService.deleteAdminOwner(id, user?.username || 'system');
      if (!success) {
        res.status(404).json({ message: 'Admin/Owner not found' });
        return;
      }

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token is required.' });
        return;
      }

      const storedToken = await RefreshTokenModel.findOne({ token: refreshToken });
      if (!storedToken) {
        res.status(401).json({ message: 'Invalid refresh token.' });
        return;
      }

      if (new Date() > storedToken.expires_at) {
        await RefreshTokenModel.deleteOne({ _id: storedToken._id });
        res.status(401).json({ message: 'Refresh token has expired.' });
        return;
      }

      const dbUser = await UserModel.findById(storedToken.user_id);
      if (!dbUser || dbUser.account_status === 'Disabled') {
        res.status(403).json({ message: 'Account is disabled or missing.' });
        return;
      }

      const token = jwt.sign(
        { id: dbUser._id.toString(), username: dbUser.username, role: dbUser.role, orgId: dbUser.orgId || 'default', token_version: dbUser.token_version },
        config.jwtSecret as jwt.Secret,
        { expiresIn: '15m' }
      );

      res.status(200).json({ token });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = (req as AuthRequest).user;

      if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!oldPassword || !newPassword) {
        res.status(400).json({ message: 'Old and new passwords are required.' });
        return;
      }

      const dbUser = await UserModel.findById(user.id);
      if (!dbUser) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      const isMatch = await (dbUser as any).comparePassword(oldPassword);
      if (!isMatch) {
        res.status(400).json({ message: 'Incorrect old password.' });
        return;
      }
      dbUser.password = newPassword;
      dbUser.token_version++;
      await dbUser.save();

      await SecurityLogModel.create({
        user_id: dbUser._id.toString(),
        username: dbUser.username,
        action: 'Password Changed',
        details: 'User successfully updated their account password.'
      });

      // Trigger operational bell notification
      const { NotificationModel } = require('../models/Notification');
      const notification = await NotificationModel.create({
        title: 'Security Alert: Password Updated',
        description: `Account password was updated for administrator "${dbUser.username}".`,
        type: 'Security Alert',
        read_status: 'Unread',
        timestamp: new Date()
      });
      const io = req.app.get('io');
      if (io) {
        io.emit('notification:received', notification);
      }

      res.status(200).json({ message: 'Password changed successfully. Other active sessions have been signed out.' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, newPassword } = req.body;
      const executor = (req as AuthRequest).user;

      if (!userId || !newPassword) {
        res.status(400).json({ message: 'userId and newPassword are required.' });
        return;
      }

      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        res.status(404).json({ message: 'Target user not found.' });
        return;
      }

      targetUser.password = newPassword;
      targetUser.token_version++;
      await targetUser.save();

      await SecurityLogModel.create({
        user_id: targetUser._id.toString(),
        username: targetUser.username,
        action: 'Password Reset',
        details: `Password reset by ${executor?.username || 'system'}.`
      });

      // Trigger operational bell notification
      const { NotificationModel } = require('../models/Notification');
      const notification = await NotificationModel.create({
        title: 'Security Alert: Password Reset',
        description: `Account password was reset for administrator "${targetUser.username}" by "${executor?.username || 'system'}".`,
        type: 'Security Alert',
        read_status: 'Unread',
        timestamp: new Date()
      });
      const io = req.app.get('io');
      if (io) {
        io.emit('notification:received', notification);
      }

      res.status(200).json({ message: 'User password reset successfully. Existing sessions logged out.' });
    } catch (error) {
      next(error);
    }
  }

  async forceLogout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const executor = (req as AuthRequest).user;

      const targetUser = await UserModel.findById(id);
      if (!targetUser) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      if (targetUser._id.toString() === executor?.id) {
        res.status(400).json({ message: 'You cannot force logout yourself.' });
        return;
      }

      targetUser.token_version++;
      await targetUser.save();

      await RefreshTokenModel.deleteMany({ user_id: id });

      await SecurityLogModel.create({
        user_id: targetUser._id.toString(),
        username: targetUser.username,
        action: 'Force Logout',
        details: `Session invalidated by ${executor?.username || 'system'}.`
      });

      res.status(200).json({ message: 'User forced to logout successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async toggleAccountStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const executor = (req as AuthRequest).user;

      if (!status || !['Enabled', 'Disabled'].includes(status)) {
        res.status(400).json({ message: 'Valid status ("Enabled" or "Disabled") is required.' });
        return;
      }

      const targetUser = await UserModel.findById(id);
      if (!targetUser) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      if (targetUser._id.toString() === executor?.id) {
        res.status(400).json({ message: 'You cannot enable or disable your own account.' });
        return;
      }

      const isWorker = targetUser.role === 'Worker';
      if (isWorker) {
        targetUser.worker_status = status;
      } else {
        if (executor?.role !== 'Owner') {
          res.status(403).json({ message: 'Forbidden: Only system Owners can enable or disable administrative accounts.' });
          return;
        }
        targetUser.account_status = status;
        if (status === 'Disabled') {
          targetUser.token_version++;
          await RefreshTokenModel.deleteMany({ user_id: id });
        }
      }

      await targetUser.save();

      await SecurityLogModel.create({
        user_id: targetUser._id.toString(),
        username: targetUser.username,
        action: status === 'Enabled' ? 'Account Enabled' : 'Account Disabled',
        details: `Action performed by ${executor?.username || 'system'}.`
      });

      res.status(200).json({ message: `Account successfully ${status.toLowerCase()}d.` });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getLoginHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await LoginHistoryModel.find().sort({ timestamp: -1 }).limit(100);
      res.status(200).json(history);
    } catch (error) {
      next(error);
    }
  }

  async getSecurityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await SecurityLogModel.find().sort({ timestamp: -1 }).limit(100);
      res.status(200).json(logs);
    } catch (error) {
      next(error);
    }
  }

  async getActiveSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await RefreshTokenModel.find({ expires_at: { $gt: new Date() } })
        .populate('user_id', 'username name phone role')
        .sort({ created_at: -1 })
        .lean();
      res.status(200).json(sessions);
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const session = await RefreshTokenModel.findById(id);
      if (!session) {
        res.status(404).json({ message: 'Session not found or already revoked.' });
        return;
      }
      
      const targetUserId = session.user_id.toString();
      const targetUser = await UserModel.findById(targetUserId);
      if (targetUser) {
        targetUser.token_version++;
        await targetUser.save();
      }

      await RefreshTokenModel.findByIdAndDelete(id);

      await SecurityLogModel.create({
        user_id: targetUserId,
        username: targetUser ? targetUser.username : 'unknown',
        action: 'Session Revoked',
        details: `Active session revoked by ${(req as any).user?.username || 'system'}.`
      });

      res.status(200).json({ message: 'Session revoked successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async bulkWorkerStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workerIds, status } = req.body;
      const executor = (req as AuthRequest).user;

      if (!Array.isArray(workerIds) || !status || !['Enabled', 'Disabled'].includes(status)) {
        res.status(400).json({ message: 'workerIds (array) and status ("Enabled" or "Disabled") are required.' });
        return;
      }

      await UserModel.updateMany(
        { _id: { $in: workerIds }, role: 'Worker' },
        { worker_status: status }
      );

      // WebSocket notification
      const io = req.app.get('io');
      if (io) {
        io.emit('message:received', { type: 'workers_refresh' });
      }

      // Log activity
      const loggingService = new LoggingService();
      await loggingService.logActivity(
        executor?.username || 'system',
        'Workers Bulk Updated',
        `Bulk updated status of ${workerIds.length} workers to ${status}.`
      );

      res.status(200).json({ message: `Bulk status update successful.` });
    } catch (error) {
      next(error);
    }
  }
}
