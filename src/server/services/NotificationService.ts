import { EventRepository } from '../database/repositories/EventRepository';
import { UserRepository } from '../database/repositories/UserRepository';
import { Event } from '../../shared/types/Event';
import { User } from '../../shared/types/User';

export interface NotificationData {
  id: string;
  userId: string;
  eventId: string;
  type: 'EVENT_REMINDER' | 'EVENT_UPDATE' | 'EVENT_CANCELLED';
  title: string;
  message: string;
  scheduledFor: Date;
  sent: boolean;
  createdAt: Date;
}

export class NotificationService {
  private eventRepository: EventRepository;
  private userRepository: UserRepository;

  constructor() {
    this.eventRepository = new EventRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Send event reminder notifications to all participants
   * Requirement 2.5: 当会议开始前，系统应当向所有参与者发送提醒通知
   */
  async sendEventReminders(eventId: string): Promise<void> {
    try {
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const participants = await this.eventRepository.getEventParticipants(eventId);
      
      for (const participant of participants) {
        await this.sendEventReminderToUser(event, participant);
      }

      console.log(`[${new Date().toISOString()}] Event reminders sent to ${participants.length} participants for event: ${event.name}`);
    } catch (error) {
      console.error('Error sending event reminders:', error);
      throw error;
    }
  }

  /**
   * Send reminder notification to a specific user
   */
  private async sendEventReminderToUser(event: Event, user: User): Promise<void> {
    const reminderMessage = this.generateReminderMessage(event, user);
    
    // In a real implementation, this would send actual notifications
    // For now, we'll log the notification
    console.log(`[${new Date().toISOString()}] REMINDER NOTIFICATION:`);
    console.log(`To: ${user.email} (${user.name})`);
    console.log(`Subject: ${reminderMessage.title}`);
    console.log(`Message: ${reminderMessage.message}`);
    console.log(`Event: ${event.name} at ${event.location}`);
    console.log(`Start Time: ${event.start_date}`);
    console.log('---');

    // TODO: Integrate with actual notification service (email, push notifications, etc.)
    // This could be extended to support:
    // - Email notifications via SendGrid, AWS SES, etc.
    // - Push notifications via Firebase, OneSignal, etc.
    // - SMS notifications via Twilio, etc.
    // - In-app notifications via WebSocket
  }

  /**
   * Generate reminder message content
   */
  private generateReminderMessage(event: Event, user: User): { title: string; message: string } {
    const eventDate = new Date(event.start_date);
    const timeUntilEvent = eventDate.getTime() - Date.now();
    const hoursUntilEvent = Math.floor(timeUntilEvent / (1000 * 60 * 60));

    let timeDescription = '';
    if (hoursUntilEvent <= 1) {
      timeDescription = 'starting soon';
    } else if (hoursUntilEvent <= 24) {
      timeDescription = `starting in ${hoursUntilEvent} hours`;
    } else {
      const daysUntilEvent = Math.floor(hoursUntilEvent / 24);
      timeDescription = `starting in ${daysUntilEvent} days`;
    }

    return {
      title: `Reminder: ${event.name} is ${timeDescription}`,
      message: `Hi ${user.name},\n\nThis is a reminder that "${event.name}" is ${timeDescription}.\n\nEvent Details:\n- Date: ${eventDate.toLocaleDateString()}\n- Time: ${eventDate.toLocaleTimeString()}\n- Location: ${event.location}\n\nDon't forget to join and make valuable connections!\n\nEvent Code: ${event.event_code}`
    };
  }

  /**
   * Schedule event reminders for all upcoming events
   */
  async scheduleUpcomingEventReminders(): Promise<void> {
    try {
      const upcomingEvents = await this.eventRepository.getUpcomingEvents(50);
      
      for (const event of upcomingEvents) {
        const eventDate = new Date(event.start_date);
        const now = new Date();
        const timeUntilEvent = eventDate.getTime() - now.getTime();
        const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

        // Send reminders at different intervals
        if (hoursUntilEvent <= 24 && hoursUntilEvent > 23) {
          // 24 hours before
          await this.sendEventReminders(event.id);
        } else if (hoursUntilEvent <= 2 && hoursUntilEvent > 1) {
          // 2 hours before
          await this.sendEventReminders(event.id);
        } else if (hoursUntilEvent <= 0.5 && hoursUntilEvent > 0) {
          // 30 minutes before
          await this.sendEventReminders(event.id);
        }
      }
    } catch (error) {
      console.error('Error scheduling event reminders:', error);
      throw error;
    }
  }

  /**
   * Send notification when event is updated
   */
  async sendEventUpdateNotification(eventId: string, updateMessage: string): Promise<void> {
    try {
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const participants = await this.eventRepository.getEventParticipants(eventId);
      
      for (const participant of participants) {
        console.log(`[${new Date().toISOString()}] EVENT UPDATE NOTIFICATION:`);
        console.log(`To: ${participant.email} (${participant.name})`);
        console.log(`Subject: Update for ${event.name}`);
        console.log(`Message: ${updateMessage}`);
        console.log('---');
      }

      console.log(`[${new Date().toISOString()}] Event update notifications sent to ${participants.length} participants`);
    } catch (error) {
      console.error('Error sending event update notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification when event is cancelled
   */
  async sendEventCancellationNotification(eventId: string, reason?: string): Promise<void> {
    try {
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const participants = await this.eventRepository.getEventParticipants(eventId);
      const cancellationMessage = reason 
        ? `The event "${event.name}" has been cancelled. Reason: ${reason}`
        : `The event "${event.name}" has been cancelled.`;
      
      for (const participant of participants) {
        console.log(`[${new Date().toISOString()}] EVENT CANCELLATION NOTIFICATION:`);
        console.log(`To: ${participant.email} (${participant.name})`);
        console.log(`Subject: CANCELLED: ${event.name}`);
        console.log(`Message: ${cancellationMessage}`);
        console.log('---');
      }

      console.log(`[${new Date().toISOString()}] Event cancellation notifications sent to ${participants.length} participants`);
    } catch (error) {
      console.error('Error sending event cancellation notifications:', error);
      throw error;
    }
  }
}