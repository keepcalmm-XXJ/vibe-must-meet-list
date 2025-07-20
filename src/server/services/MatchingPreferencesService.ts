import { Database } from 'sqlite';
import { MatchingPreferencesModel } from '../models/MatchingPreferences';
import { MatchingPreferences, CompanySize, ExperienceLevel } from '../../shared/types/Matching';
import { getDatabase } from '../database';

export class MatchingPreferencesService {
  private model: MatchingPreferencesModel;

  constructor(db?: Database) {
    const database = db || getDatabase();
    this.model = new MatchingPreferencesModel(database);
  }

  /**
   * Get user's matching preferences
   */
  async getPreferences(userId: string): Promise<MatchingPreferences | null> {
    return this.model.findByUserId(userId);
  }

  /**
   * Create or update user's matching preferences
   */
  async setPreferences(
    userId: string, 
    preferences: {
      target_positions: string[];
      target_industries: string[];
      company_size_preference: CompanySize[];
      experience_level_preference: ExperienceLevel[];
      business_goal_alignment: string[];
      geographic_preference?: string[];
    }
  ): Promise<MatchingPreferences> {
    // Validate preferences data
    this.validatePreferences(preferences);

    return this.model.upsert(userId, preferences);
  }

  /**
   * Delete user's matching preferences
   */
  async deletePreferences(userId: string): Promise<void> {
    return this.model.deleteByUserId(userId);
  }

  /**
   * Get preferences for all participants in an event
   */
  async getEventParticipantPreferences(eventId: string): Promise<MatchingPreferences[]> {
    return this.model.findByEventParticipants(eventId);
  }

  /**
   * Validate matching preferences data
   */
  private validatePreferences(preferences: any): void {
    const errors: string[] = [];

    // Validate target_positions
    if (!Array.isArray(preferences.target_positions)) {
      errors.push('target_positions must be an array');
    } else if (preferences.target_positions.some((pos: any) => typeof pos !== 'string')) {
      errors.push('All target_positions must be strings');
    }

    // Validate target_industries
    if (!Array.isArray(preferences.target_industries)) {
      errors.push('target_industries must be an array');
    } else if (preferences.target_industries.some((ind: any) => typeof ind !== 'string')) {
      errors.push('All target_industries must be strings');
    }

    // Validate company_size_preference
    const validCompanySizes: CompanySize[] = ['STARTUP', 'SME', 'ENTERPRISE'];
    if (!Array.isArray(preferences.company_size_preference)) {
      errors.push('company_size_preference must be an array');
    } else if (preferences.company_size_preference.some((size: any) => !validCompanySizes.includes(size))) {
      errors.push(`company_size_preference must contain only: ${validCompanySizes.join(', ')}`);
    }

    // Validate experience_level_preference
    const validExperienceLevels: ExperienceLevel[] = ['JUNIOR', 'MID', 'SENIOR', 'EXECUTIVE'];
    if (!Array.isArray(preferences.experience_level_preference)) {
      errors.push('experience_level_preference must be an array');
    } else if (preferences.experience_level_preference.some((level: any) => !validExperienceLevels.includes(level))) {
      errors.push(`experience_level_preference must contain only: ${validExperienceLevels.join(', ')}`);
    }

    // Validate business_goal_alignment
    if (!Array.isArray(preferences.business_goal_alignment)) {
      errors.push('business_goal_alignment must be an array');
    } else if (preferences.business_goal_alignment.some((goal: any) => typeof goal !== 'string')) {
      errors.push('All business_goal_alignment items must be strings');
    }

    // Validate geographic_preference (optional)
    if (preferences.geographic_preference !== undefined) {
      if (!Array.isArray(preferences.geographic_preference)) {
        errors.push('geographic_preference must be an array');
      } else if (preferences.geographic_preference.some((geo: any) => typeof geo !== 'string')) {
        errors.push('All geographic_preference items must be strings');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }
}