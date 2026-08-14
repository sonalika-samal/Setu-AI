import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const controller = new AnalyticsController();

router.use(authenticateJWT);
router.use(requireRole(['Admin', 'Owner']));

router.get('/summary', controller.getSummary.bind(controller));
router.get('/export', controller.exportReport.bind(controller));

export default router;
