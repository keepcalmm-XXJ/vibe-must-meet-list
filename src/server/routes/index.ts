import { Router } from 'express';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { eventRoutes } from './events';
import { matchingRoutes } from './matching';
import { connectionRoutes } from './connections';
import { messageRoutes } from './messages';
import feedbackRoutes from './feedback';

const router = Router();

/**
 * API v1 routes
 * Base path: /api/v1
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/matching', matchingRoutes);
router.use('/connections', connectionRoutes);
router.use('/messages', messageRoutes);
router.use('/feedback', feedbackRoutes);

export { router as apiRoutes };
