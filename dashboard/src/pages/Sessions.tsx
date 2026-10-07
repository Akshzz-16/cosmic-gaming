import { Fragment, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import type { SessionDoc } from '@cosmic/shared';
import {
  formatDateTime,
  formatMinutes,
  formatMoney,
  localDateStr,
  splitShares,
  totalMinutesOf,
} from '@cosmic/shared';
import { requireDb } from '../lib/firebase';
import { useSessionsRange } from '../hooks/useData';

interface Props {
  enabled: boolean;
  cafeId: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  started: 'Session started',
  extended: 'Extra time added',
  completed: 'Session ended',
};

function eventDetail(e: SessionDoc['events'][number]): string {
  if (e.type === 'extended') return `+${e.minutesAdded ?? 0} min`;
  if (e.type === 'completed') return 'Recorded';
  return 'Go';
}

export default function Sessions({ enabled, cafeId }: Props) {
  const today = localDateStr();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { sessions, loading, error } = useSessionsRange(enabled, cafeId, from, to);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!cafeId) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteDoc(doc(requireDb(), 'cafes', cafeId, 'sessions', id));
      setConfirmId(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  const completed = sessions.filter(
    (s) => s.status === 'completed' && typeof s.amount === 'number',
  );
  const total = completed.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const { owner, provider } = splitShares(total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Sessions</h1>
          <p className="mt-1 text-sm text-slate-400">
            Full history with start / extension / end timeline
          </p>
        </div>
        <div className="flex items-end gap-3">
          <label className="text-xs text-slate-400">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/60"
            />
          </label>
          <label className="text-xs text-slate-400">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/60"
            />
          </label>
          <button
            onClick={() => {
              setFrom(today);
              setTo(today);
            }}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Sessions
          </div>
          <div className="mt-1 text-2xl font-black text-white">{sessions.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Revenue
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-300">{formatMoney(total)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Your share (40%) • Café 60% = {formatMoney(owner)}
          </div>
          <div className="mt-1 text-2xl font-black text-cyan-300">{formatMoney(provider)}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {deleteError && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Could not delete session: {deleteError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Booked</th>
              <th className="px-4 py-3">Billed</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
              <th className="w-8 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No sessions in this range.
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <Fragment key={s.id}>
                <tr
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {formatDateTime(s.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatMinutes(totalMinutesOf(s))}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {typeof s.billedMinutes === 'number' ? formatMinutes(s.billedMinutes) : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">
                    {typeof s.amount === 'number' ? formatMoney(s.amount) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        s.status === 'active'
                          ? 'bg-emerald-400/15 text-emerald-300'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {s.status === 'active' ? 'ACTIVE' : 'COMPLETED'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmId === s.id) {
                          void handleDelete(s.id);
                        } else {
                          setConfirmId(s.id);
                        }
                      }}
                      disabled={deletingId === s.id}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                        confirmId === s.id
                          ? 'bg-red-500 text-white hover:bg-red-400'
                          : 'border border-red-400/30 text-red-300 hover:bg-red-400/10'
                      }`}
                    >
                      {deletingId === s.id
                        ? 'Deleting…'
                        : confirmId === s.id
                          ? 'Sure? Click again'
                          : 'Delete'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{expanded === s.id ? '▴' : '▾'}</td>
                </tr>
                {expanded === s.id && (
                  <tr className="border-b border-white/5 bg-black/30">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Timeline
                          </div>
                          <ul className="mt-3 space-y-2">
                            {s.events.map((e, i) => (
                              <li key={i} className="flex items-center gap-3 text-sm">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                                <span className="text-slate-300">
                                  {EVENT_LABELS[e.type] ?? e.type}{' '}
                                  <span className="text-slate-500">({eventDetail(e)})</span>
                                </span>
                                <span className="ml-auto text-xs text-slate-500">
                                  {formatDateTime(e.at)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-slate-500">Rate at start</div>
                            <div className="text-slate-200">{formatMoney(s.rateAtStart)}/hour</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Ends at (machine)</div>
                            <div className="text-slate-200">{formatDateTime(s.endsAt)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Completed at (machine)</div>
                            <div className="text-slate-200">
                              {s.completedAt ? formatDateTime(s.completedAt) : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Server recorded at</div>
                            <div className="text-slate-200">
                              {s.serverRecordedAt ? formatDateTime(s.serverRecordedAt) : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Café share (60%)</div>
                            <div className="font-semibold text-violet-300">
                              {typeof s.amount === 'number'
                                ? formatMoney(splitShares(s.amount).owner)
                                : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Your share (40%)</div>
                            <div className="font-semibold text-cyan-300">
                              {typeof s.amount === 'number'
                                ? formatMoney(splitShares(s.amount).provider)
                                : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
