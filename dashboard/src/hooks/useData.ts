import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { cafeFromData, sessionFromData, type CafeDoc, type SessionDoc } from '@cosmic/shared';
import { requireDb } from '../lib/firebase';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function useCafes(enabled: boolean) {
  const [cafes, setCafes] = useState<CafeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(
      collection(requireDb(), 'cafes'),
      (snap) => {
        const list = snap.docs
          .map((d) => cafeFromData(d.id, d.data()))
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.name.localeCompare(b.name));
        setCafes(list);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(errMsg(e));
        setLoading(false);
      },
    );
    return unsub;
  }, [enabled]);

  return { cafes, loading, error };
}

export function useActiveSession(enabled: boolean, cafeId: string | null) {
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !cafeId) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(
        collection(requireDb(), 'cafes', cafeId, 'sessions'),
        where('status', '==', 'active'),
        limit(1),
      ),
      (snap) => {
        const first = snap.docs[0];
        setSession(first ? sessionFromData(first.id, first.data()) : null);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(errMsg(e));
        setLoading(false);
      },
    );
    return unsub;
  }, [enabled, cafeId]);

  return { session, loading, error };
}

export function useSessionsRange(
  enabled: boolean,
  cafeId: string | null,
  from: string,
  to: string,
) {
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !cafeId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(
        collection(requireDb(), 'cafes', cafeId, 'sessions'),
        where('startDate', '>=', from),
        where('startDate', '<=', to),
        limit(500),
      ),
      (snap) => {
        const list = snap.docs.map((d) => sessionFromData(d.id, d.data()));
        list.sort((a, b) => b.startedAt - a.startedAt);
        setSessions(list);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(errMsg(e));
        setLoading(false);
      },
    );
    return unsub;
  }, [enabled, cafeId, from, to]);

  return { sessions, loading, error };
}
