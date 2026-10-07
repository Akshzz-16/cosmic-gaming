import { formatClock, formatRemaining } from '@cosmic/shared';

interface Props {
  remainingMs: number;
  totalMs: number;
  endsAt: number;
}

const SIZE = 360;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function CountdownRing({ remainingMs, totalMs, endsAt }: Props) {
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  const critical = remainingMs <= 60_000;
  const warning = remainingMs <= 5 * 60_000;
  const color = critical ? '#f87171' : warning ? '#fbbf24' : '#34d399';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`relative ${critical ? 'animate-alert' : ''}`}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.5s' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div
              className="text-7xl font-black tabular-nums tracking-tight"
              style={{ color }}
            >
              {formatRemaining(remainingMs)}
            </div>
            <div className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-slate-400">
              remaining
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-slate-400">
        Ends at <span className="font-semibold text-slate-200">{formatClock(endsAt)}</span>
      </div>
    </div>
  );
}
