-- AI Social Matching Platform - Initial Database Schema
-- Migration: 001_initial_schema.sql

-- Users table - Core user information and profiles
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    position TEXT,
    industry TEXT,
    bio TEXT,
    avatar TEXT,
    linkedin_profile TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User skills - Many-to-many relationship for user skills
CREATE TABLE user_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    skill TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, skill)
);

-- User interests - Many-to-many relationship for user interests
CREATE TABLE user_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    interest TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, interest)
);

-- User business goals - Many-to-many relationship for business goals
CREATE TABLE user_business_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    business_goal TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, business_goal)
);

-- Matching preferences - User's matching criteria and preferences
CREATE TABLE matching_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    target_positions TEXT, -- JSON array of target positions
    target_industries TEXT, -- JSON array of target industries
    company_size_preference TEXT, -- JSON array of company sizes
    experience_level_preference TEXT, -- JSON array of experience levels
    business_goal_alignment TEXT, -- JSON array of business goals
    geographic_preference TEXT, -- JSON array of geographic preferences
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Events table - Conference and meeting events
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    location TEXT NOT NULL,
    organizer_id TEXT NOT NULL,
    event_code TEXT UNIQUE NOT NULL,
    max_participants INTEGER,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id)
);

-- Event participants - Many-to-many relationship between users and events
CREATE TABLE event_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LEFT', 'REMOVED')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)
);

-- Matches table - AI matching results and history
CREATE TABLE matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    match_score REAL NOT NULL,
    match_reasons TEXT, -- JSON array of match reasons
    common_interests TEXT, -- JSON array of common interests
    business_synergies TEXT, -- JSON array of business synergies
    recommendation_strength TEXT CHECK (recommendation_strength IN ('HIGH', 'MEDIUM', 'LOW')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id, target_user_id)
);

-- Connections table - User connection requests and relationships
CREATE TABLE connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    event_id TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED')),
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    UNIQUE(requester_id, recipient_id)
);

-- Messages table - User-to-user messaging
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    connection_id INTEGER,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'FILE')),
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
);

-- Meetings table - Scheduled meetings between users
CREATE TABLE meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_time DATETIME NOT NULL,
    location TEXT,
    meeting_type TEXT DEFAULT 'IN_PERSON' CHECK (meeting_type IN ('IN_PERSON', 'VIRTUAL', 'PHONE')),
    status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
);

-- Feedback table - User feedback on matches and connections
CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    event_id TEXT,
    match_id INTEGER,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('MATCH_QUALITY', 'CONNECTION_OUTCOME', 'MEETING_OUTCOME')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL
);

-- Privacy settings table - User privacy and visibility controls
CREATE TABLE privacy_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    profile_visibility TEXT DEFAULT 'PUBLIC' CHECK (profile_visibility IN ('PUBLIC', 'EVENTS_ONLY', 'CONNECTIONS_ONLY', 'PRIVATE')),
    contact_visibility TEXT DEFAULT 'CONNECTIONS' CHECK (contact_visibility IN ('PUBLIC', 'CONNECTIONS', 'PRIVATE')),
    allow_connection_requests BOOLEAN DEFAULT 1,
    allow_direct_messages BOOLEAN DEFAULT 1,
    show_online_status BOOLEAN DEFAULT 1,
    data_sharing_consent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);