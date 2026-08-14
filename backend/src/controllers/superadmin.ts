import { Request, Response, NextFunction } from 'express';
import { OrganisationModel } from '../models/Organisation';
import { UserModel } from '../models/User';
import { TaskModel } from '../models/Task';
import { CredentialModel } from '../models/Credential';
import { DepartmentModel } from '../models/Department';
import { AuthRequest } from '../middlewares/auth';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export class SuperAdminController {
  /**
   * Create a new organisation & seed its default Admin user + Credential record
   */
  async createOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, orgId, adminEmail, adminUsername, adminPassword, plan, metaPhoneNumberId, sarvamApiKey } = req.body;

      if (!name || !orgId || !adminUsername || !adminPassword) {
        res.status(400).json({ message: 'Name, orgId, adminUsername, and adminPassword are required.' });
        return;
      }

      // Check if orgId already exists
      const existingOrg = await OrganisationModel.findOne({ orgId });
      if (existingOrg) {
        res.status(400).json({ message: `Organisation ID "${orgId}" already exists.` });
        return;
      }

      // Create Organisation
      const newOrg = await OrganisationModel.create({
        orgId,
        name,
        adminEmail: adminEmail || '',
        plan: plan || 'starter',
        isActive: true,
        metaPhoneNumberId: metaPhoneNumberId || '',
        sarvamApiKey: sarvamApiKey || '',
      });

      // Create Default Admin User for this Org
      const adminUser = await UserModel.create({
        orgId,
        username: adminUsername,
        password: adminPassword,
        name: `${name} Admin`,
        phone: req.body.adminPhone || '+910000000000',
        role: 'Admin',
        status: 'Active',
        account_status: 'Enabled'
      });

      // Create Default "Other" Department for this Org
      await DepartmentModel.create({
        orgId,
        name: 'Other',
        code: 'OTHER',
        description: 'Default System Department',
        status: 'Active',
        created_by: 'system'
      });

      // Create Default Credential Config Document for this Org
      const defaultTemplate = 'Task ID: *```{{task_id}}```*\n\nHello {{worker_name}},\n\nYou have been assigned a new task.\n\nTask:\n{{task_msg}}\n\nLocation:\n{{location}}\n\nDeadline:\n{{deadline}}\n\nPlease reply using the Task ID.\n\nExamples:\n{{task_id}} Started\n{{task_id}} Completed\n{{task_id}} Need more details';
      
      await CredentialModel.create({
        orgId,
        key: `${orgId}_config`,
        businessName: name,
        taskAssignmentTemplate: defaultTemplate
      });

      logger.info(`SuperAdmin created organisation: ${name} (${orgId}) with admin: ${adminUsername}`);

      res.status(201).json({
        message: 'Organisation created successfully',
        organisation: newOrg,
        admin: {
          id: adminUser._id,
          username: adminUser.username,
          orgId: adminUser.orgId,
          role: adminUser.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all organisations
   */
  async listOrgs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgs = await OrganisationModel.find().sort({ createdAt: -1 }).lean();
      
      // Enrich with user & task counts
      const enrichedOrgs = await Promise.all(
        orgs.map(async (org) => {
          const userCount = await UserModel.countDocuments({ orgId: org.orgId });
          const taskCount = await TaskModel.countDocuments({ orgId: org.orgId });
          return {
            ...org,
            userCount,
            taskCount
          };
        })
      );

      res.status(200).json(enrichedOrgs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle Organisation status (Activate / Deactivate)
   */
  async toggleOrgStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({ message: 'isActive (boolean) is required.' });
        return;
      }

      const org = await OrganisationModel.findOneAndUpdate(
        { orgId },
        { $set: { isActive } },
        { new: true }
      );

      if (!org) {
        res.status(404).json({ message: 'Organisation not found.' });
        return;
      }

      logger.info(`SuperAdmin updated org ${orgId} active status to: ${isActive}`);
      res.status(200).json({ message: `Organisation status updated to ${isActive ? 'Active' : 'Inactive'}`, org });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change Organisation subscription plan
   */
  async updateOrgPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = req.params;
      const { plan } = req.body;

      if (!plan || !['trial', 'starter', 'pro', 'enterprise'].includes(plan)) {
        res.status(400).json({ message: 'Valid plan ("trial", "starter", "pro", or "enterprise") is required.' });
        return;
      }

      const org = await OrganisationModel.findOneAndUpdate(
        { orgId },
        { $set: { plan } },
        { new: true }
      );

      if (!org) {
        res.status(404).json({ message: 'Organisation not found.' });
        return;
      }

      logger.info(`SuperAdmin updated org ${orgId} plan to: ${plan}`);
      res.status(200).json({ message: `Organisation plan updated to ${plan}`, org });
    } catch (error) {
      next(error);
    }
  }
}

export default SuperAdminController;
