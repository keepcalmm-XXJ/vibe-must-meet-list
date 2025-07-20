import { Router, Response } from 'express';
import { asyncHandler, authenticateToken, AuthenticatedRequest } from '../middleware';

const router = Router();

/**
 * Messaging system routes
 * Base path: /api/v1/messages
 */

// GET /api/v1/messages/:userId
router.get('/:userId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement get conversation messages
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Get conversation messages not yet implemented',
      timestamp: new Date().toISOString(),
    },
  });
}));

// POST /api/v1/messages
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement send message
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Send message not yet implemented',
      timestamp: new Date().toISOString(),
    },
  });
}));

export { router as messageRoutes };