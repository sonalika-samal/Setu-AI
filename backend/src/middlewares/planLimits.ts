import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { OrganisationModel } from '../models/Organisation';
import { UserModel } from '../models/User';
import { DepartmentModel } from '../models/Department';
import { TaskModel } from '../models/Task';

const PLAN_LIMITS: Record<string, { maxUsers: number; maxDepartments: number; maxTasks: number }> = {
  trial:      { maxUsers: 5,   maxDepartments: 2,  maxTasks: 100 },
  starter:    { maxUsers: 15,  maxDepartments: 5,  maxTasks: 1000 },
  pro:        { maxUsers: 50,  maxDepartments: 15, maxTasks: Infinity },
  enterprise: { maxUsers: Infinity, maxDepartments: Infinity, maxTasks: Infinity },
};

export const checkUserLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.orgId || 'default';
    if (orgId === 'platform') return next(); // SuperAdmin exempt

    const org = await OrganisationModel.findOne({ orgId });
    const plan = org?.plan || 'trial';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

    const userCount = await UserModel.countDocuments({ orgId });
    if (userCount >= limits.maxUsers) {
      res.status(403).json({
        message: `User limit reached (${userCount}/${limits.maxUsers}) for your ${plan} plan. Upgrade to add more users.`
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const checkDepartmentLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.orgId || 'default';
    if (orgId === 'platform') return next();

    const org = await OrganisationModel.findOne({ orgId });
    const plan = org?.plan || 'trial';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

    const deptCount = await DepartmentModel.countDocuments({ orgId });
    if (deptCount >= limits.maxDepartments) {
      res.status(403).json({
        message: `Department limit reached (${deptCount}/${limits.maxDepartments}) for your ${plan} plan. Upgrade to add more departments.`
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const checkTaskLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.orgId || 'default';
    if (orgId === 'platform') return next();

    const org = await OrganisationModel.findOne({ orgId });
    const plan = org?.plan || 'trial';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

    if (limits.maxTasks !== Infinity) {
      const taskCount = await TaskModel.countDocuments({ orgId });
      if (taskCount >= limits.maxTasks) {
        res.status(403).json({
          message: `Task limit reached (${taskCount}/${limits.maxTasks}) for your ${plan} plan. Upgrade to create more tasks.`
        });
        return;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
