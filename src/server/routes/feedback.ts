import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { FeedbackLearningService } from '../services/FeedbackLearningService';
import {
  SubmitFeedbackRequest,
  TrackBehaviorRequest,
  BehaviorType,
  EnhancedFeedbackType
} from '../../shared/types/FeedbackLearning';

const router = express.Router();

// 初始化反馈学习服务
let feedbackLearningService: FeedbackLearningService;

function getFeedbackLearningService(): FeedbackLearningService {
  if (!feedbackLearningService) {
    feedbackLearningService = new FeedbackLearningService();
  }
  return feedbackLearningService;
}

/**
 * 反馈学习系统路由
 * Base path: /api/v1/feedback
 */

// POST /api/v1/feedback/submit - 提交用户反馈
router.post('/submit', authenticateToken, async (req: Request, res: Response) => {
  try {
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

    const feedback: SubmitFeedbackRequest = req.body;

    // 验证必填字段
    if (!feedback.target_user_id || !feedback.feedback_type) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: target_user_id, feedback_type',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 验证反馈类型
    const validFeedbackTypes: EnhancedFeedbackType[] = [
      'MATCH_QUALITY', 'CONNECTION_OUTCOME', 'MEETING_OUTCOME', 
      'RECOMMENDATION_RELEVANCE', 'PROFILE_ACCURACY', 'ALGORITHM_PREFERENCE'
    ];
    
    if (!validFeedbackTypes.includes(feedback.feedback_type)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FEEDBACK_TYPE',
          message: `Invalid feedback type. Must be one of: ${validFeedbackTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 验证评分
    if (feedback.rating && (feedback.rating < 1 || feedback.rating > 5)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be between 1 and 5',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const result = await getFeedbackLearningService().submitFeedback(userId, feedback);

    res.json({
      success: true,
      data: {
        feedback_id: result.feedbackId,
        learning_updated: result.learningUpdated,
        message: 'Feedback submitted successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'FEEDBACK_SUBMISSION_ERROR',
        message: error.message || 'Failed to submit feedback',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// POST /api/v1/feedback/behavior - 跟踪用户行为
router.post('/behavior', authenticateToken, async (req: Request, res: Response) => {
  try {
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

    const behavior: TrackBehaviorRequest = req.body;

    // 验证必填字段
    if (!behavior.behavior_type) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: behavior_type',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 验证行为类型
    const validBehaviorTypes: BehaviorType[] = [
      'VIEW_PROFILE', 'SEND_CONNECTION', 'ACCEPT_CONNECTION', 'REJECT_CONNECTION',
      'START_CONVERSATION', 'SCHEDULE_MEETING', 'ATTEND_MEETING', 'SEARCH_USERS',
      'FILTER_RESULTS', 'SORT_RESULTS', 'VIEW_MATCH_DETAILS'
    ];
    
    if (!validBehaviorTypes.includes(behavior.behavior_type)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_BEHAVIOR_TYPE',
          message: `Invalid behavior type. Must be one of: ${validBehaviorTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    await getFeedbackLearningService().trackBehavior(userId, behavior);

    res.json({
      success: true,
      data: {
        message: 'Behavior tracked successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'BEHAVIOR_TRACKING_ERROR',
        message: error.message || 'Failed to track behavior',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// GET /api/v1/feedback/metrics - 获取学习指标
router.get('/metrics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { event_id } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const metrics = await getFeedbackLearningService().getLearningMetrics(
      userId, 
      event_id as string
    );

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: error.message || 'Failed to get learning metrics',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// POST /api/v1/feedback/weights/update - 手动更新用户权重
router.post('/weights/update', authenticateToken, async (req: Request, res: Response) => {
  try {
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

    const updatedWeights = await getFeedbackLearningService().updateUserWeights(userId);

    res.json({
      success: true,
      data: {
        weights: updatedWeights,
        message: 'User weights updated successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'WEIGHT_UPDATE_ERROR',
        message: error.message || 'Failed to update user weights',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// POST /api/v1/feedback/cold-start/initialize - 初始化冷启动档案
router.post('/cold-start/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
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

    const profile = await getFeedbackLearningService().initializeColdStartProfile(userId);

    res.json({
      success: true,
      data: {
        profile,
        message: 'Cold start profile initialized successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'COLD_START_ERROR',
        message: error.message || 'Failed to initialize cold start profile',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router; 