import { Router } from 'express';
import { NotificationController } from '../controllers/notification';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const controller = new NotificationController();

router.use(authenticateJWT);
router.use(requireRole(['Admin', 'Owner']));

router.get('/', controller.list.bind(controller));
router.put('/read', controller.markAsRead.bind(controller));

export default router;
