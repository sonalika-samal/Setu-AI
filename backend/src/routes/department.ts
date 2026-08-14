import { Router } from 'express';
import { DepartmentController } from '../controllers/department';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const controller = new DepartmentController();

router.use(authenticateJWT);
router.use(requireRole(['Admin', 'Owner']));

router.get('/', controller.list.bind(controller));
router.get('/summary-stats', controller.getSummaryStats.bind(controller));
router.get('/:id/details', controller.getDepartmentDetails.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/move-workers', controller.moveWorkers.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
