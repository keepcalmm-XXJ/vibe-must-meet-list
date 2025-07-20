import { UserService } from '../../src/server/services/UserService';
import { UserModel } from '../../src/server/models/User';
import { getDatabase, initializeDatabase, closeDatabase } from '../../src/server/database/connection';

describe('UserService', () => {
  let userService: UserService;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize database connection
    await initializeDatabase();
    userService = new UserService();
  });

  afterAll(async () => {
    // Clean up test user if created
    if (testUserId) {
      try {
        const userModel = new UserModel(getDatabase());
        await getDatabase().run('DELETE FROM users WHERE id = ?', [testUserId]);
        await getDatabase().run('DELETE FROM user_skills WHERE user_id = ?', [testUserId]);
        await getDatabase().run('DELETE FROM user_interests WHERE user_id = ?', [testUserId]);
        await getDatabase().run('DELETE FROM user_business_goals WHERE user_id = ?', [testUserId]);
      } catch (error) {
        console.log('Cleanup error (expected):', error);
      }
    }
    await closeDatabase();
  });

  describe('getProfile', () => {
    it('should throw NotFoundError for non-existent user', async () => {
      await expect(userService.getProfile('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    beforeEach(async () => {
      // Clean up any existing test user
      if (testUserId) {
        try {
          await getDatabase().run('DELETE FROM users WHERE id = ?', [testUserId]);
          await getDatabase().run('DELETE FROM user_skills WHERE user_id = ?', [testUserId]);
          await getDatabase().run('DELETE FROM user_interests WHERE user_id = ?', [testUserId]);
          await getDatabase().run('DELETE FROM user_business_goals WHERE user_id = ?', [testUserId]);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Create a test user with unique email
      const userModel = new UserModel(getDatabase());
      const uniqueEmail = `test-service-${Date.now()}@example.com`;
      const testUser = await userModel.create({
        email: uniqueEmail,
        password: 'TestPassword123',
        name: 'Test Service User',
        company: 'Test Company',
        position: 'Test Position',
        industry: 'Technology'
      });
      testUserId = testUser.id;
    });

    it('should update user profile with basic fields', async () => {
      const updateData = {
        name: 'Updated Name',
        company: 'Updated Company',
        bio: 'Updated bio'
      };

      const updatedProfile = await userService.updateProfile(testUserId, updateData);

      expect(updatedProfile.name).toBe('Updated Name');
      expect(updatedProfile.company).toBe('Updated Company');
      expect(updatedProfile.bio).toBe('Updated bio');
    });

    it('should update user profile with skills, interests, and business goals', async () => {
      const updateData = {
        skills: ['JavaScript', 'TypeScript', 'React'],
        interests: ['AI', 'Machine Learning'],
        business_goals: ['Network with peers', 'Find mentors']
      };

      const updatedProfile = await userService.updateProfile(testUserId, updateData);

      expect(updatedProfile.skills).toEqual(['JavaScript', 'TypeScript', 'React']);
      expect(updatedProfile.interests).toEqual(['AI', 'Machine Learning']);
      expect(updatedProfile.business_goals).toEqual(['Network with peers', 'Find mentors']);
    });

    it('should handle empty arrays for skills, interests, and business goals', async () => {
      const updateData = {
        skills: [],
        interests: [],
        business_goals: []
      };

      const updatedProfile = await userService.updateProfile(testUserId, updateData);

      expect(updatedProfile.skills).toEqual([]);
      expect(updatedProfile.interests).toEqual([]);
      expect(updatedProfile.business_goals).toEqual([]);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      const updateData = { name: 'Updated Name' };
      
      await expect(userService.updateProfile('non-existent-id', updateData)).rejects.toThrow('User not found');
    });
  });

  describe('updateAvatar', () => {
    beforeEach(async () => {
      // Clean up any existing test user
      if (testUserId) {
        try {
          await getDatabase().run('DELETE FROM users WHERE id = ?', [testUserId]);
          await getDatabase().run('DELETE FROM user_skills WHERE user_id = ?', [testUserId]);
          await getDatabase().run('DELETE FROM user_interests WHERE user_id = ?', [testUserId]);
          await getDatabase().run('DELETE FROM user_business_goals WHERE user_id = ?', [testUserId]);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Create a test user with unique email
      const userModel = new UserModel(getDatabase());
      const uniqueEmail = `test-avatar-${Date.now()}@example.com`;
      const testUser = await userModel.create({
        email: uniqueEmail,
        password: 'TestPassword123',
        name: 'Test Avatar User'
      });
      testUserId = testUser.id;
    });

    it('should update user avatar', async () => {
      const avatarPath = '/uploads/avatars/test-avatar.png';
      
      const updatedProfile = await userService.updateAvatar(testUserId, avatarPath);

      expect(updatedProfile.avatar).toBe(avatarPath);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      const avatarPath = '/uploads/avatars/test-avatar.png';
      
      await expect(userService.updateAvatar('non-existent-id', avatarPath)).rejects.toThrow('User not found');
    });
  });
});