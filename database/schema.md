# Database Schema Documentation

## Overview

This document describes the SQLite database schema for the AI Social Matching Platform. The schema is designed to support user management, event organization, AI-powered matching, real-time communication, and privacy controls.

## Core Tables

### Users Table
**Purpose**: Stores core user profile information and authentication data.

**Key Fields**:
- `id`: Unique user identifier (UUID)
- `email`: User's email address (unique, used for login)
- `password_hash`: Encrypted password for authentication
- `name`, `company`, `position`, `industry`: Basic profile information
- `bio`: User's professional biography
- `avatar`: Profile picture file path
- `linkedin_profile`: Optional LinkedIn profile URL

**Relationships**:
- One-to-many with `user_skills`, `user_interests`, `user_business_goals`
- One-to-one with `matching_preferences`, `privacy_settings`
- One-to-many with `events` (as organizer)
- Many-to-many with `events` (as participant via `event_participants`)

### User Skills, Interests, and Business Goals
**Purpose**: Normalize user attributes for better matching and querying.

**Tables**:
- `user_skills`: Professional skills and competencies
- `user_interests`: Areas of interest and expertise
- `user_business_goals`: Business objectives and goals

**Design Decision**: Separate tables instead of JSON arrays for:
- Better query performance
- Ability to add metadata (e.g., skill level, priority)
- Easier analytics and reporting

### Matching Preferences Table
**Purpose**: Stores user's matching criteria and preferences.

**Key Fields**:
- `target_positions`: JSON array of desired job roles to connect with
- `target_industries`: JSON array of preferred industries
- `company_size_preference`: Preferred company sizes (startup, SME, enterprise)
- `experience_level_preference`: Desired experience levels
- `business_goal_alignment`: Preferred business goal alignments
- `geographic_preference`: Location preferences

**Design Decision**: JSON fields for flexibility while maintaining single record per user.

### Events Table
**Purpose**: Manages conferences, meetings, and networking events.

**Key Fields**:
- `id`: Unique event identifier
- `event_code`: Human-readable code for joining events
- `organizer_id`: Reference to the user who created the event
- `status`: Event lifecycle status (ACTIVE, INACTIVE, COMPLETED, CANCELLED)
- `max_participants`: Optional participant limit

**Relationships**:
- Many-to-one with `users` (organizer)
- Many-to-many with `users` (participants via `event_participants`)

### Event Participants Table
**Purpose**: Junction table for user-event relationships.

**Key Fields**:
- `status`: Participant status (ACTIVE, LEFT, REMOVED)
- `joined_at`: Timestamp of when user joined the event

**Design Decision**: Separate table instead of JSON array in events for:
- Better query performance for participant lists
- Ability to track participation history
- Support for participant-specific metadata

### Matches Table
**Purpose**: Stores AI matching results and recommendations.

**Key Fields**:
- `match_score`: Numerical matching score (0.0 to 1.0)
- `match_reasons`: JSON array explaining why users were matched
- `common_interests`: JSON array of shared interests
- `business_synergies`: JSON array of potential business collaborations
- `recommendation_strength`: Categorical strength (HIGH, MEDIUM, LOW)

**Design Decision**: Store match results for:
- Performance optimization (avoid recalculating)
- Analytics and algorithm improvement
- User experience consistency

### Connections Table
**Purpose**: Manages user connection requests and relationships.

**Key Fields**:
- `requester_id`: User who initiated the connection
- `recipient_id`: User who received the connection request
- `status`: Connection status (PENDING, ACCEPTED, REJECTED, BLOCKED)
- `event_id`: Optional reference to the event where connection was made

**Constraints**:
- Unique constraint on (requester_id, recipient_id) to prevent duplicate requests
- Self-referencing foreign keys to users table

### Messages Table
**Purpose**: Stores user-to-user messages and chat history.

**Key Fields**:
- `sender_id`, `recipient_id`: Message participants
- `connection_id`: Optional reference to the connection
- `content`: Message text content
- `message_type`: Type of message (TEXT, IMAGE, FILE)
- `read_at`: Timestamp when message was read

**Design Decision**: Link to connections table for:
- Better organization of conversations
- Privacy controls based on connection status
- Message history management

### Meetings Table
**Purpose**: Manages scheduled meetings between connected users.

**Key Fields**:
- `connection_id`: Reference to the user connection
- `scheduled_time`: Meeting date and time
- `location`: Meeting location or virtual meeting details
- `meeting_type`: IN_PERSON, VIRTUAL, or PHONE
- `status`: Meeting status (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED)

### Feedback Table
**Purpose**: Collects user feedback for algorithm improvement.

**Key Fields**:
- `feedback_type`: Type of feedback (MATCH_QUALITY, CONNECTION_OUTCOME, MEETING_OUTCOME)
- `rating`: Numerical rating (1-5 scale)
- `comments`: Optional text feedback

**Design Decision**: Comprehensive feedback system for:
- AI algorithm learning and improvement
- Quality assurance and monitoring
- User experience optimization

### Privacy Settings Table
**Purpose**: User privacy and visibility controls.

**Key Fields**:
- `profile_visibility`: Who can see user's profile
- `contact_visibility`: Who can see contact information
- `allow_connection_requests`: Whether to accept connection requests
- `allow_direct_messages`: Whether to allow direct messages
- `show_online_status`: Whether to show online/offline status
- `data_sharing_consent`: Consent for data analysis and improvement

## Indexes and Performance

### Primary Indexes
- All foreign key columns are indexed for join performance
- Frequently queried columns (email, event_code, status fields) have dedicated indexes
- Timestamp columns are indexed for chronological queries

### Composite Indexes
- `(event_id, user_id)` for event participant queries
- `(user_id, match_score DESC)` for match result ordering
- `(sender_id, recipient_id, created_at)` for conversation queries

### Query Optimization
- JSON fields are used sparingly and only where flexibility is essential
- Normalized tables for frequently queried attributes (skills, interests)
- Appropriate use of CHECK constraints for data integrity

## Data Integrity

### Foreign Key Constraints
- All relationships use foreign key constraints with appropriate CASCADE/SET NULL actions
- Prevents orphaned records and maintains referential integrity

### Check Constraints
- Enum-like values use CHECK constraints (status fields, rating ranges)
- Ensures data consistency at the database level

### Unique Constraints
- Prevents duplicate relationships (user-event participation, user connections)
- Ensures business rule compliance

## Migration Strategy

### Version Control
- Each schema change is a separate migration file
- Migration tracking table records executed migrations
- Rollback scripts available for critical changes

### Deployment
- Migrations run automatically on application startup
- Database backup before major schema changes
- Gradual rollout for production deployments

## Security Considerations

### Data Protection
- Password hashing handled at application level
- Sensitive data (email, personal info) access controlled
- Privacy settings enforced at query level

### Access Control
- User data isolation through proper WHERE clauses
- Event-based access control for participant data
- Connection-based access for messages and meetings

## Future Considerations

### Scalability
- Current schema optimized for SQLite and moderate scale
- Migration path to PostgreSQL for larger deployments
- Partitioning strategies for high-volume tables (messages, matches)

### Analytics
- Separate analytics tables for reporting and insights
- Data warehouse integration for advanced analytics
- Real-time metrics and monitoring tables