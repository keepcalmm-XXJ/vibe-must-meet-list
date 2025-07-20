import { Event, EventCreationData, EventStatus } from '../../shared/types/Event';
import { EventRepository } from '../database/repositories/EventRepository';
import { v4 as uuidv4 } from 'uuid';

export class EventModel {
  private eventRepository: EventRepository;

  constructor() {
    this.eventRepository = new EventRepository();
  }

  /**
   * Generate unique event code
   */
  private generateEventCode(): string {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new event
   */
  async createEvent(organizerId: string, eventData: EventCreationData): Promise<Event> {
    // Generate unique event code
    let eventCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      eventCode = this.generateEventCode();
      const existingEvent = await this.eventRepository.findByEventCode(eventCode);
      isUnique = !existingEvent;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      throw new Error('Failed to generate unique event code');
    }

    const event: Omit<Event, 'created_at' | 'updated_at'> = {
      id: uuidv4(),
      name: eventData.name,
      description: eventData.description,
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      location: eventData.location,
      organizer_id: organizerId,
      event_code: eventCode,
      max_participants: eventData.max_participants,
      status: 'ACTIVE' as EventStatus,
    };

    return await this.eventRepository.create(event);
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    return await this.eventRepository.findById(eventId);
  }

  /**
   * Get event by event code
   */
  async getEventByCode(eventCode: string): Promise<Event | null> {
    return await this.eventRepository.findByEventCode(eventCode);
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, updateData: Partial<Event>): Promise<Event | null> {
    return await this.eventRepository.update(eventId, updateData);
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, status: EventStatus): Promise<Event | null> {
    return await this.eventRepository.updateEventStatus(eventId, status);
  }

  /**
   * Get events by organizer
   */
  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    return await this.eventRepository.getEventsByOrganizer(organizerId);
  }

  /**
   * Get active events
   */
  async getActiveEvents(): Promise<Event[]> {
    return await this.eventRepository.getActiveEvents();
  }

  /**
   * Delete event (soft delete by setting status to CANCELLED)
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    const result = await this.eventRepository.updateEventStatus(eventId, 'CANCELLED');
    return result !== null;
  }

  /**
   * Check if user is organizer of event
   */
  async isEventOrganizer(eventId: string, userId: string): Promise<boolean> {
    const event = await this.getEventById(eventId);
    return event?.organizer_id === userId;
  }

  /**
   * Validate event data
   */
  validateEventData(eventData: EventCreationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!eventData.name || eventData.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (eventData.name && eventData.name.length > 255) {
      errors.push('Event name must be less than 255 characters');
    }

    if (!eventData.start_date) {
      errors.push('Start date is required');
    }

    if (!eventData.end_date) {
      errors.push('End date is required');
    }

    if (eventData.start_date && eventData.end_date) {
      const startDate = new Date(eventData.start_date);
      const endDate = new Date(eventData.end_date);
      const now = new Date();

      if (startDate < now) {
        errors.push('Start date cannot be in the past');
      }

      if (endDate <= startDate) {
        errors.push('End date must be after start date');
      }
    }

    if (!eventData.location || eventData.location.trim().length === 0) {
      errors.push('Location is required');
    }

    if (eventData.max_participants && eventData.max_participants < 2) {
      errors.push('Maximum participants must be at least 2');
    }

    if (eventData.max_participants && eventData.max_participants > 10000) {
      errors.push('Maximum participants cannot exceed 10,000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}