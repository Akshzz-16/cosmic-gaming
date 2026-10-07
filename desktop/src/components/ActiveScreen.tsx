import type { CafeDoc, SessionDoc } from '@cosmic/shared';
import {
  amountFor,
  billedMinutesFor,
  formatClock,
  formatMoney,
  formatMinutes,
  totalMinutesOf,
} from '@cosmic/shared';
import CountdownRing from './CountdownRing';

interface Props {
  cafe: CafeDoc | null;
  session: SessionDoc;
  remainingMs: number;
  completionError: string | null;
  onExtend: (minutes: number) => void;
  onEnd: () => void;
  onRetrySave: () => void;
}

export default function ActiveScreen({
  cafe,
  session,
  remainingMs,
  completionError,
  onExtend,
  onEnd,
  onRetrySave,
}: Props) {
  const rate = cafe?.hourlyRate ?? session.rateAtStart;
  const billed = billedMinutesFor(session);
  const liveAmount = amountFor(session.rateAtStart || rate, billed);
  const totalMinutes = totalMinutesOf(session);
  const extensionEvents = session.events.filter((e) => e.type === 'extended');
  const canExtend = remainingMs > 0;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      {completionError && (
        <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
          <span>Could not save the session: {completionError}</span>
          <button
            onClick={onRetrySave}
            className="rounded-lg bg-red-400 px-3 py-1.5 font-semibold text-red-950 hover:bg-red-300"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-slate-400">
        <span>
          Started{' '}
          <span className="font-semibold text-slate-200">{formatClock(session.startedAt)}</span>
        </span>
        <span>
          Booked{' '}
          <span className="font-semibold text-slate-200">{formatMinutes(totalMinutes)}</span>
        </span>
        <span>
          Amount{' '}
          <span className="font-semibold text-emerald-300">{formatMoney(liveAmount)}</span>
        </span>
      </div>

      <CountdownRing remainingMs={remainingMs} totalMs={totalMinutes * 60_000} endsAt={session.endsAt} />

      <div className="flex items-center gap-4">
        <button
          disabled={!canExtend}
          onClick={() => onExtend(30)}
          className="h-20 w-44 rounded-2xl border-2 border-cyan-400/50 bg-cyan-400/10 text-2xl font-black text-cyan-200 transition hover:bg-cyan-400/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +30 min
        </button>
        <button
          disabled={!canExtend}
          onClick={() => onExtend(60)}
          className="h-20 w-44 rounded-2xl border-2 border-indigo-400/50 bg-indigo-400/10 text-2xl font-black text-indigo-200 transition hover:bg-indigo-400/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +60 min
        </button>
      </div>

      <button
        onClick={onEnd}
        className="rounded-xl border border-red-400/40 px-5 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
      >
        End session now
      </button>

      {extensionEvents.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {extensionEvents.map((e, i) => (
            <span
              key={i}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
            >
              +{e.minutesAdded} min at {formatClock(e.at)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
