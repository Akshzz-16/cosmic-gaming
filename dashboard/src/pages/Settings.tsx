import { useEffect, useState, type FormEvent } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import type { CafeDoc } from '@cosmic/shared';
import { formatMoney, OWNER_SHARE, PROVIDER_SHARE } from '@cosmic/shared';
import { requireDb } from '../lib/firebase';

interface Props {
  cafe: CafeDoc | null;
  cafes: CafeDoc[];
}

export default function Settings({ cafe, cafes }: Props) {
  const [rate, setRate] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cafe) {
      setRate(String(cafe.hourlyRate));
      setStatus(null);
    }
  }, [cafe?.id, cafe?.hourlyRate]);

  const saveRate = async (e: FormEvent) => {
    e.preventDefault();
    if (!cafe) return;
    const value = Number(rate);
    if (!Number.isFinite(value) || value <= 0) {
      setStatus({ kind: 'err', text: 'Enter a rate greater than 0.' });
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(requireDb(), 'cafes', cafe.id), { hourlyRate: value });
      setStatus({ kind: 'ok', text: `Rate saved — ${formatMoney(value)}/hour. The counter picks it up instantly.` });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const createCafe = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(newRate);
    if (!newName.trim()) return;
    if (!Number.isFinite(value) || value <= 0) {
      setStatus({ kind: 'err', text: 'Enter a rate greater than 0.' });
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(requireDb(), 'cafes'), {
        name: newName.trim(),
        hourlyRate: value,
        createdAt: Date.now(),
      });
      setNewName('');
      setNewRate('');
      setStatus({ kind: 'ok', text: 'Café created — configure the counter .exe to point at it.' });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Hourly rate is controlled here only — café machines cannot change it.
        </p>
      </div>

      {status && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.kind === 'ok'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-red-400/30 bg-red-400/10 text-red-200'
          }`}
        >
          {status.text}
        </div>
      )}

      {cafes.length === 0 && (
        <form
          onSubmit={createCafe}
          className="rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Create your first café
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-xs text-slate-400">
              Café name
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g. Sunrise Gaming Café"
                className="mt-1 block w-72 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </label>
            <label className="text-xs text-slate-400">
              Hourly rate (₹)
              <input
                type="number"
                min={1}
                step="1"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                required
                placeholder="80"
                className="mt-1 block w-40 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Create café
            </button>
          </div>
        </form>
      )}

      {cafe && (
        <form onSubmit={saveRate} className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Hourly rate — {cafe.name}
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-xs text-slate-400">
              Rate (₹ per hour)
              <input
                type="number"
                min={1}
                step="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="mt-1 block w-48 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-lg font-bold text-white outline-none focus:border-cyan-400/60"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save rate'}
            </button>
          </div>

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-slate-500">Café document ID</div>
              <div className="mt-1 font-mono text-slate-200">{cafe.id}</div>
              <div className="mt-2 text-xs text-slate-500">
                Pin the counter app to this café by setting{' '}
                <code className="rounded bg-black/50 px-1">VITE_CAFE_ID={cafe.id}</code> in its
                .env (optional — the app uses the first café otherwise).
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-slate-500">Revenue split (applies automatically)</div>
              <div className="mt-2 flex gap-4">
                <span className="text-violet-300">
                  Café owner {Math.round(OWNER_SHARE * 100)}%
                </span>
                <span className="text-cyan-300">You {Math.round(PROVIDER_SHARE * 100)}%</span>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
