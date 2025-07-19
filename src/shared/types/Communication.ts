export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: ConnectionStatus;
  createdAt: Date;
  respondedAt?: Date;
}

export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Meeting {
  id: string;
  participants: string[];
  title: string;
  description?: string;
  scheduledTime: Date;
  duration: number; // in minutes
  location?: string;
  status: MeetingStatus;
  createdAt: Date;
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface MeetingDetails {
  title: string;
  description?: string;
  scheduledTime: Date;
  duration: number;
  location?: string;
}
