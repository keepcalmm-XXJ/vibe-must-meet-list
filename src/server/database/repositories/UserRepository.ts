import { BaseRepository } from '../BaseRepository';
import { User, UserProfile, UserSkill, UserInterest, UserBusinessGoal } from '../../../shared/types/User';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.findOneBy({ email });
  }

  /**
   * Get user profile with skills, interests, and business goals
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }

      // Remove password_hash from user object
      const { password_hash, ...userWithoutPassword } = user;

      // Get user skills
      const skills = await this.query<UserSkill>(
        'SELECT * FROM user_skills WHERE user_id = ?',
        [userId]
      );

      // Get user interests
      const interests = await this.query<UserInterest>(
        'SELECT * FROM user_interests WHERE user_id = ?',
        [userId]
      );

      // Get user business goals
      const businessGoals = await this.query<UserBusinessGoal>(
        'SELECT * FROM user_business_goals WHERE user_id = ?',
        [userId]
      );

      return {
        ...userWithoutPassword,
        skills: skills.map(s => s.skill),
        interests: interests.map(i => i.interest),
        business_goals: businessGoals.map(bg => bg.business_goal)
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile including skills, interests, and business goals
   */
  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      await this.beginTransaction();

      // Update basic user information
      const { skills, interests, business_goals, ...basicUserData } = profileData;
      
      if (Object.keys(basicUserData).length > 0) {
        await this.update(userId, basicUserData);
      }

      // Update skills
      if (skills) {
        await this.updateUserSkills(userId, skills);
      }

      // Update interests
      if (interests) {
        await this.updateUserInterests(userId, interests);
      }

      // Update business goals
      if (business_goals) {
        await this.updateUserBusinessGoals(userId, business_goals);
      }

      await this.commitTransaction();

      return await this.getUserProfile(userId);
    } catch (error) {
      await this.rollbackTransaction();
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user skills
   */
  private async updateUserSkills(userId: string, skills: string[]): Promise<void> {
    // Delete existing skills
    await this.query('DELETE FROM user_skills WHERE user_id = ?', [userId]);

    // Insert new skills
    for (const skill of skills) {
      await this.query(
        'INSERT INTO user_skills (user_id, skill) VALUES (?, ?)',
        [userId, skill]
      );
    }
  }

  /**
   * Update user interests
   */
  private async updateUserInterests(userId: string, interests: string[]): Promise<void> {
    // Delete existing interests
    await this.query('DELETE FROM user_interests WHERE user_id = ?', [userId]);

    // Insert new interests
    for (const interest of interests) {
      await this.query(
        'INSERT INTO user_interests (user_id, interest) VALUES (?, ?)',
        [userId, interest]
      );
    }
  }

  /**
   * Update user business goals
   */
  private async updateUserBusinessGoals(userId: string, businessGoals: string[]): Promise<void> {
    // Delete existing business goals
    await this.query('DELETE FROM user_business_goals WHERE user_id = ?', [userId]);

    // Insert new business goals
    for (const goal of businessGoals) {
      await this.query(
        'INSERT INTO user_business_goals (user_id, business_goal) VALUES (?, ?)',
        [userId, goal]
      );
    }
  }

  /**
   * Get users by industry
   */
  async getUsersByIndustry(industry: string): Promise<User[]> {
    return await this.findBy({ industry });
  }

  /**
   * Get users by position
   */
  async getUsersByPosition(position: string): Promise<User[]> {
    return await this.findBy({ position });
  }

  /**
   * Search users by name or company
   */
  async searchUsers(searchTerm: string, limit: number = 20): Promise<User[]> {
    try {
      const sql = `
        SELECT * FROM users 
        WHERE name LIKE ? OR company LIKE ? 
        ORDER BY name 
        LIMIT ?
      `;
      const searchPattern = `%${searchTerm}%`;
      return await this.query<User>(sql, [searchPattern, searchPattern, limit]);
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get users with specific skills
   */
  async getUsersWithSkills(skills: string[]): Promise<User[]> {
    try {
      const placeholders = skills.map(() => '?').join(',');
      const sql = `
        SELECT DISTINCT u.* FROM users u
        INNER JOIN user_skills us ON u.id = us.user_id
        WHERE us.skill IN (${placeholders})
      `;
      return await this.query<User>(sql, skills);
    } catch (error) {
      console.error('Error getting users with skills:', error);
      throw error;
    }
  }

  /**
   * Get users with specific interests
   */
  async getUsersWithInterests(interests: string[]): Promise<User[]> {
    try {
      const placeholders = interests.map(() => '?').join(',');
      const sql = `
        SELECT DISTINCT u.* FROM users u
        INNER JOIN user_interests ui ON u.id = ui.user_id
        WHERE ui.interest IN (${placeholders})
      `;
      return await this.query<User>(sql, interests);
    } catch (error) {
      console.error('Error getting users with interests:', error);
      throw error;
    }
  }
}