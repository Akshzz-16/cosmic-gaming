import type { ReactNode } from 'react';
import type { CafeDoc } from '@cosmic/shared';

export type Tab = 'overview' | 'sessions' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'settings', label: 'Settings' },
];

interface Props {
  cafes: CafeDoc[];
  activeCafeId: string | null;
  onCafeChange: (id: string) => void;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  userEmail: string;
  onLogout: () => void;
  children: ReactNode;
}

export default function Layout({
  cafes,
  activeCafeId,
  onCafeChange,
  tab,
  onTabChange,
  userEmail,
  onLogout,
  children,
}: Props) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-black text-white">
              CG
            </div>
            <span className="text-sm font-bold text-white">Cosmic Gaming</span>
            {cafes.length > 0 && (
              <select
                value={activeCafeId ?? ''}
                onChange={(e) => onCafeChange(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-400/60"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                    tab === t.id
                      ? 'bg-cyan-400/15 text-cyan-200'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="hidden text-xs text-slate-400 md:block">{userEmail}</div>
            <button
              onClick={onLogout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
