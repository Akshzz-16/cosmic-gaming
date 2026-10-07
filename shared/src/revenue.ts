import type { SessionDoc } from './types';

export const OWNER_SHARE = 0.6;
export const PROVIDER_SHARE = 0.4;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** duration + every +30/+60 extension */
export function totalMinutesOf(s: Pick<SessionDoc, 'durationMinutes' | 'extensions'>): number {
  return s.durationMinutes + s.extensions.reduce((a, b) => a + b, 0);
}

/**
 * Minutes to bill: the full booked session (duration + every +30/+60
 * extension), regardless of when it actually ended — sessions are charged
 * per booked time, not per minute utilised. Completed sessions keep their
 * stored value.
 */
export function billedMinutesFor(
  s: Pick<
    SessionDoc,
    'status' | 'durationMinutes' | 'extensions' | 'billedMinutes'
  >,
): number {
  if (s.status === 'completed' && typeof s.billedMinutes === 'number') {
    return s.billedMinutes;
  }
  return totalMinutesOf(s);
}

/** ₹ amount = rate × minutes / 60 */
export function amountFor(ratePerHour: number, minutes: number): number {
  return round2((ratePerHour * minutes) / 60);
}

export function splitShares(amount: number): { owner: number; provider: number } {
  return {
    owner: round2(amount * OWNER_SHARE),
    provider: round2(amount * PROVIDER_SHARE),
  };
}

export interface CompletionFields {
  status: 'completed';
  completedAt: number;
  billedMinutes: number;
  amount: number;
}

/** Fields written to Firestore when a session ends (natural expiry or early end).
 *  The amount always covers the full booked session. */
export function completionFieldsFor(
  s: Pick<
    SessionDoc,
    'status' | 'durationMinutes' | 'extensions' | 'startedAt' | 'rateAtStart' | 'billedMinutes' | 'amount' | 'completedAt'
  >,
  now: number = Date.now(),
): CompletionFields {
  if (s.status === 'completed' && typeof s.billedMinutes === 'number' && typeof s.amount === 'number') {
    return {
      status: 'completed',
      completedAt: s.completedAt ?? now,
      billedMinutes: s.billedMinutes,
      amount: s.amount,
    };
  }
  const minutes = billedMinutesFor(s as SessionDoc);
  return {
    status: 'completed',
    completedAt: now,
    billedMinutes: minutes,
    amount: amountFor(s.rateAtStart, minutes),
  };
}
