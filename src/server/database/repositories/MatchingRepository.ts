import { BaseRepository } from '../BaseRepository';
import { Match, MatchingPreferences } from '../../../shared/types/Matching';

export class MatchingRepository extends BaseRepository<Match> {
  constructor() {
    super('matches');
  }

  /**
   * Get matches for a user in an event
   */
  async getUserMatches(userId: string, eventId: string): Promise<Match[]> {
    return await this.findBy({ user_id: userId, event_id: eventId }, {
      orderBy: 'match_score',
      orderDirection: 'DESC'
    });
  }

  /**
   * Get top matches for a user in an event
   */
  async getTopMatches(userId: string, eventId: string, limit: number = 10): Promise<Match[]> {
    return await this.findBy({ user_id: userId, event_id: eventId }, {
      orderBy: 'match_score',
      orderDirection: 'DESC',
      limit
    });
  }

  /**
   * Save match result
   */
  async saveMatch(matchData: Omit<Match, 'id' | 'created_at'>): Promise<Match> {
    try {
      // Convert arrays to JSON strings for storage
      const dataToSave: any = {
        ...matchData,
        match_reasons: JSON.stringify(matchData.match_reasons),
        common_interests: JSON.stringify(matchData.common_interests),
        business_synergies: JSON.stringify(matchData.business_synergies)
      };

      return await this.create(dataToSave);
    } catch (error) {
      console.error('Error saving match:', error);
      throw error;
    }
  }

  /**
   * Update match score
   */
  async updateMatchScore(matchId: number, newScore: number): Promise<Match | null> {
    return await this.update(matchId, { match_score: newScore });
  }

  /**
   * Get matches between two users
   */
  async getMatchBetweenUsers(userId1: string, userId2: string, eventId: string): Promise<Match | null> {
    try {
      const sql = `
        SELECT * FROM matches 
        WHERE ((user_id = ? AND target_user_id = ?) OR (user_id = ? AND target_user_id = ?))
        AND event_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;
      return await this.queryOne<Match>(sql, [userId1, userId2, userId2, userId1, eventId]);
    } catch (error) {
      console.error('Error getting match between users:', error);
      throw error;
    }
  }

  /**
   * Delete matches for an event
   */
  async deleteEventMatches(eventId: string): Promise<boolean> {
    try {
      await this.query('DELETE FROM matches WHERE event_id = ?', [eventId]);
      return true;
    } catch (error) {
      console.error('Error deleting event matches:', error);
      throw error;
    }
  }

  /**
   * Get match statistics for an event
   */
  async getEventMatchStats(eventId: string): Promise<{
    totalMatches: number;
    averageScore: number;
    highQualityMatches: number;
  }> {
    try {
      const stats = await this.queryOne<{
        total_matches: number;
        avg_score: number;
        high_quality_matches: number;
      }>(`
        SELECT 
          COUNT(*) as total_matches,
          AVG(match_score) as avg_score,
          COUNT(CASE WHEN recommendation_strength = 'HIGH' THEN 1 END) as high_quality_matches
        FROM matches 
        WHERE event_id = ?
      `, [eventId]);

      return {
        totalMatches: stats?.total_matches || 0,
        averageScore: stats?.avg_score || 0,
        highQualityMatches: stats?.high_quality_matches || 0
      };
    } catch (error) {
      console.error('Error getting event match stats:', error);
      throw error;
    }
  }
}

export class MatchingPreferencesRepository extends BaseRepository<MatchingPreferences> {
  constructor() {
    super('matching_preferences');
  }

  /**
   * Get user's matching preferences
   */
  async getUserPreferences(userId: string): Promise<MatchingPreferences | null> {
    try {
      const preferences = await this.findOneBy({ user_id: userId });
      if (!preferences) {
        return null;
      }

      // Parse JSON fields
      return {
        ...preferences,
        target_positions: JSON.parse(preferences.target_positions as any || '[]'),
        target_industries: JSON.parse(preferences.target_industries as any || '[]'),
        company_size_preference: JSON.parse(preferences.company_size_preference as any || '[]'),
        experience_level_preference: JSON.parse(preferences.experience_level_preference as any || '[]'),
        business_goal_alignment: JSON.parse(preferences.business_goal_alignment as any || '[]'),
        geographic_preference: JSON.parse(preferences.geographic_preference as any || '[]')
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Save or update user's matching preferences
   */
  async saveUserPreferences(userId: string, preferences: Omit<MatchingPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MatchingPreferences> {
    try {
      // Convert arrays to JSON strings for storage
      const dataToSave: any = {
        user_id: userId,
        target_positions: JSON.stringify(preferences.target_positions || []),
        target_industries: JSON.stringify(preferences.target_industries || []),
        company_size_preference: JSON.stringify(preferences.company_size_preference || []),
        experience_level_preference: JSON.stringify(preferences.experience_level_preference || []),
        business_goal_alignment: JSON.stringify(preferences.business_goal_alignment || []),
        geographic_preference: JSON.stringify(preferences.geographic_preference || [])
      };

      // Check if preferences already exist
      const existing = await this.findOneBy({ user_id: userId });
      
      if (existing) {
        await this.update(existing.id!, dataToSave);
        return await this.getUserPreferences(userId) as MatchingPreferences;
      } else {
        await this.create(dataToSave);
        return await this.getUserPreferences(userId) as MatchingPreferences;
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }

  /**
   * Delete user's matching preferences
   */
  async deleteUserPreferences(userId: string): Promise<boolean> {
    try {
      await this.query('DELETE FROM matching_preferences WHERE user_id = ?', [userId]);
      return true;
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      throw error;
    }
  }
}