import { 
  SubmitFeedbackRequest, 
  TrackBehaviorRequest, 
  FeedbackAnalysisResponse,
  LearningMetrics,
  UserPreferenceWeights,
  UserColdStartProfile
} from '../../shared/types/FeedbackLearning';

class FeedbackService {
  private baseUrl = '/api/v1/feedback';

  /**
   * 提交用户反馈
   */
  async submitFeedback(feedback: SubmitFeedbackRequest): Promise<{
    feedbackId: number;
    learningUpdated: boolean;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to submit feedback');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 跟踪用户行为
   */
  async trackBehavior(behavior: TrackBehaviorRequest): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/behavior`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(behavior),
      });

      if (!response.ok) {
        console.warn('Failed to track behavior:', await response.text());
      }
    } catch (error) {
      // 行为跟踪失败不应该影响用户体验，只记录警告
      console.warn('Error tracking behavior:', error);
    }
  }

  /**
   * 获取学习指标
   */
  async getLearningMetrics(eventId?: string): Promise<LearningMetrics> {
    const url = eventId 
      ? `${this.baseUrl}/metrics?event_id=${encodeURIComponent(eventId)}`
      : `${this.baseUrl}/metrics`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get learning metrics');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 更新用户权重
   */
  async updateUserWeights(): Promise<UserPreferenceWeights> {
    const response = await fetch(`${this.baseUrl}/weights/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update user weights');
    }

    const result = await response.json();
    return result.data.weights;
  }

  /**
   * 初始化冷启动档案
   */
  async initializeColdStartProfile(): Promise<UserColdStartProfile> {
    const response = await fetch(`${this.baseUrl}/cold-start/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to initialize cold start profile');
    }

    const result = await response.json();
    return result.data.profile;
  }

  /**
   * 便捷方法：为匹配结果自动跟踪查看行为
   */
  async trackMatchView(targetUserId: string, eventId?: string, matchScore?: number): Promise<void> {
    await this.trackBehavior({
      behavior_type: 'VIEW_MATCH_DETAILS',
      target_user_id: targetUserId,
      event_id: eventId,
      behavior_data: {
        match_score: matchScore,
        viewed_at: new Date().toISOString()
      }
    });
  }

  /**
   * 便捷方法：为用户档案查看自动跟踪行为
   */
  async trackProfileView(targetUserId: string, eventId?: string): Promise<void> {
    await this.trackBehavior({
      behavior_type: 'VIEW_PROFILE',
      target_user_id: targetUserId,
      event_id: eventId,
      behavior_data: {
        viewed_at: new Date().toISOString()
      }
    });
  }

  /**
   * 便捷方法：为连接请求自动跟踪行为
   */
  async trackConnectionAction(
    action: 'SEND_CONNECTION' | 'ACCEPT_CONNECTION' | 'REJECT_CONNECTION',
    targetUserId: string,
    eventId?: string
  ): Promise<void> {
    await this.trackBehavior({
      behavior_type: action,
      target_user_id: targetUserId,
      event_id: eventId,
      behavior_data: {
        action_at: new Date().toISOString()
      }
    });
  }

  /**
   * 便捷方法：提交快速匹配质量反馈
   */
  async submitQuickMatchFeedback(
    targetUserId: string,
    rating: number,
    eventId?: string,
    matchId?: number
  ): Promise<void> {
    await this.submitFeedback({
      target_user_id: targetUserId,
      feedback_type: 'MATCH_QUALITY',
      rating: rating,
      event_id: eventId,
      match_id: matchId,
      feedback_context: {
        feedback_timing: 'IMMEDIATE'
      }
    });
  }

  /**
   * 便捷方法：提交详细的匹配反馈
   */
  async submitDetailedMatchFeedback(
    targetUserId: string,
    rating: number,
    dimensions: {
      industryRelevance?: number;
      positionCompatibility?: number;
      businessGoalAlignment?: number;
      skillsMatch?: number;
    },
    comments?: string,
    eventId?: string,
    matchId?: number
  ): Promise<void> {
    await this.submitFeedback({
      target_user_id: targetUserId,
      feedback_type: 'MATCH_QUALITY',
      rating: rating,
      feedback_dimensions: {
        industry_relevance: dimensions.industryRelevance,
        position_compatibility: dimensions.positionCompatibility,
        business_goal_alignment: dimensions.businessGoalAlignment,
        skills_match: dimensions.skillsMatch,
        overall_satisfaction: rating
      },
      comments: comments,
      event_id: eventId,
      match_id: matchId,
      feedback_context: {
        feedback_timing: 'DELAYED'
      }
    });
  }
}

export const feedbackService = new FeedbackService(); 