import React, { useState } from 'react';
import { feedbackService } from '../../services/feedbackService';

interface QuickFeedbackProps {
  targetUserId: string;
  eventId?: string;
  matchId?: number;
  matchScore?: number;
  onFeedbackSubmitted?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const QuickFeedback: React.FC<QuickFeedbackProps> = ({
  targetUserId,
  eventId,
  matchId,
  matchScore,
  onFeedbackSubmitted,
  size = 'medium',
  disabled = false
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  const handleStarClick = async (selectedRating: number) => {
    if (disabled || isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    try {
      await feedbackService.submitQuickMatchFeedback(
        targetUserId,
        selectedRating,
        eventId,
        matchId
      );
      
      setRating(selectedRating);
      setIsSubmitted(true);
      onFeedbackSubmitted?.(selectedRating);
      
      // 自动跟踪匹配查看行为
      await feedbackService.trackMatchView(targetUserId, eventId, matchScore);
    } catch (error) {
      console.error('提交反馈失败:', error);
      // 可以在这里显示错误提示
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarHover = (starIndex: number) => {
    if (!disabled && !isSubmitted) {
      setHover(starIndex);
    }
  };

  const handleStarLeave = () => {
    setHover(null);
  };

  const getStarColor = (starIndex: number) => {
    const activeIndex = hover !== null ? hover : rating;
    
    if (isSubmitted) {
      return starIndex <= (rating || 0) ? 'text-yellow-400' : 'text-gray-300';
    }
    
    if (disabled) {
      return 'text-gray-200';
    }
    
    return starIndex <= (activeIndex || 0) ? 'text-yellow-400' : 'text-gray-300';
  };

  const getCursor = () => {
    if (disabled || isSubmitted) return 'cursor-default';
    return isSubmitting ? 'cursor-wait' : 'cursor-pointer';
  };

  const getRatingText = (rating: number) => {
    const texts = {
      1: '不匹配',
      2: '一般',
      3: '还好',
      4: '很好',
      5: '完美匹配'
    };
    return texts[rating as keyof typeof texts] || '';
  };

  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((starIndex) => (
          <button
            key={starIndex}
            className={`${sizeClasses[size]} ${getStarColor(starIndex)} ${getCursor()} 
                       transition-colors duration-150 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:ring-opacity-50 rounded`}
            onClick={() => handleStarClick(starIndex)}
            onMouseEnter={() => handleStarHover(starIndex)}
            onMouseLeave={handleStarLeave}
            disabled={disabled || isSubmitting || isSubmitted}
            title={getRatingText(starIndex)}
          >
            <svg
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        
        {isSubmitting && (
          <div className="ml-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
      
      {/* 显示评分文本 */}
      {(hover !== null || rating !== null) && (
        <div className="text-xs text-gray-600 min-h-[16px]">
          {hover !== null ? getRatingText(hover) : 
           rating !== null ? getRatingText(rating) : ''}
        </div>
      )}
      
      {/* 提交成功提示 */}
      {isSubmitted && (
        <div className="text-xs text-green-600 font-medium">
          反馈已提交
        </div>
      )}
    </div>
  );
};

export default QuickFeedback; 