import type { CafeDoc, SessionDoc } from '@cosmic/shared';
import {
  amountFor,
  billedMinutesFor,
  formatDateLabel,
  formatDateTime,
  formatMinutes,
  formatMoney,
  localDateStr,
  OWNER_SHARE,
  PROVIDER_SHARE,
  splitShares,
  totalMinutesOf,
} from '@cosmic/shared';
import { useSessionsRange } from '../hooks/useData';
import StatCard from '../components/StatCard';

interface Props {
  enabled: boolean;
  cafeId: string | null;
  cafe: CafeDoc | null;
  active: SessionDoc | null;
}

function summarize(sessions: SessionDoc[]) {
  const completed = sessions.filter((s) => s.status === 'completed' && typeof s.amount === 'number');
  const total = completed.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const { owner, provider } = splitShares(total);
  return { count: sessions.length, total, owner, provider };
}

export default function Overview({ enabled, cafeId, cafe, active }: Props) {
  const today = localDateStr();
  const monthStart = `${today.slice(0, 8)}01`;

  const todayRange = useSessionsRange(enabled, cafeId, today, today);
  const monthRange = useSessionsRange(enabled, cafeId, monthStart, today);

  const t = summarize(todayRange.sessions);
  const m = summarize(monthRange.sessions);

  const activeBilled = active ? billedMinutesFor(active) : 0;
  const activeAmount = active ? amountFor(active.rateAtStart, activeBilled) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live status from the counter machine • updates instantly
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Active session
          </h2>
          {active && (
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              LIVE
            </span>
          )}
        </div>

        {active ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">Started (café machine time)</div>
              <div className="mt-1 text-sm font-bold text-white">{formatDateTime(active.startedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Ends at</div>
              <div className="mt-1 text-sm font-bold text-white">{formatDateTime(active.endsAt)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Booked duration</div>
              <div className="mt-1 text-sm font-bold text-white">
                {formatMinutes(totalMinutesOf(active))}
                {active.extensions.length > 0 && (
                  <span className="ml-2 text-xs font-medium text-cyan-300">
                    (+{active.extensions.join(' + ')})
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Session amount (billed)</div>
              <div className="mt-1 text-sm font-bold text-emerald-300">
                {formatMoney(activeAmount)}
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {formatMinutes(activeBilled)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">No session running right now.</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
          Today • {formatDateLabel(today)}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sessions" value={String(t.count)} />
          <StatCard label="Revenue" value={formatMoney(t.total)} accent="green" />
          <StatCard
            label="Your share (40%)"
            value={formatMoney(t.provider)}
            sub={`Café keeps ${Math.round(OWNER_SHARE * 100)}%`}
            accent="cyan"
          />
          <StatCard
            label="Café owner share (60%)"
            value={formatMoney(t.owner)}
            sub={`Your ${Math.round(PROVIDER_SHARE * 100)}% = ${formatMoney(t.provider)}`}
            accent="violet"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
          This month
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sessions" value={String(m.count)} />
          <StatCard label="Revenue" value={formatMoney(m.total)} accent="green" />
          <StatCard label="Your share (40%)" value={formatMoney(m.provider)} accent="cyan" />
          <StatCard label="Café owner share (60%)" value={formatMoney(m.owner)} accent="violet" />
        </div>
      </section>

      {cafe && cafe.hourlyRate > 0 && (
        <div className="text-xs text-slate-500">
          Billing rate:{' '}
          <span className="text-slate-300">{formatMoney(cafe.hourlyRate)}/hour</span>
        </div>
      )}
      {(todayRange.error || monthRange.error) && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {todayRange.error ?? monthRange.error}
        </div>
      )}
    </div>
  );
}
