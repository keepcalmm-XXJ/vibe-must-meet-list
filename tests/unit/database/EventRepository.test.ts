import { EventRepository } from '../../../src/server/database/repositories/EventRepository';
import { UserRepository } from '../../../src/server/database/repositories/UserRepository';
import DatabaseManager from '../../../src/server/database/connection';
import { Event } from '../../../src/shared/types/Event';

describe('EventRepository', () => {
  let eventRepository: EventRepository;
  let userRepository: UserRepository;
  let testEventId: string;
  let testUserId: string;
  let testOrganizerId: string;

  beforeAll(async () => {
    // Connect to test database
    await DatabaseManager.getInstance().connect();
    eventRepository = new EventRepository();
    userRepository = new UserRepository();

    // Create test users
    const organizer = await userRepository.create({
      id: 'test-organizer-1',
      email: 'organizer@example.com',
      password_hash: 'hashed_password',
      name: 'Event Organizer'
    });
    testOrganizerId = organizer.id;

    const participant = await userRepository.create({
      id: 'test-participant-1',
      email: 'participant@example.com',
      password_hash: 'hashed_password',
      name: 'Event Participant'
    });
    testUserId = participant.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testEventId) {
      await eventRepository.delete(testEventId);
    }
    if (testUserId) {
      await userRepository.delete(testUserId);
    }
    if (testOrganizerId) {
      await userRepository.delete(testOrganizerId);
    }
    await DatabaseManager.getInstance().close();
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const eventData = {
        id: 'test-event-1',
        name: 'Test Conference',
        description: 'A test conference event',
        start_date: new Date('2024-12-01T09:00:00Z'),
        end_date: new Date('2024-12-01T17:00:00Z'),
        location: 'Test Venue',
        organizer_id: testOrganizerId,
        event_code: 'TEST2024',
        max_participants: 100,
        status: 'ACTIVE' as const
      };

      const createdEvent = await eventRepository.create(eventData);
      testEventId = createdEvent.id;

      expect(createdEvent).toBeDefined();
      expect(createdEvent.name).toBe(eventData.name);
      expect(createdEvent.event_code).toBe(eventData.event_code);
      expect(createdEvent.organizer_id).toBe(testOrganizerId);
      expect(createdEvent.status).toBe('ACTIVE');
    });

    it('should throw error for duplicate event code', async () => {
      const eventData = {
        id: 'test-event-2',
        name: 'Another Conference',
        start_date: new Date('2024-12-02T09:00:00Z'),
        end_date: new Date('2024-12-02T17:00:00Z'),
        location: 'Another Venue',
        organizer_id: testOrganizerId,
        event_code: 'TEST2024', // Same code as previous test
        status: 'ACTIVE' as const
      };

      await expect(eventRepository.create(eventData)).rejects.toThrow();
    });
  });

  describe('findByEventCode', () => {
    it('should find event by event code', async () => {
      const event = await eventRepository.findByEventCode('TEST2024');
      
      expect(event).toBeDefined();
      expect(event?.event_code).toBe('TEST2024');
      expect(event?.name).toBe('Test Conference');
    });

    it('should return null for non-existent event code', async () => {
      const event = await eventRepository.findByEventCode('NONEXISTENT');
      expect(event).toBeNull();
    });
  });

  describe('participant management', () => {
    it('should add participant to event', async () => {
      const participant = await eventRepository.addParticipant(testEventId, testUserId);
      
      expect(participant).toBeDefined();
      expect(participant.event_id).toBe(testEventId);
      expect(participant.user_id).toBe(testUserId);
      expect(participant.status).toBe('ACTIVE');
    });

    it('should throw error when adding duplicate participant', async () => {
      await expect(
        eventRepository.addParticipant(testEventId, testUserId)
      ).rejects.toThrow('User is already an active participant');
    });

    it('should check if user is participant', async () => {
      const isParticipant = await eventRepository.isParticipant(testEventId, testUserId);
      expect(isParticipant).toBe(true);

      const isNotParticipant = await eventRepository.isParticipant(testEventId, 'non-existent-user');
      expect(isNotParticipant).toBe(false);
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

    it('should remove participant from event', async () => {
      const removed = await eventRepository.removeParticipant(testEventId, testUserId);
      expect(removed).toBe(true);

      const isParticipant = await eventRepository.isParticipant(testEventId, testUserId);
      expect(isParticipant).toBe(false);

      const count = await eventRepository.getParticipantCount(testEventId);
      expect(count).toBe(0);
    });
  });

  describe('getEventsByOrganizer', () => {
    it('should get events organized by user', async () => {
      const events = await eventRepository.getEventsByOrganizer(testOrganizerId);
      
      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].organizer_id).toBe(testOrganizerId);
    });
  });

  describe('getActiveEvents', () => {
    it('should get active events', async () => {
      const events = await eventRepository.getActiveEvents();
      
      expect(events).toBeDefined();
      expect(events.every(event => event.status === 'ACTIVE')).toBe(true);
    });
  });

  describe('searchEvents', () => {
    it('should search events by name', async () => {
      const results = await eventRepository.searchEvents('Test');
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Test');
    });
  });

  describe('updateEventStatus', () => {
    it('should update event status', async () => {
      const updatedEvent = await eventRepository.updateEventStatus(testEventId, 'COMPLETED');
      
      expect(updatedEvent).toBeDefined();
      expect(updatedEvent?.status).toBe('COMPLETED');
    });
  });
});