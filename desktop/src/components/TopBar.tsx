import type { CafeDoc } from '@cosmic/shared';
import { formatMoney } from '@cosmic/shared';

interface Props {
  cafe: CafeDoc | null;
  online: boolean;
}

export default function TopBar({ cafe, online }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-indigo-500/30">
          CG
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">
            {cafe ? cafe.name : 'Cosmic Gaming'}
          </div>
          <div className="text-xs text-slate-400">PS4 Session Counter</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {cafe && cafe.hourlyRate > 0 && (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            {formatMoney(cafe.hourlyRate)} / hour
          </span>
        )}
        <span
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            online
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`}
          />
          {online ? 'Cloud synced' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
