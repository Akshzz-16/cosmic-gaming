import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  cafeFromData,
  completionFieldsFor,
  formatClock,
  formatMinutes,
  formatMoney,
  localDateStr,
  sessionFromData,
  type CafeDoc,
  type CompletionFields,
  type SessionDoc,
} from '@cosmic/shared';
import { getFirebase, isConfigured, pinnedCafeId } from '../firebase';
import { playEnd, playStart } from '../utils/sound';
import { notify } from '../utils/notify';

export type ToastKind = 'info' | 'success' | 'warn' | 'error';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export type CounterStatus = 'config-error' | 'connecting' | 'auth-error' | 'ready';

export interface DayStats {
  count: number;
  total: number;
  last: SessionDoc | null;
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function useCounter() {
  const [status, setStatus] = useState<CounterStatus>(() =>
    isConfigured ? 'connecting' : 'config-error',
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [cafeLoaded, setCafeLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [cafe, setCafe] = useState<CafeDoc | null>(null);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [today, setToday] = useState(() => localDateStr());
  const [todaySessions, setTodaySessions] = useState<SessionDoc[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const cafeRef = useRef<CafeDoc | null>(null);
  const sessionRef = useRef<SessionDoc | null>(null);
  const toastId = useRef(0);
  const completingRef = useRef<string | null>(null);
  const completionAttempts = useRef(0);

  const updateCafe = useCallback((c: CafeDoc | null) => {
    cafeRef.current = c;
    setCafe(c);
  }, []);

  const updateSession = useCallback((s: SessionDoc | null) => {
    const prev = sessionRef.current;
    if (!s || !prev || s.id !== prev.id) {
      completingRef.current = null;
      completionAttempts.current = 0;
      setCompletionError(null);
    }
    sessionRef.current = s;
    setSession(s);
  }, []);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /* ---------------- auth (anonymous for the counter app) ---------------- */

  const retryAuth = useCallback(() => {
    if (!isConfigured) return;
    setStatus('connecting');
    setAuthError(null);
    const { auth } = getFirebase();
    signInAnonymously(auth).catch((e) => {
      setStatus('auth-error');
      setAuthError(errText(e));
    });
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    const { auth } = getFirebase();
    let cancelled = false;
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (cancelled) return;
        if (user) {
          setStatus('ready');
          setAuthError(null);
        } else {
          signInAnonymously(auth).catch((e) => {
            if (cancelled) return;
            setStatus('auth-error');
            setAuthError(errText(e));
          });
        }
      },
      (e) => {
        if (cancelled) return;
        setStatus('auth-error');
        setAuthError(errText(e));
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /* ---------------- connection status ---------------- */

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      if (status === 'auth-error') retryAuth();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [status, retryAuth]);

  /* ---------------- cafés listener ---------------- */

  useEffect(() => {
    if (status !== 'ready') return;
    const { db } = getFirebase();
    let unsub: Unsubscribe | undefined;
    try {
      unsub = onSnapshot(
        collection(db, 'cafes'),
        (snap) => {
          const list = snap.docs
            .map((d) => cafeFromData(d.id, d.data()))
            .sort(
              (a, b) =>
                (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.name.localeCompare(b.name),
            );
          const chosen = pinnedCafeId
            ? (list.find((c) => c.id === pinnedCafeId) ?? null)
            : (list[0] ?? null);
          updateCafe(chosen);
          setCafeId(chosen ? chosen.id : null);
          setCafeLoaded(true);
          if (!chosen) {
            pushToast('warn', 'No café found — create one from your dashboard');
          }
        },
        (e) => pushToast('error', `Café sync failed: ${e.message}`),
      );
    } catch (e) {
      pushToast('error', `Café sync failed: ${errText(e)}`);
    }
    return () => unsub?.();
  }, [status, updateCafe, pushToast]);

  /* ---------------- day rollover ---------------- */

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = localDateStr();
      setToday((prev) => (prev === d ? prev : d));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  /* ---------------- session listeners (per café) ---------------- */

  useEffect(() => {
    if (status !== 'ready' || !cafeId) return;
    setSessionsLoaded(false);
    const { db } = getFirebase();
    const sessions = collection(db, 'cafes', cafeId, 'sessions');

    const unsubActive = onSnapshot(
      query(sessions, where('status', '==', 'active'), limit(1)),
      (snap) => {
        const first = snap.docs[0];
        updateSession(first ? sessionFromData(first.id, first.data()) : null);
        setSessionsLoaded(true);
      },
      (e) => pushToast('error', `Session sync failed: ${e.message}`),
    );

    const unsubToday = onSnapshot(
      query(sessions, where('startDate', '==', today), limit(200)),
      (snap) => {
        const list = snap.docs.map((d) => sessionFromData(d.id, d.data()));
        list.sort((a, b) => b.startedAt - a.startedAt);
        setTodaySessions(list);
      },
      (e) => pushToast('error', `History sync failed: ${e.message}`),
    );

    return () => {
      unsubActive();
      unsubToday();
    };
  }, [status, cafeId, today, updateSession, pushToast]);

  /* ---------------- actions ---------------- */

  const startSession = useCallback(
    (minutes: number) => {
      const c = cafeRef.current;
      if (!c) {
        pushToast('error', 'No café configured yet');
        return;
      }
      if (sessionRef.current) {
        pushToast('error', 'A session is already running');
        return;
      }
      if (!c.hourlyRate || c.hourlyRate <= 0) {
        pushToast('error', 'Hourly rate not set — configure it on your dashboard');
        return;
      }
      const now = Date.now();
      const endsAt = now + minutes * 60_000;
      const { db } = getFirebase();
      addDoc(collection(db, 'cafes', c.id, 'sessions'), {
        status: 'active',
        durationMinutes: minutes,
        extensions: [],
        startedAt: now,
        endsAt,
        serverRecordedAt: serverTimestamp(),
        startDate: localDateStr(now),
        rateAtStart: c.hourlyRate,
        events: [{ type: 'started', at: now }],
      }).catch((e) => pushToast('error', `Could not start session: ${errText(e)}`));

      playStart();
      notify('Session started', `${formatMinutes(minutes)} — ends at ${formatClock(endsAt)}`);
      pushToast('success', `Started — ${formatMinutes(minutes)}, ends ${formatClock(endsAt)}`);
    },
    [pushToast],
  );

  const extendSession = useCallback(
    (minutes: number) => {
      const s = sessionRef.current;
      const c = cafeRef.current;
      if (!s || !c) return;
      const now = Date.now();
      if (now >= s.endsAt) {
        pushToast('warn', 'Time already over — session ended');
        return;
      }
      const newEndsAt = s.endsAt + minutes * 60_000;
      const { db } = getFirebase();
      updateDoc(doc(db, 'cafes', c.id, 'sessions', s.id), {
        endsAt: newEndsAt,
        extensions: arrayUnion(minutes),
        events: arrayUnion({ type: 'extended', at: now, minutesAdded: minutes }),
      }).catch((e) => pushToast('error', `Could not add time: ${errText(e)}`));

      playStart();
      notify(`+${minutes} minutes added`, `Now ends at ${formatClock(newEndsAt)}`);
      pushToast('info', `+${minutes} min added — now ends ${formatClock(newEndsAt)}`);
    },
    [pushToast],
  );

  /**
   * Completes a session (natural expiry or early end).
   * Returns the computed completion fields, or null if already completing/failed.
   */
  const completeSession = useCallback(
    (s: SessionDoc): CompletionFields | null => {
      if (completingRef.current === s.id) return null;
      completingRef.current = s.id;
      const fields = completionFieldsFor(s, Date.now());
      const c = cafeRef.current;
      if (!c) {
        completingRef.current = null;
        return null;
      }
      const { db } = getFirebase();
      updateDoc(doc(db, 'cafes', c.id, 'sessions', s.id), {
        ...fields,
        events: arrayUnion({ type: 'completed', at: fields.completedAt }),
      }).catch((e) => {
        completingRef.current = null;
        completionAttempts.current += 1;
        if (completionAttempts.current >= 3) {
          setCompletionError(errText(e));
          pushToast('error', `Could not save session: ${errText(e)}`);
        } else {
          pushToast('error', 'Save failed — retrying…');
        }
      });
      return fields;
    },
    [pushToast],
  );

  const retryCompletion = useCallback(() => {
    completionAttempts.current = 0;
    setCompletionError(null);
    const s = sessionRef.current;
    if (s) {
      completingRef.current = null;
      completeSession(s);
    }
  }, [completeSession]);

  const endSessionNow = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const fields = completeSession(s);
    if (!fields) return;
    playEnd();
    notify('Session ended', `${formatMinutes(fields.billedMinutes)} billed — ${formatMoney(fields.amount)}`);
    pushToast(
      'success',
      `Session ended — ${formatMinutes(fields.billedMinutes)} billed — ${formatMoney(fields.amount)}`,
    );
  }, [completeSession, pushToast]);

  /* natural expiry: called by App when the countdown hits zero */
  const expireSession = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const fields = completeSession(s);
    if (!fields) return;
    playEnd();
    notify('Time is up!', `Session ended — ${formatMoney(fields.amount)}`);
    pushToast('success', `Time's up! ${formatMinutes(fields.billedMinutes)} — ${formatMoney(fields.amount)}`);
  }, [completeSession, pushToast]);

  const dayStats: DayStats = useMemo(() => {
    const completed = todaySessions.filter(
      (s) => s.status === 'completed' && typeof s.amount === 'number',
    );
    const total = completed.reduce((sum, s) => sum + (s.amount ?? 0), 0);
    return { count: todaySessions.length, total, last: completed[0] ?? null };
  }, [todaySessions]);

  return {
    status,
    authError,
    retryAuth,
    online,
    cafeLoaded,
    sessionsLoaded,
    cafe,
    cafeId,
    session,
    todayStats: dayStats,
    toasts,
    pushToast,
    dismissToast,
    startSession,
    extendSession,
    endSessionNow,
    expireSession,
    completionError,
    retryCompletion,
  };
}
