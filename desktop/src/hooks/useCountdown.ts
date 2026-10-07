import { useEffect, useState } from 'react';

/**
 * Ticks every 500ms while active. Returns milliseconds remaining
 * (0 when past the end time), or null when there is no end time.
 */
export function useCountdown(endsAt: number | null, active: boolean): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active, endsAt]);

  if (endsAt == null) return null;
  return Math.max(0, endsAt - now);
}
