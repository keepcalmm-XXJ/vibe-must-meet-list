import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, UserRegistrationData } from '../../shared/types/User';
import { appConfig } from '../config';

export class UserModel {
  constructor(private db: Database) {}

  /**
   * Create a new user
   */
  async create(userData: UserRegistrationData): Promise<User> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(userData.password, appConfig.security.bcryptRounds);
    const now = new Date();

    const query = `
      INSERT INTO users (
        id, email, password_hash, name, company, position, 
        industry, bio, linkedin_profile, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(query, [
      id,
      userData.email,
      passwordHash,
      userData.name,
      userData.company || null,
      userData.position || null,
      userData.industry || null,
      userData.bio || null,
      userData.linkedin_profile || null,
      now.toISOString(),
      now.toISOString(),
    ]);

    const user = await this.findById(id);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, name, company, position, 
             industry, bio, avatar, linkedin_profile, created_at, updated_at
      FROM users 
      WHERE id = ?
    `;

    const row = await this.db.get(query, [id]);
    return row ? this.mapRowToUser(row) : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, name, company, position, 
             industry, bio, avatar, linkedin_profile, created_at, updated_at
      FROM users 
      WHERE email = ?
    `;

    const row = await this.db.get(query, [email]);
    return row ? this.mapRowToUser(row) : null;
  }

  /**
   * Verify user password
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE users 
      SET updated_at = ? 
      WHERE id = ?
    `;

    await this.db.run(query, [new Date().toISOString(), id]);
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM users WHERE email = ?`;
    const result = await this.db.get(query, [email]);
    return result.count > 0;
  }

  /**
   * Get user profile (without password hash)
   */
  async getProfile(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const { password_hash, ...profile } = user;
    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, updates: Partial<Omit<User, 'id' | 'email' | 'password_hash' | 'created_at'>>): Promise<User | null> {
    const allowedFields = ['name', 'company', 'position', 'industry', 'bio', 'avatar', 'linkedin_profile'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    await this.db.run(query, updateValues);
    return this.findById(id);
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      company: row.company,
      position: row.position,
      industry: row.industry,
      bio: row.bio,
      avatar: row.avatar,
      linkedin_profile: row.linkedin_profile,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}