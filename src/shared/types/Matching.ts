export type RecommendationStrength = 'HIGH' | 'MEDIUM' | 'LOW';
export type CompanySize = 'STARTUP' | 'SME' | 'ENTERPRISE';
export type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXECUTIVE';

export interface MatchingPreferences {
  id?: number;
  user_id: string;
  target_positions: string[];
  target_industries: string[];
  company_size_preference: CompanySize[];
  experience_level_preference: ExperienceLevel[];
  business_goal_alignment: string[];
  geographic_preference?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface Match {
  id: number;
  event_id: string;
  user_id: string;
  target_user_id: string;
  match_score: number;
  match_reasons: string[];
  common_interests: string[];
  business_synergies: string[];
  recommendation_strength: RecommendationStrength;
  created_at: Date;
}

export interface MatchResult {
  target_user: any; // Will be populated with User data
  match_score: number;
  match_reasons: MatchReason[];
  common_interests: string[];
  business_synergies: string[];
  recommendation_strength: RecommendationStrength;
  partial_match?: {
    matchedCriteria: string[];
    missedCriteria: string[];
    matchPercentage: number;
    explanation: string;
  };
}

export interface MatchReason {
  type: 'INDUSTRY' | 'POSITION' | 'SKILLS' | 'BUSINESS_GOALS' | 'EXPERIENCE' | 'COMPANY_SIZE';
  description: string;
  score: number;
}

export interface MatchingFeedback {
  rating: number;
  feedback_type: 'MATCH_QUALITY' | 'CONNECTION_OUTCOME' | 'MEETING_OUTCOME';
  comments?: string;
}