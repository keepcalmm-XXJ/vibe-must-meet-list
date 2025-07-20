import { Router, Response } from 'express';
import { asyncHandler, authenticateToken, AuthenticatedRequest } from '../middleware';
import { MatchingService, SortStrategy, FilterOptions } from '../services/MatchingService';
import { MatchResult } from '../../shared/types/Matching';
import { getDatabase } from '../database/connection';

const router = Router();

// 延迟初始化服务，确保数据库已初始化
function getMatchingService(): MatchingService {
  return new MatchingService(getDatabase());
}

/**
 * Matching and recommendations routes
 * Base path: /api/v1/matching
 */

// GET /api/v1/matching/recommendations/:eventId
router.get('/recommendations/:eventId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  // 解析查询参数
  const {
    limit = '10',
    sort = 'BALANCED',
    minScore,
    onlineOnly,
    preferenceOnly,
    diversity,
    includePartial = 'true'
  } = req.query;

  try {
    // 构建过滤选项
    const filterOptions: FilterOptions = {};
    if (minScore) filterOptions.minScore = parseInt(minScore as string);
    if (onlineOnly === 'true') filterOptions.onlineOnly = true;
    if (preferenceOnly === 'true') filterOptions.preferenceMatchOnly = true;
    if (diversity) filterOptions.diversityFactor = parseFloat(diversity as string);

    // 生成匹配推荐
    const recommendations = await getMatchingService().generateMatches(userId, eventId, {
      limit: parseInt(limit as string),
      sortStrategy: sort as SortStrategy,
      filterOptions,
      includePartialMatches: includePartial === 'true'
    });

    res.json({
      success: true,
      data: {
        eventId,
        userId,
        recommendations,
        total: recommendations.length,
        filters: filterOptions,
        sortStrategy: sort
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(400).json({
      error: {
        code: 'MATCHING_ERROR',
        message: error.message || 'Failed to generate matching recommendations',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/matching/preferences/:eventId - 基于用户偏好的分类推荐
router.get('/preferences/:eventId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const { strict = 'false' } = req.query;

  try {
    // 获取基于偏好的分类推荐
    const recommendations = await getMatchingService().getPreferenceBasedRecommendations(
      userId, 
      eventId, 
      strict === 'true'
    );

    res.json({
      success: true,
      data: {
        eventId,
        userId,
        perfect: recommendations.perfect,
        partial: recommendations.partial,
        alternative: recommendations.alternative,
        summary: {
          perfectCount: recommendations.perfect.length,
          partialCount: recommendations.partial.length,
          alternativeCount: recommendations.alternative.length,
          total: recommendations.perfect.length + recommendations.partial.length + recommendations.alternative.length
        },
        strictMode: strict === 'true'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(400).json({
      error: {
        code: 'PREFERENCE_MATCHING_ERROR',
        message: error.message || 'Failed to generate preference-based recommendations',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/matching/history/:eventId? - 获取匹配历史记录
router.get('/history/:eventId?', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const { 
    limit = '20', 
    minScore = '0', 
    strength,
    includePast = 'true' 
  } = req.query;

  try {
    // 解析查询参数
    const options = {
      limit: parseInt(limit as string),
      minScore: parseInt(minScore as string),
      strengthFilter: strength ? [strength as any] : undefined,
      includePastMatches: includePast === 'true'
    };

    // 获取匹配历史记录
    const historyData = await getMatchingService().getMatchHistory(userId, eventId, options);

    res.json({
      success: true,
      data: {
        eventId: eventId || null,
        userId,
        history: historyData.matches,
        statistics: historyData.statistics,
        filters: {
          limit: options.limit,
          minScore: options.minScore,
          strengthFilter: options.strengthFilter,
          includePastMatches: options.includePastMatches
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(400).json({
      error: {
        code: 'HISTORY_RETRIEVAL_ERROR',
        message: error.message || 'Failed to retrieve match history',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/matching/stats/:eventId - 获取会议匹配统计信息
router.get('/stats/:eventId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    // 获取会议匹配统计信息（可能需要权限验证：组织者或参与者）
    const stats = await getMatchingService().getEventMatchingStats(eventId);

    res.json({
      success: true,
      data: {
        eventId,
        requestedBy: userId,
        statistics: stats,
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(400).json({
      error: {
        code: 'STATS_ERROR',
        message: error.message || 'Failed to retrieve matching statistics',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/matching/score/:eventId/:targetUserId - 获取特定用户间的匹配分数详情
router.get('/score/:eventId/:targetUserId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, targetUserId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    // 获取特定用户间的匹配详情
    const matches = await getMatchingService().generateMatches(userId, eventId, {
      limit: 100,
      saveToHistory: false // 查询时不保存到历史记录
    });

    const targetMatch = matches.find(match => match.target_user.id === targetUserId);

    if (!targetMatch) {
      return res.status(404).json({
        error: {
          code: 'MATCH_NOT_FOUND',
          message: 'Target user not found in event participants or no match generated',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        eventId,
        userId,
        targetUserId,
        matchDetails: {
          matchScore: targetMatch.match_score,
          recommendationStrength: targetMatch.recommendation_strength,
          matchReasons: targetMatch.match_reasons,
          commonInterests: targetMatch.common_interests,
          businessSynergies: targetMatch.business_synergies,
          partialMatch: targetMatch.partial_match
        },
        targetUser: {
          id: targetMatch.target_user.id,
          name: targetMatch.target_user.name,
          position: targetMatch.target_user.position,
          company: targetMatch.target_user.company,
          industry: targetMatch.target_user.industry
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(400).json({
      error: {
        code: 'SCORE_CALCULATION_ERROR',
        message: error.message || 'Failed to calculate matching score',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// POST /api/v1/matching/feedback
router.post('/feedback', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement matching feedback
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Matching feedback not yet implemented',
      timestamp: new Date().toISOString(),
    },
  });
}));

export { router as matchingRoutes };