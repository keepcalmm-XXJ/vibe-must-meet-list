import { UserModel } from '../../src/server/models/User';
import { Database } from 'sqlite';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock database
const mockDb = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
} as unknown as jest.Mocked<Database>;

describe('UserModel', () => {
  let userModel: UserModel;

  beforeEach(() => {
    jest.clearAllMocks();
    userModel = new UserModel(mockDb);
  });

  describe('create', () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
      company: 'Test Company',
    };

    it('should create a new user successfully', async () => {
      const mockHashedPassword = 'hashed-password';
      const mockUser = {
        id: 'mock-uuid',
        email: userData.email,
        password_hash: mockHashedPassword,
        name: userData.name,
        company: userData.company,
        position: null,
        industry: null,
        bio: null,
        avatar: null,
        linkedin_profile: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockBcrypt.hash.mockResolvedValue(mockHashedPassword);
      mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 } as any);
      mockDb.get.mockResolvedValue(mockUser);

      const result = await userModel.create(userData);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockDb.run).toHaveBeenCalled();
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.company).toBe(userData.company);
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        name: 'Test User',
        company: 'Test Company',
        position: null,
        industry: null,
        bio: null,
        avatar: null,
        linkedin_profile: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.get.mockResolvedValue(mockUser);

      const result = await userModel.findById('test-user-id');

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test-user-id']
      );
      expect(result).toBeTruthy();
      expect(result!.id).toBe('test-user-id');
      expect(result!.email).toBe('test@example.com');
    });

    it('should return null for non-existent user', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await userModel.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        name: 'Test User',
        company: 'Test Company',
        position: null,
        industry: null,
        bio: null,
        avatar: null,
        linkedin_profile: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.get.mockResolvedValue(mockUser);

      const result = await userModel.findByEmail('test@example.com');

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test@example.com']
      );
      expect(result).toBeTruthy();
      expect(result!.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await userModel.findByEmail('non-existent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await userModel.verifyPassword('plainPassword', 'hashedPassword');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('plainPassword', 'hashedPassword');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await userModel.verifyPassword('wrongPassword', 'hashedPassword');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
      expect(result).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await userModel.emailExists('existing@example.com');

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        ['existing@example.com']
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });

      const result = await userModel.emailExists('non-existing@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password hash', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        name: 'Test User',
        company: 'Test Company',
        position: null,
        industry: null,
        bio: null,
        avatar: null,
        linkedin_profile: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.get.mockResolvedValue(mockUser);

      const result = await userModel.getProfile('test-user-id');

      expect(result).toBeTruthy();
      expect(result!.id).toBe('test-user-id');
      expect(result!.email).toBe('test@example.com');
      expect('password_hash' in result!).toBe(false);
    });

    it('should return null for non-existent user', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await userModel.getProfile('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 } as any);

      await userModel.updateLastLogin('test-user-id');

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['test-user-id'])
      );
    });
  });
});