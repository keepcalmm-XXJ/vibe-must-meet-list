import { UserModel } from '../models/User';
import { UserRegistrationData } from '../../shared/types/User';
import { generateToken } from '../middleware/auth';
import { ValidationError, AuthenticationError, ConflictError } from '../middleware/errorHandler';
import { getDatabase } from '../database/connection';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    company?: string;
    position?: string;
    industry?: string;
    bio?: string;
    avatar?: string;
    linkedin_profile?: string;
  };
  token: string;
}

export class AuthService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel(getDatabase());
  }

  /**
   * Register a new user
   */
  async register(userData: UserRegistrationData): Promise<AuthResponse> {
    // Validate required fields
    if (!userData.email || !userData.password || !userData.name) {
      throw new ValidationError('Email, password, and name are required');
    }

    // Check if email already exists
    const existingUser = await this.userModel.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = await this.userModel.create(userData);

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Return user data without password hash
    const { password_hash, created_at, updated_at, ...userResponse } = user;

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Validate required fields
    if (!credentials.email || !credentials.password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await this.userModel.findByEmail(credentials.email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.userModel.verifyPassword(
      credentials.password,
      user.password_hash!
    );

    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await this.userModel.updateLastLogin(user.id);

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Return user data without password hash
    const { password_hash, created_at, updated_at, ...userResponse } = user;

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string) {
    const profile = await this.userModel.getProfile(userId);
    if (!profile) {
      throw new AuthenticationError('User not found');
    }
    return profile;
  }

  /**
   * Refresh token (validate current token and issue new one)
   */
  async refreshToken(userId: string): Promise<{ token: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return { token };
  }
}