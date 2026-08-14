import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();
const authController = new AuthController();

// Parameter validation helper
const validateBody = (fields: string[]) => {
  return (req: any, res: any, next: any): void => {
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        res.status(400).json({ message: `Missing required field: ${field}` });
        return;
      }
    }
    next();
  };
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user and return a JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
  validateBody(['username', 'password']),
  authController.login.bind(authController)
);

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, Owner]
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: User already exists
 */
router.post(
  '/signup',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }),
  validateBody(['username', 'password', 'name', 'phone']),
  authController.signup.bind(authController)
);

// Worker Management
router.get('/workers', authenticateJWT, requireRole(['Admin', 'Owner']), authController.getWorkers.bind(authController));
router.post('/workers', authenticateJWT, requireRole(['Admin', 'Owner']), authController.addWorker.bind(authController));
router.post('/workers/bulk-status', authenticateJWT, requireRole(['Admin', 'Owner']), authController.bulkWorkerStatus.bind(authController));
router.put('/workers/:id', authenticateJWT, requireRole(['Admin', 'Owner']), authController.updateWorker.bind(authController));
router.delete('/workers/:id', authenticateJWT, requireRole(['Admin', 'Owner']), authController.deleteWorker.bind(authController));

// Admin & Owner Management (Owner Only)
router.get('/admins-owners', authenticateJWT, requireRole(['Owner']), authController.getAdminsOwners.bind(authController));
router.post('/admins-owners', authenticateJWT, requireRole(['Owner']), authController.addAdminOwner.bind(authController));
router.put('/admins-owners/:id', authenticateJWT, requireRole(['Owner']), authController.updateAdminOwner.bind(authController));
router.delete('/admins-owners/:id', authenticateJWT, requireRole(['Owner']), authController.deleteAdminOwner.bind(authController));

// Security & Account Status endpoints
router.post('/refresh', authController.refreshToken.bind(authController));
router.put(
  '/change-password',
  authenticateJWT,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  validateBody(['oldPassword', 'newPassword']),
  authController.changePassword.bind(authController)
);
router.post(
  '/reset-password',
  authenticateJWT,
  requireRole(['Owner']),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateBody(['userId', 'newPassword']),
  authController.resetPassword.bind(authController)
);
router.post('/force-logout/:id', authenticateJWT, requireRole(['Owner']), authController.forceLogout.bind(authController));
router.put('/users/:id/status', authenticateJWT, requireRole(['Admin', 'Owner']), authController.toggleAccountStatus.bind(authController));
router.get('/login-history', authenticateJWT, requireRole(['Owner']), authController.getLoginHistory.bind(authController));
router.get('/security-logs', authenticateJWT, requireRole(['Owner']), authController.getSecurityLogs.bind(authController));
router.get('/sessions', authenticateJWT, requireRole(['Owner']), authController.getActiveSessions.bind(authController));
router.delete('/sessions/:id', authenticateJWT, requireRole(['Owner']), authController.revokeSession.bind(authController));

export default router;
