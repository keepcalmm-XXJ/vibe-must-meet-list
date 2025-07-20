export type EventStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ParticipantStatus = 'ACTIVE' | 'LEFT' | 'REMOVED';

export interface Event {
  id: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  location: string;
  organizer_id: string;
  event_code: string;
  max_participants?: number;
  status: EventStatus;
  created_at: Date;
  updated_at: Date;
}

export interface EventCreationData {
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  location: string;
  max_participants?: number;
}

export interface EventParticipant {
  id: number;
  event_id: string;
  user_id: string;
  joined_at: Date;
  status: ParticipantStatus;
}