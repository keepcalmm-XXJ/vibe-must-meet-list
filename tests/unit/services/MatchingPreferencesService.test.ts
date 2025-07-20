import { Database } from 'sqlite';
import { MatchingPreferencesService } from '../../../src/server/services/MatchingPreferencesService';
import { MatchingPreferences, CompanySize, ExperienceLevel } from '../../../src/shared/types/Matching';

// Mock database
const mockDb = {
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn(),
} as unknown as Database;

describe('MatchingPreferencesService', () => {
  let service: MatchingPreferencesService;
  const userId = 'test-user-id';

  beforeEach(() => {
    service = new MatchingPreferencesService(mockDb);
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return user preferences when they exist', async () => {
      const mockPreferences = {
        id: 1,
        user_id: userId,
        target_positions: '["CEO", "CTO"]',
        target_industries: '["Technology", "Finance"]',
        company_size_preference: '["STARTUP", "SME"]',
        experience_level_preference: '["SENIOR", "EXECUTIVE"]',
        business_goal_alignment: '["Networking", "Investment"]',
        geographic_preference: '["San Francisco", "New York"]',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      (mockDb.get as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(userId);

      expect(result).toEqual({
        id: 1,
        user_id: userId,
        target_positions: ['CEO', 'CTO'],
        target_industries: ['Technology', 'Finance'],
        company_size_preference: ['STARTUP', 'SME'],
        experience_level_preference: ['SENIOR', 'EXECUTIVE'],
        business_goal_alignment: ['Networking', 'Investment'],
        geographic_preference: ['San Francisco', 'New York'],
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when preferences do not exist', async () => {
      (mockDb.get as jest.Mock).mockResolvedValue(null);

      const result = await service.getPreferences(userId);

      expect(result).toBeNull();
    });
  });

  describe('setPreferences', () => {
    const validPreferences = {
      target_positions: ['CEO', 'CTO'],
      target_industries: ['Technology', 'Finance'],
      company_size_preference: ['STARTUP', 'SME'] as CompanySize[],
      experience_level_preference: ['SENIOR', 'EXECUTIVE'] as ExperienceLevel[],
      business_goal_alignment: ['Networking', 'Investment'],
      geographic_preference: ['San Francisco', 'New York'],
    };

    it('should create new preferences when none exist', async () => {
      // Mock that no existing preferences exist
      (mockDb.get as jest.Mock).mockResolvedValueOnce(null);
      
      // Mock successful insert
      (mockDb.run as jest.Mock).mockResolvedValue({ changes: 1 });
      
      // Mock the return of newly created preferences
      const mockCreatedPreferences = {
        id: 1,
        user_id: userId,
        target_positions: JSON.stringify(validPreferences.target_positions),
        target_industries: JSON.stringify(validPreferences.target_industries),
        company_size_preference: JSON.stringify(validPreferences.company_size_preference),
        experience_level_preference: JSON.stringify(validPreferences.experience_level_preference),
        business_goal_alignment: JSON.stringify(validPreferences.business_goal_alignment),
        geographic_preference: JSON.stringify(validPreferences.geographic_preference),
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      (mockDb.get as jest.Mock).mockResolvedValueOnce(mockCreatedPreferences);

      const result = await service.setPreferences(userId, validPreferences);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO matching_preferences'),
        expect.arrayContaining([
          userId,
          JSON.stringify(validPreferences.target_positions),
          JSON.stringify(validPreferences.target_industries),
          JSON.stringify(validPreferences.company_size_preference),
          JSON.stringify(validPreferences.experience_level_preference),
          JSON.stringify(validPreferences.business_goal_alignment),
          JSON.stringify(validPreferences.geographic_preference),
          expect.any(String), // created_at
          expect.any(String), // updated_at
        ])
      );

      expect(result.target_positions).toEqual(validPreferences.target_positions);
    });

    it('should update existing preferences', async () => {
      // Mock existing preferences
      const existingPreferences = {
        id: 1,
        user_id: userId,
        target_positions: '["Old Position"]',
        target_industries: '["Old Industry"]',
        company_size_preference: '["ENTERPRISE"]',
        experience_level_preference: '["JUNIOR"]',
        business_goal_alignment: '["Old Goal"]',
        geographic_preference: '["Old Location"]',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      (mockDb.get as jest.Mock).mockResolvedValueOnce(existingPreferences);
      
      // Mock successful update
      (mockDb.run as jest.Mock).mockResolvedValue({ changes: 1 });
      
      // Mock the return of updated preferences
      const mockUpdatedPreferences = {
        ...existingPreferences,
        target_positions: JSON.stringify(validPreferences.target_positions),
        target_industries: JSON.stringify(validPreferences.target_industries),
        company_size_preference: JSON.stringify(validPreferences.company_size_preference),
        experience_level_preference: JSON.stringify(validPreferences.experience_level_preference),
        business_goal_alignment: JSON.stringify(validPreferences.business_goal_alignment),
        geographic_preference: JSON.stringify(validPreferences.geographic_preference),
        updated_at: '2024-01-02T00:00:00.000Z',
      };
      (mockDb.get as jest.Mock).mockResolvedValueOnce(mockUpdatedPreferences);

      const result = await service.setPreferences(userId, validPreferences);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE matching_preferences'),
        expect.arrayContaining([
          JSON.stringify(validPreferences.target_positions),
          JSON.stringify(validPreferences.target_industries),
          JSON.stringify(validPreferences.company_size_preference),
          JSON.stringify(validPreferences.experience_level_preference),
          JSON.stringify(validPreferences.business_goal_alignment),
          JSON.stringify(validPreferences.geographic_preference),
          expect.any(String), // updated_at
          userId,
        ])
      );

      expect(result.target_positions).toEqual(validPreferences.target_positions);
    });

    it('should validate preferences and throw error for invalid data', async () => {
      const invalidPreferences = {
        target_positions: 'not an array', // Invalid: should be array
        target_industries: ['Technology'],
        company_size_preference: ['INVALID_SIZE'] as any,
        experience_level_preference: ['SENIOR'] as ExperienceLevel[],
        business_goal_alignment: ['Networking'],
      };

      await expect(service.setPreferences(userId, invalidPreferences as any))
        .rejects.toThrow('Validation failed');
    });

    it('should validate company size preferences', async () => {
      const invalidPreferences = {
        target_positions: ['CEO'],
        target_industries: ['Technology'],
        company_size_preference: ['INVALID_SIZE'] as any,
        experience_level_preference: ['SENIOR'] as ExperienceLevel[],
        business_goal_alignment: ['Networking'],
      };

      await expect(service.setPreferences(userId, invalidPreferences as any))
        .rejects.toThrow('company_size_preference must contain only: STARTUP, SME, ENTERPRISE');
    });

    it('should validate experience level preferences', async () => {
      const invalidPreferences = {
        target_positions: ['CEO'],
        target_industries: ['Technology'],
        company_size_preference: ['STARTUP'] as CompanySize[],
        experience_level_preference: ['INVALID_LEVEL'] as any,
        business_goal_alignment: ['Networking'],
      };

      await expect(service.setPreferences(userId, invalidPreferences as any))
        .rejects.toThrow('experience_level_preference must contain only: JUNIOR, MID, SENIOR, EXECUTIVE');
    });
  });

  describe('deletePreferences', () => {
    it('should delete user preferences', async () => {
      (mockDb.run as jest.Mock).mockResolvedValue({ changes: 1 });

      await service.deletePreferences(userId);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM matching_preferences WHERE user_id = ?',
        [userId]
      );
    });
  });

  describe('getEventParticipantPreferences', () => {
    it('should return preferences for all event participants', async () => {
      const eventId = 'test-event-id';
      const mockPreferences = [
        {
          id: 1,
          user_id: 'user1',
          target_positions: '["CEO"]',
          target_industries: '["Technology"]',
          company_size_preference: '["STARTUP"]',
          experience_level_preference: '["SENIOR"]',
          business_goal_alignment: '["Networking"]',
          geographic_preference: '[]',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          user_id: 'user2',
          target_positions: '["CTO"]',
          target_industries: '["Finance"]',
          company_size_preference: '["SME"]',
          experience_level_preference: '["EXECUTIVE"]',
          business_goal_alignment: '["Investment"]',
          geographic_preference: '["New York"]',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      (mockDb.all as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.getEventParticipantPreferences(eventId);

      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe('user1');
      expect(result[0].target_positions).toEqual(['CEO']);
      expect(result[1].user_id).toBe('user2');
      expect(result[1].target_positions).toEqual(['CTO']);

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('FROM matching_preferences mp'),
        [eventId]
      );
    });
  });
});