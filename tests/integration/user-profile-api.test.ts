import request from 'supertest';
import { app } from '../../src/server/index';
import { initializeDatabase, closeDatabase } from '../../src/server/database/connection';

describe('User Profile API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('User Registration and Profile Management', () => {
    it('should register a new user and get profile', async () => {
      // Register user
      const registerData = {
        email: `test-integration-${Date.now()}@example.com`,
        password: 'TestPassword123',
        name: 'Integration Test User',
        company: 'Test Company',
        position: 'Software Engineer',
        industry: 'Technology',
        bio: 'Test bio for integration test',
        linkedin_profile: 'https://linkedin.com/in/testuser'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(registerData.email);
      expect(registerResponse.body.data.token).toBeDefined();

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;

      // Get profile
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.profile.email).toBe(registerData.email);
      expect(profileResponse.body.data.profile.name).toBe(registerData.name);
      expect(profileResponse.body.data.profile.skills).toEqual([]);
      expect(profileResponse.body.data.profile.interests).toEqual([]);
      expect(profileResponse.body.data.profile.business_goals).toEqual([]);
    });

    it('should update user profile with basic information', async () => {
      const updateData = {
        name: 'Updated Integration User',
        company: 'Updated Company',
        bio: 'Updated bio with more information'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.name).toBe(updateData.name);
      expect(response.body.data.profile.company).toBe(updateData.company);
      expect(response.body.data.profile.bio).toBe(updateData.bio);
    });

    it('should update user profile with skills, interests, and business goals', async () => {
      const updateData = {
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        interests: ['AI', 'Machine Learning', 'Web Development'],
        business_goals: ['Network with industry leaders', 'Find potential partners', 'Learn new technologies']
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.skills).toEqual(updateData.skills);
      expect(response.body.data.profile.interests).toEqual(updateData.interests);
      expect(response.body.data.profile.business_goals).toEqual(updateData.business_goals);
    });

    it('should handle validation errors for invalid profile data', async () => {
      const invalidData = {
        name: 'A', // Too short
        bio: 'A'.repeat(501), // Too long
        linkedin_profile: 'invalid-url'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication for profile endpoints', async () => {
      // Test without token
      await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      await request(app)
        .put('/api/v1/users/profile')
        .send({ name: 'Test' })
        .expect(401);

      // Test with invalid token
      await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});