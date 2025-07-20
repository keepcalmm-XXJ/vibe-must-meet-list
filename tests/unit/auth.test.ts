import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { asyncHandler, validate, authenticateToken } from '../../src/server/middleware';
import { globalErrorHandler } from '../../src/server/middleware/errorHandler';
import { AuthService } from '../../src/server/services/AuthService';
import { generateToken, verifyToken } from '../../src/server/middleware/auth';
import { registerSchema, loginSchema } from '../../src/shared/validators/auth';

// Mock the database and services
jest.mock('../../src/server/database/connection');
jest.mock('../../src/server/services/AuthService');

// Create a mock auth service instance
const mockAuthServiceInstance = {
  register: jest.fn(),
  login: jest.fn(),
  getProfile: jest.fn(),
  refreshToken: jest.fn(),
};

// Mock the AuthService constructor
const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
mockAuthService.mockImplementation(() => mockAuthServiceInstance as any);

// Create test routes manually to ensure proper mocking
const createTestAuthRoutes = () => {
  const router = Router();
  const authService = new AuthService();

  router.post('/register', 
    validate({ body: registerSchema }),
    asyncHandler(async (req: any, res: any) => {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.post('/login',
    validate({ body: loginSchema }),
    asyncHandler(async (req: any, res: any) => {
      const result = await authService.login(req.body);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result,
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.post('/logout', 
    authenticateToken,
    asyncHandler(async (req: any, res: any) => {
      res.json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.post('/refresh',
    authenticateToken,
    asyncHandler(async (req: any, res: any) => {
      const result = await authService.refreshToken(req.user!.id);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.get('/me',
    authenticateToken,
    asyncHandler(async (req: any, res: any) => {
      const profile = await authService.getProfile(req.user!.id);
      
      res.json({
        success: true,
        data: { user: profile },
        timestamp: new Date().toISOString(),
      });
    })
  );

  return router;
};

const app = express();
app.use(express.json());
app.use('/auth', createTestAuthRoutes());
app.use(globalErrorHandler);

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company',
      };

      const mockResponse = {
        user: mockUser,
        token: 'mock-jwt-token',
      };

      mockAuthServiceInstance.register.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User',
          company: 'Test Company',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toEqual(mockResponse);
    });

    it('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password and name
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'mock-jwt-token',
      };

      mockAuthServiceInstance.login.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toEqual(mockResponse);
    });

    it('should return validation error for missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockToken = generateToken({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      });

      const mockResponse = {
        token: 'new-mock-jwt-token',
      };

      mockAuthServiceInstance.refreshToken.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toEqual(mockResponse);
    });

    it('should return authentication error for missing token', async () => {
      const response = await request(app)
        .post('/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company',
      };

      const mockToken = generateToken({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      });

      mockAuthServiceInstance.getProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockProfile);
    });

    it('should return authentication error for missing token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const mockToken = generateToken({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      });

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should return authentication error for missing token', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });
});

describe('JWT Authentication Middleware', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };

      const token = generateToken(user);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.name).toBe(user.name);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });
  });
});