import { Router } from 'express';
import { SuperAdminController } from '../controllers/superadmin';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const superAdminController = new SuperAdminController();

// All SuperAdmin endpoints require JWT and SuperAdmin role
router.use(authenticateJWT);
router.use(requireRole(['SuperAdmin']));

router.post('/orgs', (req, res, next) => superAdminController.createOrg(req, res, next));
router.get('/orgs', (req, res, next) => superAdminController.listOrgs(req, res, next));
router.patch('/orgs/:orgId/status', (req, res, next) => superAdminController.toggleOrgStatus(req, res, next));
router.patch('/orgs/:orgId/plan', (req, res, next) => superAdminController.updateOrgPlan(req, res, next));

export default router;
