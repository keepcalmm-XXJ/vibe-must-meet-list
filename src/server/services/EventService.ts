import { Event, EventCreationData, EventStatus } from '../../shared/types/Event';
import { User } from '../../shared/types/User';
import { EventModel } from '../models/Event';
import { EventRepository } from '../database/repositories/EventRepository';
import { NotificationService } from './NotificationService';

export class EventService {
  private eventModel: EventModel;
  private eventRepository: EventRepository;
  private notificationService: NotificationService;

  constructor() {
    this.eventModel = new EventModel();
    this.eventRepository = new EventRepository();
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new event
   */
  async createEvent(organizerId: string, eventData: EventCreationData): Promise<Event> {
    // Validate event data
    const validation = this.eventModel.validateEventData(eventData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const event = await this.eventModel.createEvent(organizerId, eventData);
      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    try {
      return await this.eventModel.getEventById(eventId);
    } catch (error) {
      console.error('Error getting event by ID:', error);
      throw new Error('Failed to retrieve event');
    }
  }

  /**
   * Get event by event code
   */
  async getEventByCode(eventCode: string): Promise<Event | null> {
    try {
      return await this.eventModel.getEventByCode(eventCode);
    } catch (error) {
      console.error('Error getting event by code:', error);
      throw new Error('Failed to retrieve event');
    }
  }

  /**
   * Update event information
   */
  async updateEvent(eventId: string, organizerId: string, updateData: Partial<EventCreationData>): Promise<Event> {
    try {
      // Check if user is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, organizerId);
      if (!isOrganizer) {
        throw new Error('Only event organizer can update event');
      }

      // Validate update data if provided
      if (Object.keys(updateData).length > 0) {
        const currentEvent = await this.eventModel.getEventById(eventId);
        if (!currentEvent) {
          throw new Error('Event not found');
        }

        // Merge current data with updates for validation
        const mergedData: EventCreationData = {
          name: updateData.name || currentEvent.name,
          description: updateData.description !== undefined ? updateData.description : currentEvent.description,
          start_date: updateData.start_date || currentEvent.start_date,
          end_date: updateData.end_date || currentEvent.end_date,
          location: updateData.location || currentEvent.location,
          max_participants: updateData.max_participants !== undefined ? updateData.max_participants : currentEvent.max_participants,
        };

        const validation = this.eventModel.validateEventData(mergedData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      const updatedEvent = await this.eventModel.updateEvent(eventId, updateData);
      if (!updatedEvent) {
        throw new Error('Failed to update event');
      }

      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, organizerId: string, status: EventStatus): Promise<Event> {
    try {
      // Check if user is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, organizerId);
      if (!isOrganizer) {
        throw new Error('Only event organizer can update event status');
      }

      const updatedEvent = await this.eventModel.updateEventStatus(eventId, status);
      if (!updatedEvent) {
        throw new Error('Failed to update event status');
      }

      // Send notifications for status changes
      if (status === 'CANCELLED') {
        await this.notificationService.sendEventCancellationNotification(eventId);
      } else {
        await this.notificationService.sendEventUpdateNotification(
          eventId, 
          `Event status has been updated to: ${status}`
        );
      }

      return updatedEvent;
    } catch (error) {
      console.error('Error updating event status:', error);
      throw error;
    }
  }

  /**
   * Get events organized by user
   */
  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    try {
      return await this.eventModel.getEventsByOrganizer(organizerId);
    } catch (error) {
      console.error('Error getting events by organizer:', error);
      throw new Error('Failed to retrieve events');
    }
  }

  /**
   * Get active events
   */
  async getActiveEvents(): Promise<Event[]> {
    try {
      return await this.eventModel.getActiveEvents();
    } catch (error) {
      console.error('Error getting active events:', error);
      throw new Error('Failed to retrieve active events');
    }
  }

  /**
   * Join event by code
   */
  async joinEventByCode(userId: string, eventCode: string): Promise<Event> {
    try {
      const event = await this.eventModel.getEventByCode(eventCode);
      if (!event) {
        throw new Error('Event not found with the provided code');
      }

      if (event.status !== 'ACTIVE') {
        throw new Error('Event is not active');
      }

      // Check if event has reached maximum participants
      if (event.max_participants) {
        const participantCount = await this.eventRepository.getParticipantCount(event.id);
        if (participantCount >= event.max_participants) {
          throw new Error('Event has reached maximum participants');
        }
      }

      // Check if user is already a participant
      const isAlreadyParticipant = await this.eventRepository.isParticipant(event.id, userId);
      if (isAlreadyParticipant) {
        throw new Error('User is already a participant of this event');
      }

      // Add user as participant
      await this.eventRepository.addParticipant(event.id, userId);

      return event;
    } catch (error) {
      console.error('Error joining event:', error);
      throw error;
    }
  }

  /**
   * Get event participants
   */
  async getEventParticipants(eventId: string, requesterId: string): Promise<User[]> {
    try {
      // Check if requester is organizer or participant
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, requesterId);
      const isParticipant = await this.eventRepository.isParticipant(eventId, requesterId);

      if (!isOrganizer && !isParticipant) {
        throw new Error('Access denied: You must be an organizer or participant to view participants');
      }

      return await this.eventRepository.getEventParticipants(eventId);
    } catch (error) {
      console.error('Error getting event participants:', error);
      throw error;
    }
  }

  /**
   * Leave event
   */
  async leaveEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is a participant
      const isParticipant = await this.eventRepository.isParticipant(eventId, userId);
      if (!isParticipant) {
        throw new Error('User is not a participant of this event');
      }

      // Check if user is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, userId);
      if (isOrganizer) {
        throw new Error('Event organizer cannot leave the event');
      }

      return await this.eventRepository.removeParticipant(eventId, userId);
    } catch (error) {
      console.error('Error leaving event:', error);
      throw error;
    }
  }

  /**
   * Delete event (only by organizer)
   */
  async deleteEvent(eventId: string, organizerId: string): Promise<boolean> {
    try {
      // Check if user is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, organizerId);
      if (!isOrganizer) {
        throw new Error('Only event organizer can delete event');
      }

      return await this.eventModel.deleteEvent(eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Get user's events (as participant or organizer)
   */
  async getUserEvents(userId: string): Promise<{ organized: Event[]; participating: Event[] }> {
    try {
      const organized = await this.eventModel.getEventsByOrganizer(userId);
      const participating = await this.eventRepository.getUserEvents(userId);

      return {
        organized,
        participating
      };
    } catch (error) {
      console.error('Error getting user events:', error);
      throw new Error('Failed to retrieve user events');
    }
  }

  /**
   * Enhanced participant management methods
   */

  /**
   * Get participant count for an event
   * Enhanced permission verification for requirement 2.4
   */
  async getParticipantCount(eventId: string, requesterId: string): Promise<number> {
    try {
      // Verify requester has permission to view participant information
      const hasPermission = await this.verifyParticipantViewPermission(eventId, requesterId);
      if (!hasPermission) {
        throw new Error('Access denied: Insufficient permissions to view participant count');
      }

      return await this.eventRepository.getParticipantCount(eventId);
    } catch (error) {
      console.error('Error getting participant count:', error);
      throw error;
    }
  }

  /**
   * Check if user is participant of event with enhanced permission verification
   */
  async isUserParticipant(eventId: string, userId: string, requesterId: string): Promise<boolean> {
    try {
      // Verify requester has permission to check participant status
      const hasPermission = await this.verifyParticipantViewPermission(eventId, requesterId);
      if (!hasPermission) {
        throw new Error('Access denied: Insufficient permissions to check participant status');
      }

      return await this.eventRepository.isParticipant(eventId, userId);
    } catch (error) {
      console.error('Error checking participant status:', error);
      throw error;
    }
  }

  /**
   * Remove participant from event (organizer only)
   * Enhanced participant management for requirement 2.4
   */
  async removeParticipant(eventId: string, participantId: string, organizerId: string): Promise<boolean> {
    try {
      // Check if requester is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, organizerId);
      if (!isOrganizer) {
        throw new Error('Only event organizer can remove participants');
      }

      // Check if target user is actually a participant
      const isParticipant = await this.eventRepository.isParticipant(eventId, participantId);
      if (!isParticipant) {
        throw new Error('User is not a participant of this event');
      }

      // Prevent organizer from removing themselves
      if (participantId === organizerId) {
        throw new Error('Event organizer cannot be removed from the event');
      }

      const result = await this.eventRepository.removeParticipant(eventId, participantId);
      
      if (result) {
        console.log(`[${new Date().toISOString()}] Participant ${participantId} removed from event ${eventId} by organizer ${organizerId}`);
      }

      return result;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Bulk add participants to event (organizer only)
   */
  async addMultipleParticipants(eventId: string, participantIds: string[], organizerId: string): Promise<{ success: string[]; failed: { id: string; reason: string }[] }> {
    try {
      // Check if requester is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, organizerId);
      if (!isOrganizer) {
        throw new Error('Only event organizer can add participants');
      }

      const event = await this.eventModel.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== 'ACTIVE') {
        throw new Error('Cannot add participants to inactive event');
      }

      const results = {
        success: [] as string[],
        failed: [] as { id: string; reason: string }[]
      };

      for (const participantId of participantIds) {
        try {
          // Check if user is already a participant
          const isAlreadyParticipant = await this.eventRepository.isParticipant(eventId, participantId);
          if (isAlreadyParticipant) {
            results.failed.push({ id: participantId, reason: 'Already a participant' });
            continue;
          }

          // Check participant limit
          if (event.max_participants) {
            const currentCount = await this.eventRepository.getParticipantCount(eventId);
            if (currentCount >= event.max_participants) {
              results.failed.push({ id: participantId, reason: 'Event has reached maximum participants' });
              continue;
            }
          }

          await this.eventRepository.addParticipant(eventId, participantId);
          results.success.push(participantId);
        } catch (error: any) {
          results.failed.push({ id: participantId, reason: error.message });
        }
      }

      console.log(`[${new Date().toISOString()}] Bulk participant addition: ${results.success.length} successful, ${results.failed.length} failed for event ${eventId}`);
      
      return results;
    } catch (error) {
      console.error('Error adding multiple participants:', error);
      throw error;
    }
  }

  /**
   * Send event reminders to all participants
   * Implementation for requirement 2.5
   */
  async sendEventReminders(eventId: string, organizerId: string): Promise<void> {
    try {
      // Check if requester is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, organizerId);
      if (!isOrganizer) {
        throw new Error('Only event organizer can send reminders');
      }

      await this.notificationService.sendEventReminders(eventId);
    } catch (error) {
      console.error('Error sending event reminders:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic reminders for upcoming events
   * Implementation for requirement 2.5
   */
  async scheduleAutomaticReminders(): Promise<void> {
    try {
      await this.notificationService.scheduleUpcomingEventReminders();
    } catch (error) {
      console.error('Error scheduling automatic reminders:', error);
      throw error;
    }
  }

  /**
   * Verify if user has permission to view participant information
   * Enhanced permission verification for requirements 2.4 and 2.5
   */
  private async verifyParticipantViewPermission(eventId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, userId);
      if (isOrganizer) {
        return true;
      }

      // Check if user is a participant
      const isParticipant = await this.eventRepository.isParticipant(eventId, userId);
      if (isParticipant) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying participant view permission:', error);
      return false;
    }
  }

  /**
   * Get detailed participant information (organizer only)
   */
  async getDetailedParticipants(eventId: string, organizerId: string): Promise<User[]> {
    try {
      // Check if requester is the organizer
      const isOrganizer = await this.eventModel.isEventOrganizer(eventId, organizerId);
      if (!isOrganizer) {
        throw new Error('Only event organizer can view detailed participant information');
      }

      return await this.eventRepository.getEventParticipants(eventId);
    } catch (error) {
      console.error('Error getting detailed participants:', error);
      throw error;
    }
  }
}