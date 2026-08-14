import { Router, Request, Response, NextFunction } from 'express';
import { CredentialRepository } from '../repositories/CredentialRepository';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();
const credentialRepo = new CredentialRepository();

router.use(authenticateJWT);
router.use(requireRole(['Admin', 'Owner']));

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Retrieve general application settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application settings retrieved successfully
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creds = await credentialRepo.getCredentials();
    res.status(200).json(creds.settings);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Update general application settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newSettings = req.body;
    const creds = await credentialRepo.getCredentials();
    
    // Merge new settings into current settings sub-object
    creds.settings = {
      ...creds.settings,
      ...newSettings
    };

    const updated = await credentialRepo.updateCredentials(creds);
    res.status(200).json({
      message: 'Settings updated successfully',
      settings: updated.settings
    });
  } catch (error) {
    next(error);
  }
});

export default router;
