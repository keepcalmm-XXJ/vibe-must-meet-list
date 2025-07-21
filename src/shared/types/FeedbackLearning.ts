// Feedback Learning System Types

export type BehaviorType = 
  | 'VIEW_PROFILE' 
  | 'SEND_CONNECTION' 
  | 'ACCEPT_CONNECTION' 
  | 'REJECT_CONNECTION'
  | 'START_CONVERSATION' 
  | 'SCHEDULE_MEETING' 
  | 'ATTEND_MEETING' 
  | 'SEARCH_USERS'
  | 'FILTER_RESULTS' 
  | 'SORT_RESULTS' 
  | 'VIEW_MATCH_DETAILS';

export type EnhancedFeedbackType = 
  | 'MATCH_QUALITY' 
  | 'CONNECTION_OUTCOME' 
  | 'MEETING_OUTCOME' 
  | 'RECOMMENDATION_RELEVANCE' 
  | 'PROFILE_ACCURACY' 
  | 'ALGORITHM_PREFERENCE';

export type InsightType = 
  | 'DIMENSION_PREFERENCE' 
  | 'REJECTION_PATTERN' 
  | 'CONNECTION_SUCCESS_PATTERN'
  | 'MEETING_OUTCOME_PATTERN' 
  | 'TEMPORAL_PATTERN' 
  | 'COLD_START_ADJUSTMENT';

export type ColdStartPhase = 'INITIAL' | 'LEARNING' | 'ADAPTING' | 'ESTABLISHED';

// User Behavior Tracking
export interface UserBehavior {
  id?: number;
  user_id: string;
  event_id?: string;
  behavior_type: BehaviorType;
  target_user_id?: string;
  behavior_data?: Record<string, any>; // JSON data
  session_id?: string;
  created_at?: Date;
}

// Enhanced Feedback
export interface EnhancedFeedback {
  id?: number;
  user_id: string;
  target_user_id: string;
  event_id?: string;
  match_id?: number;
  feedback_type: EnhancedFeedbackType;
  rating?: number; // 1-5
  feedback_dimensions?: FeedbackDimensions;
  comments?: string;
  feedback_context?: FeedbackContext;
  is_implicit?: boolean;
  confidence_score?: number; // 0-1
  created_at?: Date;
}

// Feedback dimensions for detailed analysis
export interface FeedbackDimensions {
  industry_relevance?: number; // 1-5
  position_compatibility?: number; // 1-5
  business_goal_alignment?: number; // 1-5
  skills_match?: number; // 1-5
  communication_quality?: number; // 1-5
  meeting_value?: number; // 1-5
  overall_satisfaction?: number; // 1-5
}

// Context information when feedback is given
export interface FeedbackContext {
  match_score?: number;
  recommendation_rank?: number;
  interaction_duration?: number; // seconds
  meeting_duration?: number; // minutes
  connection_method?: 'DIRECT' | 'THROUGH_PLATFORM' | 'IN_PERSON';
  feedback_timing?: 'IMMEDIATE' | 'DELAYED' | 'PROMPTED';
  user_mood_indicator?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

// User Preference Weights
export interface UserPreferenceWeights {
  id?: number;
  user_id: string;
  industry_weight: number;
  position_weight: number;
  business_goal_weight: number;
  skills_weight: number;
  experience_weight: number;
  company_size_weight: number;
  user_preference_weight: number;
  learning_count: number;
  last_updated?: Date;
  created_at?: Date;
}

// Algorithm Learning Insights
export interface AlgorithmInsight {
  id?: number;
  user_id: string;
  insight_type: InsightType;
  insight_data: InsightData;
  confidence_level: number; // 0-1
  impact_score: number;
  created_at?: Date;
  expires_at?: Date;
}

// Data structure for different insight types
export interface InsightData {
  dimension_preferences?: {
    preferred_dimensions: string[];
    weight_adjustments: Record<string, number>;
  };
  rejection_patterns?: {
    common_rejection_reasons: string[];
    rejected_profiles: Array<{
      industry?: string;
      position?: string;
      company_size?: string;
      experience_level?: string;
    }>;
  };
  connection_success_patterns?: {
    successful_profile_types: string[];
    success_factors: Record<string, number>;
    optimal_timing: string[];
  };
  meeting_outcome_patterns?: {
    positive_outcome_factors: string[];
    negative_outcome_factors: string[];
    meeting_preferences: Record<string, any>;
  };
  temporal_patterns?: {
    active_hours: number[];
    response_time_patterns: Record<string, number>;
    seasonal_preferences: Record<string, any>;
  };
  cold_start_adjustments?: {
    similarity_based_weights: Record<string, number>;
    diversity_preferences: number;
    exploration_factor: number;
  };
}

// User Cold Start Profile
export interface UserColdStartProfile {
  id?: number;
  user_id: string;
  initial_preferences?: InitialPreferences;
  industry_similarity_score: number;
  position_similarity_score: number;
  profile_completeness: number; // 0-1
  behavior_activity_score: number;
  recommendation_diversity_factor: number; // 0-1
  cold_start_phase: ColdStartPhase;
  created_at?: Date;
  updated_at?: Date;
}

// Initial preferences inferred for new users
export interface InitialPreferences {
  inferred_target_industries: string[];
  inferred_target_positions: string[];
  similarity_based_weights: Record<string, number>;
  profile_based_interests: string[];
  behavioral_indicators: Record<string, any>;
}

// Feedback Learning Statistics
export interface FeedbackLearningStats {
  id?: number;
  user_id: string;
  event_id?: string;
  total_feedback_count: number;
  positive_feedback_count: number;
  negative_feedback_count: number;
  avg_match_quality_rating: number;
  connection_success_rate: number; // 0-1
  meeting_success_rate: number; // 0-1
  algorithm_accuracy_score: number; // 0-1
  last_learning_update?: Date;
  created_at?: Date;
}

// API Request/Response Types
export interface SubmitFeedbackRequest {
  target_user_id: string;
  event_id?: string;
  match_id?: number;
  feedback_type: EnhancedFeedbackType;
  rating?: number;
  feedback_dimensions?: FeedbackDimensions;
  comments?: string;
  feedback_context?: Partial<FeedbackContext>;
}

export interface TrackBehaviorRequest {
  behavior_type: BehaviorType;
  target_user_id?: string;
  event_id?: string;
  behavior_data?: Record<string, any>;
  session_id?: string;
}

export interface FeedbackAnalysisResponse {
  user_learning_progress: {
    learning_phase: ColdStartPhase;
    feedback_count: number;
    accuracy_improvement: number;
    personalization_level: number; // 0-1
  };
  algorithm_insights: AlgorithmInsight[];
  recommendation_improvements: {
    weight_adjustments: UserPreferenceWeights;
    expected_improvement: number; // percentage
    confidence_level: number; // 0-1
  };
  next_learning_opportunities: string[];
}

export interface LearningMetrics {
  overall_satisfaction: number; // 0-1
  recommendation_accuracy: number; // 0-1
  connection_success_rate: number; // 0-1
  learning_velocity: number; // improvement rate
  personalization_effectiveness: number; // 0-1
}

// Feedback Learning Service Interface
export interface FeedbackLearningService {
  // Feedback Collection
  submitFeedback(userId: string, feedback: SubmitFeedbackRequest): Promise<void>;
  trackBehavior(userId: string, behavior: TrackBehaviorRequest): Promise<void>;
  
  // Learning Analysis
  analyzeFeedbackPatterns(userId: string): Promise<FeedbackAnalysisResponse>;
  updateUserWeights(userId: string): Promise<UserPreferenceWeights>;
  
  // Cold Start Handling
  initializeColdStartProfile(userId: string): Promise<UserColdStartProfile>;
  updateColdStartProgress(userId: string): Promise<void>;
  
  // Insights Generation
  generateAlgorithmInsights(userId: string): Promise<AlgorithmInsight[]>;
  getLearningMetrics(userId: string, eventId?: string): Promise<LearningMetrics>;
} 