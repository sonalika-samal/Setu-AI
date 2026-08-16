import { Router } from 'express';
import { SuperAdminController } from '../controllers/superadmin';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const superAdminController = new SuperAdminController();

// All SuperAdmin endpoints require JWT and SuperAdmin role
router.use(authenticateJWT);
router.use(requireRole(['SuperAdmin']));

router.post('/orgs', superAdminController.createOrg.bind(superAdminController));
router.get('/orgs', superAdminController.listOrgs.bind(superAdminController));
router.patch('/orgs/:orgId/status', superAdminController.toggleOrgStatus.bind(superAdminController));
router.patch('/orgs/:orgId/plan', superAdminController.updateOrgPlan.bind(superAdminController));

export default router;
