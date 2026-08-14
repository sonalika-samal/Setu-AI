import { Router } from 'express';
import { TaskController } from '../controllers/task';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const controller = new TaskController();

router.use(authenticateJWT);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Retrieve list of all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks retrieved successfully
 */
router.get('/', controller.getTasks.bind(controller));

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post('/', controller.createTask.bind(controller));

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     summary: Get tasks statistics counters for the dashboard
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counters statistics object
 */
router.get('/stats', controller.getDashboardStats.bind(controller));

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, In Progress, Completed]
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *       404:
 *         description: Task not found
 */
router.get('/workers/attendance-stats', requireRole(['Admin', 'Owner']), controller.getAttendanceStats.bind(controller));
router.get('/proofs/all', requireRole(['Admin', 'Owner']), controller.getAllProofs.bind(controller));
router.put('/workers/:id/availability', requireRole(['Admin', 'Owner']), controller.updateWorkerAvailability.bind(controller));
router.put('/:id/status-manual', requireRole(['Admin', 'Owner']), controller.manualUpdateTaskStatus.bind(controller));

router.patch('/:id/status', controller.updateTaskStatus.bind(controller));
router.put('/:id', requireRole(['Admin', 'Owner']), controller.updateTask.bind(controller));
router.delete('/:id', requireRole(['Admin', 'Owner']), controller.deleteTask.bind(controller));
router.put('/:id/proof/:proofId/review', requireRole(['Admin', 'Owner']), controller.reviewProof.bind(controller));

/**
 * @swagger
 * /api/tasks/{id}/details:
 *   get:
 *     summary: Retrieve complete historical timeline, message logs, AI logs, and activity audits for a single task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task complete details object
 *       404:
 *         description: Task not found
 */
router.get('/:id/details', controller.getTaskDetails.bind(controller));

export default router;
