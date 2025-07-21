import React, { useState, useEffect } from 'react';
import QuickFeedback from './QuickFeedback';
import DetailedFeedback from './DetailedFeedback';
import { feedbackService } from '../../services/feedbackService';

interface MatchRecommendationCardProps {
  user: {
    id: string;
    name: string;
    position?: string;
    company?: string;
    industry?: string;
    bio?: string;
    avatar?: string;
  };
  matchScore: number;
  matchReasons: Array<{
    type: string;
    description: string;
    score: number;
  }>;
  commonInterests: string[];
  businessSynergies: string[];
  recommendationStrength: 'HIGH' | 'MEDIUM' | 'LOW';
  eventId?: string;
  matchId?: number;
  onConnect?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

const MatchRecommendationCard: React.FC<MatchRecommendationCardProps> = ({
  user,
  matchScore,
  matchReasons,
  commonInterests,
  businessSynergies,
  recommendationStrength,
  eventId,
  matchId,
  onConnect,
  onViewProfile
}) => {
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [hasProvidedFeedback, setHasProvidedFeedback] = useState(false);

  // 组件挂载时自动跟踪查看行为
  useEffect(() => {
    const trackView = async () => {
      await feedbackService.trackMatchView(user.id, eventId, matchScore);
    };
    trackView();
  }, [user.id, eventId, matchScore]);

  const handleConnect = async () => {
    if (onConnect) {
      onConnect(user.id);
    }
    // 跟踪连接行为
    await feedbackService.trackConnectionAction('SEND_CONNECTION', user.id, eventId);
  };

  const handleViewProfile = async () => {
    if (onViewProfile) {
      onViewProfile(user.id);
    }
    // 跟踪档案查看行为
    await feedbackService.trackProfileView(user.id, eventId);
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'HIGH': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'HIGH': return '高度推荐';
      case 'MEDIUM': return '中等推荐';
      case 'LOW': return '一般推荐';
      default: return '推荐';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        {/* 用户信息和匹配分数 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <span className="text-gray-500 font-medium">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
              {user.position && user.company && (
                <p className="text-sm text-gray-600">{user.position} at {user.company}</p>
              )}
              {user.industry && (
                <p className="text-xs text-gray-500">{user.industry}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{matchScore}%</div>
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${getStrengthColor(recommendationStrength)}`}>
                {getStrengthText(recommendationStrength)}
              </div>
            </div>
          </div>
        </div>

        {/* 匹配原因 */}
        {matchReasons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">匹配原因</h4>
            <div className="space-y-1">
              {matchReasons.slice(0, 2).map((reason, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  {reason.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 共同兴趣和商业协同 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {commonInterests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">共同兴趣</h4>
              <div className="flex flex-wrap gap-1">
                {commonInterests.slice(0, 3).map((interest, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {businessSynergies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">商业协同</h4>
              <div className="flex flex-wrap gap-1">
                {businessSynergies.slice(0, 3).map((synergy, index) => (
                  <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {synergy}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 快速反馈 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700">快速反馈</h4>
              <p className="text-xs text-gray-500">帮助AI改进推荐</p>
            </div>
            <QuickFeedback
              targetUserId={user.id}
              eventId={eventId}
              matchId={matchId}
              matchScore={matchScore}
              onFeedbackSubmitted={(rating) => {
                setHasProvidedFeedback(true);
                console.log(`用户为 ${user.name} 提供了 ${rating} 星评分`);
              }}
              size="small"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-3">
          <button
            onClick={handleViewProfile}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium 
                       text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
          >
            查看档案
          </button>
          
          <button
            onClick={handleConnect}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium 
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                       focus:ring-opacity-50 transition-colors"
          >
            发送连接
          </button>
          
          <button
            onClick={() => setShowDetailedFeedback(true)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium 
                       text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
            title="提供详细反馈"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.468L3 21l1.468-5.094A8.959 8.959 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z" />
            </svg>
          </button>
        </div>

        {/* 反馈状态提示 */}
        {hasProvidedFeedback && (
          <div className="mt-3 text-xs text-green-600 font-medium flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            感谢您的反馈！AI正在学习您的偏好。
          </div>
        )}
      </div>

      {/* 详细反馈弹窗 */}
      {showDetailedFeedback && (
        <DetailedFeedback
          targetUserId={user.id}
          targetUserName={user.name}
          eventId={eventId}
          matchId={matchId}
          onClose={() => setShowDetailedFeedback(false)}
          onFeedbackSubmitted={() => {
            setHasProvidedFeedback(true);
            console.log(`用户为 ${user.name} 提供了详细反馈`);
          }}
        />
      )}
    </>
  );
};

export default MatchRecommendationCard; 