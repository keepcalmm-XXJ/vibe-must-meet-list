export interface User {
  id: string;
  email: string;
  password_hash?: string; // Optional for security - not always included in responses
  name: string;
  company?: string;
  position?: string;
  industry?: string;
  bio?: string;
  avatar?: string;
  linkedin_profile?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile extends Omit<User, 'password_hash'> {
  skills: string[];
  interests: string[];
  business_goals: string[];
}

export interface UserRegistrationData {
  email: string;
  password: string;
  name: string;
  company?: string;
  position?: string;
  industry?: string;
  bio?: string;
  linkedin_profile?: string;
}

export interface UserSkill {
  id: number;
  user_id: string;
  skill: string;
  created_at: Date;
}

export interface UserInterest {
  id: number;
  user_id: string;
  interest: string;
  created_at: Date;
}

export interface UserBusinessGoal {
  id: number;
  user_id: string;
  business_goal: string;
  created_at: Date;
}