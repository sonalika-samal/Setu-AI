"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const superadmin_1 = require("../controllers/superadmin");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const superAdminController = new superadmin_1.SuperAdminController();
// All SuperAdmin endpoints require JWT and SuperAdmin role
router.use(auth_1.authenticateJWT);
router.use((0, auth_1.requireRole)(['SuperAdmin']));
router.post('/orgs', (req, res, next) => superAdminController.createOrg(req, res, next));
router.get('/orgs', (req, res, next) => superAdminController.listOrgs(req, res, next));
router.patch('/orgs/:orgId/status', (req, res, next) => superAdminController.toggleOrgStatus(req, res, next));
router.patch('/orgs/:orgId/plan', (req, res, next) => superAdminController.updateOrgPlan(req, res, next));
exports.default = router;
