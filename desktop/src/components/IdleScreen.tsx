import { useState } from 'react';
import type { CafeDoc } from '@cosmic/shared';
import { formatClock, formatMinutes, formatMoney } from '@cosmic/shared';
import type { DayStats } from '../hooks/useCounter';

const DURATIONS = [60, 120]; // minutes — 1 hr / 2 hr

interface Props {
  cafe: CafeDoc | null;
  todayStats: DayStats;
  onStart: (minutes: number) => void;
}

export default function IdleScreen({ cafe, todayStats, onStart }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const rateSet = !!cafe && cafe.hourlyRate > 0;
  const canStart = selected !== null && rateSet && !!cafe;

  const projectedEnd = selected ? Date.now() + selected * 60_000 : null;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-8">
      {!cafe && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Waiting for café data — create your café from the dashboard.
        </div>
      )}
      {cafe && !rateSet && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Hourly rate not configured — set it from your dashboard to start sessions.
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
          Select duration
        </div>
        <div className="flex gap-4">
          {DURATIONS.map((m) => (
            <button
              key={m}
              onClick={() => setSelected(m)}
              className={`h-16 w-32 rounded-2xl border text-lg font-bold transition ${
                selected === m
                  ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200 shadow-lg shadow-cyan-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
              }`}
            >
              {formatMinutes(m)}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={!canStart}
        onClick={() => canStart && onStart(selected!)}
        className={`group relative grid h-[22rem] w-[22rem] place-items-center rounded-full border-2 transition-all duration-200 ${
          canStart
            ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 shadow-[0_0_60px_rgba(16,185,129,0.35)] hover:scale-[1.03] hover:shadow-[0_0_80px_rgba(16,185,129,0.5)] active:scale-95'
            : 'cursor-not-allowed border-white/10 bg-white/5'
        }`}
      >
        <div className="text-center">
          <div
            className={`text-6xl font-black tracking-widest ${
              canStart ? 'text-emerald-300' : 'text-slate-600'
            }`}
          >
            START
          </div>
          <div className="mt-3 text-sm text-slate-400">
            {selected === null
              ? 'Pick a duration first'
              : `${formatMinutes(selected)}${projectedEnd ? ` • ends ${formatClock(projectedEnd)}` : ''}`}
          </div>
          {selected !== null && rateSet && (
            <div className="mt-1 text-sm font-semibold text-cyan-300">
              {formatMoney((cafe!.hourlyRate * selected) / 60)}
            </div>
          )}
        </div>
      </button>

      <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-slate-300">
        <span>
          <span className="font-semibold text-white">{todayStats.count}</span> session
          {todayStats.count === 1 ? '' : 's'} today
        </span>
        <span className="h-4 w-px bg-white/15" />
        <span>
          Collected{' '}
          <span className="font-semibold text-emerald-300">{formatMoney(todayStats.total)}</span>
        </span>
        {todayStats.last && (
          <>
            <span className="h-4 w-px bg-white/15" />
            <span className="text-slate-400">Last: {formatClock(todayStats.last.startedAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}
