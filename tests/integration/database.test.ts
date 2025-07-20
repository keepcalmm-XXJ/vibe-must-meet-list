import { UserRepository, EventRepository } from '../../src/server/database/repositories';
import DatabaseManager from '../../src/server/database/connection';
import DatabaseMigrator from '../../database/migrate';
import path from 'path';
import fs from 'fs';

describe('Database Integration Tests', () => {
  const TEST_DB_PATH = path.join(process.cwd(), 'database', 'test-integration.db');
  let userRepository: UserRepository;
  let eventRepository: EventRepository;

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Set test database path
    process.env.DB_PATH = TEST_DB_PATH;

    // Close any existing connection
    try {
      await DatabaseManager.getInstance().close();
    } catch (e) {
      // Ignore if no connection exists
    }

    // Run migrations
    const migrator = new DatabaseMigrator();
    await migrator.runMigrations();

    // Connect to database
    await DatabaseManager.getInstance().connect();

    // Initialize repositories
    userRepository = new UserRepository();
    eventRepository = new EventRepository();
  });

  afterAll(async () => {
    try {
      await DatabaseManager.getInstance().close();
    } catch (e) {
      // Ignore close errors
    }
    
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('User Repository', () => {
    let testUserId: string;

    it('should create a user with string ID', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        company: 'Test Company',
        position: 'Developer',
        industry: 'Technology'
      };

      const createdUser = await userRepository.create(userData);
      testUserId = createdUser.id;

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBe('user-123');
      expect(createdUser.email).toBe('test@example.com');
      expect(createdUser.name).toBe('Test User');
    });

    it('should find user by ID', async () => {
      const user = await userRepository.findById(testUserId);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);
      expect(user?.email).toBe('test@example.com');
    });

    it('should find user by email', async () => {
      const user = await userRepository.findByEmail('test@example.com');
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);
      expect(user?.name).toBe('Test User');
    });

    it('should update user profile with skills', async () => {
      const profileData = {
        bio: 'Updated bio',
        skills: ['JavaScript', 'TypeScript'],
        interests: ['Web Development'],
        business_goals: ['Build SaaS']
      };

      const updatedProfile = await userRepository.updateUserProfile(testUserId, profileData);

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile?.bio).toBe('Updated bio');
      expect(updatedProfile?.skills).toEqual(['JavaScript', 'TypeScript']);
      expect(updatedProfile?.interests).toEqual(['Web Development']);
      expect(updatedProfile?.business_goals).toEqual(['Build SaaS']);
    });

    it('should get user profile with related data', async () => {
      const profile = await userRepository.getUserProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile?.skills).toContain('JavaScript');
      expect(profile?.interests).toContain('Web Development');
      expect(profile?.business_goals).toContain('Build SaaS');
      expect(profile?.password_hash).toBeUndefined(); // Should not include password
    });
  });

  describe('Event Repository', () => {
    let testEventId: string;
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user for event tests
      const user = await userRepository.create({
        id: 'event-user-123',
        email: 'eventuser@example.com',
        password_hash: 'hashed_password',
        name: 'Event User'
      });
      testUserId = user.id;
    });

    it('should create an event', async () => {
      const eventData = {
        id: 'event-123',
        name: 'Test Conference',
        description: 'A test conference',
        start_date: new Date('2024-12-01T09:00:00Z'),
        end_date: new Date('2024-12-01T17:00:00Z'),
        location: 'Test Venue',
        organizer_id: testUserId,
        event_code: 'TEST123',
        status: 'ACTIVE' as const
      };

      const createdEvent = await eventRepository.create(eventData);
      testEventId = createdEvent.id;

      expect(createdEvent).toBeDefined();
      expect(createdEvent.id).toBe('event-123');
      expect(createdEvent.name).toBe('Test Conference');
      expect(createdEvent.event_code).toBe('TEST123');
    });

    it('should find event by event code', async () => {
      const event = await eventRepository.findByEventCode('TEST123');
      
      expect(event).toBeDefined();
      expect(event?.id).toBe(testEventId);
      expect(event?.name).toBe('Test Conference');
    });

    it('should add participant to event', async () => {
      const participant = await eventRepository.addParticipant(testEventId, testUserId);
      
      expect(participant).toBeDefined();
      expect(participant.event_id).toBe(testEventId);
      expect(participant.user_id).toBe(testUserId);
      expect(participant.status).toBe('ACTIVE');
    });

    it('should check if user is participant', async () => {
      const isParticipant = await eventRepository.isParticipant(testEventId, testUserId);
      expect(isParticipant).toBe(true);
    });

    it('should get event participants', async () => {
      const participants = await eventRepository.getEventParticipants(testEventId);
      
      expect(participants).toBeDefined();
      expect(participants.length).toBe(1);
      expect(participants[0].id).toBe(testUserId);
    });

    it('should get participant count', async () => {
      const count = await eventRepository.getParticipantCount(testEventId);
      expect(count).toBe(1);
    });
  });

  describe('Database Connection', () => {
    it('should be connected', async () => {
      const isConnected = await DatabaseManager.getInstance().isConnected();
      expect(isConnected).toBe(true);
    });

    it('should execute raw queries', async () => {
      const result = await userRepository.query('SELECT COUNT(*) as count FROM users');
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('count');
    });
  });
});