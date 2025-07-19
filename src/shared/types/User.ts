export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  position: string;
  industry: string;
  bio: string;
  skills: string[];
  interests: string[];
  businessGoals: string[];
  avatar?: string;
  linkedinProfile?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  name: string;
  company: string;
  position: string;
  industry: string;
}

export interface UserProfile {
  name: string;
  company: string;
  position: string;
  industry: string;
  bio: string;
  skills: string[];
  interests: string[];
  businessGoals: string[];
  avatar?: string;
  linkedinProfile?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user: User;
  expiresAt: Date;
}
