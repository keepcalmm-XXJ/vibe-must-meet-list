import { UserRepository } from '../../../src/server/database/repositories/UserRepository';
import DatabaseManager from '../../../src/server/database/connection';
import { User, UserProfile } from '../../../src/shared/types/User';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let testUserId: string;

  beforeAll(async () => {
    // Connect to test database
    await DatabaseManager.getInstance().connect();
    userRepository = new UserRepository();
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await userRepository.delete(testUserId);
    }
    await DatabaseManager.getInstance().close();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        id: 'test-user-1',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        company: 'Test Company',
        position: 'Software Engineer',
        industry: 'Technology'
      };

      const createdUser = await userRepository.create(userData);
      testUserId = createdUser.id;

      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.company).toBe(userData.company);
      expect(createdUser.created_at).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        id: 'test-user-2',
        email: 'test@example.com', // Same email as previous test
        password_hash: 'hashed_password',
        name: 'Another User'
      };

      await expect(userRepository.create(userData)).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = await userRepository.findByEmail('test@example.com');
      
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepository.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile with skills, interests, and business goals', async () => {
      // First add some skills, interests, and business goals
      await userRepository.query(
        'INSERT INTO user_skills (user_id, skill) VALUES (?, ?)',
        [testUserId, 'JavaScript']
      );
      await userRepository.query(
        'INSERT INTO user_skills (user_id, skill) VALUES (?, ?)',
        [testUserId, 'TypeScript']
      );
      await userRepository.query(
        'INSERT INTO user_interests (user_id, interest) VALUES (?, ?)',
        [testUserId, 'Web Development']
      );
      await userRepository.query(
        'INSERT INTO user_business_goals (user_id, business_goal) VALUES (?, ?)',
        [testUserId, 'Build SaaS Product']
      );

      const profile = await userRepository.getUserProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile?.skills).toContain('JavaScript');
      expect(profile?.skills).toContain('TypeScript');
      expect(profile?.interests).toContain('Web Development');
      expect(profile?.business_goals).toContain('Build SaaS Product');
      expect(profile?.password_hash).toBeUndefined(); // Should not include password
    });

    it('should return null for non-existent user', async () => {
      const profile = await userRepository.getUserProfile('non-existent-id');
      expect(profile).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile including skills and interests', async () => {
      const updateData: Partial<UserProfile> = {
        bio: 'Updated bio',
        skills: ['React', 'Node.js'],
        interests: ['AI', 'Machine Learning'],
        business_goals: ['Start a Company']
      };

      const updatedProfile = await userRepository.updateUserProfile(testUserId, updateData);

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile?.bio).toBe('Updated bio');
      expect(updatedProfile?.skills).toEqual(['React', 'Node.js']);
      expect(updatedProfile?.interests).toEqual(['AI', 'Machine Learning']);
      expect(updatedProfile?.business_goals).toEqual(['Start a Company']);
    });
  });

  describe('searchUsers', () => {
    it('should search users by name', async () => {
      const results = await userRepository.searchUsers('Test');
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Test');
    });

    it('should search users by company', async () => {
      const results = await userRepository.searchUsers('Test Company');
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].company).toContain('Test Company');
    });
  });

  describe('getUsersWithSkills', () => {
    it('should find users with specific skills', async () => {
      const users = await userRepository.getUsersWithSkills(['React']);
      
      expect(users).toBeDefined();
      expect(users.length).toBeGreaterThan(0);
    });
  });

  describe('update and delete', () => {
    it('should update user', async () => {
      const updatedUser = await userRepository.update(testUserId, {
        position: 'Senior Software Engineer'
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.position).toBe('Senior Software Engineer');
    });

    it('should delete user', async () => {
      const deleted = await userRepository.delete(testUserId);
      expect(deleted).toBe(true);

      const user = await userRepository.findById(testUserId);
      expect(user).toBeNull();
      
      testUserId = ''; // Reset so cleanup doesn't try to delete again
    });
  });
});