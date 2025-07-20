import { UserModel } from '../models/User';
import { User, UserProfile } from '../../shared/types/User';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { getDatabase } from '../database/connection';

export interface UserProfileUpdateData {
  name?: string;
  company?: string;
  position?: string;
  industry?: string;
  bio?: string;
  linkedin_profile?: string;
  skills?: string[];
  interests?: string[];
  business_goals?: string[];
}

export class UserService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel(getDatabase());
  }

  /**
   * Get user profile with skills, interests, and business goals
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userModel.getProfile(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get additional profile data
    const [skills, interests, businessGoals] = await Promise.all([
      this.getUserSkills(userId),
      this.getUserInterests(userId),
      this.getUserBusinessGoals(userId),
    ]);

    return {
      ...user,
      skills,
      interests,
      business_goals: businessGoals,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UserProfileUpdateData): Promise<UserProfile> {
    // Validate user exists
    const existingUser = await this.userModel.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Extract basic profile fields
    const { skills, interests, business_goals, ...basicFields } = updateData;

    // Update basic profile fields
    if (Object.keys(basicFields).length > 0) {
      await this.userModel.updateProfile(userId, basicFields);
    }

    // Update skills if provided
    if (skills !== undefined) {
      await this.updateUserSkills(userId, skills);
    }

    // Update interests if provided
    if (interests !== undefined) {
      await this.updateUserInterests(userId, interests);
    }

    // Update business goals if provided
    if (business_goals !== undefined) {
      await this.updateUserBusinessGoals(userId, business_goals);
    }

    // Return updated profile
    return this.getProfile(userId);
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarPath: string): Promise<UserProfile> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userModel.updateProfile(userId, { avatar: avatarPath });
    return this.getProfile(userId);
  }

  /**
   * Get user skills
   */
  private async getUserSkills(userId: string): Promise<string[]> {
    const db = getDatabase();
    const query = `SELECT skill FROM user_skills WHERE user_id = ? ORDER BY created_at`;
    const rows = await db.all(query, [userId]);
    return rows.map(row => row.skill);
  }

  /**
   * Get user interests
   */
  private async getUserInterests(userId: string): Promise<string[]> {
    const db = getDatabase();
    const query = `SELECT interest FROM user_interests WHERE user_id = ? ORDER BY created_at`;
    const rows = await db.all(query, [userId]);
    return rows.map(row => row.interest);
  }

  /**
   * Get user business goals
   */
  private async getUserBusinessGoals(userId: string): Promise<string[]> {
    const db = getDatabase();
    const query = `SELECT business_goal FROM user_business_goals WHERE user_id = ? ORDER BY created_at`;
    const rows = await db.all(query, [userId]);
    return rows.map(row => row.business_goal);
  }

  /**
   * Update user skills
   */
  private async updateUserSkills(userId: string, skills: string[]): Promise<void> {
    const db = getDatabase();
    
    // Remove existing skills
    await db.run(`DELETE FROM user_skills WHERE user_id = ?`, [userId]);
    
    // Add new skills
    if (skills.length > 0) {
      const insertQuery = `INSERT INTO user_skills (user_id, skill, created_at) VALUES (?, ?, ?)`;
      const now = new Date().toISOString();
      
      for (const skill of skills) {
        if (skill.trim()) {
          await db.run(insertQuery, [userId, skill.trim(), now]);
        }
      }
    }
  }

  /**
   * Update user interests
   */
  private async updateUserInterests(userId: string, interests: string[]): Promise<void> {
    const db = getDatabase();
    
    // Remove existing interests
    await db.run(`DELETE FROM user_interests WHERE user_id = ?`, [userId]);
    
    // Add new interests
    if (interests.length > 0) {
      const insertQuery = `INSERT INTO user_interests (user_id, interest, created_at) VALUES (?, ?, ?)`;
      const now = new Date().toISOString();
      
      for (const interest of interests) {
        if (interest.trim()) {
          await db.run(insertQuery, [userId, interest.trim(), now]);
        }
      }
    }
  }

  /**
   * Update user business goals
   */
  private async updateUserBusinessGoals(userId: string, businessGoals: string[]): Promise<void> {
    const db = getDatabase();
    
    // Remove existing business goals
    await db.run(`DELETE FROM user_business_goals WHERE user_id = ?`, [userId]);
    
    // Add new business goals
    if (businessGoals.length > 0) {
      const insertQuery = `INSERT INTO user_business_goals (user_id, business_goal, created_at) VALUES (?, ?, ?)`;
      const now = new Date().toISOString();
      
      for (const goal of businessGoals) {
        if (goal.trim()) {
          await db.run(insertQuery, [userId, goal.trim(), now]);
        }
      }
    }
  }
}