interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: 'default' | 'green' | 'cyan' | 'violet';
}

const ACCENTS = {
  default: 'text-white',
  green: 'text-emerald-300',
  cyan: 'text-cyan-300',
  violet: 'text-violet-300',
};

export default function StatCard({ label, value, sub, accent = 'default' }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-black ${ACCENTS[accent]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
