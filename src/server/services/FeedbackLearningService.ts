import { Database } from 'sqlite';
import { FeedbackLearningRepository } from '../database/repositories/FeedbackLearningRepository';
import { MatchingRepository } from '../database/repositories/MatchingRepository';
import { UserRepository } from '../database/repositories/UserRepository';
import {
  UserBehavior,
  EnhancedFeedback,
  UserPreferenceWeights,
  AlgorithmInsight,
  UserColdStartProfile,
  FeedbackLearningStats,
  SubmitFeedbackRequest,
  TrackBehaviorRequest,
  FeedbackAnalysisResponse,
  LearningMetrics,
  BehaviorType,
  EnhancedFeedbackType,
  ColdStartPhase,
  FeedbackContext,
  FeedbackDimensions,
  InsightData
} from '../../shared/types/FeedbackLearning';
import { UserProfile } from '../../shared/types/User';
import { MatchingWeights } from './MatchingService';

export class FeedbackLearningService {
  private feedbackRepo: FeedbackLearningRepository;
  private matchingRepo: MatchingRepository;
  private userRepo: UserRepository;

  constructor(db?: Database) {
    this.feedbackRepo = new FeedbackLearningRepository();
    this.matchingRepo = new MatchingRepository();
    this.userRepo = new UserRepository();
  }

  // ===== 反馈收集功能 =====

  /**
   * 提交用户反馈
   */
  async submitFeedback(
    userId: string, 
    feedback: SubmitFeedbackRequest
  ): Promise<{ feedbackId: number; learningUpdated: boolean }> {
    try {
      // 构建反馈记录
      const enhancedFeedback: EnhancedFeedback = {
        user_id: userId,
        target_user_id: feedback.target_user_id,
        event_id: feedback.event_id,
        match_id: feedback.match_id,
        feedback_type: feedback.feedback_type,
        rating: feedback.rating,
        feedback_dimensions: feedback.feedback_dimensions,
        comments: feedback.comments,
        feedback_context: feedback.feedback_context,
        is_implicit: false, // 显式反馈
        confidence_score: 1.0
      };

      // 保存反馈到数据库
      const feedbackId = await this.feedbackRepo.submitEnhancedFeedback(enhancedFeedback);

      // 更新用户学习统计
      await this.updateFeedbackLearningStats(userId, feedback.event_id);

      // 异步触发算法学习
      const learningUpdated = await this.triggerLearningUpdate(userId, feedback);

      // 记录反馈行为
      await this.trackBehavior(userId, {
        behavior_type: 'VIEW_MATCH_DETAILS', // 间接记录反馈行为
        target_user_id: feedback.target_user_id,
        event_id: feedback.event_id,
        behavior_data: {
          feedback_type: feedback.feedback_type,
          rating: feedback.rating,
          feedback_provided: true
        }
      });

      return { feedbackId, learningUpdated };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  /**
   * 记录用户行为
   */
  async trackBehavior(userId: string, behavior: TrackBehaviorRequest): Promise<void> {
    try {
      const userBehavior: UserBehavior = {
        user_id: userId,
        behavior_type: behavior.behavior_type,
        target_user_id: behavior.target_user_id,
        event_id: behavior.event_id,
        behavior_data: behavior.behavior_data,
        session_id: behavior.session_id || this.generateSessionId(userId)
      };

      await this.feedbackRepo.trackUserBehavior(userBehavior);

      // 对于某些关键行为，生成隐式反馈
      await this.generateImplicitFeedback(userId, behavior);

      // 更新用户冷启动档案的行为活跃度
      await this.updateBehaviorActivity(userId);
    } catch (error) {
      console.error('Error tracking behavior:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 生成隐式反馈
   */
  private async generateImplicitFeedback(
    userId: string, 
    behavior: TrackBehaviorRequest
  ): Promise<void> {
    if (!behavior.target_user_id) return;

    let implicitFeedback: EnhancedFeedback | null = null;

    switch (behavior.behavior_type) {
      case 'SEND_CONNECTION':
        // 发送连接请求视为正面反馈
        implicitFeedback = {
          user_id: userId,
          target_user_id: behavior.target_user_id,
          event_id: behavior.event_id,
          feedback_type: 'MATCH_QUALITY',
          rating: 4, // 推断为较高评分
          is_implicit: true,
          confidence_score: 0.7
        };
        break;

      case 'ACCEPT_CONNECTION':
        // 接受连接请求视为正面反馈
        implicitFeedback = {
          user_id: userId,
          target_user_id: behavior.target_user_id,
          event_id: behavior.event_id,
          feedback_type: 'CONNECTION_OUTCOME',
          rating: 5, // 接受视为最高评分
          is_implicit: true,
          confidence_score: 0.9
        };
        break;

      case 'REJECT_CONNECTION':
        // 拒绝连接请求视为负面反馈
        implicitFeedback = {
          user_id: userId,
          target_user_id: behavior.target_user_id,
          event_id: behavior.event_id,
          feedback_type: 'MATCH_QUALITY',
          rating: 2, // 推断为较低评分
          is_implicit: true,
          confidence_score: 0.6
        };
        break;

      case 'ATTEND_MEETING':
        // 参加会面视为正面反馈
        const meetingDuration = behavior.behavior_data?.duration_minutes || 30;
        const rating = meetingDuration >= 30 ? 5 : (meetingDuration >= 15 ? 4 : 3);
        
        implicitFeedback = {
          user_id: userId,
          target_user_id: behavior.target_user_id,
          event_id: behavior.event_id,
          feedback_type: 'MEETING_OUTCOME',
          rating: rating,
          is_implicit: true,
          confidence_score: 0.8,
          feedback_context: {
            meeting_duration: meetingDuration,
            connection_method: 'IN_PERSON'
          }
        };
        break;
    }

    if (implicitFeedback) {
      try {
        await this.feedbackRepo.submitEnhancedFeedback(implicitFeedback);
      } catch (error) {
        console.error('Error generating implicit feedback:', error);
      }
    }
  }

  // ===== 算法学习和优化 =====

  /**
   * 触发学习更新
   */
  private async triggerLearningUpdate(
    userId: string, 
    feedback: SubmitFeedbackRequest
  ): Promise<boolean> {
    try {
      // 获取用户当前的反馈统计
      const stats = await this.feedbackRepo.getFeedbackLearningStats(userId, feedback.event_id);
      
      // 每收到5个反馈就触发一次学习
      if (stats && stats.total_feedback_count % 5 === 0) {
        await this.updateUserWeights(userId);
        await this.generateAlgorithmInsights(userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error triggering learning update:', error);
      return false;
    }
  }

  /**
   * 更新用户权重
   */
  async updateUserWeights(userId: string): Promise<UserPreferenceWeights> {
    try {
      // 获取用户当前权重
      let currentWeights = await this.feedbackRepo.getUserPreferenceWeights(userId);
      
      if (!currentWeights) {
        // 如果没有权重记录，创建默认权重
        currentWeights = this.createDefaultWeights(userId);
        await this.feedbackRepo.upsertUserPreferenceWeights(currentWeights);
      }

      // 分析用户反馈模式
      const feedbackPatterns = await this.analyzeFeedbackPatterns(userId);
      
      // 计算新的权重
      const newWeights = this.calculateAdjustedWeights(currentWeights, feedbackPatterns);
      
      // 保存新权重
      await this.feedbackRepo.upsertUserPreferenceWeights(newWeights);

      return newWeights;
    } catch (error) {
      console.error('Error updating user weights:', error);
      throw error;
    }
  }

  /**
   * 创建默认权重
   */
  private createDefaultWeights(userId: string): UserPreferenceWeights {
    return {
      user_id: userId,
      industry_weight: 0.25,
      position_weight: 0.20,
      business_goal_weight: 0.20,
      skills_weight: 0.15,
      experience_weight: 0.10,
      company_size_weight: 0.05,
      user_preference_weight: 0.05,
      learning_count: 0
    };
  }

  /**
   * 分析反馈模式
   */
  private async analyzeFeedbackPatterns(userId: string): Promise<{
    dimension_preferences: Record<string, number>;
    positive_feedback_ratio: number;
    feedback_consistency: number;
    dimension_correlations: Record<string, number>;
  }> {
    // 获取用户反馈历史
    const feedbackHistory = await this.feedbackRepo.getUserFeedbackHistory(userId, {
      limit: 100 // 分析最近100个反馈
    });

    const dimensionPreferences: Record<string, number> = {};
    let totalPositive = 0;
    let totalFeedback = 0;

    // 分析各维度的反馈分数
    for (const feedback of feedbackHistory) {
      totalFeedback++;
      
      if (feedback.rating && feedback.rating >= 4) {
        totalPositive++;
      }

      if (feedback.feedback_dimensions) {
        for (const [dimension, score] of Object.entries(feedback.feedback_dimensions)) {
          if (typeof score === 'number') {
            if (!dimensionPreferences[dimension]) {
              dimensionPreferences[dimension] = 0;
            }
            dimensionPreferences[dimension] += score;
          }
        }
      }
    }

    // 计算平均分数
    for (const dimension in dimensionPreferences) {
      dimensionPreferences[dimension] /= totalFeedback;
    }

    return {
      dimension_preferences: dimensionPreferences,
      positive_feedback_ratio: totalFeedback > 0 ? totalPositive / totalFeedback : 0.5,
      feedback_consistency: this.calculateFeedbackConsistency(feedbackHistory),
      dimension_correlations: this.calculateDimensionCorrelations(feedbackHistory)
    };
  }

  /**
   * 计算反馈一致性
   */
  private calculateFeedbackConsistency(feedbackHistory: EnhancedFeedback[]): number {
    if (feedbackHistory.length < 2) return 1.0;

    let consistencySum = 0;
    let comparisons = 0;

    for (let i = 0; i < feedbackHistory.length - 1; i++) {
      for (let j = i + 1; j < feedbackHistory.length; j++) {
        const feedback1 = feedbackHistory[i];
        const feedback2 = feedbackHistory[j];

        if (feedback1.rating && feedback2.rating) {
          const difference = Math.abs(feedback1.rating - feedback2.rating);
          const consistency = 1 - (difference / 4); // 最大差异为4分
          consistencySum += consistency;
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? consistencySum / comparisons : 1.0;
  }

  /**
   * 计算维度相关性
   */
  private calculateDimensionCorrelations(feedbackHistory: EnhancedFeedback[]): Record<string, number> {
    const correlations: Record<string, number> = {};
    const dimensionData: Record<string, number[]> = {};

    // 收集各维度的评分数据
    for (const feedback of feedbackHistory) {
      if (feedback.feedback_dimensions && feedback.rating) {
        for (const [dimension, score] of Object.entries(feedback.feedback_dimensions)) {
          if (typeof score === 'number') {
            if (!dimensionData[dimension]) {
              dimensionData[dimension] = [];
            }
            dimensionData[dimension].push(score);
          }
        }
      }
    }

    // 计算与总体评分的相关性（简化实现）
    for (const [dimension, scores] of Object.entries(dimensionData)) {
      if (scores.length >= 3) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        correlations[dimension] = avgScore / 5; // 标准化到0-1
      }
    }

    return correlations;
  }

  /**
   * 计算调整后的权重
   */
  private calculateAdjustedWeights(
    currentWeights: UserPreferenceWeights, 
    patterns: ReturnType<FeedbackLearningService['analyzeFeedbackPatterns']> extends Promise<infer T> ? T : never
  ): UserPreferenceWeights {
    const adjustmentFactor = 0.1; // 权重调整幅度
    const newWeights = { ...currentWeights };

    // 基于维度偏好调整权重
    const dimensionMappings: Record<string, keyof UserPreferenceWeights> = {
      'industry_relevance': 'industry_weight',
      'position_compatibility': 'position_weight',
      'business_goal_alignment': 'business_goal_weight',
      'skills_match': 'skills_weight'
    };

    for (const [dimension, preference] of Object.entries(patterns.dimension_preferences)) {
      const weightKey = dimensionMappings[dimension];
      if (weightKey && typeof newWeights[weightKey] === 'number') {
        const preferenceScore = preference / 5; // 标准化到0-1
        const adjustment = (preferenceScore - 0.6) * adjustmentFactor; // 0.6为基准
        (newWeights[weightKey] as number) += adjustment;
      }
    }

    // 确保权重在合理范围内
    const weightKeys: (keyof UserPreferenceWeights)[] = [
      'industry_weight', 'position_weight', 'business_goal_weight',
      'skills_weight', 'experience_weight', 'company_size_weight', 'user_preference_weight'
    ];

    for (const key of weightKeys) {
      const weight = newWeights[key] as number;
      newWeights[key] = Math.max(0.01, Math.min(0.5, weight)); // 限制在0.01-0.5之间
    }

    // 标准化权重，确保总和为1
    const totalWeight = weightKeys.reduce((sum, key) => sum + (newWeights[key] as number), 0);
    for (const key of weightKeys) {
      (newWeights[key] as number) = (newWeights[key] as number) / totalWeight;
    }

    newWeights.learning_count = currentWeights.learning_count + 1;

    return newWeights;
  }

  /**
   * 生成算法洞察
   */
  async generateAlgorithmInsights(userId: string): Promise<AlgorithmInsight[]> {
    try {
      const insights: AlgorithmInsight[] = [];

      // 分析维度偏好
      const dimensionInsight = await this.generateDimensionPreferenceInsight(userId);
      if (dimensionInsight) insights.push(dimensionInsight);

      // 分析拒绝模式
      const rejectionInsight = await this.generateRejectionPatternInsight(userId);
      if (rejectionInsight) insights.push(rejectionInsight);

      // 分析连接成功模式
      const successInsight = await this.generateConnectionSuccessInsight(userId);
      if (successInsight) insights.push(successInsight);

      // 保存洞察到数据库
      for (const insight of insights) {
        await this.feedbackRepo.saveAlgorithmInsight(insight);
      }

      return insights;
    } catch (error) {
      console.error('Error generating algorithm insights:', error);
      return [];
    }
  }

  /**
   * 生成维度偏好洞察
   */
  private async generateDimensionPreferenceInsight(userId: string): Promise<AlgorithmInsight | null> {
    const feedbackHistory = await this.feedbackRepo.getUserFeedbackHistory(userId, {
      feedbackTypes: ['MATCH_QUALITY'],
      limit: 50
    });

    if (feedbackHistory.length < 5) return null;

    const dimensionScores: Record<string, number[]> = {};
    
    for (const feedback of feedbackHistory) {
      if (feedback.feedback_dimensions) {
        for (const [dimension, score] of Object.entries(feedback.feedback_dimensions)) {
          if (typeof score === 'number') {
            if (!dimensionScores[dimension]) {
              dimensionScores[dimension] = [];
            }
            dimensionScores[dimension].push(score);
          }
        }
      }
    }

    // 找出偏好最强的维度
    const preferredDimensions: string[] = [];
    const weightAdjustments: Record<string, number> = {};

    for (const [dimension, scores] of Object.entries(dimensionScores)) {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (avgScore >= 4.0) {
        preferredDimensions.push(dimension);
        weightAdjustments[dimension] = (avgScore - 3) / 10; // 权重调整
      }
    }

    if (preferredDimensions.length === 0) return null;

    const insightData: InsightData = {
      dimension_preferences: {
        preferred_dimensions: preferredDimensions,
        weight_adjustments: weightAdjustments
      }
    };

    return {
      user_id: userId,
      insight_type: 'DIMENSION_PREFERENCE',
      insight_data: insightData,
      confidence_level: Math.min(0.9, feedbackHistory.length / 20),
      impact_score: preferredDimensions.length * 0.1,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后过期
    };
  }

  /**
   * 生成拒绝模式洞察
   */
  private async generateRejectionPatternInsight(userId: string): Promise<AlgorithmInsight | null> {
    const behaviorHistory = await this.feedbackRepo.getUserBehaviorHistory(userId, {
      behaviorTypes: ['REJECT_CONNECTION'],
      limit: 30
    });

    if (behaviorHistory.length < 3) return null;

    // 分析被拒绝用户的共同特征
    const rejectedProfiles: Array<{
      industry?: string;
      position?: string;
      company_size?: string;
      experience_level?: string;
    }> = [];

    // 这里需要获取被拒绝用户的档案信息
    // 简化实现，实际需要从behavior_data中提取或查询用户档案
    
    const insightData: InsightData = {
      rejection_patterns: {
        common_rejection_reasons: ['行业不匹配', '职位不相关'],
        rejected_profiles: rejectedProfiles
      }
    };

    return {
      user_id: userId,
      insight_type: 'REJECTION_PATTERN',
      insight_data: insightData,
      confidence_level: Math.min(0.8, behaviorHistory.length / 10),
      impact_score: 0.15,
      expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // 20天后过期
    };
  }

  /**
   * 生成连接成功洞察
   */
  private async generateConnectionSuccessInsight(userId: string): Promise<AlgorithmInsight | null> {
    const successBehaviors = await this.feedbackRepo.getUserBehaviorHistory(userId, {
      behaviorTypes: ['ACCEPT_CONNECTION', 'ATTEND_MEETING'],
      limit: 20
    });

    if (successBehaviors.length < 2) return null;

    const insightData: InsightData = {
      connection_success_patterns: {
        successful_profile_types: ['同行业高管', '互补技能专家'],
        success_factors: {
          'industry_match': 0.8,
          'position_complementarity': 0.7,
          'mutual_connections': 0.6
        },
        optimal_timing: ['工作日上午', '会议期间']
      }
    };

    return {
      user_id: userId,
      insight_type: 'CONNECTION_SUCCESS_PATTERN',
      insight_data: insightData,
      confidence_level: Math.min(0.9, successBehaviors.length / 10),
      impact_score: 0.2,
      expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45天后过期
    };
  }

  // ===== 冷启动处理 =====

  /**
   * 初始化冷启动档案
   */
  async initializeColdStartProfile(userId: string): Promise<UserColdStartProfile> {
    try {
      // 获取用户基本档案
      const userProfile = await this.userRepo.findById(userId);
      if (!userProfile) {
        throw new Error('User not found');
      }

      // 计算档案完整度
      const profileCompleteness = this.calculateProfileCompleteness(userProfile);

      // 基于相似用户推断初始偏好
      const initialPreferences = await this.inferInitialPreferences(userProfile);

      // 创建冷启动档案
      const coldStartProfile: UserColdStartProfile = {
        user_id: userId,
        initial_preferences: initialPreferences,
        industry_similarity_score: 0.0,
        position_similarity_score: 0.0,
        profile_completeness: profileCompleteness,
        behavior_activity_score: 0.0,
        recommendation_diversity_factor: 0.8, // 新用户需要更多样化的推荐
        cold_start_phase: 'INITIAL'
      };

      await this.feedbackRepo.upsertUserColdStartProfile(coldStartProfile);

      return coldStartProfile;
    } catch (error) {
      console.error('Error initializing cold start profile:', error);
      throw error;
    }
  }

  /**
   * 计算档案完整度
   */
  private calculateProfileCompleteness(user: UserProfile): number {
    const fields = [
      'name', 'company', 'position', 'industry', 'bio',
      'skills', 'interests', 'business_goals'
    ];

    let completedFields = 0;
    for (const field of fields) {
      const value = (user as any)[field];
      if (value && (typeof value === 'string' ? value.trim() : Array.isArray(value) ? value.length > 0 : true)) {
        completedFields++;
      }
    }

    return completedFields / fields.length;
  }

  /**
   * 推断初始偏好
   */
  private async inferInitialPreferences(user: UserProfile): Promise<any> {
    // 基于用户的行业和职位推断可能感兴趣的目标
    const inferredTargetIndustries: string[] = [];
    const inferredTargetPositions: string[] = [];

    // 行业相关推断
    if (user.industry) {
      inferredTargetIndustries.push(user.industry);
      // 添加相关行业
      const relatedIndustries = this.getRelatedIndustries(user.industry);
      inferredTargetIndustries.push(...relatedIndustries);
    }

    // 职位相关推断
    if (user.position) {
      // 推断互补职位
      const complementaryPositions = this.getComplementaryPositions(user.position);
      inferredTargetPositions.push(...complementaryPositions);
    }

    return {
      inferred_target_industries: inferredTargetIndustries,
      inferred_target_positions: inferredTargetPositions,
      similarity_based_weights: {
        industry_weight: 0.3,
        position_weight: 0.25,
        skills_weight: 0.2
      },
      profile_based_interests: user.interests || [],
      behavioral_indicators: {}
    };
  }

  /**
   * 获取相关行业
   */
  private getRelatedIndustries(industry: string): string[] {
    const industryMap: Record<string, string[]> = {
      '科技': ['人工智能', '软件开发', '数据科学'],
      '金融': ['金融科技', '投资', '保险'],
      '医疗': ['生物技术', '制药', '医疗设备'],
      '教育': ['在线教育', '培训', '企业学习']
    };

    return industryMap[industry] || [];
  }

  /**
   * 获取互补职位
   */
  private getComplementaryPositions(position: string): string[] {
    const positionMap: Record<string, string[]> = {
      'CEO': ['CTO', 'CFO', 'CMO', '投资人'],
      'CTO': ['CEO', '产品经理', '技术专家'],
      '产品经理': ['工程师', '设计师', '市场经理'],
      '销售': ['市场', '客户成功', '业务发展']
    };

    for (const [key, values] of Object.entries(positionMap)) {
      if (position.toLowerCase().includes(key.toLowerCase())) {
        return values;
      }
    }

    return [];
  }

  /**
   * 更新冷启动进度
   */
  async updateColdStartProgress(userId: string): Promise<void> {
    try {
      const profile = await this.feedbackRepo.getUserColdStartProfile(userId);
      if (!profile) return;

      // 获取用户活动统计
      const behaviorStats = await this.feedbackRepo.getUserBehaviorStats(userId);
      const feedbackStats = await this.feedbackRepo.getFeedbackLearningStats(userId);

      // 更新活动分数
      const activityScore = this.calculateActivityScore(behaviorStats, feedbackStats);
      
      // 确定冷启动阶段
      const newPhase = this.determineColdStartPhase(behaviorStats, feedbackStats);

      // 调整多样性因子
      const diversityFactor = this.calculateDiversityFactor(newPhase, activityScore);

      // 更新档案
      const updatedProfile: UserColdStartProfile = {
        ...profile,
        behavior_activity_score: activityScore,
        cold_start_phase: newPhase,
        recommendation_diversity_factor: diversityFactor
      };

      await this.feedbackRepo.upsertUserColdStartProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating cold start progress:', error);
    }
  }

  /**
   * 计算活动分数
   */
  private calculateActivityScore(
    behaviorStats: any,
    feedbackStats: FeedbackLearningStats | null
  ): number {
    let score = 0;

    // 基于行为数量
    const totalBehaviors = behaviorStats.total_behaviors || 0;
    score += Math.min(0.5, totalBehaviors / 20); // 最多0.5分

    // 基于反馈数量
    const totalFeedback = feedbackStats?.total_feedback_count || 0;
    score += Math.min(0.3, totalFeedback / 10); // 最多0.3分

    // 基于会话数量
    const activeSessions = behaviorStats.active_sessions || 0;
    score += Math.min(0.2, activeSessions / 5); // 最多0.2分

    return Math.min(1.0, score);
  }

  /**
   * 确定冷启动阶段
   */
  private determineColdStartPhase(
    behaviorStats: any,
    feedbackStats: FeedbackLearningStats | null
  ): ColdStartPhase {
    const totalBehaviors = behaviorStats.total_behaviors || 0;
    const totalFeedback = feedbackStats?.total_feedback_count || 0;

    if (totalFeedback >= 15 && totalBehaviors >= 50) {
      return 'ESTABLISHED';
    } else if (totalFeedback >= 8 && totalBehaviors >= 25) {
      return 'ADAPTING';
    } else if (totalFeedback >= 3 && totalBehaviors >= 10) {
      return 'LEARNING';
    }

    return 'INITIAL';
  }

  /**
   * 计算多样性因子
   */
  private calculateDiversityFactor(phase: ColdStartPhase, activityScore: number): number {
    const baseDiversity = {
      'INITIAL': 0.9,
      'LEARNING': 0.8,
      'ADAPTING': 0.6,
      'ESTABLISHED': 0.4
    };

    const base = baseDiversity[phase];
    const adjustment = (1 - activityScore) * 0.2; // 活动越少，多样性越高

    return Math.min(0.95, Math.max(0.3, base + adjustment));
  }

  // ===== 辅助方法 =====

  /**
   * 生成会话ID
   */
  private generateSessionId(userId: string): string {
    const timestamp = Date.now();
    return `${userId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新用户行为活跃度
   */
  private async updateBehaviorActivity(userId: string): Promise<void> {
    try {
      const profile = await this.feedbackRepo.getUserColdStartProfile(userId);
      if (profile) {
        // 简单的活跃度更新逻辑
        const newActivity = Math.min(1.0, profile.behavior_activity_score + 0.01);
        const updatedProfile = { ...profile, behavior_activity_score: newActivity };
        await this.feedbackRepo.upsertUserColdStartProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error updating behavior activity:', error);
    }
  }

  /**
   * 更新反馈学习统计
   */
  private async updateFeedbackLearningStats(userId: string, eventId?: string): Promise<void> {
    try {
      // 获取当前统计
      let stats = await this.feedbackRepo.getFeedbackLearningStats(userId, eventId);
      
      if (!stats) {
        stats = {
          user_id: userId,
          event_id: eventId,
          total_feedback_count: 0,
          positive_feedback_count: 0,
          negative_feedback_count: 0,
          avg_match_quality_rating: 0.0,
          connection_success_rate: 0.0,
          meeting_success_rate: 0.0,
          algorithm_accuracy_score: 0.0
        };
      }

      // 重新计算统计数据
      const recentFeedback = await this.feedbackRepo.getUserFeedbackHistory(userId, {
        eventId: eventId,
        limit: 1000
      });

      stats.total_feedback_count = recentFeedback.length;
      stats.positive_feedback_count = recentFeedback.filter(f => f.rating && f.rating >= 4).length;
      stats.negative_feedback_count = recentFeedback.filter(f => f.rating && f.rating <= 2).length;

      if (recentFeedback.length > 0) {
        const totalRating = recentFeedback
          .filter(f => f.rating)
          .reduce((sum, f) => sum + (f.rating || 0), 0);
        const ratedFeedbackCount = recentFeedback.filter(f => f.rating).length;
        
        if (ratedFeedbackCount > 0) {
          stats.avg_match_quality_rating = totalRating / ratedFeedbackCount;
        }
      }

      // 计算成功率（简化实现）
      stats.connection_success_rate = stats.total_feedback_count > 0 ? 
        stats.positive_feedback_count / stats.total_feedback_count : 0;

      await this.feedbackRepo.upsertFeedbackLearningStats(stats);
    } catch (error) {
      console.error('Error updating feedback learning stats:', error);
    }
  }

  // ===== 公共API方法 =====

  /**
   * 分析反馈模式
   */
  async analyzeFeedbackPatterns(userId: string): Promise<FeedbackAnalysisResponse> {
    try {
      const userProfile = await this.feedbackRepo.getUserColdStartProfile(userId);
      const insights = await this.feedbackRepo.getUserAlgorithmInsights(userId);
      const weights = await this.feedbackRepo.getUserPreferenceWeights(userId);
      const stats = await this.feedbackRepo.getFeedbackLearningStats(userId);

      const response: FeedbackAnalysisResponse = {
        user_learning_progress: {
          learning_phase: userProfile?.cold_start_phase || 'INITIAL',
          feedback_count: stats?.total_feedback_count || 0,
          accuracy_improvement: this.calculateAccuracyImprovement(stats),
          personalization_level: this.calculatePersonalizationLevel(weights, stats)
        },
        algorithm_insights: insights,
        recommendation_improvements: {
          weight_adjustments: weights || this.createDefaultWeights(userId),
          expected_improvement: this.calculateExpectedImprovement(stats, insights),
          confidence_level: this.calculateConfidenceLevel(stats, insights)
        },
        next_learning_opportunities: this.generateLearningOpportunities(userProfile, stats)
      };

      return response;
    } catch (error) {
      console.error('Error analyzing feedback patterns:', error);
      throw error;
    }
  }

  /**
   * 获取学习指标
   */
  async getLearningMetrics(userId: string, eventId?: string): Promise<LearningMetrics> {
    try {
      const stats = await this.feedbackRepo.getFeedbackLearningStats(userId, eventId);
      const profile = await this.feedbackRepo.getUserColdStartProfile(userId);
      const qualityDistribution = await this.feedbackRepo.getFeedbackQualityDistribution(userId, eventId);

      return {
        overall_satisfaction: this.calculateOverallSatisfaction(qualityDistribution),
        recommendation_accuracy: stats?.algorithm_accuracy_score || 0.5,
        connection_success_rate: stats?.connection_success_rate || 0.0,
        learning_velocity: this.calculateLearningVelocity(stats, profile),
        personalization_effectiveness: this.calculatePersonalizationEffectiveness(stats, profile)
      };
    } catch (error) {
      console.error('Error getting learning metrics:', error);
      throw error;
    }
  }

  // ===== 私有辅助方法 =====

  private calculateAccuracyImprovement(stats: FeedbackLearningStats | null): number {
    if (!stats || stats.total_feedback_count < 5) return 0;
    
    // 简化计算：基于反馈数量和平均评分
    const improvementFactor = Math.min(1, stats.total_feedback_count / 20);
    const qualityFactor = (stats.avg_match_quality_rating - 3) / 2; // 标准化到-1到1
    
    return Math.max(0, improvementFactor * qualityFactor);
  }

  private calculatePersonalizationLevel(
    weights: UserPreferenceWeights | null, 
    stats: FeedbackLearningStats | null
  ): number {
    if (!weights || !stats) return 0;
    
    // 基于学习次数和反馈质量计算个性化水平
    const learningFactor = Math.min(1, weights.learning_count / 10);
    const qualityFactor = (stats.avg_match_quality_rating - 3) / 2;
    
    return Math.max(0, Math.min(1, learningFactor * 0.6 + qualityFactor * 0.4));
  }

  private calculateExpectedImprovement(
    stats: FeedbackLearningStats | null, 
    insights: AlgorithmInsight[]
  ): number {
    if (!stats) return 0;
    
    // 基于洞察数量和置信度计算预期改进
    const insightScore = insights.reduce((sum, insight) => 
      sum + insight.confidence_level * insight.impact_score, 0
    ) / Math.max(1, insights.length);
    
    return Math.min(30, insightScore * 100); // 最大30%改进
  }

  private calculateConfidenceLevel(
    stats: FeedbackLearningStats | null, 
    insights: AlgorithmInsight[]
  ): number {
    if (!stats) return 0.3;
    
    const dataConfidence = Math.min(1, stats.total_feedback_count / 15);
    const insightConfidence = insights.length > 0 ? 
      insights.reduce((sum, insight) => sum + insight.confidence_level, 0) / insights.length : 0.3;
    
    return (dataConfidence * 0.7 + insightConfidence * 0.3);
  }

  private generateLearningOpportunities(
    profile: UserColdStartProfile | null, 
    stats: FeedbackLearningStats | null
  ): string[] {
    const opportunities: string[] = [];
    
    if (!stats || stats.total_feedback_count < 5) {
      opportunities.push('提供更多匹配反馈以改进推荐算法');
    }
    
    if (!profile || profile.profile_completeness < 0.8) {
      opportunities.push('完善个人档案信息以获得更精准匹配');
    }
    
    if (profile && profile.behavior_activity_score < 0.5) {
      opportunities.push('增加平台使用频率以优化个性化推荐');
    }
    
    if (stats && stats.connection_success_rate < 0.3) {
      opportunities.push('调整匹配偏好设置以提高连接成功率');
    }
    
    return opportunities;
  }

  private calculateOverallSatisfaction(qualityDistribution: {
    excellent: number; good: number; average: number; poor: number; terrible: number;
  }): number {
    const total = Object.values(qualityDistribution).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0.5;
    
    const weightedSum = 
      qualityDistribution.excellent * 1.0 +
      qualityDistribution.good * 0.8 +
      qualityDistribution.average * 0.6 +
      qualityDistribution.poor * 0.4 +
      qualityDistribution.terrible * 0.2;
    
    return weightedSum / total;
  }

  private calculateLearningVelocity(
    stats: FeedbackLearningStats | null, 
    profile: UserColdStartProfile | null
  ): number {
    if (!stats || !profile) return 0;
    
    // 基于学习阶段和反馈频率计算学习速度
    const phaseMultipliers = {
      'INITIAL': 0.2,
      'LEARNING': 0.5,
      'ADAPTING': 0.8,
      'ESTABLISHED': 1.0
    };
    
    const phaseMultiplier = phaseMultipliers[profile.cold_start_phase];
    const feedbackVelocity = Math.min(1, stats.total_feedback_count / 20);
    
    return phaseMultiplier * feedbackVelocity;
  }

  private calculatePersonalizationEffectiveness(
    stats: FeedbackLearningStats | null, 
    profile: UserColdStartProfile | null
  ): number {
    if (!stats || !profile) return 0;
    
    // 综合个性化效果评估
    const satisfactionScore = (stats.avg_match_quality_rating - 3) / 2; // 标准化
    const activityScore = profile.behavior_activity_score;
    const learningScore = profile.cold_start_phase === 'ESTABLISHED' ? 1.0 : 
                          profile.cold_start_phase === 'ADAPTING' ? 0.8 : 
                          profile.cold_start_phase === 'LEARNING' ? 0.5 : 0.2;
    
    return Math.max(0, Math.min(1, 
      satisfactionScore * 0.4 + activityScore * 0.3 + learningScore * 0.3
    ));
  }
} 