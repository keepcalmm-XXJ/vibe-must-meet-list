export interface Event {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  organizerId: string;
  eventCode: string;
  maxParticipants?: number;
  status: EventStatus;
  participants: string[];
  createdAt: Date;
}

export enum EventStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface EventCreationData {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  maxParticipants?: number;
}
