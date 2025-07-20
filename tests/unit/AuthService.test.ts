import { AuthService } from '../../src/server/services/AuthService';
import { UserModel } from '../../src/server/models/User';
import { ValidationError, AuthenticationError, ConflictError } from '../../src/server/middleware/errorHandler';

// Mock the UserModel and database connection
jest.mock('../../src/server/models/User');
jest.mock('../../src/server/database/connection');

const mockUserModel = UserModel as jest.MockedClass<typeof UserModel>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserModelInstance: jest.Mocked<UserModel>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserModelInstance = new mockUserModel() as jest.Mocked<UserModel>;
    authService = new AuthService();
    // Replace the userModel instance with our mock
    (authService as any).userModel = mockUserModelInstance;
  });

  describe('register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
      company: 'Test Company',
    };

    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      company: 'Test Company',
      position: null,
      industry: null,
      bio: null,
      avatar: null,
      linkedin_profile: null,
      password_hash: 'hashed-password',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should register a new user successfully', async () => {
      mockUserModelInstance.findByEmail.mockResolvedValue(null);
      mockUserModelInstance.create.mockResolvedValue(mockUser);

      const result = await authService.register(validUserData);

      expect(mockUserModelInstance.findByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockUserModelInstance.create).toHaveBeenCalledWith(validUserData);
      expect(result.user.email).toBe(validUserData.email);
      expect(result.user.name).toBe(validUserData.name);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw ValidationError for missing email', async () => {
      const invalidData = { ...validUserData, email: '' };

      await expect(authService.register(invalidData)).rejects.toThrow(ValidationError);
      await expect(authService.register(invalidData)).rejects.toThrow('Email, password, and name are required');
    });

    it('should throw ValidationError for missing password', async () => {
      const invalidData = { ...validUserData, password: '' };

      await expect(authService.register(invalidData)).rejects.toThrow(ValidationError);
      await expect(authService.register(invalidData)).rejects.toThrow('Email, password, and name are required');
    });

    it('should throw ValidationError for missing name', async () => {
      const invalidData = { ...validUserData, name: '' };

      await expect(authService.register(invalidData)).rejects.toThrow(ValidationError);
      await expect(authService.register(invalidData)).rejects.toThrow('Email, password, and name are required');
    });

    it('should throw ConflictError for existing email', async () => {
      mockUserModelInstance.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(validUserData)).rejects.toThrow(ConflictError);
      await expect(authService.register(validUserData)).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      company: 'Test Company',
      position: null,
      industry: null,
      bio: null,
      avatar: null,
      linkedin_profile: null,
      password_hash: 'hashed-password',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should login user successfully', async () => {
      mockUserModelInstance.findByEmail.mockResolvedValue(mockUser);
      mockUserModelInstance.verifyPassword.mockResolvedValue(true);
      mockUserModelInstance.updateLastLogin.mockResolvedValue();

      const result = await authService.login(validCredentials);

      expect(mockUserModelInstance.findByEmail).toHaveBeenCalledWith(validCredentials.email);
      expect(mockUserModelInstance.verifyPassword).toHaveBeenCalledWith(
        validCredentials.password,
        mockUser.password_hash
      );
      expect(mockUserModelInstance.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result.user.email).toBe(validCredentials.email);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw ValidationError for missing email', async () => {
      const invalidCredentials = { ...validCredentials, email: '' };

      await expect(authService.login(invalidCredentials)).rejects.toThrow(ValidationError);
      await expect(authService.login(invalidCredentials)).rejects.toThrow('Email and password are required');
    });

    it('should throw ValidationError for missing password', async () => {
      const invalidCredentials = { ...validCredentials, password: '' };

      await expect(authService.login(invalidCredentials)).rejects.toThrow(ValidationError);
      await expect(authService.login(invalidCredentials)).rejects.toThrow('Email and password are required');
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      mockUserModelInstance.findByEmail.mockResolvedValue(null);

      await expect(authService.login(validCredentials)).rejects.toThrow(AuthenticationError);
      await expect(authService.login(validCredentials)).rejects.toThrow('Invalid email or password');
    });

    it('should throw AuthenticationError for invalid password', async () => {
      mockUserModelInstance.findByEmail.mockResolvedValue(mockUser);
      mockUserModelInstance.verifyPassword.mockResolvedValue(false);

      await expect(authService.login(validCredentials)).rejects.toThrow(AuthenticationError);
      await expect(authService.login(validCredentials)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('getProfile', () => {
    const mockProfile = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      company: 'Test Company',
      position: null,
      industry: null,
      bio: null,
      avatar: null,
      linkedin_profile: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should return user profile successfully', async () => {
      mockUserModelInstance.getProfile.mockResolvedValue(mockProfile);

      const result = await authService.getProfile('test-user-id');

      expect(mockUserModelInstance.getProfile).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(mockProfile);
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      mockUserModelInstance.getProfile.mockResolvedValue(null);

      await expect(authService.getProfile('non-existent-id')).rejects.toThrow(AuthenticationError);
      await expect(authService.getProfile('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('refreshToken', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      company: 'Test Company',
      position: null,
      industry: null,
      bio: null,
      avatar: null,
      linkedin_profile: null,
      password_hash: 'hashed-password',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should refresh token successfully', async () => {
      mockUserModelInstance.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshToken('test-user-id');

      expect(mockUserModelInstance.findById).toHaveBeenCalledWith('test-user-id');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      mockUserModelInstance.findById.mockResolvedValue(null);

      await expect(authService.refreshToken('non-existent-id')).rejects.toThrow(AuthenticationError);
      await expect(authService.refreshToken('non-existent-id')).rejects.toThrow('User not found');
    });
  });
});