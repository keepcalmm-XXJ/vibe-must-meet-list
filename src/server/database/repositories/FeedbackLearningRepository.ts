import { Database } from 'sqlite';
import { BaseRepository } from '../BaseRepository';
import {
  UserBehavior,
  EnhancedFeedback,
  UserPreferenceWeights,
  AlgorithmInsight,
  UserColdStartProfile,
  FeedbackLearningStats,
  BehaviorType,
  EnhancedFeedbackType,
  InsightType,
  ColdStartPhase
} from '../../../shared/types/FeedbackLearning';

export class FeedbackLearningRepository extends BaseRepository<any> {
  constructor(tableName: string = 'user_behaviors') {
    super(tableName);
  }

  // ===== User Behavior Tracking =====

  /**
   * 记录用户行为
   */
  async trackUserBehavior(behavior: UserBehavior): Promise<void> {
    const sql = `
      INSERT INTO user_behaviors (
        user_id, event_id, behavior_type, target_user_id, 
        behavior_data, session_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      behavior.user_id,
      behavior.event_id,
      behavior.behavior_type,
      behavior.target_user_id,
      behavior.behavior_data ? JSON.stringify(behavior.behavior_data) : null,
      behavior.session_id
    ]);
  }

  /**
   * 获取用户行为历史
   */
  async getUserBehaviorHistory(
    userId: string,
    options: {
      behaviorTypes?: BehaviorType[];
      eventId?: string;
      targetUserId?: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<UserBehavior[]> {
    const {
      behaviorTypes,
      eventId,
      targetUserId,
      limit = 50,
      offset = 0,
      startDate,
      endDate
    } = options;

    let sql = `
      SELECT 
        id, user_id, event_id, behavior_type, target_user_id,
        behavior_data, session_id, created_at
      FROM user_behaviors
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    // 添加过滤条件
    if (behaviorTypes && behaviorTypes.length > 0) {
      const placeholders = behaviorTypes.map(() => '?').join(',');
      sql += ` AND behavior_type IN (${placeholders})`;
      params.push(...behaviorTypes);
    }

    if (eventId) {
      sql += ' AND event_id = ?';
      params.push(eventId);
    }

    if (targetUserId) {
      sql += ' AND target_user_id = ?';
      params.push(targetUserId);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate.toISOString());
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate.toISOString());
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await this.query<any>(sql, params);
    
    return rows.map(row => ({
      ...row,
      behavior_data: row.behavior_data ? JSON.parse(row.behavior_data) : null,
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * 获取用户行为统计
   */
  async getUserBehaviorStats(userId: string, eventId?: string): Promise<{
    total_behaviors: number;
    behavior_counts: Record<BehaviorType, number>;
    active_sessions: number;
    avg_session_duration: number;
  }> {
    let sql = `
      SELECT 
        COUNT(*) as total_behaviors,
        behavior_type,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM user_behaviors
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (eventId) {
      sql += ' AND event_id = ?';
      params.push(eventId);
    }

    sql += ' GROUP BY behavior_type';

    const rows = await this.query<{
      total_behaviors: number;
      behavior_type: BehaviorType;
      unique_sessions: number;
    }>(sql, params);

    const behaviorCounts: Record<BehaviorType, number> = {} as any;
    let totalBehaviors = 0;
    let activeSessions = 0;

    for (const row of rows) {
      behaviorCounts[row.behavior_type] = row.total_behaviors;
      totalBehaviors += row.total_behaviors;
      activeSessions = Math.max(activeSessions, row.unique_sessions);
    }

    return {
      total_behaviors: totalBehaviors,
      behavior_counts: behaviorCounts,
      active_sessions: activeSessions,
      avg_session_duration: 0 // 需要更复杂的计算
    };
  }

  // ===== Enhanced Feedback =====

  /**
   * 提交增强反馈
   */
  async submitEnhancedFeedback(feedback: EnhancedFeedback): Promise<number> {
    const sql = `
      INSERT INTO enhanced_feedback (
        user_id, target_user_id, event_id, match_id, feedback_type,
        rating, feedback_dimensions, comments, feedback_context,
        is_implicit, confidence_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(sql, [
      feedback.user_id,
      feedback.target_user_id,
      feedback.event_id,
      feedback.match_id,
      feedback.feedback_type,
      feedback.rating,
      feedback.feedback_dimensions ? JSON.stringify(feedback.feedback_dimensions) : null,
      feedback.comments,
      feedback.feedback_context ? JSON.stringify(feedback.feedback_context) : null,
      feedback.is_implicit ? 1 : 0,
      feedback.confidence_score || 1.0
    ]);

    return result.lastID as number;
  }

  /**
   * 获取用户反馈历史
   */
  async getUserFeedbackHistory(
    userId: string,
    options: {
      feedbackTypes?: EnhancedFeedbackType[];
      eventId?: string;
      minRating?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<EnhancedFeedback[]> {
    const {
      feedbackTypes,
      eventId,
      minRating,
      limit = 50,
      offset = 0
    } = options;

    let sql = `
      SELECT 
        id, user_id, target_user_id, event_id, match_id, feedback_type,
        rating, feedback_dimensions, comments, feedback_context,
        is_implicit, confidence_score, created_at
      FROM enhanced_feedback
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (feedbackTypes && feedbackTypes.length > 0) {
      const placeholders = feedbackTypes.map(() => '?').join(',');
      sql += ` AND feedback_type IN (${placeholders})`;
      params.push(...feedbackTypes);
    }

    if (eventId) {
      sql += ' AND event_id = ?';
      params.push(eventId);
    }

    if (minRating) {
      sql += ' AND rating >= ?';
      params.push(minRating);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await this.query<any>(sql, params);
    
    return rows.map(row => ({
      ...row,
      feedback_dimensions: row.feedback_dimensions ? JSON.parse(row.feedback_dimensions) : null,
      feedback_context: row.feedback_context ? JSON.parse(row.feedback_context) : null,
      is_implicit: Boolean(row.is_implicit),
      created_at: new Date(row.created_at)
    }));
  }

  // ===== User Preference Weights =====

  /**
   * 获取用户偏好权重
   */
  async getUserPreferenceWeights(userId: string): Promise<UserPreferenceWeights | null> {
    const sql = `
      SELECT * FROM user_preference_weights WHERE user_id = ?
    `;

    const row = await this.queryOne<any>(sql, [userId]);
    
    if (!row) return null;

    return {
      ...row,
      last_updated: new Date(row.last_updated),
      created_at: new Date(row.created_at)
    };
  }

  /**
   * 创建或更新用户偏好权重
   */
  async upsertUserPreferenceWeights(weights: UserPreferenceWeights): Promise<void> {
    const sql = `
      INSERT INTO user_preference_weights (
        user_id, industry_weight, position_weight, business_goal_weight,
        skills_weight, experience_weight, company_size_weight,
        user_preference_weight, learning_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        industry_weight = excluded.industry_weight,
        position_weight = excluded.position_weight,
        business_goal_weight = excluded.business_goal_weight,
        skills_weight = excluded.skills_weight,
        experience_weight = excluded.experience_weight,
        company_size_weight = excluded.company_size_weight,
        user_preference_weight = excluded.user_preference_weight,
        learning_count = excluded.learning_count
    `;

    await this.db.run(sql, [
      weights.user_id,
      weights.industry_weight,
      weights.position_weight,
      weights.business_goal_weight,
      weights.skills_weight,
      weights.experience_weight,
      weights.company_size_weight,
      weights.user_preference_weight,
      weights.learning_count
    ]);
  }

  // ===== Algorithm Insights =====

  /**
   * 保存算法洞察
   */
  async saveAlgorithmInsight(insight: AlgorithmInsight): Promise<number> {
    const sql = `
      INSERT INTO algorithm_insights (
        user_id, insight_type, insight_data, confidence_level,
        impact_score, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(sql, [
      insight.user_id,
      insight.insight_type,
      JSON.stringify(insight.insight_data),
      insight.confidence_level,
      insight.impact_score,
      insight.expires_at?.toISOString()
    ]);

    return result.lastID as number;
  }

  /**
   * 获取用户算法洞察
   */
  async getUserAlgorithmInsights(
    userId: string,
    insightTypes?: InsightType[]
  ): Promise<AlgorithmInsight[]> {
    let sql = `
      SELECT 
        id, user_id, insight_type, insight_data, confidence_level,
        impact_score, created_at, expires_at
      FROM algorithm_insights
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;
    const params: any[] = [userId];

    if (insightTypes && insightTypes.length > 0) {
      const placeholders = insightTypes.map(() => '?').join(',');
      sql += ` AND insight_type IN (${placeholders})`;
      params.push(...insightTypes);
    }

    sql += ' ORDER BY confidence_level DESC, impact_score DESC';

    const rows = await this.query<any>(sql, params);
    
    return rows.map(row => ({
      ...row,
      insight_data: JSON.parse(row.insight_data),
      created_at: new Date(row.created_at),
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined
    }));
  }

  // ===== Cold Start Profiles =====

  /**
   * 获取用户冷启动档案
   */
  async getUserColdStartProfile(userId: string): Promise<UserColdStartProfile | null> {
    const sql = `
      SELECT * FROM user_cold_start_profiles WHERE user_id = ?
    `;

    const row = await this.queryOne<any>(sql, [userId]);
    
    if (!row) return null;

    return {
      ...row,
      initial_preferences: row.initial_preferences ? JSON.parse(row.initial_preferences) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * 创建或更新用户冷启动档案
   */
  async upsertUserColdStartProfile(profile: UserColdStartProfile): Promise<void> {
    const sql = `
      INSERT INTO user_cold_start_profiles (
        user_id, initial_preferences, industry_similarity_score,
        position_similarity_score, profile_completeness, behavior_activity_score,
        recommendation_diversity_factor, cold_start_phase
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        initial_preferences = excluded.initial_preferences,
        industry_similarity_score = excluded.industry_similarity_score,
        position_similarity_score = excluded.position_similarity_score,
        profile_completeness = excluded.profile_completeness,
        behavior_activity_score = excluded.behavior_activity_score,
        recommendation_diversity_factor = excluded.recommendation_diversity_factor,
        cold_start_phase = excluded.cold_start_phase
    `;

    await this.db.run(sql, [
      profile.user_id,
      profile.initial_preferences ? JSON.stringify(profile.initial_preferences) : null,
      profile.industry_similarity_score,
      profile.position_similarity_score,
      profile.profile_completeness,
      profile.behavior_activity_score,
      profile.recommendation_diversity_factor,
      profile.cold_start_phase
    ]);
  }

  // ===== Feedback Learning Statistics =====

  /**
   * 获取用户反馈学习统计
   */
  async getFeedbackLearningStats(userId: string, eventId?: string): Promise<FeedbackLearningStats | null> {
    let sql = `
      SELECT * FROM feedback_learning_stats WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (eventId) {
      sql += ' AND event_id = ?';
      params.push(eventId);
    } else {
      sql += ' AND event_id IS NULL';
    }

    const row = await this.queryOne<any>(sql, params);
    
    if (!row) return null;

    return {
      ...row,
      last_learning_update: new Date(row.last_learning_update),
      created_at: new Date(row.created_at)
    };
  }

  /**
   * 更新反馈学习统计
   */
  async upsertFeedbackLearningStats(stats: FeedbackLearningStats): Promise<void> {
    const sql = `
      INSERT INTO feedback_learning_stats (
        user_id, event_id, total_feedback_count, positive_feedback_count,
        negative_feedback_count, avg_match_quality_rating, connection_success_rate,
        meeting_success_rate, algorithm_accuracy_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, event_id) DO UPDATE SET
        total_feedback_count = excluded.total_feedback_count,
        positive_feedback_count = excluded.positive_feedback_count,
        negative_feedback_count = excluded.negative_feedback_count,
        avg_match_quality_rating = excluded.avg_match_quality_rating,
        connection_success_rate = excluded.connection_success_rate,
        meeting_success_rate = excluded.meeting_success_rate,
        algorithm_accuracy_score = excluded.algorithm_accuracy_score,
        last_learning_update = CURRENT_TIMESTAMP
    `;

    await this.db.run(sql, [
      stats.user_id,
      stats.event_id,
      stats.total_feedback_count,
      stats.positive_feedback_count,
      stats.negative_feedback_count,
      stats.avg_match_quality_rating,
      stats.connection_success_rate,
      stats.meeting_success_rate,
      stats.algorithm_accuracy_score
    ]);
  }

  // ===== Analytics and Aggregations =====

  /**
   * 计算用户反馈质量分布
   */
  async getFeedbackQualityDistribution(userId: string, eventId?: string): Promise<{
    excellent: number; // 5分
    good: number;      // 4分
    average: number;   // 3分
    poor: number;      // 2分
    terrible: number;  // 1分
  }> {
    let sql = `
      SELECT 
        rating,
        COUNT(*) as count
      FROM enhanced_feedback
      WHERE user_id = ? AND rating IS NOT NULL
    `;
    const params: any[] = [userId];

    if (eventId) {
      sql += ' AND event_id = ?';
      params.push(eventId);
    }

    sql += ' GROUP BY rating';

    const rows = await this.query<{ rating: number; count: number }>(sql, params);
    
    const distribution = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
      terrible: 0
    };

    for (const row of rows) {
      switch (row.rating) {
        case 5: distribution.excellent = row.count; break;
        case 4: distribution.good = row.count; break;
        case 3: distribution.average = row.count; break;
        case 2: distribution.poor = row.count; break;
        case 1: distribution.terrible = row.count; break;
      }
    }

    return distribution;
  }

  /**
   * 获取行为模式分析
   */
  async getBehaviorPatterns(userId: string, eventId?: string): Promise<{
    most_common_behaviors: { behavior_type: BehaviorType; count: number }[];
    peak_activity_hours: number[];
    average_session_length: number;
    interaction_patterns: Record<string, number>;
  }> {
    // 获取最常见的行为
    let behaviorSql = `
      SELECT behavior_type, COUNT(*) as count
      FROM user_behaviors
      WHERE user_id = ?
    `;
    const behaviorParams: any[] = [userId];

    if (eventId) {
      behaviorSql += ' AND event_id = ?';
      behaviorParams.push(eventId);
    }

    behaviorSql += ' GROUP BY behavior_type ORDER BY count DESC LIMIT 10';

    const behaviorRows = await this.query<{ behavior_type: BehaviorType; count: number }>(
      behaviorSql, 
      behaviorParams
    );

    // 获取活跃时间模式
    let hourSql = `
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as count
      FROM user_behaviors
      WHERE user_id = ?
    `;
    const hourParams: any[] = [userId];

    if (eventId) {
      hourSql += ' AND event_id = ?';
      hourParams.push(eventId);
    }

    hourSql += ' GROUP BY hour ORDER BY count DESC LIMIT 5';

    const hourRows = await this.query<{ hour: number; count: number }>(hourSql, hourParams);

    return {
      most_common_behaviors: behaviorRows,
      peak_activity_hours: hourRows.map(row => row.hour),
      average_session_length: 0, // 需要更复杂的计算
      interaction_patterns: {} // 需要更复杂的分析
    };
  }
} 