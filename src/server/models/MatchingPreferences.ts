import { Database } from 'sqlite';
import { MatchingPreferences, CompanySize, ExperienceLevel } from '../../shared/types/Matching';

export class MatchingPreferencesModel {
  constructor(private db: Database) {}

  /**
   * Create or update matching preferences for a user
   */
  async upsert(userId: string, preferences: Omit<MatchingPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MatchingPreferences> {
    const now = new Date().toISOString();
    
    // Check if preferences already exist
    const existing = await this.findByUserId(userId);
    
    if (existing) {
      // Update existing preferences
      const query = `
        UPDATE matching_preferences 
        SET target_positions = ?, 
            target_industries = ?, 
            company_size_preference = ?, 
            experience_level_preference = ?, 
            business_goal_alignment = ?, 
            geographic_preference = ?,
            updated_at = ?
        WHERE user_id = ?
      `;

      await this.db.run(query, [
        JSON.stringify(preferences.target_positions),
        JSON.stringify(preferences.target_industries),
        JSON.stringify(preferences.company_size_preference),
        JSON.stringify(preferences.experience_level_preference),
        JSON.stringify(preferences.business_goal_alignment),
        JSON.stringify(preferences.geographic_preference || []),
        now,
        userId,
      ]);
    } else {
      // Create new preferences
      const query = `
        INSERT INTO matching_preferences (
          user_id, target_positions, target_industries, 
          company_size_preference, experience_level_preference, 
          business_goal_alignment, geographic_preference, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(query, [
        userId,
        JSON.stringify(preferences.target_positions),
        JSON.stringify(preferences.target_industries),
        JSON.stringify(preferences.company_size_preference),
        JSON.stringify(preferences.experience_level_preference),
        JSON.stringify(preferences.business_goal_alignment),
        JSON.stringify(preferences.geographic_preference || []),
        now,
        now,
      ]);
    }

    const result = await this.findByUserId(userId);
    if (!result) {
      throw new Error('Failed to create or update matching preferences');
    }
    return result;
  }

  /**
   * Find matching preferences by user ID
   */
  async findByUserId(userId: string): Promise<MatchingPreferences | null> {
    const query = `
      SELECT id, user_id, target_positions, target_industries, 
             company_size_preference, experience_level_preference, 
             business_goal_alignment, geographic_preference, 
             created_at, updated_at
      FROM matching_preferences 
      WHERE user_id = ?
    `;

    const row = await this.db.get(query, [userId]);
    return row ? this.mapRowToPreferences(row) : null;
  }

  /**
   * Delete matching preferences for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    const query = `DELETE FROM matching_preferences WHERE user_id = ?`;
    await this.db.run(query, [userId]);
  }

  /**
   * Get all users with matching preferences for a specific event
   */
  async findByEventParticipants(eventId: string): Promise<MatchingPreferences[]> {
    const query = `
      SELECT mp.id, mp.user_id, mp.target_positions, mp.target_industries, 
             mp.company_size_preference, mp.experience_level_preference, 
             mp.business_goal_alignment, mp.geographic_preference, 
             mp.created_at, mp.updated_at
      FROM matching_preferences mp
      INNER JOIN event_participants ep ON mp.user_id = ep.user_id
      WHERE ep.event_id = ? AND ep.status = 'ACTIVE'
    `;

    const rows = await this.db.all(query, [eventId]);
    return rows.map(row => this.mapRowToPreferences(row));
  }

  /**
   * Map database row to MatchingPreferences object
   */
  private mapRowToPreferences(row: any): MatchingPreferences {
    return {
      id: row.id,
      user_id: row.user_id,
      target_positions: JSON.parse(row.target_positions || '[]'),
      target_industries: JSON.parse(row.target_industries || '[]'),
      company_size_preference: JSON.parse(row.company_size_preference || '[]'),
      experience_level_preference: JSON.parse(row.experience_level_preference || '[]'),
      business_goal_alignment: JSON.parse(row.business_goal_alignment || '[]'),
      geographic_preference: JSON.parse(row.geographic_preference || '[]'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}