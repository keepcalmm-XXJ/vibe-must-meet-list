-- AI Social Matching Platform - Database Indexes
-- Migration: 002_indexes.sql

-- User table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_industry ON users(industry);
CREATE INDEX idx_users_position ON users(position);
CREATE INDEX idx_users_company ON users(company);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User skills indexes
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill);

-- User interests indexes
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest ON user_interests(interest);

-- User business goals indexes
CREATE INDEX idx_user_business_goals_user_id ON user_business_goals(user_id);
CREATE INDEX idx_user_business_goals_goal ON user_business_goals(business_goal);

-- Matching preferences indexes
CREATE INDEX idx_matching_preferences_user_id ON matching_preferences(user_id);

-- Events table indexes
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_event_code ON events(event_code);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);

-- Event participants indexes
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);
CREATE INDEX idx_event_participants_joined_at ON event_participants(joined_at);

-- Matches table indexes
CREATE INDEX idx_matches_event_id ON matches(event_id);
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_target_user_id ON matches(target_user_id);
CREATE INDEX idx_matches_match_score ON matches(match_score);
CREATE INDEX idx_matches_recommendation_strength ON matches(recommendation_strength);
CREATE INDEX idx_matches_created_at ON matches(created_at);

-- Connections table indexes
CREATE INDEX idx_connections_requester_id ON connections(requester_id);
CREATE INDEX idx_connections_recipient_id ON connections(recipient_id);
CREATE INDEX idx_connections_event_id ON connections(event_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_created_at ON connections(created_at);

-- Messages table indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_connection_id ON messages(connection_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_read_at ON messages(read_at);

-- Meetings table indexes
CREATE INDEX idx_meetings_connection_id ON meetings(connection_id);
CREATE INDEX idx_meetings_scheduled_time ON meetings(scheduled_time);
CREATE INDEX idx_meetings_status ON meetings(status);

-- Feedback table indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_target_user_id ON feedback(target_user_id);
CREATE INDEX idx_feedback_event_id ON feedback(event_id);
CREATE INDEX idx_feedback_match_id ON feedback(match_id);
CREATE INDEX idx_feedback_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);

-- Privacy settings indexes
CREATE INDEX idx_privacy_settings_user_id ON privacy_settings(user_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_event_participants_event_user ON event_participants(event_id, user_id);
CREATE INDEX idx_matches_event_user ON matches(event_id, user_id);
CREATE INDEX idx_matches_user_score ON matches(user_id, match_score DESC);
CREATE INDEX idx_connections_users ON connections(requester_id, recipient_id);
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX idx_feedback_user_event ON feedback(user_id, event_id);