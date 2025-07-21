export interface SocketUser {
  id: string;
  userId: string;
  eventId?: string;
  isOnline: boolean;
  lastSeen: Date;
  socketId: string;
}

export interface UserConnectionStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  eventId?: string;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export enum NotificationType {
  CONNECTION_REQUEST = 'connection_request',
  CONNECTION_ACCEPTED = 'connection_accepted',
  CONNECTION_REJECTED = 'connection_rejected',
  NEW_MESSAGE = 'new_message',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_REMINDER = 'meeting_reminder',
  MATCH_FOUND = 'match_found',
  EVENT_UPDATE = 'event_update',
  SYSTEM_NOTIFICATION = 'system_notification',
}

// Socket.io event interfaces
export interface ServerToClientEvents {
  // Connection status events
  user_connected: (data: UserConnectionStatus) => void;
  user_disconnected: (data: UserConnectionStatus) => void;
  users_online: (users: UserConnectionStatus[]) => void;
  
  // Notification events
  notification: (notification: NotificationData) => void;
  notification_read: (notificationId: string) => void;
  
  // Connection request events
  connection_request_received: (request: any) => void;
  connection_request_accepted: (request: any) => void;
  connection_request_rejected: (request: any) => void;
  
  // Message events
  message_received: (message: any) => void;
  message_read: (messageId: string) => void;
  
  // Meeting events
  meeting_scheduled: (meeting: any) => void;
  meeting_updated: (meeting: any) => void;
  meeting_cancelled: (meetingId: string) => void;
  
  // Match events
  new_matches: (matches: any[]) => void;
  
  // Event updates
  event_updated: (event: any) => void;
  participant_joined: (participant: any) => void;
  participant_left: (participantId: string) => void;
  
  // Error events
  error: (error: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  // Authentication
  authenticate: (token: string) => void;
  
  // Event management
  join_event: (eventId: string) => void;
  leave_event: (eventId: string) => void;
  
  // Connection requests
  send_connection_request: (data: { toUserId: string; message?: string }) => void;
  respond_connection_request: (data: { requestId: string; accept: boolean }) => void;
  
  // Messaging
  send_message: (data: { toUserId: string; content: string }) => void;
  mark_message_read: (messageId: string) => void;
  
  // Meetings
  schedule_meeting: (data: any) => void;
  update_meeting: (data: any) => void;
  cancel_meeting: (meetingId: string) => void;
  
  // Notifications
  mark_notification_read: (notificationId: string) => void;
  get_notifications: () => void;
  
  // Status updates
  update_status: (status: 'online' | 'away' | 'busy') => void;
  
  // Typing indicators
  typing_start: (data: { toUserId: string }) => void;
  typing_stop: (data: { toUserId: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
  eventId?: string;
  authenticated: boolean;
}