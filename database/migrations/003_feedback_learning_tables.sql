-- AI Social Matching Platform - Feedback Learning System Tables
-- Migration: 003_feedback_learning_tables.sql

-- User behavior tracking table - 用户行为跟踪表
CREATE TABLE user_behaviors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event_id TEXT,
    behavior_type TEXT NOT NULL CHECK (behavior_type IN (
        'VIEW_PROFILE', 'SEND_CONNECTION', 'ACCEPT_CONNECTION', 'REJECT_CONNECTION',
        'START_CONVERSATION', 'SCHEDULE_MEETING', 'ATTEND_MEETING', 'SEARCH_USERS',
        'FILTER_RESULTS', 'SORT_RESULTS', 'VIEW_MATCH_DETAILS'
    )),
    target_user_id TEXT, -- 行为目标用户（如果适用）
    behavior_data TEXT, -- JSON数据存储行为相关信息
    session_id TEXT, -- 会话ID，用于追踪用户行为路径
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Enhanced feedback table - 增强的反馈表
CREATE TABLE enhanced_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    event_id TEXT,
    match_id INTEGER,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN (
        'MATCH_QUALITY', 'CONNECTION_OUTCOME', 'MEETING_OUTCOME', 
        'RECOMMENDATION_RELEVANCE', 'PROFILE_ACCURACY', 'ALGORITHM_PREFERENCE'
    )),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_dimensions TEXT, -- JSON存储各维度的详细反馈
    comments TEXT,
    feedback_context TEXT, -- JSON存储反馈时的上下文信息
    is_implicit BOOLEAN DEFAULT 0, -- 是否为隐式反馈（从行为推断）
    confidence_score REAL DEFAULT 1.0, -- 反馈的置信度(0-1)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL
);

-- User preference weights - 用户个性化权重表
CREATE TABLE user_preference_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    industry_weight REAL DEFAULT 0.25,
    position_weight REAL DEFAULT 0.20,
    business_goal_weight REAL DEFAULT 0.20,
    skills_weight REAL DEFAULT 0.15,
    experience_weight REAL DEFAULT 0.10,
    company_size_weight REAL DEFAULT 0.05,
    user_preference_weight REAL DEFAULT 0.05,
    learning_count INTEGER DEFAULT 0, -- 学习次数，用于决定权重调整幅度
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Algorithm learning insights - 算法学习洞察表
CREATE TABLE algorithm_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'DIMENSION_PREFERENCE', 'REJECTION_PATTERN', 'CONNECTION_SUCCESS_PATTERN',
        'MEETING_OUTCOME_PATTERN', 'TEMPORAL_PATTERN', 'COLD_START_ADJUSTMENT'
    )),
    insight_data TEXT NOT NULL, -- JSON存储洞察数据
    confidence_level REAL DEFAULT 0.5, -- 洞察的置信度(0-1)
    impact_score REAL DEFAULT 0.0, -- 对推荐质量的影响分数
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- 洞察过期时间（某些模式可能会过时）
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User cold start profile - 用户冷启动档案表
CREATE TABLE user_cold_start_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    initial_preferences TEXT, -- JSON存储初始偏好推断
    industry_similarity_score REAL DEFAULT 0.0, -- 与相似行业用户的相似度
    position_similarity_score REAL DEFAULT 0.0, -- 与相似职位用户的相似度
    profile_completeness REAL DEFAULT 0.0, -- 档案完整度(0-1)
    behavior_activity_score REAL DEFAULT 0.0, -- 行为活跃度分数
    recommendation_diversity_factor REAL DEFAULT 0.8, -- 推荐多样性因子
    cold_start_phase TEXT DEFAULT 'INITIAL' CHECK (cold_start_phase IN (
        'INITIAL', 'LEARNING', 'ADAPTING', 'ESTABLISHED'
    )),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Feedback learning statistics - 反馈学习统计表
CREATE TABLE feedback_learning_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event_id TEXT,
    total_feedback_count INTEGER DEFAULT 0,
    positive_feedback_count INTEGER DEFAULT 0,
    negative_feedback_count INTEGER DEFAULT 0,
    avg_match_quality_rating REAL DEFAULT 0.0,
    connection_success_rate REAL DEFAULT 0.0,
    meeting_success_rate REAL DEFAULT 0.0,
    algorithm_accuracy_score REAL DEFAULT 0.0, -- 算法准确度分数
    last_learning_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    UNIQUE(user_id, event_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX idx_user_behaviors_event_id ON user_behaviors(event_id);
CREATE INDEX idx_user_behaviors_type ON user_behaviors(behavior_type);
CREATE INDEX idx_user_behaviors_created_at ON user_behaviors(created_at);

CREATE INDEX idx_enhanced_feedback_user_id ON enhanced_feedback(user_id);
CREATE INDEX idx_enhanced_feedback_target_user_id ON enhanced_feedback(target_user_id);
CREATE INDEX idx_enhanced_feedback_type ON enhanced_feedback(feedback_type);
CREATE INDEX idx_enhanced_feedback_rating ON enhanced_feedback(rating);

CREATE INDEX idx_algorithm_insights_user_id ON algorithm_insights(user_id);
CREATE INDEX idx_algorithm_insights_type ON algorithm_insights(insight_type);
CREATE INDEX idx_algorithm_insights_confidence ON algorithm_insights(confidence_level);

CREATE INDEX idx_feedback_stats_user_id ON feedback_learning_stats(user_id);
CREATE INDEX idx_feedback_stats_event_id ON feedback_learning_stats(event_id);

-- Add constraints to ensure data quality
CREATE TRIGGER update_user_preference_weights_timestamp 
    AFTER UPDATE ON user_preference_weights
BEGIN
    UPDATE user_preference_weights 
    SET last_updated = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_cold_start_profiles_timestamp 
    AFTER UPDATE ON user_cold_start_profiles
BEGIN
    UPDATE user_cold_start_profiles 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END; 