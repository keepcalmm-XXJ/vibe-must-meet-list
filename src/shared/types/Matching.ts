export interface MatchingPreferences {
  targetPositions: string[];
  targetIndustries: string[];
  companySizePreference: CompanySize[];
  experienceLevelPreference: ExperienceLevel[];
  businessGoalAlignment: string[];
  geographicPreference?: string[];
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  EXECUTIVE = 'executive',
}

export interface MatchResult {
  targetUser: User;
  matchScore: number;
  matchReasons: MatchReason[];
  commonInterests: string[];
  businessSynergies: string[];
  recommendationStrength: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MatchReason {
  dimension: string;
  score: number;
  explanation: string;
}

export interface MatchingFeedback {
  targetUserId: string;
  rating: number;
  connected: boolean;
  meetingScheduled: boolean;
  feedback?: string;
}

import { User } from './User';
