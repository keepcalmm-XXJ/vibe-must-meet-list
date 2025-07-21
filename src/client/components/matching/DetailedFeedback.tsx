import React, { useState } from 'react';
import { feedbackService } from '../../services/feedbackService';

interface DetailedFeedbackProps {
  targetUserId: string;
  targetUserName: string;
  eventId?: string;
  matchId?: number;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
}

interface FeedbackDimensions {
  industryRelevance: number;
  positionCompatibility: number;
  businessGoalAlignment: number;
  skillsMatch: number;
}

const DetailedFeedback: React.FC<DetailedFeedbackProps> = ({
  targetUserId,
  targetUserName,
  eventId,
  matchId,
  onClose,
  onFeedbackSubmitted
}) => {
  const [overallRating, setOverallRating] = useState<number>(0);
  const [dimensions, setDimensions] = useState<FeedbackDimensions>({
    industryRelevance: 0,
    positionCompatibility: 0,
    businessGoalAlignment: 0,
    skillsMatch: 0
  });
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dimensionLabels = {
    industryRelevance: '行业相关性',
    positionCompatibility: '职位互补性',
    businessGoalAlignment: '商业目标匹配',
    skillsMatch: '技能匹配度'
  };

  const dimensionDescriptions = {
    industryRelevance: '对方的行业背景与您的需求匹配程度',
    positionCompatibility: '对方的职位与您的合作需求互补程度',
    businessGoalAlignment: '双方商业目标的一致性和协同性',
    skillsMatch: '对方的技能与您的需求匹配程度'
  };

  const handleDimensionChange = (dimension: keyof FeedbackDimensions, value: number) => {
    setDimensions(prev => ({
      ...prev,
      [dimension]: value
    }));
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      alert('请选择总体评分');
      return;
    }

    setIsSubmitting(true);
    try {
      await feedbackService.submitDetailedMatchFeedback(
        targetUserId,
        overallRating,
        dimensions,
        comments.trim() || undefined,
        eventId,
        matchId
      );

      onFeedbackSubmitted?.();
      onClose();
    } catch (error) {
      console.error('提交详细反馈失败:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (
    value: number,
    onChange: (rating: number) => void,
    label: string,
    description?: string
  ) => {
    return (
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`w-6 h-6 transition-colors duration-150 focus:outline-none 
                         focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded
                         ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {value > 0 ? `${value}/5` : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              详细反馈
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 用户信息 */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">为以下用户提供反馈：</p>
            <p className="font-medium text-gray-900">{targetUserName}</p>
          </div>

          {/* 总体评分 */}
          <div className="mb-6">
            {renderStarRating(
              overallRating,
              setOverallRating,
              '总体匹配度 *',
              '您对这次匹配推荐的总体满意程度'
            )}
          </div>

          {/* 维度评分 */}
          <div className="space-y-4 mb-6">
            <h4 className="text-md font-medium text-gray-900">详细评分（可选）</h4>
            {Object.entries(dimensionLabels).map(([key, label]) => (
              <div key={key}>
                {renderStarRating(
                  dimensions[key as keyof FeedbackDimensions],
                  (value) => handleDimensionChange(key as keyof FeedbackDimensions, value),
                  label,
                  dimensionDescriptions[key as keyof FeedbackDescriptions]
                )}
              </div>
            ))}
          </div>

          {/* 评论 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              其他意见（可选）
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="您可以在这里分享更多关于这次匹配的想法..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         resize-none"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {comments.length}/500
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium 
                         text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || overallRating === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium 
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  提交中...
                </>
              ) : (
                '提交反馈'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 添加类型定义以避免编译错误
type FeedbackDescriptions = typeof DetailedFeedback.prototype extends React.Component<any, any> 
  ? never 
  : {
    industryRelevance: string;
    positionCompatibility: string;
    businessGoalAlignment: string;
    skillsMatch: string;
  };

export default DetailedFeedback; 