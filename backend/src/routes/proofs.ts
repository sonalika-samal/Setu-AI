import { Router } from 'express';
import { TaskController } from '../controllers/task';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const controller = new TaskController();

router.use(authenticateJWT);
router.use(requireRole(['Admin', 'Owner']));

router.put('/:proofId/audit', controller.reviewProofById.bind(controller));
router.put('/:proofId/review', controller.reviewProofById.bind(controller));

export default router;
