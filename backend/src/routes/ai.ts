import { Router } from 'express';
import { AIController } from '../controllers/ai';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const controller = new AIController();

router.use(authenticateJWT);
router.use(requireRole(['Admin', 'Owner']));

router.post('/chat', controller.chat.bind(controller));

export default router;
