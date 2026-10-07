import type { CafeDoc, SessionDoc, SessionEvent } from './types';
import { localDateStr } from './format';

function isNum(v: unknown): v is number {
  return typeof v === 'number';
}

function isStr(v: unknown): v is string {
  return typeof v === 'string';
}

function isEvent(v: unknown): v is SessionEvent {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return isStr(e.type) && isNum(e.at);
}

/** Parses a raw Firestore café document. */
export function cafeFromData(id: string, d: Record<string, unknown>): CafeDoc {
  return {
    id,
    name: isStr(d.name) && d.name ? d.name : 'Café',
    hourlyRate: isNum(d.hourlyRate) ? d.hourlyRate : 0,
    createdAt: isNum(d.createdAt) ? d.createdAt : undefined,
  };
}

/** Parses a raw Firestore session document (tolerant of missing fields). */
export function sessionFromData(id: string, d: Record<string, unknown>): SessionDoc {
  const serverAt = d.serverRecordedAt;
  return {
    id,
    status: d.status === 'completed' ? 'completed' : 'active',
    durationMinutes: isNum(d.durationMinutes) ? d.durationMinutes : 0,
    extensions: Array.isArray(d.extensions) ? d.extensions.filter(isNum) : [],
    startedAt: isNum(d.startedAt) ? d.startedAt : 0,
    endsAt: isNum(d.endsAt) ? d.endsAt : 0,
    serverRecordedAt: isNum(serverAt) ? serverAt : null,
    startDate: isStr(d.startDate) ? d.startDate : localDateStr(),
    rateAtStart: isNum(d.rateAtStart) ? d.rateAtStart : 0,
    events: Array.isArray(d.events) ? d.events.filter(isEvent) : [],
    billedMinutes: isNum(d.billedMinutes) ? d.billedMinutes : undefined,
    amount: isNum(d.amount) ? d.amount : undefined,
    completedAt: isNum(d.completedAt) ? d.completedAt : null,
  };
}
