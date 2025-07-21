import React, { useState, useEffect } from 'react';
import { feedbackService } from '../../services/feedbackService';
import { LearningMetrics } from '../../../shared/types/FeedbackLearning';

interface LearningProgressProps {
  eventId?: string;
  className?: string;
}

const LearningProgress: React.FC<LearningProgressProps> = ({ 
  eventId, 
  className = '' 
}) => {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [eventId]);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await feedbackService.getLearningMetrics(eventId);
      setMetrics(data);
    } catch (err) {
      setError('加载学习指标失败');
      console.error('Failed to load learning metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    if (score >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressText = (score: number) => {
    if (score >= 0.8) return '优秀';
    if (score >= 0.6) return '良好';
    if (score >= 0.4) return '一般';
    return '需要改进';
  };

  const formatPercentage = (value: number) => {
    return Math.round(value * 100);
  };

  const renderMetricCard = (
    title: string,
    value: number,
    description: string,
    icon: React.ReactNode
  ) => {
    const percentage = formatPercentage(value);
    const progressColor = getProgressColor(value);
    const progressText = getProgressText(value);

    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-blue-600">{icon}</div>
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full text-white ${progressColor}`}>
            {progressText}
          </span>
        </div>
        
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{percentage}%</span>
            <span className="font-semibold text-gray-900">{percentage}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-3">
              {error || '暂无学习数据'}
            </p>
            <button
              onClick={loadMetrics}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              个性化学习进度
            </h3>
            <button
              onClick={loadMetrics}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              刷新
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            AI根据您的反馈持续优化推荐算法
          </p>
        </div>

        {/* 指标网格 */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderMetricCard(
              '总体满意度',
              metrics.overall_satisfaction,
              '您对推荐匹配的整体满意程度',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10 5a3 3 0 003-3V8a3 3 0 013-3h4a3 3 0 013 3v8a3 3 0 01-3 3H6z" />
              </svg>
            )}

            {renderMetricCard(
              '推荐准确度',
              metrics.recommendation_accuracy,
              'AI推荐的匹配质量和相关性',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}

            {renderMetricCard(
              '连接成功率',
              metrics.connection_success_rate,
              '您与推荐用户建立连接的成功率',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}

            {renderMetricCard(
              '学习速度',
              metrics.learning_velocity,
              'AI算法适应您偏好的速度',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )}
          </div>

          {/* 个性化效果 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h4 className="text-sm font-medium text-blue-900">个性化效果</h4>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                算法个性化程度: {formatPercentage(metrics.personalization_effectiveness)}%
              </span>
              <span className={`text-xs px-2 py-1 rounded-full text-white ${getProgressColor(metrics.personalization_effectiveness)}`}>
                {getProgressText(metrics.personalization_effectiveness)}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${formatPercentage(metrics.personalization_effectiveness)}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {metrics.personalization_effectiveness >= 0.7 
                ? '您的推荐已高度个性化，继续提供反馈以保持最佳效果'
                : '继续使用和提供反馈，AI将为您提供更精准的推荐'
              }
            </p>
          </div>

          {/* 改进建议 */}
          {metrics.overall_satisfaction < 0.7 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h4 className="text-sm font-medium text-yellow-900">改进建议</h4>
              </div>
              <div className="text-sm text-yellow-800 space-y-1">
                <p>• 多提供反馈帮助AI学习您的偏好</p>
                <p>• 完善您的个人档案和匹配偏好设置</p>
                <p>• 与推荐的用户建立连接以提供实际成功案例</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningProgress; 