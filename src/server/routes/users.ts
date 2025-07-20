import { Router, Response } from 'express';
import { asyncHandler, authenticateToken, AuthenticatedRequest, validate } from '../middleware';
import { handleAvatarUpload, getAvatarUrl, deleteAvatarFile } from '../middleware/upload';
import { UserService } from '../services/UserService';
import { updateProfileSchema } from '../../shared/validators/user';

const router = Router();

/**
 * User management routes
 * Base path: /api/v1/users
 */

// GET /api/v1/users/profile
router.get('/profile', 
  authenticateToken, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userService = new UserService();
    const profile = await userService.getProfile(req.user!.id);
    
    res.json({
      success: true,
      data: { profile },
      timestamp: new Date().toISOString(),
    });
  })
);

// PUT /api/v1/users/profile
router.put('/profile', 
  authenticateToken,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userService = new UserService();
    const updatedProfile = await userService.updateProfile(req.user!.id, req.body);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile: updatedProfile },
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/v1/users/avatar
router.post('/avatar', 
  authenticateToken,
  handleAvatarUpload,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No avatar file provided',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userService = new UserService();
    
    // Get current profile to check for existing avatar
    const currentProfile = await userService.getProfile(req.user!.id);
    
    // Delete old avatar if exists
    if (currentProfile.avatar) {
      deleteAvatarFile(currentProfile.avatar);
    }
    
    // Update profile with new avatar path
    const avatarUrl = getAvatarUrl(req.file.filename);
    const updatedProfile = await userService.updateAvatar(req.user!.id, avatarUrl);
    
    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { 
        profile: updatedProfile,
        avatar_url: avatarUrl,
      },
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/v1/users/preferences
router.get('/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement get matching preferences
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Get matching preferences not yet implemented',
      timestamp: new Date().toISOString(),
    },
  });
}));

// PUT /api/v1/users/preferences
router.put('/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement update matching preferences
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Update matching preferences not yet implemented',
      timestamp: new Date().toISOString(),
    },
  });
}));

export { router as userRoutes };