import { UserRepository, EventRepository } from '../../src/server/database/repositories';
import DatabaseManager from '../../src/server/database/connection';
import DatabaseMigrator from '../../database/migrate';
import path from 'path';
import fs from 'fs';

describe('Database Access Layer - Simple Tests', () => {
  const TEST_DB_PATH = path.join(process.cwd(), 'database', 'test-simple.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Set test database path
    process.env.DB_PATH = TEST_DB_PATH;

    // Reset database manager instance
    DatabaseManager.resetInstance();

    // Run migrations
    const migrator = new DatabaseMigrator();
    await migrator.runMigrations();

    // Connect to database
    await DatabaseManager.getInstance().connect();
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

  it('should create and retrieve a user', async () => {
    const userRepository = new UserRepository();
    
    const userData = {
      id: 'test-user-simple',
      email: 'simple@example.com',
      password_hash: 'hashed_password',
      name: 'Simple Test User',
      company: 'Test Company',
      position: 'Developer'
    };

    // Create user
    const createdUser = await userRepository.create(userData);
    expect(createdUser).toBeDefined();
    expect(createdUser.id).toBe('test-user-simple');
    expect(createdUser.email).toBe('simple@example.com');

    // Find user by ID
    const foundUser = await userRepository.findById('test-user-simple');
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('simple@example.com');

    // Find user by email
    const foundByEmail = await userRepository.findByEmail('simple@example.com');
    expect(foundByEmail).toBeDefined();
    expect(foundByEmail?.id).toBe('test-user-simple');
  });

  it('should create and retrieve an event', async () => {
    const eventRepository = new EventRepository();
    const userRepository = new UserRepository();

    // Create organizer user first
    const organizer = await userRepository.create({
      id: 'organizer-simple',
      email: 'organizer@example.com',
      password_hash: 'hashed_password',
      name: 'Event Organizer'
    });

    const eventData = {
      id: 'test-event-simple',
      name: 'Simple Test Event',
      description: 'A simple test event',
      start_date: new Date('2024-12-01T09:00:00Z'),
      end_date: new Date('2024-12-01T17:00:00Z'),
      location: 'Test Location',
      organizer_id: organizer.id,
      event_code: 'SIMPLE123',
      status: 'ACTIVE' as const
    };

    // Create event
    const createdEvent = await eventRepository.create(eventData);
    expect(createdEvent).toBeDefined();
    expect(createdEvent.id).toBe('test-event-simple');
    expect(createdEvent.event_code).toBe('SIMPLE123');

    // Find event by code
    const foundEvent = await eventRepository.findByEventCode('SIMPLE123');
    expect(foundEvent).toBeDefined();
    expect(foundEvent?.id).toBe('test-event-simple');
  });

  it('should manage event participants', async () => {
    const eventRepository = new EventRepository();
    const userRepository = new UserRepository();

    // Create participant user
    const participant = await userRepository.create({
      id: 'participant-simple',
      email: 'participant@example.com',
      password_hash: 'hashed_password',
      name: 'Event Participant'
    });

    // Add participant to event
    const participantRecord = await eventRepository.addParticipant('test-event-simple', participant.id);
    expect(participantRecord).toBeDefined();
    expect(participantRecord.event_id).toBe('test-event-simple');
    expect(participantRecord.user_id).toBe(participant.id);

    // Check if user is participant
    const isParticipant = await eventRepository.isParticipant('test-event-simple', participant.id);
    expect(isParticipant).toBe(true);

    // Get participant count
    const count = await eventRepository.getParticipantCount('test-event-simple');
    expect(count).toBe(1);
  });

  it('should handle database queries', async () => {
    const userRepository = new UserRepository();

    // Test raw query
    const result = await userRepository.query('SELECT COUNT(*) as count FROM users');
    expect(result).toBeDefined();
    expect(result[0]).toHaveProperty('count');
    expect(result[0].count).toBeGreaterThan(0);

    // Test count method
    const userCount = await userRepository.count();
    expect(userCount).toBeGreaterThan(0);

    // Test exists method
    const exists = await userRepository.exists({ email: 'simple@example.com' });
    expect(exists).toBe(true);

    const notExists = await userRepository.exists({ email: 'nonexistent@example.com' });
    expect(notExists).toBe(false);
  });
});