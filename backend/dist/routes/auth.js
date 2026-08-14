"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const auth_2 = require("../middlewares/auth");
const rateLimit_1 = require("../middlewares/rateLimit");
const router = (0, express_1.Router)();
const authController = new auth_1.AuthController();
// Parameter validation helper
const validateBody = (fields) => {
    return (req, res, next) => {
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
router.post('/login', (0, rateLimit_1.rateLimit)({ windowMs: 15 * 60 * 1000, max: 100 }), validateBody(['username', 'password']), authController.login.bind(authController));
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
router.post('/signup', (0, rateLimit_1.rateLimit)({ windowMs: 60 * 60 * 1000, max: 20 }), validateBody(['username', 'password', 'name', 'phone']), authController.signup.bind(authController));
// Worker Management
router.get('/workers', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Admin', 'Owner']), authController.getWorkers.bind(authController));
router.post('/workers', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Admin', 'Owner']), authController.addWorker.bind(authController));
router.post('/workers/bulk-status', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Admin', 'Owner']), authController.bulkWorkerStatus.bind(authController));
router.put('/workers/:id', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Admin', 'Owner']), authController.updateWorker.bind(authController));
router.delete('/workers/:id', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Admin', 'Owner']), authController.deleteWorker.bind(authController));
// Admin & Owner Management (Owner Only)
router.get('/admins-owners', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.getAdminsOwners.bind(authController));
router.post('/admins-owners', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.addAdminOwner.bind(authController));
router.put('/admins-owners/:id', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.updateAdminOwner.bind(authController));
router.delete('/admins-owners/:id', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.deleteAdminOwner.bind(authController));
// Security & Account Status endpoints
router.post('/refresh', authController.refreshToken.bind(authController));
router.put('/change-password', auth_2.authenticateJWT, (0, rateLimit_1.rateLimit)({ windowMs: 15 * 60 * 1000, max: 20 }), validateBody(['oldPassword', 'newPassword']), authController.changePassword.bind(authController));
router.post('/reset-password', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), (0, rateLimit_1.rateLimit)({ windowMs: 15 * 60 * 1000, max: 10 }), validateBody(['userId', 'newPassword']), authController.resetPassword.bind(authController));
router.post('/force-logout/:id', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.forceLogout.bind(authController));
router.put('/users/:id/status', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Admin', 'Owner']), authController.toggleAccountStatus.bind(authController));
router.get('/login-history', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.getLoginHistory.bind(authController));
router.get('/security-logs', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.getSecurityLogs.bind(authController));
router.get('/sessions', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.getActiveSessions.bind(authController));
router.delete('/sessions/:id', auth_2.authenticateJWT, (0, auth_2.requireRole)(['Owner']), authController.revokeSession.bind(authController));
exports.default = router;
