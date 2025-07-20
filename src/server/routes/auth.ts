import { Router, Request, Response } from 'express';
import { asyncHandler, validate, authenticateToken } from '../middleware';
import { AuthService } from '../services/AuthService';
import { registerSchema, loginSchema } from '../../shared/validators/auth';

const router = Router();

/**
 * Authentication routes
 * Base path: /api/v1/auth
 */

// POST /api/v1/auth/register
router.post('/register', 
  validate({ body: registerSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = new AuthService();
    const result = await authService.register(req.body);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/v1/auth/login
router.post('/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = new AuthService();
    const result = await authService.login(req.body);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/v1/auth/logout
router.post('/logout', 
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    // For JWT tokens, logout is handled client-side by removing the token
    // Server-side logout would require token blacklisting (future enhancement)
    res.json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/v1/auth/refresh
router.post('/refresh',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const authService = new AuthService();
    const result = await authService.refreshToken(req.user!.id);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/v1/auth/me - Get current user profile
router.get('/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const authService = new AuthService();
    const profile = await authService.getProfile(req.user!.id);
    
    res.json({
      success: true,
      data: { user: profile },
      timestamp: new Date().toISOString(),
    });
  })
);

export { router as authRoutes };