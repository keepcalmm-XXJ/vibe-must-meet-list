import request from 'supertest';
import { app } from '../../src/server';
import { getDatabase } from '../../src/server/database';
import { Database } from 'sqlite';

describe('Matching Preferences API', () => {
  let db: Database;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    db = getDatabase();
    
    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        company: 'Test Company',
        position: 'Test Position',
        industry: 'Technology',
      });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.run('DELETE FROM users WHERE email = ?', ['test@example.com']);
    await db.run('DELETE FROM matching_preferences WHERE user_id = ?', [userId]);
  });

  describe('GET /api/v1/users/preferences', () => {
    it('should return null when user has no preferences', async () => {
      const response = await request(app)
        .get('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users/preferences');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/users/preferences', () => {
    const validPreferences = {
      target_positions: ['CEO', 'CTO', 'Product Manager'],
      target_industries: ['Technology', 'Finance', 'Healthcare'],
      company_size_preference: ['STARTUP', 'SME'],
      experience_level_preference: ['SENIOR', 'EXECUTIVE'],
      business_goal_alignment: ['Networking', 'Investment', 'Partnership'],
      geographic_preference: ['San Francisco', 'New York'],
    };

    it('should create new preferences successfully', async () => {
      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validPreferences);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Matching preferences updated successfully');
      expect(response.body.data.preferences).toMatchObject({
        user_id: userId,
        target_positions: validPreferences.target_positions,
        target_industries: validPreferences.target_industries,
        company_size_preference: validPreferences.company_size_preference,
        experience_level_preference: validPreferences.experience_level_preference,
        business_goal_alignment: validPreferences.business_goal_alignment,
        geographic_preference: validPreferences.geographic_preference,
      });
    });

    it('should update existing preferences successfully', async () => {
      const updatedPreferences = {
        target_positions: ['VP Engineering', 'Director'],
        target_industries: ['AI/ML', 'Fintech'],
        company_size_preference: ['ENTERPRISE'],
        experience_level_preference: ['EXECUTIVE'],
        business_goal_alignment: ['Strategic Partnership'],
        geographic_preference: ['London', 'Berlin'],
      };

      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedPreferences);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.target_positions).toEqual(updatedPreferences.target_positions);
      expect(response.body.data.preferences.target_industries).toEqual(updatedPreferences.target_industries);
    });

    it('should validate required fields', async () => {
      const invalidPreferences = {
        target_positions: ['CEO'],
        // Missing required fields
      };

      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate company size values', async () => {
      const invalidPreferences = {
        ...validPreferences,
        company_size_preference: ['INVALID_SIZE'],
      };

      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate experience level values', async () => {
      const invalidPreferences = {
        ...validPreferences,
        experience_level_preference: ['INVALID_LEVEL'],
      };

      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate array limits', async () => {
      const invalidPreferences = {
        ...validPreferences,
        target_positions: new Array(25).fill('Position'), // Exceeds max of 20
      };

      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should allow empty arrays', async () => {
      const emptyPreferences = {
        target_positions: [],
        target_industries: [],
        company_size_preference: [],
        experience_level_preference: [],
        business_goal_alignment: [],
        geographic_preference: [],
      };

      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emptyPreferences);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle optional geographic_preference', async () => {
      const preferencesWithoutGeo = {
        target_positions: ['CEO'],
        target_industries: ['Technology'],
        company_size_preference: ['STARTUP'],
        experience_level_preference: ['SENIOR'],
        business_goal_alignment: ['Networking'],
        // geographic_preference is optional
      };

      const response = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferencesWithoutGeo);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/v1/users/preferences')
        .send(validPreferences);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/preferences (after creation)', () => {
    it('should return user preferences after they are created', async () => {
      const response = await request(app)
        .get('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).not.toBeNull();
      expect(response.body.data.preferences.user_id).toBe(userId);
      expect(Array.isArray(response.body.data.preferences.target_positions)).toBe(true);
    });
  });

  describe('DELETE /api/v1/users/preferences', () => {
    it('should delete user preferences successfully', async () => {
      const response = await request(app)
        .delete('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Matching preferences deleted successfully');
    });

    it('should return null after deletion', async () => {
      const response = await request(app)
        .get('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.preferences).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/users/preferences');

      expect(response.status).toBe(401);
    });
  });
});