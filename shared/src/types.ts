export type SessionStatus = 'active' | 'completed';

export type SessionEventType = 'started' | 'extended' | 'completed';

export interface SessionEvent {
  type: SessionEventType;
  /** epoch ms from the café machine clock */
  at: number;
  /** only for 'extended' events */
  minutesAdded?: number;
}

export interface CafeDoc {
  id: string;
  name: string;
  /** ₹ per hour — set only from the provider dashboard */
  hourlyRate: number;
  createdAt?: number;
}

export interface SessionDoc {
  id: string;
  status: SessionStatus;
  /** initial duration chosen before START */
  durationMinutes: number;
  /** minutes added via +30 / +60, in order */
  extensions: number[];
  /** epoch ms — café machine clock (authoritative for the countdown) */
  startedAt: number;
  /** absolute epoch ms when the session ends — survives restarts */
  endsAt: number;
  /** Firebase server timestamp (ms) — audit / clock-skew detection */
  serverRecordedAt?: number | null;
  /** YYYY-MM-DD of startedAt in the café machine's local timezone */
  startDate: string;
  /** ₹/hour snapshot at session start */
  rateAtStart: number;
  /** full audit trail: started / extended / completed */
  events: SessionEvent[];
  billedMinutes?: number;
  /** ₹ — computed automatically on completion */
  amount?: number;
  completedAt?: number | null;
}
