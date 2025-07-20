import { Router, Response } from 'express';
import { asyncHandler, authenticateToken, AuthenticatedRequest } from '../middleware';
import { EventService } from '../services/EventService';
import { EventCreationData, EventStatus } from '../../shared/types/Event';

const router = Router();

/**
 * Event management routes
 * Base path: /api/v1/events
 */

// POST /api/v1/events/join - Join event by code
router.post('/join', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const userId = req.user!.id;
    const { eventCode } = req.body;

    if (!eventCode) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event code is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const event = await eventService.joinEventByCode(userId, eventCode);

    res.json({
      success: true,
      data: event,
      message: 'Successfully joined event',
    });
  } catch (error: any) {
    console.error('Error joining event:', error);
    let statusCode = 400;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('already a participant')) {
      statusCode = 409;
    }

    res.status(statusCode).json({
      error: {
        code: 'JOIN_EVENT_ERROR',
        message: error.message || 'Failed to join event',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/events/my/events - Get user's events
router.get('/my/events', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const userId = req.user!.id;
    const events = await eventService.getUserEvents(userId);

    res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    console.error('Error getting user events:', error);
    res.status(500).json({
      error: {
        code: 'GET_USER_EVENTS_ERROR',
        message: error.message || 'Failed to retrieve user events',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/events/active - Get active events
router.get('/active', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const events = await eventService.getActiveEvents();

    res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    console.error('Error getting active events:', error);
    res.status(500).json({
      error: {
        code: 'GET_ACTIVE_EVENTS_ERROR',
        message: error.message || 'Failed to retrieve active events',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// POST /api/v1/events - Create new event
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const userId = req.user!.id;
    const eventData: EventCreationData = req.body;

    // Validate required fields
    if (!eventData.name || !eventData.start_date || !eventData.end_date || !eventData.location) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, start_date, end_date, location',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Convert date strings to Date objects
    eventData.start_date = new Date(eventData.start_date);
    eventData.end_date = new Date(eventData.end_date);

    const event = await eventService.createEvent(userId, eventData);

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully',
    });
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(400).json({
      error: {
        code: 'CREATE_EVENT_ERROR',
        message: error.message || 'Failed to create event',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/events/:id - Get event details
router.get('/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const event = await eventService.getEventById(eventId);

    if (!event) {
      return res.status(404).json({
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'Event not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error('Error getting event:', error);
    res.status(500).json({
      error: {
        code: 'GET_EVENT_ERROR',
        message: error.message || 'Failed to retrieve event',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// PUT /api/v1/events/:id - Update event
router.put('/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const userId = req.user!.id;
    const updateData = req.body;

    // Convert date strings to Date objects if provided
    if (updateData.start_date) {
      updateData.start_date = new Date(updateData.start_date);
    }
    if (updateData.end_date) {
      updateData.end_date = new Date(updateData.end_date);
    }

    const event = await eventService.updateEvent(eventId, userId, updateData);

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating event:', error);
    const statusCode = error.message.includes('Only event organizer') ? 403 : 400;
    res.status(statusCode).json({
      error: {
        code: 'UPDATE_EVENT_ERROR',
        message: error.message || 'Failed to update event',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// PATCH /api/v1/events/:id/status - Update event status
router.patch('/:id/status', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const userId = req.user!.id;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status. Must be one of: ACTIVE, INACTIVE, COMPLETED, CANCELLED',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const event = await eventService.updateEventStatus(eventId, userId, status as EventStatus);

    res.json({
      success: true,
      data: event,
      message: 'Event status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating event status:', error);
    const statusCode = error.message.includes('Only event organizer') ? 403 : 400;
    res.status(statusCode).json({
      error: {
        code: 'UPDATE_STATUS_ERROR',
        message: error.message || 'Failed to update event status',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/events/:id/participants - Get event participants
router.get('/:id/participants', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const userId = req.user!.id;

    const participants = await eventService.getEventParticipants(eventId, userId);

    res.json({
      success: true,
      data: participants,
    });
  } catch (error: any) {
    console.error('Error getting event participants:', error);
    const statusCode = error.message.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: 'GET_PARTICIPANTS_ERROR',
        message: error.message || 'Failed to retrieve event participants',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// DELETE /api/v1/events/:id - Delete event
router.delete('/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const userId = req.user!.id;

    const success = await eventService.deleteEvent(eventId, userId);

    if (!success) {
      return res.status(500).json({
        error: {
          code: 'DELETE_EVENT_ERROR',
          message: 'Failed to delete event',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    const statusCode = error.message.includes('Only event organizer') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: 'DELETE_EVENT_ERROR',
        message: error.message || 'Failed to delete event',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// POST /api/v1/events/:id/leave - Leave event
router.post('/:id/leave', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const userId = req.user!.id;

    const success = await eventService.leaveEvent(eventId, userId);

    if (!success) {
      return res.status(500).json({
        error: {
          code: 'LEAVE_EVENT_ERROR',
          message: 'Failed to leave event',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Successfully left event',
    });
  } catch (error: any) {
    console.error('Error leaving event:', error);
    res.status(400).json({
      error: {
        code: 'LEAVE_EVENT_ERROR',
        message: error.message || 'Failed to leave event',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// Enhanced participant management routes

// GET /api/v1/events/:id/participants/count - Get participant count
router.get('/:id/participants/count', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const userId = req.user!.id;

    const count = await eventService.getParticipantCount(eventId, userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    console.error('Error getting participant count:', error);
    const statusCode = error.message.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: 'GET_PARTICIPANT_COUNT_ERROR',
        message: error.message || 'Failed to get participant count',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// POST /api/v1/events/:id/participants/remove - Remove participant (organizer only)
router.post('/:id/participants/remove', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const organizerId = req.user!.id;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Participant ID is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const success = await eventService.removeParticipant(eventId, participantId, organizerId);

    res.json({
      success: true,
      data: { removed: success },
      message: 'Participant removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing participant:', error);
    const statusCode = error.message.includes('Only event organizer') ? 403 : 400;
    res.status(statusCode).json({
      error: {
        code: 'REMOVE_PARTICIPANT_ERROR',
        message: error.message || 'Failed to remove participant',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// POST /api/v1/events/:id/participants/bulk-add - Add multiple participants (organizer only)
router.post('/:id/participants/bulk-add', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const organizerId = req.user!.id;
    const { participantIds } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Participant IDs array is required and must not be empty',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const results = await eventService.addMultipleParticipants(eventId, participantIds, organizerId);

    res.json({
      success: true,
      data: results,
      message: `Bulk add completed: ${results.success.length} successful, ${results.failed.length} failed`,
    });
  } catch (error: any) {
    console.error('Error bulk adding participants:', error);
    const statusCode = error.message.includes('Only event organizer') ? 403 : 400;
    res.status(statusCode).json({
      error: {
        code: 'BULK_ADD_PARTICIPANTS_ERROR',
        message: error.message || 'Failed to add participants',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/events/:id/participants/check/:userId - Check if user is participant
router.get('/:id/participants/check/:userId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const userId = req.params.userId;
    const requesterId = req.user!.id;

    const isParticipant = await eventService.isUserParticipant(eventId, userId, requesterId);

    res.json({
      success: true,
      data: { isParticipant },
    });
  } catch (error: any) {
    console.error('Error checking participant status:', error);
    const statusCode = error.message.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: 'CHECK_PARTICIPANT_ERROR',
        message: error.message || 'Failed to check participant status',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// POST /api/v1/events/:id/reminders - Send event reminders (organizer only)
router.post('/:id/reminders', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const organizerId = req.user!.id;

    await eventService.sendEventReminders(eventId, organizerId);

    res.json({
      success: true,
      message: 'Event reminders sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending event reminders:', error);
    const statusCode = error.message.includes('Only event organizer') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: 'SEND_REMINDERS_ERROR',
        message: error.message || 'Failed to send event reminders',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

// GET /api/v1/events/:id/participants/detailed - Get detailed participant information (organizer only)
router.get('/:id/participants/detailed', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventService = new EventService();
    const eventId = req.params.id;
    const organizerId = req.user!.id;

    const participants = await eventService.getDetailedParticipants(eventId, organizerId);

    res.json({
      success: true,
      data: participants,
    });
  } catch (error: any) {
    console.error('Error getting detailed participants:', error);
    const statusCode = error.message.includes('Only event organizer') ? 403 : 500;
    res.status(statusCode).json({
      error: {
        code: 'GET_DETAILED_PARTICIPANTS_ERROR',
        message: error.message || 'Failed to get detailed participant information',
        timestamp: new Date().toISOString(),
      },
    });
  }
}));

export { router as eventRoutes };