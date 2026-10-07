import type { ToastItem, ToastKind } from '../hooks/useCounter';

const STYLES: Record<ToastKind, { bar: string; label: string }> = {
  info: { bar: 'bg-cyan-400', label: 'text-cyan-200' },
  success: { bar: 'bg-emerald-400', label: 'text-emerald-200' },
  warn: { bar: 'bg-amber-400', label: 'text-amber-200' },
  error: { bar: 'bg-red-400', label: 'text-red-200' },
};

interface Props {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}

export default function Toasts({ items, onDismiss }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-96 flex-col gap-2">
      {items.map((t) => {
        const style = STYLES[t.kind];
        return (
          <div
            key={t.id}
            className="toast-in pointer-events-auto flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className={`w-1.5 shrink-0 ${style.bar}`} />
            <div className={`flex-1 px-4 py-3 text-sm font-medium ${style.label}`}>
              {t.message}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="px-3 text-slate-500 transition hover:text-white"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
