import { useEffect, useRef } from 'react';
import { formatClock, formatMoney } from '@cosmic/shared';
import { useCounter } from './hooks/useCounter';
import { useCountdown } from './hooks/useCountdown';
import { playWarning } from './utils/sound';
import { notify } from './utils/notify';
import TopBar from './components/TopBar';
import IdleScreen from './components/IdleScreen';
import ActiveScreen from './components/ActiveScreen';
import Toasts from './components/Toasts';
import { AuthErrorScreen, SetupScreen, Splash } from './components/Screens';

const WARN_WINDOW_MS = 5 * 60_000;

export default function App() {
  const c = useCounter();
  const session = c.session;
  const remaining = useCountdown(session?.endsAt ?? null, session != null);
  const warnedRef = useRef<string | null>(null);

  /* 5-minute warning: once per session */
  useEffect(() => {
    if (!session || remaining == null) return;
    if (remaining <= WARN_WINDOW_MS && remaining > 0 && warnedRef.current !== session.id) {
      warnedRef.current = session.id;
      playWarning();
      notify('5 minutes left', `The session ends at ${formatClock(session.endsAt)}`);
      c.pushToast('warn', `5 minutes left — ends ${formatClock(session.endsAt)}`);
    }
  }, [remaining, session, c.pushToast]);

  /* natural expiry at 00:00 */
  useEffect(() => {
    if (!session || remaining == null || remaining > 0) return;
    if (c.completionError) return;
    c.expireSession();
  }, [remaining, session, c.expireSession, c.completionError]);

  if (c.status === 'config-error') return <SetupScreen />;
  if (c.status === 'connecting') return <Splash label="Connecting to Cosmic Gaming cloud…" />;
  if (c.status === 'auth-error') {
    return <AuthErrorScreen message={c.authError} onRetry={c.retryAuth} />;
  }
  if (!c.cafeLoaded || (c.cafeId && !c.sessionsLoaded)) {
    return <Splash label="Loading session data…" />;
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar cafe={c.cafe} online={c.online} />

      <main className="grid flex-1 place-items-center overflow-y-auto px-6 py-8">
        {session && remaining != null ? (
          <ActiveScreen
            cafe={c.cafe}
            session={session}
            remainingMs={remaining}
            completionError={c.completionError}
            onExtend={c.extendSession}
            onEnd={c.endSessionNow}
            onRetrySave={c.retryCompletion}
          />
        ) : (
          <IdleScreen cafe={c.cafe} todayStats={c.todayStats} onStart={c.startSession} />
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-white/10 bg-black/30 px-6 py-2.5 text-xs text-slate-400">
        <span>
          Today:{' '}
          <span className="font-semibold text-slate-200">{c.todayStats.count}</span> session
          {c.todayStats.count === 1 ? '' : 's'} •{' '}
          <span className="font-semibold text-emerald-300">
            {formatMoney(c.todayStats.total)}
          </span>{' '}
          collected
        </span>
        <span>
          Cosmic Gaming • {c.online ? 'synced' : 'offline — will sync when back online'}
        </span>
      </footer>

      <Toasts items={c.toasts} onDismiss={c.dismissToast} />
    </div>
  );
}
