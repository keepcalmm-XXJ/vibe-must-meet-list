import { BaseRepository } from '../BaseRepository';
import { Event, EventParticipant, EventStatus } from '../../../shared/types/Event';
import { User } from '../../../shared/types/User';

export class EventRepository extends BaseRepository<Event> {
  constructor() {
    super('events');
  }

  /**
   * Find event by event code
   */
  async findByEventCode(eventCode: string): Promise<Event | null> {
    return await this.findOneBy({ event_code: eventCode });
  }

  /**
   * Get events organized by a user
   */
  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    return await this.findBy({ organizer_id: organizerId }, {
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  /**
   * Get active events
   */
  async getActiveEvents(): Promise<Event[]> {
    return await this.findBy({ status: 'ACTIVE' }, {
      orderBy: 'start_date',
      orderDirection: 'ASC'
    });
  }

  /**
   * Get events by status
   */
  async getEventsByStatus(status: EventStatus): Promise<Event[]> {
    return await this.findBy({ status }, {
      orderBy: 'start_date',
      orderDirection: 'DESC'
    });
  }

  /**
   * Add participant to event
   */
  async addParticipant(eventId: string, userId: string): Promise<EventParticipant> {
    try {
      // Check if user is already a participant
      const existingParticipant = await this.queryOne<EventParticipant>(
        'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      if (existingParticipant) {
        if (existingParticipant.status === 'ACTIVE') {
          throw new Error('User is already an active participant');
        } else {
          // Reactivate participant
          await this.query(
            'UPDATE event_participants SET status = ?, joined_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?',
            ['ACTIVE', eventId, userId]
          );
          return await this.queryOne<EventParticipant>(
            'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
          ) as EventParticipant;
        }
      }

      // Add new participant
      await this.query(
        'INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, ?)',
        [eventId, userId, 'ACTIVE']
      );

      return await this.queryOne<EventParticipant>(
        'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      ) as EventParticipant;
    } catch (error) {
      console.error('Error adding participant to event:', error);
      throw error;
    }
  }

  /**
   * Remove participant from event
   */
  async removeParticipant(eventId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.query(
        'UPDATE event_participants SET status = ? WHERE event_id = ? AND user_id = ?',
        ['LEFT', eventId, userId]
      );
      return true;
    } catch (error) {
      console.error('Error removing participant from event:', error);
      throw error;
    }
  }

  /**
   * Get event participants
   */
  async getEventParticipants(eventId: string): Promise<User[]> {
    try {
      const sql = `
        SELECT u.* FROM users u
        INNER JOIN event_participants ep ON u.id = ep.user_id
        WHERE ep.event_id = ? AND ep.status = 'ACTIVE'
        ORDER BY ep.joined_at ASC
      `;
      return await this.query<User>(sql, [eventId]);
    } catch (error) {
      console.error('Error getting event participants:', error);
      throw error;
    }
  }

  /**
   * Get participant count for event
   */
  async getParticipantCount(eventId: string): Promise<number> {
    try {
      const result = await this.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM event_participants WHERE event_id = ? AND status = ?',
        [eventId, 'ACTIVE']
      );
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting participant count:', error);
      throw error;
    }
  }

  /**
   * Check if user is participant of event
   */
  async isParticipant(eventId: string, userId: string): Promise<boolean> {
    try {
      const participant = await this.queryOne<EventParticipant>(
        'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ? AND status = ?',
        [eventId, userId, 'ACTIVE']
      );
      return participant !== null;
    } catch (error) {
      console.error('Error checking participant status:', error);
      throw error;
    }
  }

  /**
   * Get events user is participating in
   */
  async getUserEvents(userId: string): Promise<Event[]> {
    try {
      const sql = `
        SELECT e.* FROM events e
        INNER JOIN event_participants ep ON e.id = ep.event_id
        WHERE ep.user_id = ? AND ep.status = 'ACTIVE'
        ORDER BY e.start_date DESC
      `;
      return await this.query<Event>(sql, [userId]);
    } catch (error) {
      console.error('Error getting user events:', error);
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, status: EventStatus): Promise<Event | null> {
    return await this.update(eventId, { status });
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    try {
      const sql = `
        SELECT * FROM events 
        WHERE start_date > datetime('now') AND status = 'ACTIVE'
        ORDER BY start_date ASC 
        LIMIT ?
      `;
      return await this.query<Event>(sql, [limit]);
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw error;
    }
  }

  /**
   * Search events by name or description
   */
  async searchEvents(searchTerm: string, limit: number = 20): Promise<Event[]> {
    try {
      const sql = `
        SELECT * FROM events 
        WHERE (name LIKE ? OR description LIKE ?) AND status = 'ACTIVE'
        ORDER BY start_date ASC 
        LIMIT ?
      `;
      const searchPattern = `%${searchTerm}%`;
      return await this.query<Event>(sql, [searchPattern, searchPattern, limit]);
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }
}