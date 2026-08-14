import { Router } from 'express';
import authRoutes from './auth';
import credentialRoutes from './credentials';
import webhookRoutes from './webhook';
import logRoutes from './logs';
import taskRoutes from './tasks';
import settingsRoutes from './settings';
import departmentRoutes from './department';
import notificationRoutes from './notification';
import analyticsRoutes from './analytics';
import aiRoutes from './ai';
import proofsRoutes from './proofs';
import superadminRoutes from './superadmin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/credentials', credentialRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/logs', logRoutes);
router.use('/tasks', taskRoutes);
router.use('/settings', settingsRoutes);
router.use('/departments', departmentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ai', aiRoutes);
router.use('/proofs', proofsRoutes);
router.use('/superadmin', superadminRoutes);

export default router;
