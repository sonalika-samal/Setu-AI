"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTaskLimit = exports.checkDepartmentLimit = exports.checkUserLimit = void 0;
const Organisation_1 = require("../models/Organisation");
const User_1 = require("../models/User");
const Department_1 = require("../models/Department");
const Task_1 = require("../models/Task");
const PLAN_LIMITS = {
    trial: { maxUsers: 5, maxDepartments: 2, maxTasks: 100 },
    starter: { maxUsers: 15, maxDepartments: 5, maxTasks: 1000 },
    pro: { maxUsers: 50, maxDepartments: 15, maxTasks: Infinity },
    enterprise: { maxUsers: Infinity, maxDepartments: Infinity, maxTasks: Infinity },
};
const checkUserLimit = async (req, res, next) => {
    try {
        const orgId = req.orgId || 'default';
        if (orgId === 'platform')
            return next(); // SuperAdmin exempt
        const org = await Organisation_1.OrganisationModel.findOne({ orgId });
        const plan = org?.plan || 'trial';
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
        const userCount = await User_1.UserModel.countDocuments({ orgId });
        if (userCount >= limits.maxUsers) {
            res.status(403).json({
                message: `User limit reached (${userCount}/${limits.maxUsers}) for your ${plan} plan. Upgrade to add more users.`
            });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkUserLimit = checkUserLimit;
const checkDepartmentLimit = async (req, res, next) => {
    try {
        const orgId = req.orgId || 'default';
        if (orgId === 'platform')
            return next();
        const org = await Organisation_1.OrganisationModel.findOne({ orgId });
        const plan = org?.plan || 'trial';
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
        const deptCount = await Department_1.DepartmentModel.countDocuments({ orgId });
        if (deptCount >= limits.maxDepartments) {
            res.status(403).json({
                message: `Department limit reached (${deptCount}/${limits.maxDepartments}) for your ${plan} plan. Upgrade to add more departments.`
            });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkDepartmentLimit = checkDepartmentLimit;
const checkTaskLimit = async (req, res, next) => {
    try {
        const orgId = req.orgId || 'default';
        if (orgId === 'platform')
            return next();
        const org = await Organisation_1.OrganisationModel.findOne({ orgId });
        const plan = org?.plan || 'trial';
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
        if (limits.maxTasks !== Infinity) {
            const taskCount = await Task_1.TaskModel.countDocuments({ orgId });
            if (taskCount >= limits.maxTasks) {
                res.status(403).json({
                    message: `Task limit reached (${taskCount}/${limits.maxTasks}) for your ${plan} plan. Upgrade to create more tasks.`
                });
                return;
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkTaskLimit = checkTaskLimit;
